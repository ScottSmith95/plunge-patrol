# AGENTS.md

This project is a small static web app for checking King County lake-beach conditions for cold-water swimmers.

## Project Information

- App name: Plunge Patrol
- Build: Eleventy + PostCSS
- Front end: vanilla JS modules + native custom elements
- Data: local beach manifest plus live public ArcGIS endpoints from King County
- Deployment target: static hosting

## Priority Order For Decisions

1. Preserve working filter, favorite, and beach-module behavior.
2. Keep the client lightweight and framework-free.
3. Prefer small targeted edits over broad rewrites.
4. Preserve the current visual tone unless the task asks for a redesign.
5. Keep county data handling explicit and easy to inspect.

## Setup Commands

- Install dependencies: `npm install`
- Start local development: `npm run dev`
- Build production output: `npm run build`
- Serve built output: `npm run serve`

## Architecture Notes

- `src/index.njk` is the single page shell.
- `src/assets/data/beaches.json` is the local source of truth for supported beaches.
- `src/assets/scripts/lib/beach-client.js` handles memoized remote fetches and beach-level joins.
- `src/assets/scripts/components/beach-app.js` is the root coordinator for filters, favorites, and panel rendering.
- Each beach module should manage its own `idle -> loading -> success | error` UI state.
- Join live records by `siteID` first, then `locator`. Only use name-based fallback when the manifest explicitly provides `joinName`.

## Editing Rules

- Edit source files only.
- Do not edit `_site/`.
- Do not edit `src/assets/styles/app.css` directly; it is generated from `src/assets/styles/main.css`.
- Keep the client framework-free.
- Prefer plain functions and explicit DOM behavior over abstractions.
- Keep custom elements in light DOM unless there is a strong reason to change that.
- Reuse the shared data client instead of adding duplicate remote fetches inside components.
- If adding new beach metadata, update `src/assets/data/beaches.json` rather than hardcoding beach-specific logic in components.

## Styling Conventions

- Keep the existing design tokens in `:root`.
- Preserve the current editorial/outdoorsy tone rather than shifting to generic app styling.
- Favor spacing and typography fixes over structural redesigns when polishing the UI.
- Be careful with `[hidden]` behavior because the app relies on it for filter visibility.

## Persistence And URL State

- Favorites and plunge-threshold preferences live in `localStorage`.
- Filter state is mirrored into the URL query string.
- If changing storage keys, preserve a migration path when practical.

## Validation Expectations

- Run `npm run build` after meaningful code or style changes.
- For docs-only changes, a build is optional.
- If you change filters, favorites, or module loading behavior, validate those flows manually when possible.

## Known Product Constraints

- The app currently covers King County lake beaches only.
- Temperature is supporting context, not an official go/no-go signal.
- Off-season behavior matters: `No recent data` is a valid and expected state.
- Liability and official-source disclaimers should remain present in the UI.
