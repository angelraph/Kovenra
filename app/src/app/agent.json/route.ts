import { kovenraAgentDocument } from "@/lib/agentCard";
import { findAgentId } from "@/lib/erc8004";

export const dynamic = "force-dynamic";

export async function GET() {
  const id = await findAgentId().catch(() => null);
  return Response.json(kovenraAgentDocument(undefined, id), {
    headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
}
