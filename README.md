# LockBoxIQ

Real estate investment analyzer with automatic email ingestion. Zillow and Realtor.com email alerts are parsed by AI, enriched with neighborhood data and geocoding, and displayed on a dark-themed analytics dashboard with per-property financials (Schedule E, 5/10/15-year exit modeling, Cash-on-Cash return).

**Live:** [lockboxiq.com](https://lockboxiq.com/)

---

## How It Works

```
Zillow / Realtor.com
  "New Listing" or "Price Cut" email alerts
        │
        ▼
  Mailgun (alerts.lockboxiq.com)
    catches all inbound email, forwards webhook to:
        │
        ▼
  Supabase Edge Function: inbound-email
    • Claude AI parses listing details from HTML body
    • Subject-line fallback for simple formats
    • Zillow __NEXT_DATA__ extraction (beds, baths, sqft, rent, lat/lng)
    • Upserts to properties table (dedup by address + price)
        │
        ▼
  Supabase (PostgreSQL)
    properties ← neighborhoods (ZIP-level scores, ZHVI appreciation)
    email_log, mailboxes, projects, profiles
        │
        ▼
  Cloudflare Pages (lockboxiq.com)
    Single-page dashboard: modular JS + CSS
    • Financial analysis per property (CoC, cash flow, tier classification)
    • Project-based filtering with interactive Leaflet maps
    • Texas Schedule E tax modeling
    • 5/10/15-year exit scenario with appreciation
```

## Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Vanilla JS + CSS | Modular SPA: 10 JS files, 1 CSS file, Leaflet.js maps |
| **Hosting** | Cloudflare Pages | Auto-deploys from `main` branch, serves from `docs/` |
| **Backend** | Supabase | PostgreSQL + Row Level Security + Edge Functions (Deno) |
| **Email Ingestion** | Mailgun | Inbound routing to webhook, `alerts.lockboxiq.com` domain |
| **AI Parsing** | Claude (claude-sonnet-4-20250514) | Extracts structured listing data from email HTML |
| **Maps** | Leaflet.js + CartoDB | Dark-themed tile layer, property geocoding via Census Bureau API |
| **Neighborhood Data** | SimpleMaps + Zillow ZHVI | 1,990 Texas ZCTAs with scores and appreciation rates |

## Project Structure

```
docs/                       # Frontend (Cloudflare Pages root)
├── index.html              # SPA shell (175 lines)
├── css/style.css           # All styles (dark theme, responsive)
├── js/
│   ├── config.js           # Supabase client setup
│   ├── financial.js        # GP params, CoC, Schedule E, exit modeling
│   ├── state.js            # App state, rent mode
│   ├── projects.js         # Project CRUD, filtering, card + modal maps
│   ├── auth.js             # Auth UI
│   ├── session.js          # Session management, mailbox
│   ├── data.js             # Property CRUD
│   ├── render.js           # Dashboard rendering, stats
│   ├── curation.js         # Favorite/skip toggle
│   └── modal.js            # Property detail modal (full financials)
├── img/logo.png            # Brand logo
├── favicon.png             # Favicon
└── *.md                    # Design docs (this directory)

supabase/functions/         # Edge Functions (Deno)
├── inbound-email/index.ts  # Mailgun webhook → parse → upsert
├── properties/index.ts     # GET list / PATCH single property
└── create-mailbox/index.ts # Create mailbox + Mailgun route
```

## Key Features

- **Automatic ingestion** — Email alerts from Zillow/Realtor.com are automatically parsed and added
- **Financial analysis** — Every property gets Cash-on-Cash, cash flow, tier classification (Strong Buy / Consider / Stretch / Walk Away)
- **Rent assumptions** — Toggle Low / Midpoint / High / Mid+5% rent scenarios across all properties
- **Texas Schedule E** — Full tax modeling with depreciation, mortgage interest, operating expenses
- **Exit scenarios** — 5/10/15-year hold modeling with ZHVI-based appreciation by ZIP code
- **Projects** — Group properties by city, type, beds/baths, price; each project card shows a mini-map
- **Interactive maps** — Leaflet.js maps on project cards and modals with geocoded property markers
- **Neighborhood scores** — ZIP-level data: schools, crime safety, walk score, rent growth, appreciation

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, edge functions, map pipeline |
| [DECISIONS.md](docs/DECISIONS.md) | Technical decisions log with rationale |
| [SCHEMA.md](docs/SCHEMA.md) | Database schema (all 6 tables) |
| [ASSUMPTIONS.md](docs/ASSUMPTIONS.md) | Financial assumptions and pass/fail criteria |
| [INVESTMENT_STRATEGIES.md](docs/INVESTMENT_STRATEGIES.md) | Investment metrics and strategies reference |
| [IMPROVEMENTS.md](docs/IMPROVEMENTS.md) | Roadmap and future features |
| [DATA_STANDARDS.md](docs/DATA_STANDARDS.md) | Data integrity policy |

## Quick Start

1. Sign up at [lockboxiq.com](https://lockboxiq.com/)
2. Copy your private `@alerts.lockboxiq.com` email address
3. Add it to Zillow / Realtor.com saved search notifications
4. Properties appear on your dashboard within minutes of each alert email

## Development

```bash
# Frontend changes — push to main, Cloudflare Pages auto-deploys
git push origin main

# Deploy edge function
cd /tmp
SUPABASE_ACCESS_TOKEN="..." supabase functions deploy <name> \
  --project-ref tgborqvdkujajsggfbcy [--no-verify-jwt]

# Query database
curl -s "https://api.supabase.com/v1/projects/tgborqvdkujajsggfbcy/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT ..."}'
```
