import { resortDirectory } from "./resort-directory.js";
import { annualSnowfallOverrides } from "./annual-snowfall-overrides.js";
import { snowSnapshot, snowSnapshotMeta } from "./snow-data.js";

const DEFAULT_SNOW = {
  currentDepthBase: null,
  currentDepthSummit: null,
  averageAnnualSnowfall: null,
  averageAnnualSnowfallInches: null,
  averageAnnualSnowfallSource: null,
  highestHistoricalMonth: "Not available yet",
  lastUpdated: snowSnapshotMeta.generatedAt,
  currentSnowSource: snowSnapshotMeta.provider
};

const galleryLinks = (name, official, snowReport, instagram) => {
  const tag = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
  return [
    { title: "Official gallery", caption: `Mountain-published visuals from ${name}.`, href: official, mark: "01" },
    { title: "Recent social feed", caption: `Open recent photos and reels for ${name}.`, href: instagram ? `https://www.instagram.com/${instagram.replace(/^@/, "")}/` : `https://www.instagram.com/explore/tags/${tag}/`, mark: "02" },
    { title: "Snow report imagery", caption: "Recent report pages and weather-linked photo updates.", href: snowReport, mark: "03" }
  ];
};

export const resorts = resortDirectory.map((resort) => {
  const annualSnowfallOverride = annualSnowfallOverrides[resort.id] || null;
  const snow = {
    ...DEFAULT_SNOW,
    ...(snowSnapshot[resort.id] || {}),
    averageAnnualSnowfall: annualSnowfallOverride?.valueCm ?? null,
    averageAnnualSnowfallInches: annualSnowfallOverride?.valueInches ?? null,
    averageAnnualSnowfallSource: annualSnowfallOverride?.source ?? null
  };

  return {
    ...resort,
    instagram: resort.instagram || null,
    snow,
    photos: galleryLinks(resort.name, resort.links.official, resort.links.snowReport, resort.instagram)
  };
});

export { snowSnapshotMeta };
