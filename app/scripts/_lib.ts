/* Small helpers shared by the Kovenra scripts. Nothing here talks to the network. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

export const ROOT = join(__dirname, "..");
export const AGENT_DIR = join(ROOT, ".agent");

/** Load app/.env.local (then .env) into process.env without overriding values already set. */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const v = m[2].replace(/^["']|["']$/g, "");
      if (v && process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

export interface SavedAgent { name: string; agentId: number; agentAddress: string; privateKey: string; registeredAt: string }

export function agentPath(name: string) {
  return join(AGENT_DIR, `${name}.json`);
}

export function readAgent(name: string): SavedAgent | null {
  const p = agentPath(name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as SavedAgent) : null;
}

export function saveAgent(a: SavedAgent) {
  mkdirSync(AGENT_DIR, { recursive: true });
  writeFileSync(agentPath(a.name), JSON.stringify(a, null, 2), { mode: 0o600 });
}

export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} Type yes to continue: `)).trim().toLowerCase();
  rl.close();
  return answer === "yes" || answer === "y";
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "true";
}

export const say = (s = "") => console.log(s);
export const ok = (s: string) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
export const bad = (s: string) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
export const note = (s: string) => console.log(`  \x1b[33m•\x1b[0m ${s}`);
