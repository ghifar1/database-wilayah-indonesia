import { promises as fs } from "fs"
import path from "path"

export type LevelKey = "provinsi" | "kabupaten-kota" | "kecamatan" | "kelurahan-desa"
export type ViewKey = "bps" | "dagri"

type RegionRecord = {
    kode_bps: string
    nama_bps: string
    kode_dagri: string
    nama_dagri: string
    parent_kode_bps?: string
    parent_kode_dagri?: string
    kode_pos?: string
}

export type RegionResponseItem = {
    id: string
    parent_id: string | null
    name: string
    type: ViewKey
    postal_code: string | null
}

export type ParentResponse = {
    parent_id: string
    name: string
    type: ViewKey
    postal_code: string | null
}

type LevelConfig = {
    folder: string
    parent: LevelKey | null
}

const levelConfig: Record<LevelKey, LevelConfig> = {
    "provinsi": {
        folder: "provinsi",
        parent: null
    },
    "kabupaten-kota": {
        folder: "kabupaten-kota",
        parent: "provinsi"
    },
    "kecamatan": {
        folder: "kecamatan",
        parent: "kabupaten-kota"
    },
    "kelurahan-desa": {
        folder: "kelurahan-desa",
        parent: "kecamatan"
    }
}

const dataRoot = path.resolve(process.cwd(), "..", "json")

class RegionError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

type LevelDataset = {
    records: Array<RegionRecord>
    byId: {
        bps: Map<string, RegionRecord>
        dagri: Map<string, RegionRecord>
    }
    byParent: {
        bps: Map<string, Array<RegionRecord>>
        dagri: Map<string, Array<RegionRecord>>
    }
}

const cache = new Map<LevelKey, Promise<LevelDataset>>()

const trim = (value: string | undefined | null) => value?.trim() ?? ""

const formatParent = (record: RegionRecord, view: ViewKey): ParentResponse => {
    const parentId = view === "bps" ? trim(record.kode_bps) : trim(record.kode_dagri)
    const postalCode = trim(record.kode_pos)
    return {
        parent_id: parentId,
        name: view === "bps" ? record.nama_bps : record.nama_dagri,
        type: view,
        postal_code: postalCode.length ? postalCode : null
    }
}

const formatRegion = (record: RegionRecord, view: ViewKey): RegionResponseItem => {
    const id = view === "bps" ? trim(record.kode_bps) : trim(record.kode_dagri)
    const parentId = view === "bps" ? trim(record.parent_kode_bps) : trim(record.parent_kode_dagri)
    const postalCode = trim(record.kode_pos)
    return {
        id,
        parent_id: parentId.length ? parentId : null,
        name: view === "bps" ? record.nama_bps : record.nama_dagri,
        type: view,
        postal_code: postalCode.length ? postalCode : null
    }
}

const readLevelData = async (level: LevelKey): Promise<LevelDataset> => {
    if (!cache.has(level)) {
        cache.set(level, (async () => {
            const config = levelConfig[level]
            const dir = path.join(dataRoot, config.folder)
            const entries = await fs.readdir(dir, { withFileTypes: true })
            const records: Array<RegionRecord> = []
            const byIdBps = new Map<string, RegionRecord>()
            const byIdDagri = new Map<string, RegionRecord>()
            const byParentBps = new Map<string, Array<RegionRecord>>()
            const byParentDagri = new Map<string, Array<RegionRecord>>()
            for (const entry of entries) {
                if (!entry.isFile() || !entry.name.endsWith(".json")) {
                    continue
                }
                const raw = await fs.readFile(path.join(dir, entry.name), "utf8")
                const parsed = JSON.parse(raw) as RegionRecord
                records.push(parsed)

                const kodeBps = trim(parsed.kode_bps)
                const kodeDagri = trim(parsed.kode_dagri)
                if (kodeBps.length) {
                    byIdBps.set(kodeBps, parsed)
                }
                if (kodeDagri.length) {
                    byIdDagri.set(kodeDagri, parsed)
                }

                const parentBps = trim(parsed.parent_kode_bps)
                if (parentBps.length) {
                    if (!byParentBps.has(parentBps)) {
                        byParentBps.set(parentBps, [])
                    }
                    byParentBps.get(parentBps)!.push(parsed)
                }

                const parentDagri = trim(parsed.parent_kode_dagri)
                if (parentDagri.length) {
                    if (!byParentDagri.has(parentDagri)) {
                        byParentDagri.set(parentDagri, [])
                    }
                    byParentDagri.get(parentDagri)!.push(parsed)
                }
            }
            return {
                records,
                byId: {
                    bps: byIdBps,
                    dagri: byIdDagri
                },
                byParent: {
                    bps: byParentBps,
                    dagri: byParentDagri
                }
            }
        })())
    }
    return cache.get(level)!
}

const findParentRecord = async (level: LevelKey, identifier: string, view: ViewKey) => {
    const parentLevel = levelConfig[level].parent
    if (!parentLevel) {
        return null
    }
    const dataset = await readLevelData(parentLevel)
    const lookup = view === "bps" ? dataset.byId.bps : dataset.byId.dagri
    return lookup.get(identifier) ?? null
}

type FetchOptions = {
    parentBpsId?: string | null
    parentDagriId?: string | null
}

export type LevelPayload = {
    parent: ParentResponse | null
    message: string
    data: Array<RegionResponseItem>
}

export const fetchLevel = async (level: LevelKey, options: FetchOptions = {}): Promise<LevelPayload> => {
    const normalizedBpsId = trim(options.parentBpsId)
    const normalizedDagriId = trim(options.parentDagriId)

    if (normalizedBpsId && normalizedDagriId) {
        throw new RegionError("Provide only one of 'bps_id' or 'dagri_id'.", 400)
    }

    const view: ViewKey | null = normalizedDagriId ? "dagri" : normalizedBpsId ? "bps" : null
    const dataset = await readLevelData(level)

    let filtered = dataset.records
    let parent: ParentResponse | null = null

    if (level !== "provinsi") {
        if (!view) {
            throw new RegionError("Either 'bps_id' or 'dagri_id' query parameter is required for this level.", 400)
        }

        const viewKey = view as ViewKey
        const parentIdentifier = viewKey === "bps" ? normalizedBpsId : normalizedDagriId
        const childLookup = viewKey === "bps" ? dataset.byParent.bps : dataset.byParent.dagri
        filtered = parentIdentifier.length ? childLookup.get(parentIdentifier) ?? [] : []

        const parentRecord = await findParentRecord(level, parentIdentifier, viewKey)
        if (!parentRecord) {
            throw new RegionError(`Parent with ${viewKey === "bps" ? "kode_bps" : "kode_dagri"} '${parentIdentifier}' not found.`, 404)
        }
        parent = formatParent(parentRecord, viewKey)
    }

    const viewForChildren = (view as ViewKey) ?? "bps"
    const data = filtered.map(record => formatRegion(record, viewForChildren))
    const message = data.length ? "Success" : "No data found"

    return {
        parent,
        message,
        data
    }
}

export { RegionError }
