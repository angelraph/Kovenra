/**
 * Turn wallet, network and SDK errors into words a fan understands.
 * Our own messages (short, plain) pass through unchanged.
 */
export function friendlyError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).trim();
  const m = raw.toLowerCase();
  if (!raw) return fallback;
  if (/user rejected|user denied|rejected the request|request rejected|cancel/.test(m)) return "You cancelled. Nothing was charged.";
  if (/insufficient funds|exceeds balance|transfer amount exceeds|not enough/.test(m)) return "There isn't enough USD₮ in your wallet. Add some in MiniPay and try again.";
  if (/failed to fetch|networkerror|network error|load failed|timeout|timed out|econn|503|502|504/.test(m))
    return "The connection dropped or the site is busy. Check your internet and try again.";
  if (/chain|network.*(mismatch|switch)|unsupported chain|wrong network/.test(m)) return "Switch your wallet to the Celo network and try again.";
  if (/did not complete within|registration did not complete/.test(m)) return "Self didn't confirm in time. Open the Self app to check it finished, then try again.";
  // Long or technical text (hex, stack traces, SDK internals) is not for fans.
  if (raw.length > 160 || /0x[0-9a-f]{8,}|\bat \w+ \(|error:|exception|undefined|null|json/i.test(raw)) return fallback;
  return raw;
}
