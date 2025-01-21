import * as fs from "fs"
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

const getData = async (level: string, parent: string, periode_merge: string): Promise<Array<Wilayah>> => {
    const response = await fetch(`${apiPath}/rest-bridging/getwilayah?level=${level}&parent=${parent}&periode_merge=${periode_merge}`)
    if (!response.ok) {
        throw new Error("Failed to fetch data")
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
    if (fs.existsSync(name)) {
        // add newline to first element
        temporaryCsvArray.unshift("")
        const csv = temporaryCsvArray.join("\n")
        fs.appendFileSync(name, csv)
    } else {
        temporaryCsvArray.unshift(header)
        writeCsv(name, temporaryCsvArray)
    }
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
    clearOnComplete: false,
    hideCursor: true,
    format: "{bar} | {processname} - {percentage}% | {value}/{total} | ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    linewrap: true
})

const tmpCsvArr: Array<{
    level_name: string
    array: Array<string>
}> = []

const collectData = async (level: LevelTree, parent: string, periode_merge: string) => {
    // let levelIndex = tmpCsvArr.findIndex((x) => x.level_name === level.level_name)
    // if (levelIndex === -1) {
    //     tmpCsvArr.push({ level_name: level.level_name, array: [] })
    //     levelIndex = tmpCsvArr.length - 1
    // }
    const tmpArray: Array<string> = []

    const data = await getData(level.level_name, parent, periode_merge)
    const bar = multibarProgress.create(data.length, 0, { processname: `${level.level_name}` })

    for (const d of data) {
        bar.increment(1, {
            processname: `${level.level_name} ${d.nama_bps}`
        })
        if (level.children) {
            await collectData(level.children, d.kode_bps, periode_merge)
        }

        // check level exist in array


        // push data to array
        tmpArray.push(`${parent != "0" ? `${parent},` : ""}${d.kode_bps},${d.nama_bps},${d.kode_dagri},${d.nama_dagri}`)
        // await delay(10)
    }
    const header = `${parent != "0" ? "parent_id," : ""}kode_bps,nama_bps,kode_dagri,nama_dagri`
    writeOrAppendCsv(`data/${level.level_name}.csv`, tmpArray, header)

    bar.stop()
    multibarProgress.remove(bar)
}

const start = async () => {
    const listPeriode = await getPeriode()
    console.log("list periode", listPeriode)

    const lastPeriode = listPeriode[listPeriode.length - 1]
    console.log("last periode", lastPeriode)

    await collectData(levelTree, "0", lastPeriode.kode)

    // for (const csv of tmpCsvArr) {
    //     await writeCsv(`data/${csv.level_name}.csv`, csv.array)
    // }

}

start()