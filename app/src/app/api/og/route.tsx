import { ImageResponse } from "next/og"

import { SITE_DESCRIPTION, SITE_NAME } from "../../seo.config"

export const runtime = "edge"

const WIDTH = 1200
const HEIGHT = 630

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
                    color: "#f8fafc",
                    padding: "64px",
                    fontFamily: "Geist, 'Inter', 'Segoe UI', sans-serif"
                }}
            >
                <div style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.2 }}>{SITE_NAME}</div>
                <div style={{ fontSize: 28, maxWidth: "900px", opacity: 0.85 }}>{SITE_DESCRIPTION}</div>
                <div
                    style={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 24,
                        opacity: 0.9
                    }}
                >
                    <span>Badan Pusat Statistik (BPS) • Indonesian Region Explorer</span>
                    <span>github.com/ghifar1</span>
                </div>
            </div>
        ),
        {
            width: WIDTH,
            height: HEIGHT
        }
    )
}
