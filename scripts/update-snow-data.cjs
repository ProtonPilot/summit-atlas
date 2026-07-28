const fs = require("fs");
const path = require("path");
const { loadResortDirectory } = require("./lib/load-resort-directory.cjs");
const { writeSnowModule } = require("./lib/write-snow-module.cjs");

const templatePath = path.resolve(__dirname, "..", "data", "snow-template.json");
const overridesPath = path.resolve(__dirname, "..", "data", "current-snow-overrides.json");
const forecastUrl = "https://api.open-meteo.com/v1/forecast";
const FORECAST_BATCH_SIZE = 120;
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
const resorts = loadResortDirectory();

function buildLocations() {
  return resorts.flatMap((resort) => [
    {
      resortId: resort.id,
      layer: "base",
      lat: resort.lat,
      lng: resort.lng,
      elevation: null
    },
    {
      resortId: resort.id,
      layer: "summit",
      lat: resort.lat,
      lng: resort.lng,
      elevation: resort.elevationMeters
    }
  ]);
}

function buildForecastRequest(locations) {
  const params = new URLSearchParams();
  params.set("latitude", locations.map((location) => location.lat).join(","));
  params.set("longitude", locations.map((location) => location.lng).join(","));
  params.set(
    "elevation",
    locations.map((location) => (location.elevation == null ? "nan" : location.elevation)).join(",")
  );
  params.set("hourly", "snow_depth");
  params.set("forecast_hours", "1");
  params.set("cell_selection", "land");

  return `${forecastUrl}?${params.toString()}`;
}

async function fetchForecasts(locations) {
  const allForecasts = [];

  for (let index = 0; index < locations.length; index += FORECAST_BATCH_SIZE) {
    const batch = locations.slice(index, index + FORECAST_BATCH_SIZE);
    const response = await fetch(buildForecastRequest(batch), {
      headers: {
        "User-Agent": "SummitAtlasSnowUpdater/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with ${response.status}`);
    }

    const payload = await response.json();
    const forecasts = Array.isArray(payload) ? payload : [payload];
    allForecasts.push(...forecasts);
  }

  return allForecasts;
}

function toCentimeters(valueInMeters) {
  if (valueInMeters == null || Number.isNaN(valueInMeters)) return null;
  return Math.round(valueInMeters * 100);
}

function mergeSnowSnapshot(locations, forecasts) {
  const nextResorts = { ...template.resorts };
  const today = new Date().toISOString().slice(0, 10);

  locations.forEach((location, index) => {
    const forecast = forecasts[index];
    const currentDepth = toCentimeters(forecast?.hourly?.snow_depth?.[0] ?? null);
    const existing = nextResorts[location.resortId] || {};

    if (location.layer === "base") {
      nextResorts[location.resortId] = {
        ...existing,
        currentDepthBase: currentDepth ?? existing.currentDepthBase ?? null,
        currentDepthSummit: existing.currentDepthSummit ?? null,
        highestHistoricalMonth: existing.highestHistoricalMonth || "Not available yet",
        lastUpdated: today
      };
      return;
    }

    nextResorts[location.resortId] = {
      ...existing,
      currentDepthBase: existing.currentDepthBase ?? null,
      currentDepthSummit: currentDepth ?? existing.currentDepthSummit ?? null,
      highestHistoricalMonth: existing.highestHistoricalMonth || "Not available yet",
      lastUpdated: today
    };
  });

  return nextResorts;
}

function applyCurrentSnowOverrides(records) {
  const nextRecords = { ...records };

  Object.entries(overrides).forEach(([resortId, override]) => {
    const existing = nextRecords[resortId] || {};
    nextRecords[resortId] = {
      ...existing,
      computedCurrentDepthBase: existing.currentDepthBase ?? null,
      computedCurrentDepthSummit: existing.currentDepthSummit ?? null,
      manualCurrentDepthBase: override.manualCurrentDepthBase ?? null,
      manualCurrentDepthSummit: Object.prototype.hasOwnProperty.call(override, "manualCurrentDepthSummit")
        ? override.manualCurrentDepthSummit
        : null,
      currentDepthBase: override.manualCurrentDepthBase ?? existing.currentDepthBase ?? null,
      currentDepthSummit: Object.prototype.hasOwnProperty.call(override, "manualCurrentDepthSummit")
        ? override.manualCurrentDepthSummit
        : existing.currentDepthSummit ?? null,
      currentSnowSource: override.currentSnowSource || existing.currentSnowSource || "Manual override"
    };
  });

  return nextRecords;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const forceRefresh = process.argv.includes("--force");

  if (!forceRefresh && template.generatedAt === today) {
    console.log(`Snow data is already current for ${today}; skipping API requests.`);
    return;
  }

  const locations = buildLocations();
  const forecasts = await fetchForecasts(locations);

  if (forecasts.length !== locations.length) {
    throw new Error(`Expected ${locations.length} forecast entries but received ${forecasts.length}`);
  }

  const nextPayload = {
    ...template,
    generatedAt: today,
    provider: "Open-Meteo Forecast API (coordinate-based snow depth)",
    resorts: applyCurrentSnowOverrides(mergeSnowSnapshot(locations, forecasts))
  };

  fs.writeFileSync(templatePath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");
  writeSnowModule(nextPayload);

  console.log(`Updated snow data for ${resorts.length} resorts`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
