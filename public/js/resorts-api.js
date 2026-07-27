import { resorts, snowSnapshotMeta } from "./resorts-data.js";

const CONTINENT_COLORS = {
  "North America": "#86dcff",
  Europe: "#90f0c2",
  Asia: "#f9d98d",
  "South America": "#ff9c7a",
  Oceania: "#b3a1ff",
  Africa: "#ffd876",
  "Middle East": "#ffb8d2"
};

const PASS_COLORS = {
  ikon: "#7be1ff",
  epic: "#ff7e7e",
  both: "#c79bff",
  independent: "#d8f5ff"
};

export const getAllResorts = () => resorts;
export const getResortById = (id) => resorts.find((resort) => resort.id === id) || null;
export const getContinentColor = (continent) => CONTINENT_COLORS[continent] || "#7be1ff";
export const createDetailUrl = (id) => `./resort.html?id=${encodeURIComponent(id)}`;
export const getSnowSnapshotMeta = () => snowSnapshotMeta;

export function getPassKey(passes = []) {
  const normalized = [...new Set(passes)].sort();
  if (normalized.includes("epic") && normalized.includes("ikon")) return "both";
  if (normalized.includes("epic")) return "epic";
  if (normalized.includes("ikon")) return "ikon";
  return "independent";
}

export function getPassColor(passes = []) {
  return PASS_COLORS[getPassKey(passes)];
}

export function formatPassAccess(passes = []) {
  const key = getPassKey(passes);
  if (key === "both") return "Ikon + Epic";
  if (key === "ikon") return "Ikon";
  if (key === "epic") return "Epic";
  return "Independent";
}

export function getSummaryStats() {
  return getSummaryStatsForResorts(resorts);
}

export function getSummaryStatsForResorts(items) {
  return {
    totalResorts: items.length,
    totalCountries: new Set(items.map((resort) => resort.country)).size,
    totalContinents: new Set(items.map((resort) => resort.continent)).size,
    latestUpdate: items.map((resort) => resort.snow.lastUpdated).sort().at(-1) || snowSnapshotMeta.generatedAt
  };
}

export function filterResortsByPass(items, passFilter = "all") {
  if (passFilter === "all") return items;
  return items.filter((resort) => getPassKey(resort.passes) === passFilter);
}

export function getFeaturedResorts(limit = 6, items = resorts) {
  return [...items]
    .sort((a, b) => (b.snow.currentDepthSummit ?? 0) - (a.snow.currentDepthSummit ?? 0))
    .slice(0, limit);
}

export function searchResorts(query, limit = 7, items = resorts) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getFeaturedResorts(limit, items);

  return items
    .filter((resort) =>
      [resort.name, resort.country, resort.region, resort.continent]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
    .slice(0, limit);
}

export function formatSnowDepth(value) {
  return value == null ? "Not available yet" : `${value} cm`;
}

export function formatAnnualSnowfall(value) {
  if (value == null) return "Not available yet";
  const inches = Math.round(value / 2.54);
  return `${value.toLocaleString()} cm / ${inches.toLocaleString()} in`;
}

export function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
