import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "API Playground - Database Wilayah Indonesia",
    description: "Interactive API playground for exploring Indonesian regional data (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa). Test endpoints with BPS and Dagri identifiers in real-time.",
    keywords: ["Indonesia", "regional data", "API", "Provinsi", "Kabupaten", "Kota", "Kecamatan", "Kelurahan", "Desa", "BPS", "Dagri", "administrative regions"],
    authors: [{ name: "Ghifari" }],
    openGraph: {
        title: "API Playground - Database Wilayah Indonesia",
        description: "Interactive API playground for exploring Indonesian regional administrative data from BPS",
        type: "website",
        locale: "id_ID",
        siteName: "Database Wilayah Indonesia"
    },
    twitter: {
        card: "summary_large_image",
        title: "API Playground - Database Wilayah Indonesia",
        description: "Interactive API playground for exploring Indonesian regional administrative data"
    },
    robots: {
        index: true,
        follow: true
    }
}

export default function PlaygroundLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
