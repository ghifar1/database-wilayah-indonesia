import type { MetadataRoute } from "next"

import { SITE_URL } from "./seo.config"

const routes = ["/", "/playground", "/api/provinsi", "/api/kabupaten-kota", "/api/kecamatan", "/api/kelurahan-desa"]

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date().toISOString()
    return routes.map((route) => ({
        url: `${SITE_URL}${route === "/" ? "" : route}`,
        lastModified
    }))
}
