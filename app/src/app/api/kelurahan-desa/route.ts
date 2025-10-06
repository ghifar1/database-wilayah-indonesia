import type { NextRequest } from "next/server"

import { handleLevelRequest } from "../_lib/handle-level-request"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export const GET = async (req: NextRequest) => handleLevelRequest(req, "kelurahan-desa")
