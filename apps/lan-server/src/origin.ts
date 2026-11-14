/**
 * Browser requests must come from a page served on the local network.
 * This stops a public website visited by someone on the LAN (including via
 * DNS rebinding, where the Origin keeps the attacker's hostname) from
 * joining as a device or calling the API. Non-browser clients send no
 * Origin and are allowed; they still need a session token.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (origin === undefined) return true;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (hostname === "localhost" || hostname === "[::1]" || hostname.endsWith(".local")) {
    return true;
  }
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
    return false;
  }
  const [a, b] = octets;
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}
