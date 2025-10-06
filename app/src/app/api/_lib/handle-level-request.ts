import { NextRequest, NextResponse } from "next/server"

import { fetchLevel, LevelKey, RegionError } from "./region-service"

const normalize = (value: string | null) => value?.trim() ?? ""

export const handleLevelRequest = async (req: NextRequest, level: LevelKey) => {
    const url = new URL(req.url)
    const bpsId = normalize(url.searchParams.get("bps_id"))
    const dagriId = normalize(url.searchParams.get("dagri_id"))

    try {
        if (level === "provinsi" && (bpsId || dagriId)) {
            throw new RegionError("Provinsi level does not accept parent identifiers.", 400)
        }

        const payload = await fetchLevel(level, {
            parentBpsId: bpsId || undefined,
            parentDagriId: dagriId || undefined
        })
        return NextResponse.json(payload, { status: 200 })
    } catch (error) {
        if (error instanceof RegionError) {
            return NextResponse.json(
                {
                    parent: null,
                    message: error.message,
                    data: []
                },
                { status: error.status }
            )
        }

        console.error(`Unexpected error while handling ${level} request`, error)
        return NextResponse.json(
            {
                parent: null,
                message: "Internal server error",
                data: []
            },
            { status: 500 }
        )
    }
}
