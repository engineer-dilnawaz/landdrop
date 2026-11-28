// Tiny Redis client for Upstash's REST API, so these functions need no packages. It only counts: no log of
// pings is kept, and the install id goes into a HyperLogLog, which keeps a count and cannot give the ids back.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

exports.configured = Boolean(URL_ && TOKEN);

/** Runs commands in one round trip. Returns each command's result, in order. */
exports.run = async function run(commands) {
  // Nothing to ask (for example no countries recorded yet): Redis refuses an empty batch, so skip the trip.
  if (commands.length === 0) return [];
  const response = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`Store answered ${response.status}`);
  return (await response.json()).map((entry) => {
    if (entry.error) throw new Error(entry.error);
    return entry.result;
  });
};

/** The last `n` days as YYYY-MM-DD (UTC), newest first. */
exports.days = function days(n, from = new Date()) {
  return Array.from({ length: n }, (_, i) => new Date(from.getTime() - i * 86_400_000).toISOString().slice(0, 10));
};

const REPO = "engineer-dilnawaz/landrop";

/** Installer downloads from GitHub's release counts: { total, byAsset, byRelease }. Cached by the caller. */
exports.downloads = async function downloads() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "landrop-stats" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers });
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  const byAsset = {};
  const byRelease = {};
  let total = 0;
  for (const release of await response.json()) {
    for (const asset of release.assets) {
      if (!/\.(dmg|exe)$/.test(asset.name)) continue;
      total += asset.download_count;
      byAsset[asset.name] = (byAsset[asset.name] || 0) + asset.download_count;
      byRelease[release.tag_name] = (byRelease[release.tag_name] || 0) + asset.download_count;
    }
  }
  return { total, byAsset, byRelease };
};
