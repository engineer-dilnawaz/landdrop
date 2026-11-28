const store = require("./_store");

// The numbers shown on the website appear only once they're worth showing. Both must be reached.
const MIN_DOWNLOADS = Number(process.env.STATS_MIN_DOWNLOADS || 250);
const MIN_ACTIVE = Number(process.env.STATS_MIN_ACTIVE || 25);

/** Public totals for the website. Until the thresholds are met it says only that there is nothing to show. */
module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  try {
    const [{ total }, counts] = await Promise.all([
      store.downloads(),
      store.configured
        ? store.run([["PFCOUNT", ...store.days(7).map((d) => `act:${d}`)], ["SMEMBERS", "set:c"]])
        : Promise.resolve([0, []]),
    ]);
    const [activeWeek, countryList] = counts;
    // "ZZ" stands for a country that couldn't be told.
    const countries = countryList.filter((c) => c !== "ZZ").length;
    if (total < MIN_DOWNLOADS || activeWeek < MIN_ACTIVE) return response.status(200).json({ show: false });
    return response.status(200).json({ show: true, downloads: total, activeWeek, countries });
  } catch {
    return response.status(200).json({ show: false });
  }
};
