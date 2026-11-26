import { env } from "@/lib/env";
import { skillMarkdown } from "@/lib/skill";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(skillMarkdown(env.baseUrl, env.agentId), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
}
