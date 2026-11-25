import { after } from "next/server";
import { handle } from "hono/vercel";
import { buildApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Settlement (Textile conversion + payout to the organizer) runs after the
// response is sent, so the buyer gets their ticket in ~3 seconds.
const app = buildApi((job) => after(() => job().catch((e) => console.error("settle", e))));

export const GET = handle(app);
export const POST = handle(app);
