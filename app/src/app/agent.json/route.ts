import { kovenraAgentDocument } from "@/lib/agentCard";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(kovenraAgentDocument(), {
    headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
}
