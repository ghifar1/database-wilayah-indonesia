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
            <footer className="mx-auto mt-auto w-full max-w-3xl border-t border-slate-200 pt-6 text-xs text-slate-500 sm:text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1 text-slate-600 sm:flex-row sm:items-center sm:gap-3">
                        <span>© {new Date().getFullYear()} Ghifari. All rights reserved.</span>
                        <a
                            className="transition hover:text-slate-900"
                            href="https://bps.go.id"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Data source © Badan Pusat Statistik (bps.go.id)
                        </a>
                    </div>
                    <a
                        className="inline-flex items-center gap-2 text-slate-600 transition hover:text-slate-900"
                        href="https://github.com/ghifar1"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <svg
                            aria-hidden
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577 0-.285-.011-1.04-.017-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.334-1.758-1.334-1.758-1.09-.746.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.833 2.807 1.303 3.492.996.108-.776.418-1.304.762-1.603-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.019.005 2.047.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.921.43.371.823 1.102.823 2.222 0 1.606-.015 2.902-.015 3.297 0 .32.192.694.8.576C20.565 21.796 24 17.3 24 12 24 5.37 18.627 0 12 0Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>github.com/ghifar1</span>
                    </a>
                </div>
            </footer>
        </main>
    )
}

export default PlaygroundPage
