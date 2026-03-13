# Data Standards & Integrity Policy

*Last updated: 2026-03-13*

---

## Core Principle

**No hallucinations, no guesses, no fabricated data.**

All property data displayed on the dashboard must come from a verified source. Estimated values must be clearly labeled.

---

## Data Source Classification

| Data | Source | Confidence |
|------|--------|------------|
| Address, beds, baths, sqft | Zillow `__NEXT_DATA__` or email body (Claude-parsed) | **Verified** |
| Listed price | Listing email subject/body | **Verified** |
| Rent estimate (Zestimate) | Zillow `__NEXT_DATA__` `rentZestimate` | **Estimated** — labeled as range |
| Confirmed rent | User-entered `monthly_rent` | **Verified** — overrides estimates |
| Latitude / Longitude | Zillow `__NEXT_DATA__` or Census Bureau geocoder | **Verified** (Zillow) / **Approximated** (geocoder) |
| Neighborhood area name | SimpleMaps ZCTA data | **Verified** |
| ZHVI appreciation rates | Zillow Home Value Index CSV | **Verified** (point-in-time) |
| Neighborhood scores | Not yet populated | **Missing** — shown as "—" |
| Property condition | User-entered or default "good" | **Assumed** unless manually set |
| Financial calculations | Deterministic formulas in `financial.js` | **Calculated** — based on GP params |

---

## Rules

### What We Show
- Calculations based on verified listing data (price, beds, baths, sqft)
- Rent estimates clearly labeled as ranges with source (Zestimate)
- Tier classifications (Strong Buy / Consider / Stretch / Walk Away) based on CoC thresholds
- Neighborhood data where available, blank where not

### What We Don't Show
- Fabricated condition scores or rehab estimates
- Rankings based on unverified data
- "Top deal" designations without real financials behind them
- AI-generated property descriptions not sourced from listings

### When Data Is Missing
- Display "—" or leave blank, never substitute a guess
- `rentRange` returns null if no Zestimate → property shows $0 rent and fails financial criteria
- Neighborhood scores show "—" for ZIPs without data
- Properties without lat/lng are excluded from maps but still appear in the table

---

## Email Parsing Integrity

The `inbound-email` edge function has a strict extraction chain:

1. **Zillow `__NEXT_DATA__`** — Most reliable. Structured JSON directly from Zillow's page data. Preferred source for all fields.
2. **Claude AI parsing** — Used when `__NEXT_DATA__` extraction fails. Claude is prompted to extract only explicitly stated values, never infer.
3. **Subject-line regex** — Last resort for simple "New Listing: 123 Main St" formats. Only extracts address and price.

Each email is logged to `email_log` with `parse_status` indicating how it was processed. Failed parses are preserved for debugging.

---

## Deduplication

Properties are deduped by `(user_id, address, listed_price)`. This means:
- Same property at same price from multiple emails → single record (no duplicates)
- Same property at a new price → new record with `price_drop` flag
- Different properties at same address → impossible (address is unique per listing)

---

*This policy applies to all data displayed on lockboxiq.com and stored in Supabase.*
