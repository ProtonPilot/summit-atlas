# Summit Atlas

Summit Atlas is a static-first ski globe that maps resorts around the world and opens detail pages with snow context and curated photo-source links.

## What is included

- An interactive 3D globe powered by `globe.gl`
- A static resort directory with hardcoded coordinates and metadata
- A generated snow snapshot with current depths and historically snowiest month data
- Popup cards on globe click
- A dedicated `resort.html?id=...` detail view for each resort
- A static architecture that can be hosted for free on GitHub Pages, Netlify, or Cloudflare Pages

## Run locally

Because the app uses ES modules, serve the folder with a simple static server instead of opening the files directly.

### Python

```bash
py -m http.server 8000
```

Then visit `http://localhost:8000`.

## Data layout

- `js/resort-directory.js`
  Static resort metadata. This is where new resorts should be added.
- `data/snow-template.json`
  The editable snow input used to generate the browser-facing module.
- `data/current-snow-overrides.json`
  Manual current-snow corrections for resorts where official reporting is better than the model output.
- `data/override-log.md`
  Human-readable log of manual overrides, why they were made, and what source supported them.
- `js/snow-data.js`
  Generated snow snapshot consumed by the app.
- `js/resorts-data.js`
  Merge layer that combines the static directory with the latest snow snapshot.
- `js/annual-snowfall-overrides.js`
  Trusted annual snowfall figures for resorts where we have a source we feel good about.

## Refreshing snow data

The current build is now wired for a coordinate-based daily batch update.

1. Pull fresh snow data from Open-Meteo and rewrite the snapshot:

```bash
npm run snow:update
```

2. If you manually edit `data/snow-template.json`, regenerate the browser module with:

```bash
npm run snow:build
```

3. Refresh the site or deploy the updated static files.

`snow:update` currently uses resort coordinates plus summit elevation to fetch snow depth from Open-Meteo's forecast API. Base depth uses the default terrain-adjusted location, summit depth uses the resort's peak elevation. The historically snowiest month is still preserved from the template and remains a separate field until we add the historical pipeline.

When model output is not trustworthy for a specific resort, add a correction in `data/current-snow-overrides.json`. The updater keeps the automated values and then applies the manual override for display.

To recompute the historically snowiest month from multi-year snowfall history:

```bash
npm run snow:history
```

`snow:history` uses the Open-Meteo Historical Weather API and computes the snowiest month, meaning the highest average calendar-month snowfall for each resort from 2016 through 2025 at summit elevation. This same coordinate-based method works globally, including Europe and Japan, though we may still choose to override important resorts later with operator-specific archives.

The history pipeline also stores `previousYearSnowiestMonth` from the previous full calendar year as a fallback review signal for resorts where the long-run model average looks suspicious.

Annual snowfall is no longer computed from the model archive. The app will only show annual snowfall when we have a curated trusted figure for that resort; otherwise it will display `Not available yet`.

Manual corrections live in `data/historical-month-overrides.json`. When an override exists, the pipeline keeps both values:

- `computedHighestHistoricalMonth`
- `previousYearSnowiestMonth`
- `manualHighestHistoricalMonth`
- `highestHistoricalMonth`
  This is the display value used by the UI.

To review the current automatic and manual values side by side:

```bash
npm run snow:history:review
```

This is the spot where a future GitHub Actions, Netlify, or Cloudflare scheduled job can write new global snow values each day.

## Next upgrades

- Expand the static resort directory continent by continent
- Add filters for continent, snowfall patterns, and resort style
- Add resort-specific override sources where mountain-model data is not good enough
