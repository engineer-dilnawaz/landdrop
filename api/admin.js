const crypto = require("node:crypto");
const store = require("./_store");

const safeEqual = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

/** The owner's dashboard data. Needs `Authorization: Bearer <ADMIN_TOKEN>`. */
module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  const token = process.env.ADMIN_TOKEN;
  const given = String(request.headers.authorization || "").replace(/^Bearer /, "");
  if (!token || !safeEqual(given, token)) return response.status(401).json({ message: "Unauthorised" });
  if (!store.configured) return response.status(200).json({ configured: false });

  try {
    const days = store.days(30);
    const [daily, sums, sets] = await Promise.all([
      store.run(days.map((d) => ["PFCOUNT", `act:${d}`])),
      store.run(days.flatMap((d) => ["installs", "guests", "messages", "files"].map((k) => ["GET", `sum:${d}:${k}`]))),
      store.run([["SMEMBERS", "set:os"], ["SMEMBERS", "set:v"], ["SMEMBERS", "set:c"]]),
    ]);
    const [oses, versions, countries] = sets;
    const platformKeys = ["ios", "android", "desktop", "other"];
    const platformSums = await store.run(days.flatMap((d) => platformKeys.map((k) => ["GET", `sum:${d}:p:${k}`])));
    const guestsByPlatform = Object.fromEntries(
      platformKeys.map((k, i) => [k, days.reduce((n, _, j) => n + Number(platformSums[j * platformKeys.length + i] || 0), 0)]),
    );
    const breakdown = async (prefix, names) => {
      const results = await store.run(names.map((n) => ["PFCOUNT", ...days.map((d) => `act:${d}:${prefix}:${n}`)]));
      return Object.fromEntries(names.map((n, i) => [n, results[i]]).sort((a, b) => b[1] - a[1]));
    };
    const [active7, active30, byOs, byVersion, byCountry, downloads] = await Promise.all([
      store.run([["PFCOUNT", ...days.slice(0, 7).map((d) => `act:${d}`)]]).then((r) => r[0]),
      store.run([["PFCOUNT", ...days.map((d) => `act:${d}`)]]).then((r) => r[0]),
      breakdown("os", oses),
      breakdown("v", versions),
      breakdown("c", countries),
      store.downloads().catch(() => undefined),
    ]);
    const series = days
      .map((day, i) => ({
        day,
        active: daily[i],
        installs: Number(sums[i * 4] || 0),
        guests: Number(sums[i * 4 + 1] || 0),
        messages: Number(sums[i * 4 + 2] || 0),
        files: Number(sums[i * 4 + 3] || 0),
      }))
      .reverse();
    const feedback = (await store.run([["LRANGE", "fb:items", 0, 99]]))[0]
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);
    return response.status(200).json({ configured: true, active7, active30, series, byOs, byVersion, byCountry, guestsByPlatform, downloads, feedback });
  } catch (err) {
    return response.status(500).json({ message: String(err.message || err) });
  }
};
