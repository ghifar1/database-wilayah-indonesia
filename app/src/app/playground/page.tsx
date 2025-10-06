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
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* JSON-LD Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebApplication",
                        name: "Database Wilayah Indonesia API Playground",
                        description: "Interactive API playground for Indonesian regional administrative data",
                        applicationCategory: "DeveloperApplication",
                        operatingSystem: "Web",
                        offers: {
                            "@type": "Offer",
                            price: "0",
                            priceCurrency: "IDR"
                        }
                    })
                }}
            />

            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Header Section */}
                <header className="mb-12 text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Interactive API Testing</span>
                    </div>
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                        Wilayah Indonesia
                        <span className="block text-blue-600">API Playground</span>
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-600">
                        Explore comprehensive Indonesian regional administrative data. Test endpoints for Provinsi, Kabupaten/Kota, Kecamatan, and Kelurahan/Desa with real-time responses.
                    </p>
                </header>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Form Section */}
                    <section className="lg:col-span-2">
                        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-900">Configure Request</h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    Select an administrative level and provide parent identifiers when required
                                </p>
                            </div>

                            <form className="space-y-6 p-6" onSubmit={handleSubmit}>
                                <div className="space-y-2">
                                    <label htmlFor="level-select" className="block text-sm font-semibold text-slate-700">
                                        Administrative Level
                                    </label>
                                    <select
                                        id="level-select"
                                        aria-label="Select administrative level"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                        value={level}
                                        onChange={handleLevelChange}
                                    >
                                        {levelOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="flex items-start gap-2 text-xs text-slate-500">
                                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{selectedOption.description}</span>
                                    </p>
                                </div>

                                {selectedOption.requiresParent && (
                                    <div className="grid gap-6 rounded-lg border border-blue-100 bg-blue-50/50 p-6 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <label htmlFor="bps-input" className="block text-sm font-semibold text-slate-700">
                                                Parent BPS Code
                                            </label>
                                            <input
                                                id="bps-input"
                                                type="text"
                                                aria-label="Parent BPS identifier"
                                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                                placeholder="e.g. 32"
                                                value={bpsIdentifier}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) => setBpsIdentifier(event.target.value)}
                                            />
                                            <p className="text-xs text-slate-600">
                                                Numeric kode_bps. Leave empty if using Dagri code.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="dagri-input" className="block text-sm font-semibold text-slate-700">
                                                Parent Dagri Code
                                            </label>
                                            <input
                                                id="dagri-input"
                                                type="text"
                                                aria-label="Parent Dagri identifier"
                                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                                placeholder="e.g. 32.01"
                                                value={dagriIdentifier}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) => setDagriIdentifier(event.target.value)}
                                            />
                                            <p className="text-xs text-slate-600">
                                                Dot-separated kode_dagri. Leave empty if using BPS code.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
                                    aria-label={loading ? "Loading request" : "Send API request"}
                                >
                                    <span className="relative flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Querying API...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="h-5 w-5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                <span>Send Request</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>

                            {error && (
                                <div className="mx-6 mb-6 animate-in fade-in slide-in-from-top-2 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
                                    <div className="flex items-start gap-3">
                                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-red-800">Error</h3>
                                            <p className="mt-1 text-sm text-red-700">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </article>
                    </section>

                    {/* Info Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Quick Guide
                                </h3>
                                <ul className="space-y-3 text-sm text-slate-600">
                                    <li className="flex items-start gap-2">
                                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span><strong className="text-slate-900">Provinsi</strong> requires no parent identifier</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Lower levels need <strong className="text-slate-900">either</strong> BPS or Dagri code</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Use only <strong className="text-slate-900">one</strong> identifier type per request</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Data sourced from official <strong className="text-slate-900">BPS</strong></span>
                                    </li>
                                </ul>
                            </article>

                            <article className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-lg">
                                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-900">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    Need Help?
                                </h3>
                                <p className="text-sm text-blue-800">
                                    Visit our documentation or check the GitHub repository for API reference, examples, and integration guides.
                                </p>
                            </article>
                        </div>
                    </aside>
                </div>

                {/* Response Section */}
                {hasResult && (
                    <section className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                            <div className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">API Response</h2>
                                            <p className="text-sm text-slate-600">
                                                Endpoint: <code className="rounded bg-white px-2 py-0.5 text-xs font-mono text-blue-600">/api/{selectedOption.value}</code>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                        Success
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</div>
                                        <div className="mt-1 text-sm font-medium text-slate-900">{payload.message || "Success"}</div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent Region</div>
                                        <div className="mt-1 text-sm font-medium text-slate-900">
                                            {payload.parent ? (
                                                <span className="block truncate" title={payload.parent.name}>
                                                    {payload.parent.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">None (Top Level)</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Records</div>
                                        <div className="mt-1 text-2xl font-bold text-blue-600">{payload.data.length}</div>
                                    </div>
                                </div>

                                {payload.parent && (
                                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">Parent Details</h3>
                                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                                            <div>
                                                <span className="font-medium text-blue-900">Type:</span>{" "}
                                                <span className="text-blue-700">{payload.parent.type.toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-blue-900">ID:</span>{" "}
                                                <span className="font-mono text-blue-700">{payload.parent.parent_id}</span>
                                            </div>
                                            {payload.parent.postal_code && (
                                                <div>
                                                    <span className="font-medium text-blue-900">Postal Code:</span>{" "}
                                                    <span className="font-mono text-blue-700">{payload.parent.postal_code}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-hidden rounded-lg border border-slate-300">
                                    <div className="flex items-center justify-between border-b border-slate-300 bg-slate-800 px-4 py-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">JSON Response</span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(JSON.stringify(payload, null, 2))}
                                            className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-600"
                                            aria-label="Copy JSON to clipboard"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="max-h-96 overflow-auto bg-slate-950 p-4">
                                        <pre className="text-xs text-slate-100">
                                            <code>{JSON.stringify(payload, null, 2)}</code>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </section>
                )}

                {/* Footer */}
                <footer className="mt-16 border-t border-slate-200 pt-8">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                        <div className="flex flex-col gap-3 text-center text-sm text-slate-600 sm:flex-row sm:items-center sm:text-left">
                            <span>© {new Date().getFullYear()} Ghifari. All rights reserved.</span>
                            <span className="hidden sm:inline">•</span>
                            <a
                                className="inline-flex items-center gap-2 transition hover:text-slate-900"
                                href="https://bps.go.id"
                                rel="noopener noreferrer"
                                target="_blank"
                                aria-label="Visit Badan Pusat Statistik website"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Data © Badan Pusat Statistik</span>
                            </a>
                        </div>
                        <a
                            className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
                            href="https://github.com/ghifar1"
                            rel="noopener noreferrer"
                            target="_blank"
                            aria-label="Visit GitHub profile"
                        >
                            <svg
                                aria-hidden="true"
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577 0-.285-.011-1.04-.017-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.334-1.758-1.334-1.758-1.09-.746.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.833 2.807 1.303 3.492.996.108-.776.418-1.304.762-1.603-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.019.005 2.047.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.921.43.371.823 1.102.823 2.222 0 1.606-.015 2.902-.015 3.297 0 .32.192.694.8.576C20.565 21.796 24 17.3 24 12 24 5.37 18.627 0 12 0Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="font-medium">github.com/ghifar1</span>
                        </a>
                    </div>
                </footer>
            </div>
        </main>
    )
}

export default PlaygroundPage
