import * as fs from "fs"
import * as path from "path"
import { flockSync } from "fs-ext"
import * as cli from "cli-progress"

const apiPath = "https://sig.bps.go.id"
const jsonBasePath = "json"
const jsonLevels = ["provinsi", "kabupaten-kota", "kecamatan", "kelurahan-desa"] as const

type Periode = {
    kode: string
    nama: string
}

type Wilayah = {
    kode_bps: string
    nama_bps: string
    kode_dagri: string
    nama_dagri: string
    kode_pos?: string
}

type PostalWilayah = {
    kode_bps: string
    nama_bps: string
    kode_pos: string
    nama_pos: string
}

const postalLevelMap: Record<typeof jsonLevels[number], "provinsi" | "kabupaten" | "kecamatan" | "desa"> = {
    "provinsi": "provinsi",
    "kabupaten-kota": "kabupaten",
    "kecamatan": "kecamatan",
    "kelurahan-desa": "desa"
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const maxFetchAttempts = 7

const getPeriode = async (attempt = 0): Promise<Array<Periode>> => {
    try {
        const response = await fetch(`${apiPath}/rest-drop-down/getperiode`)
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status}`)
        }
        const data = await response.json()
        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`Failed to fetch periode (attempt ${attempt + 1}): ${errorMessage}`)
        if (attempt >= maxFetchAttempts - 1) {
            throw new Error("Failed to fetch periode after multiple attempts")
        }
        await delay(3000)
        return getPeriode(attempt + 1)
    }
}

const getData = async (level: string, parent: string, periode_merge: string, attempt = 0): Promise<Array<Wilayah>> => {
    try {
        const response = await fetch(`${apiPath}/rest-bridging/getwilayah?level=${level}&parent=${parent}&periode_merge=${periode_merge}`)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`Failed to fetch data for level ${level} parent ${parent} (attempt ${attempt + 1}): ${errorMessage}`)
        if (attempt >= maxFetchAttempts - 1) {
            throw new Error("Failed to fetch data after multiple attempts")
        }
        await delay(3000)
        return await getData(level, parent, periode_merge, attempt + 1)
    }
}

const getPostalData = async (level: string, parent: string, periode_merge: string, attempt = 0): Promise<Array<PostalWilayah>> => {
    try {
        const response = await fetch(`${apiPath}/rest-bridging-pos/getwilayah?level=${level}&parent=${parent}&periode_merge=${periode_merge}`)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        return data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log(`Failed to fetch postal data for level ${level} parent ${parent} (attempt ${attempt + 1}): ${errorMessage}`)
        if (attempt >= maxFetchAttempts - 1) {
            console.log(`Skipping postal data for ${level} parent ${parent}`)
            return []
        }
        await delay(3000)
        return await getPostalData(level, parent, periode_merge, attempt + 1)
    }
}

const groupPostalCodes = (postalData: Array<PostalWilayah>) => {
    const postalMap = new Map<string, string>()
    const intermediate = new Map<string, Set<string>>()

    for (const entry of postalData) {
        const kode = entry.kode_bps?.trim()
        const kodePos = entry.kode_pos?.trim()
        if (!kode || !kodePos) {
            continue
        }
        if (!intermediate.has(kode)) {
            intermediate.set(kode, new Set())
        }
        intermediate.get(kode)?.add(kodePos)
    }

    for (const [kode, kodePosSet] of intermediate.entries()) {
        postalMap.set(kode, Array.from(kodePosSet).join(";"))
    }

    return postalMap
}

const ensureParentDirectory = (filepath: string) => {
    const dir = path.dirname(filepath)
    if (!dir || dir === ".") {
        return
    }
    fs.mkdirSync(dir, { recursive: true })
}

const writeCsv = async (name: string, temporaryCsvArray: Array<string>) => {
    ensureParentDirectory(name)
    // check if file exists and delete it
    if (fs.existsSync(name)) {
        fs.unlinkSync(name)
    }
    const csv = temporaryCsvArray.join("\n")
    fs.writeFileSync(name, csv)
}

const writeOrAppendCsv = async (name: string, temporaryCsvArray: Array<string>, header: string) => {
    ensureParentDirectory(name)
    const fd = fs.openSync(name, "a")
    try {
        flockSync(fd, "ex")
        const stats = fs.fstatSync(fd)
        if (stats.size === 0) {
            temporaryCsvArray.unshift(header)
        } else {
            temporaryCsvArray.unshift("")
        }
        const csv = temporaryCsvArray.join("\n")
        fs.writeSync(fd, csv)
    } finally {
        fs.closeSync(fd)
    }
}

const cleanupOutputFiles = () => {
    fs.mkdirSync("data", { recursive: true })
    const files = fs.readdirSync("data")
    for (const file of files) {
        if (file.endsWith(".csv") || file.endsWith(".sql")) {
            fs.unlinkSync(`data/${file}`)
        }
    }
}

const cleanupJsonOutput = () => {
    if (!fs.existsSync(jsonBasePath)) {
        return
    }
    for (const level of jsonLevels) {
        const dir = `${jsonBasePath}/${level}`
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true })
        }
    }
}

const prepareJsonOutputDirectories = () => {
    fs.mkdirSync(jsonBasePath, { recursive: true })
    for (const level of jsonLevels) {
        fs.mkdirSync(`${jsonBasePath}/${level}`, { recursive: true })
    }
}

const sanitizeCodeForFilename = (code: string) => {
    const trimmed = code?.trim() ?? ""
    return trimmed.length ? trimmed : "0"
}

const writeJsonOutput = (levelName: string, parent: string, wilayah: Wilayah) => {
    const dir = `${jsonBasePath}/${levelName}`
    fs.mkdirSync(dir, { recursive: true })

    const kodeBps = sanitizeCodeForFilename(wilayah.kode_bps)
    const kodeDagri = sanitizeCodeForFilename(wilayah.kode_dagri)
    const filename = `${dir}/${kodeBps}-${kodeDagri}.json`

    const payload: Record<string, string> & { parent_kode_bps?: string } = {
        kode_bps: wilayah.kode_bps,
        nama_bps: wilayah.nama_bps,
        kode_dagri: wilayah.kode_dagri,
        nama_dagri: wilayah.nama_dagri
    }

    if (parent !== "0") {
        payload.parent_kode_bps = parent
    }

    if (wilayah.kode_pos) {
        payload.kode_pos = wilayah.kode_pos
    }

    fs.writeFileSync(filename, `${JSON.stringify(payload, null, 2)}\n`)
}

type LevelTree = {
    level_name: string
    children?: LevelTree
}

const levelTree = {
    "level_name": "provinsi",
    "children": {
        "level_name": "kabupaten-kota",
        "children": {
            "level_name": "kecamatan",
            "children": {
                "level_name": "kelurahan-desa"
            }
        }
    }
}

const multibarProgress = new cli.MultiBar({
    clearOnComplete: true,
    hideCursor: true,
    format: "{bar} | {processname} - {percentage}% | {value}/{total} | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    linewrap: true
})

const duplicateBpsChecker = (array: Array<string>, data: Wilayah, lastIncrement: "lower" | "upper" | null = null, increment = 0) => {
    const isDuplicate = array.find((x) => x.split(",")[1].includes(data.kode_bps))

    if (isDuplicate) {
        console.log(`duplicate ${data.kode_bps} - ${data.nama_bps} on ${isDuplicate}`)
        // const kodeBps = parseInt(data.kode_bps)
        // if (!lastIncrement || lastIncrement === "upper") {
        //     data.kode_bps = (kodeBps - (Math.abs(increment) + 1)).toString()
        // } else if (lastIncrement === "lower") {
        //     data.kode_bps = (kodeBps + (Math.abs(increment) + 1)).toString()
        // }
        // return duplicateBpsChecker(array, data, lastIncrement === "upper" ? "lower" : "upper", increment + 1)
        // set zero for now
        data.kode_bps = "0"
    }

    return data
}

const sanitizeString = (str: string) => {
    str = str.replace(/\n/g, " ")
    str = str.replace(/"/g, "'")
    return str
}

const maxParallel = 7
let parallel = 0

const parallelBar = multibarProgress.create(maxParallel, 0, { processname: "parallel" })

parallelBar.update(0, { processname: "parallel" })

const collectData = async (level: LevelTree, parent: string, periode_merge: string) => {
    parallelBar.update(parallel, { processname: "parallel" })
    const tmpArray: Array<string> = []
    let bar: cli.SingleBar | null = null

    const data = await getData(level.level_name, parent, periode_merge)
    const postalLevel = postalLevelMap[level.level_name as typeof jsonLevels[number]]
    let postalMap = new Map<string, string>()
    if (postalLevel) {
        const postalData = await getPostalData(postalLevel, parent, periode_merge)
        postalMap = groupPostalCodes(postalData)
    }
    if (level.level_name === "provinsi" || level.level_name === "kabupaten-kota" || level.level_name === "kecamatan") {
        bar = multibarProgress.create(data.length, 0, { processname: `${level.level_name}` })
    }

    for (const d of data) {
        bar?.increment(1, {
            processname: `${level.level_name} ${sanitizeString(d.nama_bps)}`
        })
        if (level.children) {
            if (level.level_name === "kabupaten-kota") {
                while (parallel >= maxParallel) {
                    await delay(2000)
                }
                parallel++
                collectData(level.children, d.kode_bps, periode_merge).finally(() => {
                    parallel--
                })
            } else {
                await collectData(level.children, d.kode_bps, periode_merge)
            }

        }

        d.nama_dagri = sanitizeString(d.nama_dagri)
        d.nama_bps = sanitizeString(d.nama_bps)
        const kodePos = postalMap.get(d.kode_bps)
        if (kodePos) {
            d.kode_pos = kodePos
        }

        const data = duplicateBpsChecker(tmpArray, d)

        writeJsonOutput(level.level_name, parent, data)

        // push data to array
        const csvKodePos = data.kode_pos ? `"${data.kode_pos}"` : ""
        tmpArray.push(`${parent != "0" ? `${parent},` : ""}${data.kode_bps},"${data.nama_bps}",${data.kode_dagri},"${data.nama_dagri}",${csvKodePos}`)
        await delay(100)
    }
    const header = `${parent != "0" ? "parent_id," : ""}kode_bps,nama_bps,kode_dagri,nama_dagri,kode_pos`
    writeOrAppendCsv(`data/${level.level_name}.csv`, tmpArray, header)

    bar?.stop()
    if (bar) {
        multibarProgress.remove(bar)
    }
}

const orderCsv = async () => {
    const csvArray = fs.readdirSync("data").filter((x) => x.endsWith(".csv"))
    for (const csv of csvArray) {
        const data = fs.readFileSync(`data/${csv}`, "utf8")
        const dataArray = data.split("\n")
        const header = dataArray[0]
        dataArray.shift()

        // check if data has parent_id
        const hasParent = header.includes("parent_id")
        const sortedArray = dataArray.sort((a, b) => {
            const aSplit = a.split(",")
            const bSplit = b.split(",")
            if (hasParent) {
                return parseInt(aSplit[0]) - parseInt(bSplit[0])
            }
            return parseInt(aSplit[1]) - parseInt(bSplit[1])
        })

        sortedArray.unshift(header)
        writeCsv(`data/${csv}`, sortedArray)
    }
}

const start = async () => {
    const listPeriode = await getPeriode()
    console.log("list periode", listPeriode)

    if (!listPeriode.length) {
        throw new Error("Periode list is empty")
    }

    const currentYear = new Date().getFullYear().toString()
    const periodeWithCurrentYear = listPeriode.find((periode) => {
        const bpsYear = periode.kode.split("_")[0]
        return bpsYear === currentYear || periode.nama.includes(currentYear)
    })

    const selectedPeriode = periodeWithCurrentYear ?? listPeriode[0]
    console.log("selected periode", selectedPeriode)

    cleanupOutputFiles()
    cleanupJsonOutput()
    prepareJsonOutputDirectories()

    await collectData(levelTree, "0", selectedPeriode.kode)

    await orderCsv()
    console.log("done")

    // multibarProgress.stop()

    // for (const csv of tmpCsvArr) {
    //     await writeCsv(`data/${csv.level_name}.csv`, csv.array)
    // }

}

start()
