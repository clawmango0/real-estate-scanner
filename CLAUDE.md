# LockBoxIQ - Real Estate Investment Scanner

## What This Is
LockBoxIQ is a serverless real estate investment analyzer. Users forward property alert emails (Zillow, Redfin, Realtor.com, HAR) to their personal `@alerts.lockboxiq.com` mailbox. The system parses listings, scrapes enrichment data, estimates rent, and presents everything on a financial analysis dashboard.

**Live:** https://lockboxiq.com

## Architecture

```
Mailgun webhook ──→ inbound-email (Deno edge fn)
                         ├─ parseSubjectLine()     subject regex
                         ├─ parseWithClaude()       Claude AI extraction
                         ├─ scanZillowUrls()        URL extraction + redirect follow
                         ├─ scanRedfinUrls()        Redfin URL extraction
                         ├─ scrapeZillow()          __NEXT_DATA__ + ScraperAPI
                         └─ scrapeRedfin()          JSON-LD extraction

Browser bookmarklet ──→ fetch-listing (Deno edge fn)
                         ├─ parseZillowNextData()   Zillow __NEXT_DATA__
                         ├─ parseRealtorNextData()   Realtor initialReduxState
                         ├─ parseJsonLd()           JSON-LD (Redfin, generic)
                         ├─ parseMetaTags()         og:*/meta description
                         ├─ regexFallback()         HTML pattern matching
                         └─ claudeFallback()        Claude AI last resort

Dashboard (SPA) ──→ properties (Deno edge fn) ──→ Supabase PostgreSQL
                ──→ estimate-rent (Deno edge fn) ──→ Claude API
```

## Tech Stack
- **Frontend:** Vanilla JS (no framework, no build step), served from `docs/` via Cloudflare Pages
- **Backend:** Supabase Edge Functions (Deno/TypeScript) at `supabase/functions/`
- **Database:** Supabase PostgreSQL with RLS
- **Email:** Mailgun inbound routing to `[slug]@alerts.lockboxiq.com`
- **AI:** Claude Sonnet 4 (`claude-sonnet-4-20250514`) for parsing + rent estimation
- **Scraping:** Direct fetch → ScraperAPI (no render) → ScraperAPI (render) fallback chain

## Key Files
| File | Purpose |
|------|---------|
| `supabase/functions/inbound-email/index.ts` | Mailgun webhook handler, email parsing, Zillow/Redfin scraping, agent extraction |
| `supabase/functions/fetch-listing/index.ts` | URL/address-based scraping with multi-parser fallback chain |
| `supabase/functions/estimate-rent/index.ts` | Claude-powered rent estimation |
| `supabase/functions/properties/index.ts` | REST CRUD for properties |
| `docs/js/financial.js` | All investment math: CoC, Schedule E, BRRRR, flip, STR, wholesale |
| `docs/js/config.js` | Supabase client setup, source badges |
| `docs/js/render.js` | Dashboard table rendering with tier coloring |
| `docs/js/data.js` | Property loading with 401 token refresh |

## Parser Fallback Chains

### inbound-email (email → properties)
1. `parseWithClaude()` — AI extraction from email body
2. `parseSubjectLine()` — regex for Zillow "New Listing:" / "Price Cut:" and Redfin "New in City at $NNK"
3. Redfin fallback — `scanRedfinUrls()` → `followRedfinRedirect()` → `scrapeRedfin()` (JSON-LD)
4. ZPID fallback — `scanZillowUrls()` zpids → `scrapeZillow()` (__NEXT_DATA__)
5. Zillow enrichment — `resolveZillowUrl()` → `scrapeZillow()` for missing fields

### fetch-listing (URL → property details)
1. `parseZillowNextData()` / `parseRealtorNextData()` — site-specific __NEXT_DATA__
2. `parseJsonLd()` — JSON-LD structured data
3. `parseMetaTags()` — og:*/meta description
4. `regexFallback()` — HTML pattern matching
5. `claudeFallback()` — AI extraction from raw HTML
6. `searchByAddress()` — Google search → scrape results → Claude on snippets

Quality gate: `detailsQuality()` scores 0-12 (price=3, sqft=2, beds/baths/address/city/zip=1 each). Stops at score >= 6 for early parsers, >= 4 for regex, >= 3 for Claude.

## Conventions
- **Property types:** SFR, DUPLEX, TRIPLEX, QUAD, CONDO, LOT
- **Sources:** zillow, realtor, redfin, har, auction, tax
- **Pipeline stages:** inbox, shortlist, diligence, offer, contract, closed, archived
- **Legacy curation:** fav, ni, blk (kept in sync by setStage() for backwards compat)
- **Conditions:** distressed, needswork, good, updated
- **Improvements:** asis, cosmetic, moderate, fullrehab
- **Default state:** TX (DFW market focus)
- **Dedup key:** `(user_id, address)` — upsert with ON CONFLICT DO UPDATE
- **User-curated fields preserved on upsert:** condition, improvement, curated, notes, monthly_rent

## Environment Variables (Supabase function settings)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` — Claude API
- `MAILGUN_WEBHOOK_SIGNING_KEY` — webhook HMAC validation
- `SCRAPER_API_KEY` — ScraperAPI (optional, for anti-bot bypass)
- `GITHUB_PAT` — for realtor repo updates

## Common Pitfalls
- Zillow emails use zero-width Unicode chars for tracking — `cleanContent()` strips them before Claude parsing
- Redfin plain text is marketing copy, not structured data — always use HTML (stripped) for Redfin
- Zillow tracking URLs (`click.mail.zillow.com`) expire — follow redirects at email-receive time
- ScraperAPI render=true is slow (45s) but needed for JS-only shells
- `inbound-email` always returns 200 to Mailgun (even on error) to prevent retries
- Properties table has no FK on zip — allows properties outside the neighborhoods table
