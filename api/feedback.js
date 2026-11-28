const crypto = require("node:crypto");
const store = require("./_store");

const KINDS = new Set(["problem", "idea", "other"]);
const SOURCES = new Set(["app", "web"]);
const AREAS = new Set(["joining", "sending", "chat", "folders", "install", "other"]);
const FREQUENCIES = new Set(["always", "sometimes", "once"]);
const TAGS = new Set(["wont-connect", "slow", "froze", "failed", "confusing", "looks-wrong"]);
const PLATFORMS = new Set(["ios", "android", "desktop", "other"]);
const OS = new Set(["darwin", "win32", "linux"]);
const KEEP = 1000; // newest feedback kept
const PER_INSTALL_PER_DAY = 10;
const PER_MINUTE = 20; // across everyone, a ceiling against floods

/**
 * Feedback sent by someone on purpose: from the app's Settings (relayed by the host computer, so phones without
 * internet can still send) or from the website's form. Only what the person chose or typed is stored, with the app version
 * and kind of device. No address is read or kept.
 */
module.exports = async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).end();
  if (!store.configured) return response.status(503).json({ message: "Feedback is not available right now" });
  const body = request.body && typeof request.body === "object" ? request.body : {};
  // A hidden field only bots fill in: pretend it worked.
  if (body.website) return response.status(204).end();

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const tags = Array.isArray(body.tags) ? [...new Set(body.tags.filter((t) => TAGS.has(t)))] : [];
  if (!KINDS.has(body.kind) || message.length > 2000 || (message.length < 3 && tags.length === 0)) return response.status(400).json({ message: "Tick what happened or write a few words" });
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return response.status(400).json({ message: "That email does not look right" });
  // Only the five details the person was shown, each a short string.
  const device = {};
  if (body.device && typeof body.device === "object") {
    for (const key of ["device", "os", "browser", "screen", "language"]) {
      const value = body.device[key];
      if (typeof value === "string" && value.trim()) device[key] = value.trim().slice(0, 40);
    }
  }
  const source = SOURCES.has(body.source) ? body.source : "web";
  const install = typeof body.install === "string" && /^[0-9a-f-]{16,64}$/i.test(body.install) ? body.install : undefined;

  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const minute = Math.floor(now / 60_000);
  try {
    const [perMinute, perInstall] = await store.run([
      ["INCR", `fb:rate:${minute}`],
      install ? ["INCR", `fb:inst:${day}:${install}`] : ["GET", "fb:none"],
    ]);
    await store.run([["EXPIRE", `fb:rate:${minute}`, 120], ...(install ? [["EXPIRE", `fb:inst:${day}:${install}`, 90_000]] : [])]);
    if (perMinute > PER_MINUTE || (install && perInstall > PER_INSTALL_PER_DAY)) return response.status(429).json({ message: "Too many messages, try again later" });

    const item = {
      id: crypto.randomUUID(),
      at: now,
      kind: body.kind,
      ...(message ? { message } : {}),
      ...(AREAS.has(body.area) ? { area: body.area } : {}),
      ...(FREQUENCIES.has(body.frequency) ? { frequency: body.frequency } : {}),
      ...(tags.length ? { tags } : {}),
      ...(Object.keys(device).length ? { device } : {}),
      ...(email ? { email } : {}),
      source,
      ...(PLATFORMS.has(body.platform) ? { platform: body.platform } : {}),
      ...(typeof body.version === "string" && /^\d{1,3}\.\d{1,3}\.\d{1,5}$/.test(body.version) ? { version: body.version } : {}),
      ...(OS.has(body.os) ? { os: body.os } : {}),
    };
    await store.run([["LPUSH", "fb:items", JSON.stringify(item)], ["LTRIM", "fb:items", 0, KEEP - 1]]);
    return response.status(204).end();
  } catch {
    return response.status(500).json({ message: "Could not save that, try again" });
  }
};
