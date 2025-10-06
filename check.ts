import * as fs from "fs"
import * as path from "path"

type RegionRecord = {
    kode_bps?: string
    nama_bps?: string
    kode_dagri?: string
    nama_dagri?: string
    kode_pos?: string
    parent_kode_bps?: string
    parent_kode_dagri?: string
}

type Anomaly = {
    file: string
    issues: Array<string>
    snapshot: Partial<RegionRecord>
}

const jsonRoot = path.resolve(process.cwd(), "json")

const collectJsonFiles = (dir: string): Array<string> => {
    if (!fs.existsSync(dir)) {
        return []
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: Array<string> = []
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            files.push(...collectJsonFiles(fullPath))
        } else if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(fullPath)
        }
    }
    return files
}

const isZeroLike = (value: string) => value.trim() === "0"

const inspectRecord = (record: RegionRecord): Array<string> => {
    const issues: Array<string> = []
    const checks: Array<{ key: keyof RegionRecord; allowMissing?: boolean }> = [
        { key: "kode_bps" },
        { key: "nama_bps" },
        { key: "kode_dagri" },
        { key: "nama_dagri" },
        { key: "kode_pos", allowMissing: true },
        { key: "parent_kode_bps", allowMissing: true },
        { key: "parent_kode_dagri", allowMissing: true }
    ]

    for (const { key, allowMissing } of checks) {
        const raw = record[key]
        if (raw === undefined) {
            if (!allowMissing) {
                issues.push(`${key} missing`)
            }
            continue
        }
        const value = raw.trim()
        if (!value.length) {
            issues.push(`${key} empty`)
        } else if (isZeroLike(value)) {
            issues.push(`${key} equals 0`)
        }
    }

    return issues
}

const summarizeAnomalies = (anomalies: Array<Anomaly>) => {
    if (!anomalies.length) {
        return "No anomalies detected in JSON outputs."
    }

    const header = "| File | Issues | Sample |\n| --- | --- | --- |"
    const rows = anomalies.map((anomaly) => {
        const relative = path.relative(process.cwd(), anomaly.file)
        const issues = anomaly.issues.join(", ")
        const snapshot = JSON.stringify(anomaly.snapshot)
        const safeSnapshot = snapshot
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ")
            .replace(/\r/g, " ")
        return `| ${relative} | ${issues} | ${safeSnapshot} |`
    })
    return [header, ...rows].join("\n")
}

const writeBrokenDataReport = (report: string) => {
    const brokenDataPath = path.resolve(process.cwd(), "broken_data.md")
    const timestamp = new Date().toISOString()
    const content = `# Broken Data Report\n\n_Last updated: ${timestamp}_\n\n${report}\n`
    fs.writeFileSync(brokenDataPath, content)
}

const ensureReadmePointer = () => {
    const readmePath = path.resolve(process.cwd(), "README.md")
    const markerStart = "<!-- anomaly-report:start -->"
    const markerEnd = "<!-- anomaly-report:end -->"
    const pointerText = `${markerStart}\n## Data Anomaly Report\n\nSee [broken_data.md](./broken_data.md) for the latest anomaly scan.\n${markerEnd}`

    let readme = ""
    if (fs.existsSync(readmePath)) {
        readme = fs.readFileSync(readmePath, "utf8")
    }

    if (!readme.trim().length) {
        readme = "# Database Wilayah Indonesia\n\n> Sumber data: Badan Pusat Statistik (BPS) Indonesia - sig.bps.go.id\n\n"
    }

    const startIndex = readme.indexOf(markerStart)
    const endIndex = readme.indexOf(markerEnd)

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const afterMarker = endIndex + markerEnd.length
        readme = `${readme.slice(0, startIndex)}${pointerText}${readme.slice(afterMarker)}`
    } else {
        if (!readme.endsWith("\n")) {
            readme += "\n"
        }
        readme += `\n${pointerText}\n`
    }

    fs.writeFileSync(readmePath, readme)
}

const main = () => {
    const jsonFiles = collectJsonFiles(jsonRoot)
    if (!jsonFiles.length) {
        console.log("No JSON files found under json/. Nothing to check.")
        writeBrokenDataReport("No anomalies detected in JSON outputs.")
        ensureReadmePointer()
        return
    }

    const anomalies: Array<Anomaly> = []

    for (const file of jsonFiles) {
        const raw = fs.readFileSync(file, "utf8")
        try {
            const parsed = JSON.parse(raw) as RegionRecord
            const issues = inspectRecord(parsed)
            if (issues.length) {
                anomalies.push({
                    file,
                    issues,
                    snapshot: parsed
                })
            }
        } catch (error) {
            anomalies.push({
                file,
                issues: ["invalid JSON"],
                snapshot: {}
            })
        }
    }

    const report = summarizeAnomalies(anomalies)
    writeBrokenDataReport(report)
    ensureReadmePointer()
    console.log(report)
}

main()
