export function eventDate(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

export function naira(units: string | bigint): string {
  const v = typeof units === "bigint" ? units : BigInt(units || "0");
  const n = Number(v / 10_000n) / 100;
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function usd(units: string | bigint): string {
  const v = typeof units === "bigint" ? units : BigInt(units || "0");
  return "$" + (Number(v / 10_000n) / 100).toFixed(2);
}

export const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
export const celoscanTx = (h: string) => `https://celoscan.io/tx/${h}`;
