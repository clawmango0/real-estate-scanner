# Architecture

## System Overview

LockBoxIQ is a serverless real estate investment platform built on three pillars:

1. **Supabase** — PostgreSQL database, Row Level Security, Deno Edge Functions
2. **Mailgun** — Inbound email routing for automatic property ingestion
3. **Cloudflare Pages** — Static SPA hosting with auto-deploy from GitHub

There is no traditional backend server. All business logic lives in edge functions (Deno) or client-side JavaScript.

---

## Data Flow

### Inbound Email Pipeline

```
1. User adds their @alerts.lockboxiq.com address to Zillow/Realtor.com saved searches

2. Zillow sends "New Listing" or "Price Cut" email to user's mailbox

3. Mailgun receives email → catch_all() route → forwards webhook POST to:
   https://tgborqvdkujajsggfbcy.supabase.co/functions/v1/inbound-email

4. inbound-email edge function:
   a. Validates Mailgun webhook signature
   b. Logs raw email to email_log table
   c. Matches sender to a mailbox → user_id
   d. For Zillow emails with listing URLs:
      - Fetches Zillow page, extracts __NEXT_DATA__ JSON
      - Pulls: beds, baths, sqft, price, property_type, rent estimate (Zestimate),
        latitude, longitude, lot size
   e. Falls back to Claude AI (claude-sonnet-4-20250514) to parse email HTML body
   f. Subject-line regex fallback for simple "New Listing: X" / "Price Cut: X" formats
   g. Upserts each property (dedup key: user_id + address + listed_price)
   h. Updates email_log with parse_status and properties_found count
```

### Dashboard Load

```
1. User opens lockboxiq.com → auth screen
2. Supabase Auth (email/password) → session token
3. onAuthStateChange fires → loads mailbox + properties + projects
4. Properties loaded via GET /functions/v1/properties
   - Edge function queries properties table (RLS enforces user_id filter)
   - Joins neighborhoods table for ZIP-level scores and appreciation
   - Returns shaped objects with: rawCity, lat, lng, hood, rentRange, etc.
5. Client-side JS computes financials for each property:
   - Cash-on-Cash return, monthly cash flow, tier classification
   - Schedule E tax modeling (depreciation, interest, expenses)
   - 5/10/15 year exit projections with ZHVI appreciation
6. renderApp() builds the property table with sort/filter/curation
7. renderProjectCards() creates project cards with Leaflet mini-maps
```

---

## Edge Functions

### `inbound-email` (verify_jwt: false)

The most complex function. Handles the full email-to-property pipeline.

**Trigger:** Mailgun webhook POST (multipart/form-data)

**Key behaviors:**
- Extracts listing URLs from email HTML using regex
- For Zillow URLs: fetches page, parses `__NEXT_DATA__` JSON for structured property data
- Extracts `latitude` and `longitude` from Zillow's `prop` object
- For non-Zillow or failed fetches: sends email body to Claude for AI extraction
- Subject-line fallback parser handles "New Listing:" and "Price Cut:" formats
- Price drops detected by address match with different price → sets `price_drop`, `price_drop_amt`
- Deduplication: `ON CONFLICT (user_id, address, listed_price) DO UPDATE`

**Error handling:**
- All parse attempts logged to `email_log` with status: `success`, `no_listings`, `failed`
- Individual property extraction failures don't block other properties in same email
- Zillow fetch failures (403, timeout) gracefully fall back to AI parsing

### `properties` (verify_jwt: false, RLS-protected)

Simple CRUD proxy with shaping logic.

**GET:** Returns all properties for authenticated user, joined with neighborhoods.
- Shapes response: `rawCity`, `lat`, `lng`, `hood` (neighborhood data), `rentRange` (from Zestimate +-15%)
- Neighborhood join: `LEFT JOIN neighborhoods ON properties.zip = neighborhoods.zip`

**PATCH:** Updates a single property. Allowed fields whitelist: `condition`, `improvement`, `status`, `curated`, `notes`, `monthly_rent`, `latitude`, `longitude`.

### `create-mailbox` (verify_jwt: true)

Creates a new mailbox for a user and configures the Mailgun route.

**Flow:**
1. Generates unique slug from user's email
2. Inserts mailbox record
3. Creates Mailgun route: `match_recipient(slug@alerts.lockboxiq.com)` → forward to inbound-email

---

## Frontend Architecture

### Module Structure

The SPA is split into 10 JS files loaded via `<script>` tags (global scope, no bundler):

```
config.js       → Supabase client initialization
    ↓
financial.js    → Pure functions: GP params, CoC, Schedule E, exit modeling, formatters (M, MS, PCT)
    ↓
state.js        → Mutable state: currentUser, props[], projects[], activeProject, gRentMode
    ↓
projects.js     → Project CRUD, filtering logic, card rendering, Leaflet maps
    ↓
auth.js         → Auth screen UI: tab switching, doAuth(), signOut()
    ↓
session.js      → onAuthStateChange, token caching, mailbox loading
    ↓
data.js         → loadProperties(), saveProperty(), property editing
    ↓
render.js       → vis(), renderApp(), updateStats() — main render loop
    ↓
curation.js     → curate() — favorite/skip toggle
    ↓
modal.js        → buildMod() — property detail modal with full financials, event listeners
```

**Load order matters.** Each file depends on globals from files loaded before it. `config.js` must be first (creates `sb` client), `modal.js` must be last (references functions from all others).

### Rendering Strategy

No framework — direct DOM manipulation via `innerHTML` + event delegation.

- `renderApp()` is the main render loop. Called on: data load, filter change, sort, project selection, rent mode change.
- Property rows are generated as HTML strings with inline `onclick` handlers.
- Project cards use `renderProjectCards()` with Leaflet maps created after DOM insertion.
- The property detail modal (`buildMod()`) generates ~250 lines of HTML with full financial analysis.

### Map Implementation

**Technology:** Leaflet.js 1.9.4 + CartoDB dark_all tiles

**Mini-maps (project cards):**
- 70px tall, non-interactive (all Leaflet interactions disabled)
- Teal `circleMarker` dots for matching properties
- `fitBounds()` with 8px padding
- Map instances tracked in `window._projMaps` array, destroyed before re-render

**Modal map (project edit):**
- 250px tall, fully interactive (zoom, drag, popups)
- Teal markers = properties matching project filters
- Gray markers = all other properties (for context)
- Address + price popups on teal markers
- **Critical:** Map must be created AFTER modal is visible (`display:flex`), not before. Otherwise Leaflet calculates 0x0 dimensions and the map breaks.

**Tile layer:** `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Natively dark-themed (no CSS filter needed)
- Previous approach (CSS filter on OSM tiles) broke tile rendering on zoom/pan

---

## Authentication & Security

- **Supabase Auth** with email/password (no OAuth yet)
- **Row Level Security (RLS)** on all tables — users can only read/write their own data
- **Edge functions** use `--no-verify-jwt` because RLS handles authorization at the database level
- **Access token caching** — `onAuthStateChange` caches the token to avoid stale `getSession()` calls that caused a login loop bug (fixed 2026-03-12)

---

## Geocoding Pipeline

Properties are geocoded for map display:

1. **New properties from Zillow:** `latitude` and `longitude` extracted from `__NEXT_DATA__` (most reliable)
2. **Existing properties without coords:** Batch geocoded via:
   - Primary: US Census Bureau Geocoding API (free, no key required)
   - Fallback: Nominatim / OpenStreetMap
   - Last resort: ZIP centroid approximation
3. **Coverage:** 78/78 properties geocoded (as of 2026-03-13)

---

## Neighborhood Data

The `neighborhoods` table contains ZIP-level data for 1,990 Texas ZCTAs:

| Source | Data |
|--------|------|
| SimpleMaps | ZIP → `area_name` mapping (city, county) |
| Zillow ZHVI | `zhvi_current`, `appreci_1yr`, `appreci_3yr`, `appreci_5yr` |
| Manual (future) | `schools`, `crime_safety`, `walk_score`, `rent_growth` |

Appreciation data is used in the 5/10/15-year exit scenario calculations for each property.

---

## Deployment

| Component | Deploy Method | Trigger |
|-----------|--------------|---------|
| Frontend | `git push origin main` | Cloudflare Pages watches `main` branch, serves `docs/` |
| Edge Functions | `supabase functions deploy <name>` | Manual CLI deploy |
| Database | Supabase Management API | Manual SQL via API |
| Mailgun Routes | Mailgun API | Manual (one-time setup) |
