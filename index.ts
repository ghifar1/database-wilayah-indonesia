import * as fs from "fs"
import { flockSync } from "fs-ext"
import * as cli from "cli-progress"

const apiPath = "https://sig.bps.go.id"

type Periode = {
    kode: string
    nama: string
}

type Wilayah = {
    kode_bps: string
    nama_bps: string
    kode_dagri: string
    nama_dagri: string
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const getPeriode = async (): Promise<Array<Periode>> => {
    const response = await fetch(`${apiPath}/rest-drop-down/getperiode`)
    if (!response.ok) {
        throw new Error("Failed to fetch data")
    }
    const data = await response.json()
    return data
}

const getData = async (level: string, parent: string, periode_merge: string, attempt = 0): Promise<Array<Wilayah>> => {
    const response = await fetch(`${apiPath}/rest-bridging/getwilayah?level=${level}&parent=${parent}&periode_merge=${periode_merge}`)
    if (!response.ok) {
        console.log("Failed to fetch data", response.status)
        if (attempt >= 5) {
            throw new Error("Failed to fetch data")
        }
        await delay(3000)
        return await getData(level, parent, periode_merge, attempt + 1)
        // throw new Error("Failed to fetch data")
    }
    const data = await response.json()
    return data
}

const writeCsv = async (name: string, temporaryCsvArray: Array<string>) => {
    // check if file exists and delete it
    if (fs.existsSync(name)) {
        fs.unlinkSync(name)
    }
    const csv = temporaryCsvArray.join("\n")
    fs.writeFileSync(name, csv)
}

const writeOrAppendCsv = async (name: string, temporaryCsvArray: Array<string>, header: string) => {
    // implement flock
    const fd = fs.openSync(name, "a")
    flockSync(fd, "ex")
    if (fs.existsSync(name)) {
        // add newline to first element
        temporaryCsvArray.unshift("")
        const csv = temporaryCsvArray.join("\n")
        fs.appendFileSync(name, csv)
    } else {
        temporaryCsvArray.unshift(header)
        writeCsv(name, temporaryCsvArray)
    }
    fs.closeSync(fd)
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

        const data = duplicateBpsChecker(tmpArray, d)

        // push data to array
        tmpArray.push(`${parent != "0" ? `${parent},` : ""}${data.kode_bps},"${data.nama_bps}",${data.kode_dagri},"${data.nama_dagri}"`)
        await delay(100)
    }
    const header = `${parent != "0" ? "parent_id," : ""}kode_bps,nama_bps,kode_dagri,nama_dagri`
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

    const lastPeriode = listPeriode[listPeriode.length - 1]
    console.log("last periode", lastPeriode)

    await collectData(levelTree, "0", lastPeriode.kode)

    await orderCsv()
    console.log("done")

    // multibarProgress.stop()

    // for (const csv of tmpCsvArr) {
    //     await writeCsv(`data/${csv.level_name}.csv`, csv.array)
    // }

}

start()