const store = require("./_store");

const OS = new Set(["darwin", "win32", "linux"]);
const ARCH = new Set(["arm64", "x64"]);
const clamp = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(Math.trunc(n), 100_000)) : 0);
const YEAR = 400 * 86_400;

/**
 * The anonymous usage ping from the desktop app. Only counts are stored: for each day, how many distinct installs
 * were active (overall, and by version, system and country) plus the day's totals for guests, messages and files.
 * The country comes from Vercel's request header; the address itself is never read or kept.
 */
module.exports = async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).end();
  if (!store.configured) return response.status(204).end();
  const body = request.body && typeof request.body === "object" ? request.body : {};
  const id = typeof body.id === "string" && /^[0-9a-f-]{16,64}$/i.test(body.id) ? body.id : undefined;
  const version = typeof body.version === "string" && /^\d{1,3}\.\d{1,3}\.\d{1,5}$/.test(body.version) ? body.version : undefined;
  if (!id || !version || !OS.has(body.os) || !ARCH.has(body.arch)) return response.status(400).end();
  const country = /^[A-Z]{2}$/.test(String(request.headers["x-vercel-ip-country"])) ? request.headers["x-vercel-ip-country"] : "ZZ";
  const day = new Date().toISOString().slice(0, 10);

  try {
    const key = (suffix = "") => `act:${day}${suffix}`;
    const [fresh] = await store.run([
      ["PFADD", key(), id],
      ["PFADD", key(`:os:${body.os}-${body.arch}`), id],
      ["PFADD", key(`:v:${version}`), id],
      ["PFADD", key(`:c:${country}`), id],
      ["SADD", "set:os", `${body.os}-${body.arch}`],
      ["SADD", "set:v", version],
      ["SADD", "set:c", country],
      ...[key(), key(`:os:${body.os}-${body.arch}`), key(`:v:${version}`), key(`:c:${country}`)].map((k) => ["EXPIRE", k, YEAR]),
    ]);
    // Count a day's totals once per install: PFADD answers 1 only the first time it sees an id that day.
    if (fresh === 1) {
      await store.run([
        ["INCR", `sum:${day}:installs`],
        ["INCRBY", `sum:${day}:guests`, clamp(body.guests)],
        ["INCRBY", `sum:${day}:messages`, clamp(body.messages)],
        ["INCRBY", `sum:${day}:files`, clamp(body.files)],
        ...["installs", "guests", "messages", "files"].map((k) => ["EXPIRE", `sum:${day}:${k}`, YEAR]),
      ]);
    }
    return response.status(204).end();
  } catch {
    return response.status(204).end();
  }
};
