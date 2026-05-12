const fs = require("fs");
const path = require("path");
const { loadResortDirectory } = require("./lib/load-resort-directory.cjs");
const { writeSnowModule } = require("./lib/write-snow-module.cjs");

const templatePath = path.resolve(__dirname, "..", "data", "snow-template.json");
const overridesPath = path.resolve(__dirname, "..", "data", "historical-month-overrides.json");
const archiveUrl = "https://archive-api.open-meteo.com/v1/archive";
const resorts = loadResortDirectory();
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));

const DEFAULT_START_YEAR = 2016;
const DEFAULT_END_YEAR = 2025;
const DEFAULT_PREVIOUS_YEAR = 2025;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function buildArchiveRequest() {
  const params = new URLSearchParams();
  params.set("latitude", resorts.map((resort) => resort.lat).join(","));
  params.set("longitude", resorts.map((resort) => resort.lng).join(","));
  params.set("elevation", resorts.map((resort) => resort.elevationMeters ?? "nan").join(","));
  params.set("daily", "snowfall_sum");
  params.set("timezone", "GMT");
  params.set("start_date", `${DEFAULT_START_YEAR}-01-01`);
  params.set("end_date", `${DEFAULT_END_YEAR}-12-31`);
  params.set("cell_selection", "land");
  return `${archiveUrl}?${params.toString()}`;
}

async function fetchHistoricalArchive() {
  const response = await fetch(buildArchiveRequest(), {
    headers: {
      "User-Agent": "SummitAtlasHistoricalUpdater/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo archive request failed with ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
}

function computeSnowiestMonth(record, existingMonth, allowedYears = null) {
  const dates = record?.daily?.time;
  const snowfall = record?.daily?.snowfall_sum;

  if (!Array.isArray(dates) || !Array.isArray(snowfall) || dates.length !== snowfall.length) {
    return existingMonth || "Not available yet";
  }

  const byMonth = new Map();

  dates.forEach((dateString, index) => {
    const snowfallValue = Number(snowfall[index] ?? 0);
    const monthIndex = Number(dateString.slice(5, 7)) - 1;
    const year = dateString.slice(0, 4);
    if (allowedYears && !allowedYears.has(year)) return;
    const bucket = byMonth.get(monthIndex) || { total: 0, years: new Set() };

    bucket.total += Number.isFinite(snowfallValue) ? snowfallValue : 0;
    bucket.years.add(year);
    byMonth.set(monthIndex, bucket);
  });

  const monthlyAverages = [...byMonth.entries()]
    .map(([monthIndex, bucket]) => ({
      monthIndex,
      averageSnowfall: bucket.years.size ? bucket.total / bucket.years.size : 0
    }));

  const ranked = [...monthlyAverages]
    .sort((left, right) => right.averageSnowfall - left.averageSnowfall);

  if (!ranked.length || ranked[0].averageSnowfall <= 0) {
    return existingMonth || "Not available yet";
  }

  return MONTH_NAMES[ranked[0].monthIndex];
}

async function main() {
  const archive = await fetchHistoricalArchive();

  if (archive.length !== resorts.length) {
    throw new Error(`Expected ${resorts.length} archive records but received ${archive.length}`);
  }

  const nextResorts = { ...template.resorts };

  resorts.forEach((resort, index) => {
    const existing = nextResorts[resort.id] || {};

    const computedHighestHistoricalMonth = computeSnowiestMonth(
      archive[index],
      existing.computedHighestHistoricalMonth || existing.highestHistoricalMonth
    );
    const previousYearSnowiestMonth = computeSnowiestMonth(
      archive[index],
      existing.previousYearSnowiestMonth || existing.highestHistoricalMonth,
      new Set([String(DEFAULT_PREVIOUS_YEAR)])
    );
    const manualHighestHistoricalMonth = overrides[resort.id] || existing.manualHighestHistoricalMonth || null;

    nextResorts[resort.id] = {
      ...existing,
      computedHighestHistoricalMonth,
      previousYearSnowiestMonth,
      manualHighestHistoricalMonth,
      highestHistoricalMonth: manualHighestHistoricalMonth || computedHighestHistoricalMonth || previousYearSnowiestMonth
    };
  });

  const nextPayload = {
    ...template,
    historicalMethod: "Open-Meteo Historical Weather API monthly snowfall averages at resort summit elevation",
    historyWindow: `${DEFAULT_START_YEAR}-${DEFAULT_END_YEAR} calendar-month snowfall averages`,
    previousYearWindow: `${DEFAULT_PREVIOUS_YEAR} calendar-year snowfall totals`,
    resorts: nextResorts
  };

  fs.writeFileSync(templatePath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");
  writeSnowModule(nextPayload);

  console.log(`Updated historical snowiest month for ${resorts.length} resorts`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
