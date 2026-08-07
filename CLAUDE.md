# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SpotSan (renamed from "PointSan Mobile" 2026-08, repo `GiBruGa/SpotSan` — was `PointSan-Mobile`; renamed to avoid the "oin" diphthong internationally) is a single-file Progressive Web App (PWA) for surveying public toilets in the field ("constat terrain des toilettes publiques"). It's the mobile companion to a desktop app called "StatSan" (itself renamed from "PointSan Desktop") — SpotSan confirms/edits/reports toilets on a map; StatSan is the authoritative source for the base dataset (name, address, official Gouv/OSM data). The rename was purely cosmetic (name + repo + directory only, no data/behavior change) — internal identifiers (Storage bucket names `PointSan-Photos`/`PointSan-Incidents`, etc.) deliberately kept their old value rather than triggering an infrastructure migration for a cosmetic change; only user-visible text changed. There is no build step, no package.json, and no test suite: the entire app is `index.html`, served as a static file.

## Files

- `index.html` — page shell only: HTML markup, `<link>`/`<script src>` tags, and one small inline `<script>` that declares `const MAP_DATA_TOI = [];` (empty). The ~35KB base64-encoded logo is still embedded directly in the welcome-screen/topbar `<img>` tags (a fallback in case the dynamic `acronymes.icon_svg` fetch in `app.js` fails or the device is offline).
- `style.css` — all CSS (theme variables, layout, components), extracted from the former inline `<style>` block.
- `app.js` — all application JS (data model, map rendering, sheet/forms, sync), extracted from the former inline `<script>` block. Loaded via a plain `<script src="app.js">` (no `type="module"`), so it still shares one global scope with the `MAP_DATA_TOI` declaration in `index.html` — see the gotcha below, which still applies unchanged.
- `data/toilets-seed.json` — the ~18MB seed dataset (was the `MAP_DATA_TOI` JS literal, now a static JSON file), fetched once at startup and pushed into `MAP_DATA_TOI` before the first `buildLayers()` call (see the end of `app.js`). Don't try to eyeball this file in an editor — use `grep`/`sed`/targeted `Read` offsets if you need to inspect it.
- `sw.js` — service worker: cache-first for same-origin app-shell files (including `data/toilets-seed.json`, so a re-installed/offline PWA still has the seed data it used to get for free from the HTML), network-first (with cache fallback) for everything else (map tiles, CDN assets).
- `manifest.json` — PWA manifest (name, icons, theme colors, `display: standalone`).
- `icon-*.png` — app icons.

**Gotcha for edits**: `MAP_DATA_TOI` is declared `const` in its own `<script>` tag in `index.html` (the data-seed block, now just `const MAP_DATA_TOI = [];`). Classic (non-module) `<script>` tags — inline or external via `<script src>` — **share one global lexical scope for `let`/`const`** — redeclaring `MAP_DATA_TOI` (or any top-level `const`/`let`) in `app.js` throws a silent-to-the-user `SyntaxError` that aborts the *entire* script with no console output visible via casual testing. Always **mutate** the existing array in place (`MAP_DATA_TOI.length = 0; rows.forEach(r => MAP_DATA_TOI.push(r));`) rather than reassigning it. This applies both to the seed fetch (`app.js`, bottom) and to `refreshBaseFromServer()`.

## Running / testing locally

There's no dev server or build tooling. Serve the directory with any static file server and open `index.html`:

```bash
npx serve .
# or
python -m http.server 8000
```

Opening `index.html` directly via `file://` mostly works but the service worker registration will silently fail (this is handled gracefully — see the `.catch()` around `navigator.serviceWorker.register`). Geolocation and camera capture require a real device or browser devtools device emulation to test meaningfully.

There is no lint/test/build command — verify changes by loading the page in a browser (see the `run` skill) and exercising the flow you changed. When testing writes, check them directly in Supabase (`execute_sql`) rather than trusting the UI alone.

## Architecture

Everything lives in one global script scope in `index.html`. Key pieces, in the order they appear in the file:

**Data model**: `MAP_DATA_TOI` is a flat array of objects, one per row of the shared `SanitaryBlocks_Inventory` table — no more client-side annotation overlay. Each object carries the full row: `UB_id`, `Sources` (`['Gouv']`/`['OSM']`/both/`['PSM']`), `Name`, `Adresse`, `City`, `District`, `Region`, `Latitude`, `Longitude`, `Provider`, `Exists`, `MSB`/`PMR`/`Urinals`/`Showers`/`ChangingRooms` (counts), `Automatic`, `Verified`/`Certified` (server-computed from `Sources`), `Rating_Access`/`Rating_Cleanliness`/`Rating_Odors`/`Rating_Overall`, `Comment`, `Equipment` (jsonb: per-equipment ok/hs + niveau), and five `Photo_*` fields (Environment/CloseUp/Interior/Seat/Sink — one URL each, latest upload wins, not an array/history).

`findToiByUbId`, `classify` (returns `'verified'|'gouv'|'osm'|'certified'` from `Sources`/`Verified`/`Certified`) are the accessors used everywhere instead of reaching into rows directly.

**Map rendering** (`buildLayers`): Leaflet + `leaflet.markercluster`, loaded from CDN (`cdnjs`). Five cluster groups keyed `verified/gouv/osm/certified/supprimees`, toggled by the chip filters (`activeChips`). `buildLayers()` is the single re-render entry point — call it after any mutation to `MAP_DATA_TOI` rather than patching the DOM/markers directly. Map tiles switch dark/light CARTO basemaps automatically via `prefers-color-scheme`.

**Theming**: CSS custom properties in `:root` with a `@media (prefers-color-scheme: light)` override block — the whole UI (not just the map) follows the OS theme, no manual toggle.

**Sheet UI** (`openSheet` / `closeSheet` / `openForm` / `openRatingForm` / `openIncidentForm` / `saveForm`): a bottom-sheet panel is populated by string-concatenated `innerHTML` (no templating engine, no framework) and wired up with `addEventListener` calls made right after the HTML is injected. This pattern repeats throughout the file — when editing sheet/form markup, keep the corresponding `document.getElementById(...).addEventListener` calls in sync since they're re-attached every time the sheet content is rebuilt. There is only one code path per sheet now (no more `isNew` branch): a freshly-reported toilet is a normal `MAP_DATA_TOI` row with a temporary `TEMP-...` id until synced.

**Rating/equipment model**: `openRatingForm` builds sliders (`sliderRow`, -5..+5 range inputs) for access/cleanliness/odors/overall, plus per-equipment OK/HS toggles with a fill-level (`equipRow`: lave-mains, savon, séchage, papier, poubelle). Stored under `Rating_*` columns / the `Equipment` jsonb column, summarized read-only via `ratingSummaryHtml`. The old "type d'installation" dropdown is gone — `openForm` now edits the count fields (`COUNT_FIELDS`: MSB/PMR/Urinals/Showers/ChangingRooms) directly.

**Photos**: captured via `<input type="file" capture="environment">`, compressed client-side to a JPEG data URI (`compressImage`, canvas-based, no libraries). Five categories (`PHOTO_CATS`: Environment/CloseUp/Interior/Seat/Sink), each mapped 1:1 to a `Photo_*` column — taking a new photo in a category overwrites the previous one for that toilet, it's a "current state" snapshot, not a gallery. Stored as a `data:` URI locally until synced, at which point `uploadPhoto` uploads to Supabase Storage (bucket `PointSan-Photos`, public) and the field is swapped for the public URL.

**Incidents (vandalism/incivilités)**: a separate concept from the above — `openIncidentForm` collects a mandatory photo + optional free text and appends to `pendingIncidents`, synced via a **direct INSERT** into `Incident_Reports` (no RPC needed, that table's INSERT policy is open). Deliberately append-only / no update-delete policy: incident history is never overwritten, unlike the state photos above.

**Sync (Supabase)**: `SUPABASE_URL`/`SUPABASE_ANON_KEY` (anon/public key, safe to be client-side) point at the shared Supabase project. There is no login in Mobile — all writes are anonymous, gated server-side instead of client-side:
- `dirtyFeedback` (Map: `UB_id` → patch of changed fields) and `pendingNewToilets` (array of not-yet-synced new reports, temp local id) are the local write queue, replacing the old `dirtyRefIds`/`dirtyNewIds`/`ANNOTATIONS`/`NEW_POINTS`.
- `pushDirty()` processes `pendingNewToilets` **before** `dirtyFeedback` (a freshly-created toilet's own rating/comment/photos get queued into `dirtyFeedback` under its new server-assigned id *during* the new-toilet loop — it must run first so that queued patch is picked up in the same pass, not deferred to the next sync), then `pendingIncidents`.
- New toilets go through the RPC `report_new_toilet(p_name, p_adresse, p_city, p_district, p_region, p_lat, p_lon, p_automatic, p_pmr, p_msb)` — server-assigns the `UB_id` (continues the existing `UB-NNNNNN` sequence) and stamps `Sources=['PSM']`.
- Feedback on any existing toilet (new or official) goes through the RPC `report_toilet_feedback(p_ub_id, ...)` — a `SECURITY DEFINER` function that only ever touches existence/position/counts/automatic/ratings/comment/equipment/photos. It **never** touches `Name`/`Adresse`/`City`/`Sources`/`Provider` — those stay collaborator-only (Desktop), enforced server-side by the function body, not by anything in this file. `RPC_PARAM_MAP` maps local field names to RPC parameter names.
- `syncNow(silent)` runs `pushDirty()` then re-renders; called once silently on startup (after the initial `refreshBaseFromServer()`) and again from the menu's "Synchroniser maintenant" button.
- `refreshBaseFromServer()` paginates through `SanitaryBlocks_Inventory` (public `SELECT`, no auth) and replaces `MAP_DATA_TOI` wholesale (by mutation, see the gotcha above) — local `dirtyFeedback`/`pendingNewToilets` entries are preserved/reapplied over the fetched rows so an unsynced edit is never clobbered by a stale server read.

**Local export**: no more JSON interchange format with Desktop (both apps read/write the same Supabase tables directly now, nothing to interchange). If a local backup/export feature is wanted again, scope it to *pending* (unsynced) changes only, not a full annotations dump — the tables that format used to import into (`toilette_annotations`, `new_points`) are archived (`archive` schema) and no longer exist in `public`.

**Startup flow**: welcome overlay → `locateOnStartup()` requests geolocation and zooms to a 500m bbox around the user (falls back to the default France-wide view if denied/unavailable) → `fetch('data/toilets-seed.json')` populates `MAP_DATA_TOI` → `buildLayers()` (first render, on the seed data) → `refreshBaseFromServer()` → silent `syncNow(true)`.

## Conventions specific to this codebase

- French throughout: UI strings, variable-adjacent domain terms (`ann`-style naming has mostly given way to direct `SanitaryBlocks_Inventory` field names), and code comments. Keep new user-facing strings and comments in French to match.
- No framework, no bundler, no modules — everything is a global `const`/`function` in one script tag, and DOM updates are done via `innerHTML` string building rather than a virtual DOM. Match this style rather than introducing a build step or component library.
- `CHANGELOG` at the top of the script is a manually maintained, user-visible version history (shown in the app's "about" panel) — bump `APP_VERSION`/`SYNCED_WITH` and add an entry here for any user-facing change.
- Everything degrades gracefully offline/without permissions (geolocation denied, service worker unregisterable, sync unreachable) rather than erroring — preserve that pattern (silent `catch`, toast messages, fallback to last-known-good state) when touching these paths.
