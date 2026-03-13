# LockBoxIQ — Roadmap

*Last updated: 2026-03-13*

---

## Completed

### Infrastructure (2026-03-10 – 03-12)
- [x] Supabase backend with PostgreSQL + RLS
- [x] Mailgun inbound email routing (`alerts.lockboxiq.com`)
- [x] Claude AI email parsing (claude-sonnet-4-20250514)
- [x] Zillow `__NEXT_DATA__` extraction (beds, baths, sqft, rent, lat/lng)
- [x] Subject-line fallback parser ("New Listing", "Price Cut")
- [x] Supabase Auth (email/password) with session token caching
- [x] Cloudflare Pages deployment from `main` branch
- [x] Edge functions: `inbound-email`, `properties`, `create-mailbox`
- [x] Fixed login loop bug (stale token → 401 → signout → infinite loop)

### Data Pipeline (2026-03-10 – 03-13)
- [x] 1,990 Texas ZIP/ZCTA neighborhood records (SimpleMaps)
- [x] Zillow ZHVI appreciation data (1yr, 3yr, 5yr) by ZIP
- [x] Batch geocoding of 78 properties (Census Bureau + Nominatim + ZIP centroid)
- [x] Latitude/longitude extraction from Zillow for new properties
- [x] Backfilled 28 empty city values from address parsing
- [x] Dropped `properties.zip` FK constraint (was blocking inserts for unlisted ZIPs)

### Dashboard (2026-03-10 – 03-13)
- [x] Full financial analysis per property (CoC, cash flow, tier classification)
- [x] Texas Schedule E tax modeling with depreciation
- [x] 5/10/15-year exit scenario with ZHVI appreciation
- [x] Rent assumption modes (Low / Midpoint / High / Mid+5%)
- [x] Sortable property table with filter chips
- [x] Property detail modal with accordions
- [x] Curation: favorite (⭐) and skip (👎) toggles
- [x] Brand style guide: Poppins font, navy/teal/silver palette, dark-only
- [x] Projects: saved filter presets with financial overrides
- [x] Project cards with mini-maps (Leaflet.js + CartoDB dark tiles)
- [x] Interactive map in project edit modal
- [x] Modular file structure (10 JS files, external CSS, extracted images)

---

## In Progress

### Data Quality
- [ ] Populate neighborhood scores: `schools`, `crime_safety`, `walk_score`, `rent_growth`
- [ ] Validate/update ZHVI appreciation data quarterly
- [ ] Auto-detect and flag stale listings (no price change in 30+ days)

---

## Planned — Near Term

### Polygon-Based Geographic Filtering
- Draw custom boundaries on the map to define project areas
- More precise than city-name filtering
- Infrastructure ready: all properties have lat/lng

### Realtor.com Email Parsing
- Current parsing is Zillow-optimized (`__NEXT_DATA__` extraction)
- Realtor.com emails have different HTML structure
- Need dedicated parser or improved Claude prompting for Realtor format

### Property Image Analysis
- Condition rating from listing photos (5-point scale)
- Started manual rating collection (see IMAGE_RATING.md)
- Goal: After 20+ ratings, Claude can auto-rate new properties
- Would feed into `condition` field for more accurate rehab cost estimates

### Comp Analysis
- Pull comparable sales data for each property
- Display in property detail modal
- Inform tier pricing (Strong Buy / Consider thresholds)

### Multi-Source Alert Support
- HAR.com email alerts
- Redfin email alerts
- Each source needs format-specific parsing

---

## Planned — Medium Term

### Notification System
- Push notifications for new Strong Buy properties
- Daily digest email with new listings matching project criteria
- Price drop alerts for favorited properties

### Portfolio Tracking
- Mark properties as "under contract" or "owned"
- Track actual rent, expenses, and returns vs projections
- Dashboard view: portfolio cash flow, total equity, ROI

### Export & Reporting
- Export property list to CSV
- Generate PDF deal analysis reports
- Share deal analysis via URL (read-only link)

### Mobile Optimization
- Progressive Web App (PWA) for offline access
- Push notifications on mobile
- Swipe gestures for property curation (swipe right = fav, left = skip)

---

## Planned — Long Term

### Multi-Market Expansion
- Support markets beyond DFW (Houston, Austin, San Antonio)
- Market-specific tax rates and insurance defaults
- Regional neighborhood data sources

### Multi-User / Team Features
- Share projects with investment partners
- Role-based access (viewer, editor)
- Shared deal pipeline with stage tracking

### MLS Integration
- Direct MLS data feed (requires Realtor association membership)
- Real-time listing updates (no email delay)
- Historical price and days-on-market data

---

## Architecture Improvements

### Consider for Scale
- [ ] Add TypeScript to edge functions (already Deno, TS is native)
- [ ] Minification/bundling if JS payload grows significantly
- [ ] Add unit tests for financial calculations
- [ ] Add integration tests for email parsing
- [ ] Move to ES modules if cross-file dependency management becomes complex
- [ ] Consider Preact/Solid if UI complexity warrants a framework

### Infrastructure
- [ ] Set up staging environment (separate Supabase project)
- [ ] Add error monitoring (Sentry or similar)
- [ ] Add analytics (simple page view + feature usage tracking)
- [ ] Database backups schedule verification
