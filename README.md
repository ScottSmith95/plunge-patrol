# Plunge Patrol

Plunge Patrol is a lightweight static web app for checking King County lake-beach conditions for cold-water swimmers.
It presents one panel per beach and loads each beach module independently for:

- official county safety status
- latest recorded water temperature
- historical reliability context

The app is intentionally low-dependency and framework-free on the client. It uses Eleventy for the static shell, PostCSS for styles, and native custom elements for the interactive UI.

## What It Does

- Loads a local beach manifest from `src/assets/data/beaches.json`
- Fetches live county data directly in the browser from public ArcGIS endpoints
- Joins records by `siteID` first, then `locator`, with optional `joinName` fallbacks for edge cases
- Renders a beach-first interface with independently loading modules and isolated error states
- Saves favorites and plunge-threshold preferences in `localStorage`
- Supports filter state in the URL query string

## Tech Stack

- Eleventy 3 for the static site build
- PostCSS with `postcss-preset-env`
- Vanilla JS modules
- Native Web Components using light DOM

## Commands

- Install dependencies: `npm install`
- Start local development: `npm run dev`
- Build for production: `npm run build`
- Serve the built site: `npm run serve`

`npm run dev` watches CSS with PostCSS and starts Eleventy in serve mode.

## Project Structure

```text
.
├── eleventy.config.js
├── postcss.config.js
├── scripts/
│   └── dev.mjs
├── src/
│   ├── index.njk
│   └── assets/
│       ├── data/
│       │   └── beaches.json
│       ├── scripts/
│       │   ├── app.js
│       │   ├── components/
│       │   └── lib/
│       └── styles/
│           ├── main.css
│           └── app.css
└── _site/
```

## Key Front-End Pieces

- `src/index.njk`
  Static HTML shell and footer copy.

- `src/assets/data/beaches.json`
  Local source of truth for supported beaches, aliases, display order, and curated reliability summaries.

- `src/assets/scripts/lib/beach-client.js`
  Shared memoized data client. Fetches the county datasets once per page load and exposes beach-level accessors.

- `src/assets/scripts/components/beach-app.js`
  Root application component. Loads the beach manifest, renders panels, manages filters, favorites, and live filter state.

- `src/assets/scripts/components/beach-panel.js`
  Per-beach shell. Uses `IntersectionObserver` to lazily activate child modules.

- `src/assets/scripts/components/beach-status.js`
  Official county status module.

- `src/assets/scripts/components/beach-temperature.js`
  Latest recorded temperature module.

- `src/assets/scripts/components/beach-reliability.js`
  Reliability and 30-day bacteria context module.

- `src/assets/scripts/components/beach-filters.js`
  Global filters and plunge-threshold controls.

## Data Sources

The app currently uses two public King County ArcGIS query endpoints:

- Beach status:
  `https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/Swimming_beaches_view/FeatureServer/0/query`
- Temperature:
  `https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/Swim_beach_temperature_view/FeatureServer/0/query`

For context and official interpretation, also see:

- `https://kingcounty.gov/en/dept/dnrp/nature-recreation/parks-recreation/king-county-parks/water-recreation/swimming-beach-bacteria-temperature`

## Notes And Caveats

- Temperature is not the same thing as clearance to enter the water. Official status should win.
- Outside the main monitoring season, the county can show `No recent data` while still exposing an older recorded temperature.
- The app is currently scoped to King County lake beaches only. Golden Gardens is not included.
- `src/assets/styles/app.css` is generated from `src/assets/styles/main.css`.
- `_site/` is generated build output.

## Deployment Shape

This project is designed to work as a simple static site. The build writes HTML and passthrough assets to `_site/`.

## Liability

Plunge Patrol is informational only. Water conditions can change quickly, county updates can lag, and users are responsible for verifying current conditions and making their own safety decisions before entering the water.
