# Technical Decisions Log

Key design decisions, trade-offs, and rationale for the LockBoxIQ platform.

---

## D1: Serverless Architecture (Supabase + Edge Functions)

**Decision:** Use Supabase (PostgreSQL + Deno Edge Functions) instead of a traditional backend.

**Rationale:**
- No server to manage, scale, or pay for at idle
- Row Level Security eliminates most auth middleware
- Edge functions run close to users (low latency)
- Free tier is generous for a single-user MVP

**Trade-off:** Edge functions have cold start latency (~200ms) and limited debugging. Acceptable for an email-ingestion workflow where latency isn't critical.

---

## D2: Email-Based Ingestion (Not Scraping)

**Decision:** Receive property data via Zillow/Realtor.com email alerts forwarded through Mailgun, rather than scraping listing sites directly.

**Rationale:**
- Zillow and Realtor.com actively block scrapers (403s, CAPTCHAs, rate limits)
- Email alerts are a legitimate, stable data channel
- Users already use saved-search email alerts — we just receive them at our domain
- Email contains structured listing URLs that can be enriched via page fetch
- No legal risk from Terms of Service violations

**Trade-off:** Dependent on the listing site continuing to send email alerts. If Zillow changes their email format, the parser needs updating. Mitigated by AI-powered parsing (Claude) which adapts to format changes.

---

## D3: Claude AI for Email Parsing

**Decision:** Use Claude (claude-sonnet-4-20250514) as the primary email parser, with regex fallbacks.

**Rationale:**
- Email HTML varies significantly across listing sites and email types
- AI parsing handles format changes without code updates
- Structured extraction prompt returns clean JSON
- Cost is minimal (~$0.001 per email parse)

**Fallback chain:**
1. Zillow `__NEXT_DATA__` extraction (most reliable, structured JSON)
2. Claude AI parsing of email HTML body
3. Subject-line regex for "New Listing: X" / "Price Cut: X" formats

---

## D4: No JavaScript Framework

**Decision:** Build the SPA with vanilla JavaScript (no React, Vue, etc.).

**Rationale:**
- Single-user dashboard with relatively simple state
- No build step = instant deploy via Cloudflare Pages
- Total JS payload ~72KB (unminified) — smaller than most frameworks
- Direct DOM manipulation is fast for ~100 property rows
- No dependency management, no bundler config, no version conflicts

**Trade-off:** Manual DOM updates, no virtual DOM diffing, no component lifecycle. Acceptable because the app is relatively small and the developer is the primary user. If multi-user scaling becomes needed, a framework migration would be warranted.

**Modularity approach:** Split from a single 1,651-line file into 10 focused modules loaded via `<script>` tags in dependency order. All functions are global scope — simpler than ES modules but requires careful naming.

---

## D5: Property Deduplication Strategy

**Decision:** Unique constraint on `(user_id, address, listed_price)`.

**Rationale:**
- Same address at a different price = price drop or relist → should be a new record (or update)
- Same address at same price from multiple email alerts = duplicate → should be ignored
- `ON CONFLICT ... DO UPDATE` allows enrichment of existing records without creating duplicates

**Trade-off:** A property that is delisted and relisted at the same price will not create a new record. Acceptable because the original record still has all the data.

---

## D6: City Filtering — Exact Match on rawCity

**Decision:** Filter projects by exact case-insensitive match on the `city` database column, not by ZIP-level neighborhood area names.

**Rationale:**
- The `neighborhoods.area_name` field contains ZIP-level descriptions like "Keller, Tarrant County" — substring matching caused false positives (e.g., a Fort Worth property at ZIP 76244 matched "Keller" because the area_name is "Keller, Tarrant County")
- The `city` column on `properties` is the actual city from the listing address
- Exact matching eliminates geographic leakage between adjacent cities

**Previous approach (abandoned):** `.includes()` substring matching on `p.hood.area` (neighborhood area_name). This was fast to implement but produced incorrect project membership.

---

## D7: Leaflet.js + CartoDB Dark Tiles (Not Google Maps)

**Decision:** Use Leaflet.js with CartoDB dark_all tiles for map display.

**Rationale:**
- Leaflet is open-source, 42KB gzipped, no API key required
- CartoDB dark_all tiles are natively dark — matches the dashboard's dark theme
- No usage limits or billing concerns (unlike Google Maps)
- CircleMarker dots are lightweight and sufficient for showing property clusters

**Previous approach (abandoned):** OpenStreetMap tiles with CSS filter hack (`filter: brightness(.6) invert(1) contrast(3) hue-rotate(200deg) saturate(.3) brightness(.7)`). This made tiles look dark statically, but **broke tile rendering on zoom/pan** because Leaflet loads new tile images dynamically and the CSS filter interfered with the rendering pipeline.

**Map initialization timing:** Leaflet must be initialized AFTER its container element has visible dimensions (`display:flex`, not `display:none`). The modal overlay uses `display:none` → `display:flex` on open, so map creation is deferred 350ms to ensure the container has layout.

---

## D8: Financial Modeling Approach

**Decision:** Client-side financial calculations with configurable global parameters.

**Key parameters (GP):**
| Parameter | Default | Source |
|-----------|---------|--------|
| Down payment | 25% | Investor convention |
| Interest rate | 6.875% | Current market (2026) |
| Loan term | 30 years | Standard mortgage |
| CoC minimum | 8% | BiggerPockets threshold |
| Vacancy | 5% | DFW market average |
| Maintenance | 8% of rent | Conservative estimate |
| CapEx | 5% of rent | Reserve for major repairs |
| Management | 0% | Self-managed |
| Insurance | $175/mo | Texas average |
| Property tax | 2.2% of price | Tarrant County average |

**Tier classification:**
- Strong Buy: CoC >= 10%
- Consider: CoC >= 8%
- Stretch: CoC >= 5%
- Walk Away: CoC < 5%

**Rent assumptions:** Four modes available (Low, Midpoint, High, Mid+5%). Zillow Zestimate rent range is used when available. Confirmed monthly rent (from user input) always overrides estimates.

---

## D9: Projects as Filter + Override Groups

**Decision:** Projects are saved filter presets with optional financial overrides, not separate property collections.

**Rationale:**
- Properties exist independently — they belong to the user, not to a project
- A project defines criteria (cities, property types, beds, baths, max price) that dynamically filter the property list
- Projects can override global financial params (down payment, rate, hold period)
- This allows the same property to appear in multiple projects (e.g., a duplex in Euless appears in both "SFR Mid Cities" and "Duplexes Under 300K")

**Data model:** `projects` table stores filter criteria as columns. No junction table. Filtering is done client-side by `projectFilter()`.

---

## D10: Neighborhood Data at ZIP Level

**Decision:** Use ZIP code (ZCTA) as the geographic unit for neighborhood scoring.

**Rationale:**
- SimpleMaps provides free ZIP-to-city mapping for all Texas ZCTAs (1,990 records)
- Zillow ZHVI data is available at ZIP level
- ZIP-level granularity is sufficient for investment screening (not property-level precision)
- Avoids the complexity of census tract or polygon-based boundaries

**Future consideration:** Polygon-based filtering (draw-on-map) would require switching to census tracts or custom boundaries. The lat/lng geocoding pipeline is already in place to support this.

---

## D11: No Build Step / No Bundler

**Decision:** Ship raw JS/CSS files directly to Cloudflare Pages, no webpack/vite/rollup.

**Rationale:**
- Cloudflare Pages serves static files from the `docs/` directory
- No build configuration to maintain or debug
- Changes deploy in seconds (git push → live)
- Browser caching handles performance
- Total asset size is small (~190KB total: 72KB JS + 25KB CSS + 88KB images + Leaflet/Supabase from CDN)

**Trade-off:** No minification, no tree-shaking, no TypeScript. The JS is small enough that these optimizations aren't needed yet. If the codebase grows significantly, adding a build step would be straightforward.

---

## D12: Mailgun for Inbound Email

**Decision:** Use Mailgun (not SendGrid, Amazon SES, or self-hosted) for inbound email routing.

**Rationale:**
- Mailgun has robust inbound routing with webhook forwarding
- Simple catch-all route forwards all email to a single webhook URL
- Free tier supports the current volume (< 100 emails/month)
- Custom domain (`alerts.lockboxiq.com`) with DNS verification
- Webhook includes full parsed email (headers, body, attachments)

---

## D13: Graceful Degradation for Maps

**Decision:** All map code is guarded by `typeof L !== 'undefined'` checks.

**Rationale:**
- If the Leaflet CDN fails to load, the dashboard still works — just without maps
- Maps are informational, not functional requirements
- Project cards show stats (Props, Pass, Favs, Avg CF) even without the mini-map
- No blocking script loads in the critical path

---

## D14: Access Token Caching via onAuthStateChange

**Decision:** Cache the Supabase access token from `onAuthStateChange` events instead of calling `getSession()` on each request.

**Rationale:**
- `getSession()` can return stale tokens if the session was refreshed in another tab
- Stale tokens caused 401 responses from edge functions → auto-signout → refresh token revoked → infinite login loop
- `onAuthStateChange` always provides the current token
- Combined with `--no-verify-jwt` on edge functions (RLS handles auth at DB level), this eliminates the token freshness problem entirely

**Bug history:** This was the root cause of a critical login loop bug (2026-03-12). Users would sign in, the dashboard would load, then immediately sign them out in a loop.
