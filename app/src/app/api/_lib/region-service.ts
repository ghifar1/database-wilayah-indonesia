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

const cache = new Map<LevelKey, Promise<Array<RegionRecord>>>()

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

const readLevelData = async (level: LevelKey): Promise<Array<RegionRecord>> => {
    if (!cache.has(level)) {
        cache.set(level, (async () => {
            const config = levelConfig[level]
            const dir = path.join(dataRoot, config.folder)
            const entries = await fs.readdir(dir, { withFileTypes: true })
            const records: Array<RegionRecord> = []
            for (const entry of entries) {
                if (!entry.isFile() || !entry.name.endsWith(".json")) {
                    continue
                }
                const raw = await fs.readFile(path.join(dir, entry.name), "utf8")
                const parsed = JSON.parse(raw) as RegionRecord
                records.push(parsed)
            }
            return records
        })())
    }
    return cache.get(level)!
}

const findParentRecord = async (level: LevelKey, identifier: string, view: ViewKey) => {
    const parentLevel = levelConfig[level].parent
    if (!parentLevel) {
        return null
    }
    const data = await readLevelData(parentLevel)
    const key = view === "bps" ? "kode_bps" : "kode_dagri"
    const candidate = data.find(record => trim(record[key as keyof RegionRecord] as string | undefined) === identifier)
    return candidate ?? null
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
    const records = await readLevelData(level)

    let filtered = records
    let parent: ParentResponse | null = null

    if (level !== "provinsi") {
        if (!view) {
            throw new RegionError("Either 'bps_id' or 'dagri_id' query parameter is required for this level.", 400)
        }

        const viewKey = view as ViewKey
        const parentField = viewKey === "bps" ? "parent_kode_bps" : "parent_kode_dagri"
        const parentIdentifier = viewKey === "bps" ? normalizedBpsId : normalizedDagriId
        filtered = records.filter(record => trim(record[parentField as keyof RegionRecord] as string | undefined) === parentIdentifier)

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
