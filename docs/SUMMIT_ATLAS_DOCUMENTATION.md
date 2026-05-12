# Summit Atlas Documentation

## Overview

Summit Atlas is a static-first ski globe web app focused on resort discovery, current snow context, and trip-planning signals.

The app is designed around three ideas:

- a visually engaging globe for exploration
- a static resort directory that can grow over time
- generated snow data that can refresh without rewriting the UI

The current implementation is entirely frontend-hostable and is suitable for free static hosting.

## Core Features

- Interactive 3D globe built with `globe.gl`
- Clickable resort markers with a popup card
- Dedicated resort detail pages at `resort.html?id=<resort-id>`
- Search across resort names, regions, countries, and continents
- Ski pass filtering for `All`, `Ikon`, `Epic`, and `Independent`
- Ski pass color-coded markers
- Current base and summit snow depth fields
- Snowiest month field
- Trusted annual snowfall field when available
- Curated outbound photo and source links

## Current Architecture

### Static resort metadata

The resort directory lives in:

- `js/resort-directory.js`

Each resort record includes:

- `id`
- `name`
- `country`
- `region`
- `continent`
- `lat`
- `lng`
- `size`
- `elevationMeters`
- `summary`
- `notes`
- `instagram`
- `passes`
- `links`

This file is the canonical source for adding or editing resorts.

### Generated snow snapshot

The app reads current and historical snow fields from:

- `data/snow-template.json`
- `js/snow-data.js`

`data/snow-template.json` is the editable source of truth.
`js/snow-data.js` is the generated browser-facing module.

### Merge layer

The frontend uses:

- `js/resorts-data.js`
- `js/resorts-api.js`

`resorts-data.js` merges static resort metadata with generated snow data and trusted annual snowfall overrides.

`resorts-api.js` provides small frontend helpers such as:

- pass color selection
- pass access formatting
- search
- featured resort selection
- summary counts
- snow formatting

### UI entry points

- `index.html`
  Main globe experience
- `resort.html`
  Resort detail page
- `js/app.js`
  Main globe UI logic
- `js/resort-page.js`
  Resort detail-page rendering
- `style.css`
  Shared styles

## Data Pipelines

### Current snow updater

File:

- `scripts/update-snow-data.cjs`

Purpose:

- fetch latest current snow depth from Open-Meteo
- update `data/snow-template.json`
- regenerate `js/snow-data.js`

Important behavior:

- uses batched requests so the growing resort directory does not exceed URL length limits
- stores base and summit depth
- applies manual current-snow overrides after automated values

### Historical snowiest-month updater

File:

- `scripts/update-historical-months.cjs`

Purpose:

- fetch historical snowfall archive data from Open-Meteo
- compute the `snowiest month`
- store a previous-year comparison signal
- write the results back into `data/snow-template.json`
- regenerate `js/snow-data.js`

Important behavior:

- uses modeled snowfall archive data
- can produce results that are good enough for broad guidance but not always trustworthy at resort level
- archive requests can rate-limit with `429`

### Snow module generator

File:

- `scripts/generate-snow-data.cjs`

Purpose:

- regenerate `js/snow-data.js` from `data/snow-template.json` without calling external APIs

## Override System

Summit Atlas intentionally supports manual corrections where automated data is not trustworthy enough.

### Current snow overrides

File:

- `data/current-snow-overrides.json`

Use this when:

- official resort snow depth is better than model output
- base and summit model values are clearly wrong

### Historical snowiest-month overrides

File:

- `data/historical-month-overrides.json`

Use this when:

- modeled month does not pass a smell test
- a manually chosen month is better for the user-facing planning signal
- the archive API rate-limited and a temporary placeholder is needed

### Annual snowfall overrides

File:

- `js/annual-snowfall-overrides.js`

Use this when:

- a trusted official annual snowfall figure is available

Important rule:

- annual snowfall is no longer shown from the model archive
- the UI displays annual snowfall only when a trusted override exists
- otherwise it shows `Not available yet`

### Human-readable override log

File:

- `data/override-log.md`

This file is the manual audit trail for overrides and should be updated whenever a new override is added.

## Local Workflow

### Serve the app locally

```powershell
py -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

### Refresh current snow

```powershell
npm run snow:update
```

### Recompute historical snowiest month

```powershell
npm run snow:history
```

### Regenerate browser snow module only

```powershell
npm run snow:build
```

### Review snowiest-month values

```powershell
npm run snow:history:review
```

### Run browser smoke tests

```powershell
npm test
```

## Pass Filtering

The homepage includes a ski-pass filter with:

- `All`
- `Ikon`
- `Epic`
- `Independent`

The filter currently updates:

- globe markers
- search results
- featured resorts
- summary chips
- selection behavior

## Marker System

The current globe markers are:

- custom 3D objects on the globe object layer
- pass-colored
- zoom-aware
- selected-marker aware

The current direction favors:

- fewer bulky tops
- smaller visible stems
- larger invisible hit areas for easier clicking

This area is still a likely candidate for future refinement.

## Country Borders

A lightweight line-based country border approach is now used instead of filled country polygons.

Why:

- the filled-polygon approach caused serious performance and responsiveness issues
- lightweight line data is much safer for this globe setup

## Testing

Playwright smoke tests live in:

- `tests/smoke.spec.js`
- `playwright.config.js`

The current test suite checks:

- homepage loads
- globe selection works
- detail page opens
- rotation toggle works
- search flow works
- invalid resort page handling works

## Hosting

This project is intended for free static hosting.

Good options:

- GitHub Pages
- Netlify
- Cloudflare Pages

The architecture is already static-friendly because:

- resort metadata is static JS
- snow data is generated into static files
- no runtime backend is required for site rendering

## Current Limitations

- historical snowiest-month data can still be wrong for some resorts because it comes from a modeled archive source
- archive API calls can rate-limit
- many recently added resorts may temporarily use manual snowiest-month placeholders until a successful archive rerun
- annual snowfall is only present where a trusted manual value has been added

## Recommended Next Steps

- continue reviewing snowiest-month overrides for suspicious resorts
- add more trusted annual snowfall values for key resorts
- refine marker density behavior further in crowded regions
- optionally add additional filters such as continent or region
- prepare a deployment workflow for static hosting
