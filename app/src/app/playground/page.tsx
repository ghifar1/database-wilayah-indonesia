"use client"

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react"

import type { LevelKey, LevelPayload } from "../api/_lib/region-service"

type LevelOption = {
    value: LevelKey
    label: string
    requiresParent: boolean
    description: string
}

const levelOptions: Array<LevelOption> = [
    {
        value: "provinsi",
        label: "Provinsi",
        requiresParent: false,
        description: "Top-level regions. No parent identifier required."
    },
    {
        value: "kabupaten-kota",
        label: "Kabupaten / Kota",
        requiresParent: true,
        description: "Requires parent provinsi code (kode_bps or kode_dagri)."
    },
    {
        value: "kecamatan",
        label: "Kecamatan",
        requiresParent: true,
        description: "Requires parent kabupaten / kota code (kode_bps or kode_dagri)."
    },
    {
        value: "kelurahan-desa",
        label: "Kelurahan / Desa",
        requiresParent: true,
        description: "Requires parent kecamatan code (kode_bps or kode_dagri)."
    }
]

const initialPayload: LevelPayload = {
    parent: null,
    message: "",
    data: []
}

const PlaygroundPage = () => {
    const [level, setLevel] = useState<LevelKey>("provinsi")
    const [bpsIdentifier, setBpsIdentifier] = useState("")
    const [dagriIdentifier, setDagriIdentifier] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [payload, setPayload] = useState<LevelPayload>(() => ({ ...initialPayload }))
    const [hasResult, setHasResult] = useState(false)

    const selectedOption = useMemo(
        () => levelOptions.find((option) => option.value === level) ?? levelOptions[0],
        [level]
    )

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const trimmedBpsId = bpsIdentifier.trim()
        const trimmedDagriId = dagriIdentifier.trim()

        if (selectedOption.requiresParent && !trimmedBpsId.length && !trimmedDagriId.length) {
            setError("Provide either a BPS parent identifier or a Dagri parent identifier.")
            setHasResult(false)
            return
        }

        if (selectedOption.requiresParent && trimmedBpsId.length && trimmedDagriId.length) {
            setError("Provide only one parent identifier: either BPS or Dagri, not both.")
            setHasResult(false)
            return
        }

        const params = new URLSearchParams()
        if (selectedOption.requiresParent) {
            if (trimmedBpsId.length) {
                params.set("bps_id", trimmedBpsId)
            } else if (trimmedDagriId.length) {
                params.set("dagri_id", trimmedDagriId)
            }
        }
        const query = params.toString()
        const endpoint = `/api/${selectedOption.value}${query ? `?${query}` : ""}`

        setLoading(true)
        setError(null)
        setHasResult(false)

        try {
            const response = await fetch(endpoint)
            const data = (await response.json()) as LevelPayload
            if (!response.ok) {
                setError(data.message || "Request failed")
                setPayload({ ...initialPayload })
                return
            }

            setPayload(data)
            setHasResult(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error")
            setPayload({ ...initialPayload })
        } finally {
            setLoading(false)
        }
    }

    const handleLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const newLevel = event.target.value as LevelKey
        setLevel(newLevel)
        setError(null)
        setHasResult(false)
        setPayload({ ...initialPayload })
        if (!levelOptions.find((option) => option.value === newLevel)?.requiresParent) {
            setBpsIdentifier("")
            setDagriIdentifier("")
        }
    }

    return (
        <main className="flex min-h-screen flex-col gap-12 bg-white px-6 py-10 text-slate-900">
            <section className="mx-auto w-full max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight">Wilayah API Playground</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Experiment with the region endpoints by choosing a level and (when required) a parent
                    identifier. You can provide either a BPS code or a Dagri code for the parent.
                </p>
            </section>

            <section className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-700">Level</span>
                        <select
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            value={level}
                            onChange={handleLevelChange}
                        >
                            {levelOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-500">{selectedOption.description}</span>
                    </label>

                    {selectedOption.requiresParent && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-slate-700">Parent BPS Identifier</span>
                                <input
                                    className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="e.g. 32"
                                    value={bpsIdentifier}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setBpsIdentifier(event.target.value)}
                                />
                                <span className="text-xs text-slate-500">
                                    Fill this field with a numeric kode_bps. Leave empty if querying by Dagri code instead.
                                </span>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-slate-700">Parent Dagri Identifier</span>
                                <input
                                    className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    placeholder="e.g. 32.01"
                                    value={dagriIdentifier}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setDagriIdentifier(event.target.value)}
                                />
                                <span className="text-xs text-slate-500">
                                    Fill this field with a dot-separated kode_dagri. Leave empty if querying by BPS code instead.
                                </span>
                            </label>
                        </div>
                    )}

                    <button
                        className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Querying..." : "Send Request"}
                    </button>
                </form>

                {error && (
                    <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </section>

            {hasResult && (
                <section className="mx-auto w-full max-w-3xl space-y-4">
                    <header>
                        <h2 className="text-xl font-semibold text-slate-800">Response</h2>
                        <p className="text-sm text-slate-500">Showing data for <code className="rounded bg-slate-100 px-1 text-xs">/api/{selectedOption.value}</code>.</p>
                    </header>

                    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="space-y-2 text-sm text-slate-700">
                            <div>
                                <span className="font-semibold text-slate-900">Message:</span> {payload.message || "Success"}
                            </div>
                            <div>
                                <span className="font-semibold text-slate-900">Parent:</span>{" "}
                                {payload.parent ? (
                                    <span>
                                        {payload.parent.name} ({payload.parent.type.toUpperCase()}:{" "}
                                        {payload.parent.parent_id}){payload.parent.postal_code ? ` • ${payload.parent.postal_code}` : ""}
                                    </span>
                                ) : (
                                    <span>None</span>
                                )}
                            </div>
                            <div>
                                <span className="font-semibold text-slate-900">Records:</span> {payload.data.length}
                            </div>
                        </div>

                        <div className="mt-4 overflow-auto rounded border border-slate-200 bg-slate-950 px-3 py-4 text-xs text-slate-100">
                            <pre className="whitespace-pre-wrap">
                                {JSON.stringify(payload, null, 2)}
                            </pre>
                        </div>
                    </article>
                </section>
            )}
        </main>
    )
}

export default PlaygroundPage
