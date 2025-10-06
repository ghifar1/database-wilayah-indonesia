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

const levelConfig: Record<LevelKey, LevelConfig & { filename: string }> = {
    "provinsi": {
        folder: "provinsi",
        parent: null,
        filename: "provinsi.csv"
    },
    "kabupaten-kota": {
        folder: "kabupaten-kota",
        parent: "provinsi",
        filename: "kabupaten-kota.csv"
    },
    "kecamatan": {
        folder: "kecamatan",
        parent: "kabupaten-kota",
        filename: "kecamatan.csv"
    },
    "kelurahan-desa": {
        folder: "kelurahan-desa",
        parent: "kecamatan",
        filename: "kelurahan-desa.csv"
    }
}

const dataRoot = path.resolve(process.cwd(), "..", "data")

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

const parseCsvRow = (row: string): Array<string> => {
    const cells: Array<string> = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < row.length; i++) {
        const char = row[i]
        if (char === "\"") {
            if (inQuotes && row[i + 1] === "\"") {
                current += "\""
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === "," && !inQuotes) {
            cells.push(current)
            current = ""
        } else {
            current += char
        }
    }
    cells.push(current)
    return cells
}

const readLevelData = async (level: LevelKey): Promise<LevelDataset> => {
    if (!cache.has(level)) {
        cache.set(level, (async () => {
            const config = levelConfig[level]
            const filePath = path.join(dataRoot, config.filename)
            const raw = await fs.readFile(filePath, "utf8")
            const records: Array<RegionRecord> = []
            const byIdBps = new Map<string, RegionRecord>()
            const byIdDagri = new Map<string, RegionRecord>()
            const byParentBps = new Map<string, Array<RegionRecord>>()
            const byParentDagri = new Map<string, Array<RegionRecord>>()
            const lines = raw.split(/\r?\n/)
            const header = lines.shift() ?? ""
            const headerCells = parseCsvRow(header).map(cell => cell.trim())
            const hasParentColumns = headerCells.includes("parent_id")

            for (const line of lines) {
                const trimmedLine = line.trim()
                if (!trimmedLine.length) {
                    continue
                }
                const cells = parseCsvRow(trimmedLine)
                const normalized = cells.map(cell => {
                    const trimmed = cell.trim()
                    if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
                        return trimmed.slice(1, -1).replace(/""/g, "\"")
                    }
                    return trimmed
                })

                let index = 0
                let parentBps: string | undefined
                let parentDagri: string | undefined
                if (hasParentColumns) {
                    parentBps = normalized[index++] || undefined
                    parentDagri = normalized[index++] || undefined
                }

                const kodeBps = normalized[index++] ?? ""
                const namaBps = normalized[index++] ?? ""
                const kodeDagri = normalized[index++] ?? ""
                const namaDagri = normalized[index++] ?? ""
                const kodePos = normalized[index++] ?? ""

                const record: RegionRecord = {
                    kode_bps: kodeBps,
                    nama_bps: namaBps,
                    kode_dagri: kodeDagri,
                    nama_dagri: namaDagri,
                    parent_kode_bps: parentBps,
                    parent_kode_dagri: parentDagri,
                    kode_pos: kodePos || undefined
                }

                records.push(record)

                const finalKodeBps = trim(record.kode_bps)
                const finalKodeDagri = trim(record.kode_dagri)
                if (finalKodeBps.length) {
                    byIdBps.set(finalKodeBps, record)
                }
                if (finalKodeDagri.length) {
                    byIdDagri.set(finalKodeDagri, record)
                }

                const finalParentBps = trim(record.parent_kode_bps)
                if (finalParentBps.length) {
                    if (!byParentBps.has(finalParentBps)) {
                        byParentBps.set(finalParentBps, [])
                    }
                    byParentBps.get(finalParentBps)!.push(record)
                }

                const finalParentDagri = trim(record.parent_kode_dagri)
                if (finalParentDagri.length) {
                    if (!byParentDagri.has(finalParentDagri)) {
                        byParentDagri.set(finalParentDagri, [])
                    }
                    byParentDagri.get(finalParentDagri)!.push(record)
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
