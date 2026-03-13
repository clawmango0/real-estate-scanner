# Database Schema

Supabase PostgreSQL — project ref: `tgborqvdkujajsggfbcy`

All tables have Row Level Security (RLS) enabled. Users can only access their own data.

---

## Tables

### `profiles`

User accounts. Created automatically on Supabase Auth signup via trigger.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | — | PK, matches `auth.users.id` |
| `email` | text | NO | — | User email |
| `full_name` | text | YES | — | Display name |
| `plan` | text | NO | — | Account tier (currently all 'free') |
| `created_at` | timestamptz | NO | `now()` | |

### `mailboxes`

Per-user inbound email addresses.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | — | PK |
| `user_id` | uuid | NO | — | FK → profiles.id |
| `slug` | text | NO | — | Email prefix (e.g., `ian-kelly-ca99`) |
| `display_name` | text | YES | — | |
| `domain` | text | NO | — | Always `alerts.lockboxiq.com` |
| `active` | boolean | NO | — | |
| `created_at` | timestamptz | NO | — | |

Full address: `{slug}@{domain}`

### `properties`

Core table. One row per property per user per price point.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `user_id` | uuid | NO | — | FK → profiles.id |
| `mailbox_id` | uuid | YES | — | FK → mailboxes.id |
| `address` | text | NO | — | Full street address |
| `city` | text | YES | — | Parsed city name |
| `state` | text | YES | `'TX'` | |
| `zip` | text | YES | — | 5-digit ZIP code |
| `listed_price` | numeric | YES | — | Current listing price |
| `beds` | numeric | YES | — | Bedroom count |
| `baths` | numeric | YES | — | Bathroom count |
| `sqft` | numeric | YES | — | Living area square footage |
| `property_type` | text | YES | — | SFR, DUPLEX, TRIPLEX, QUAD, CONDO, LOT |
| `listing_url` | text | YES | — | Zillow/Realtor.com URL |
| `source` | text | YES | — | `zillow`, `realtor`, etc. |
| `monthly_rent` | numeric | YES | — | User-confirmed actual rent |
| `rent_estimate` | integer | YES | — | Zillow Zestimate rent |
| `lot_size` | numeric | YES | — | Lot size in sqft |
| `latitude` | double precision | YES | — | Geocoded latitude |
| `longitude` | double precision | YES | — | Geocoded longitude |
| `condition` | text | YES | `'good'` | Property condition assessment |
| `improvement` | text | YES | `'asis'` | Improvement strategy |
| `status` | text | YES | `'new'` | Listing status |
| `curated` | text | YES | — | `'fav'`, `'ni'` (not interested), or null |
| `notes` | text | YES | — | User notes |
| `is_new` | boolean | YES | `true` | New listing flag |
| `price_drop` | boolean | YES | `false` | Price reduction detected |
| `price_drop_amt` | numeric | YES | `0` | Amount of price drop |
| `raw_json` | jsonb | YES | — | Full raw data from source |
| `email_log_id` | uuid | YES | — | FK → email_log.id |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Unique constraint:** `(user_id, address, listed_price)` — prevents duplicate imports.

**No FK on zip:** Intentionally removed (2026-03-10). The original FK to `neighborhoods.zip` blocked inserts for properties in ZIPs not in the neighborhoods table.

### `email_log`

Audit trail for all inbound emails.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | — | PK |
| `user_id` | uuid | YES | — | FK → profiles.id |
| `mailbox_id` | uuid | YES | — | FK → mailboxes.id |
| `received_at` | timestamptz | NO | — | |
| `from_address` | text | YES | — | Sender email |
| `subject` | text | YES | — | Email subject line |
| `parse_status` | text | YES | — | `pending`, `success`, `no_listings`, `failed`, `verified`, `verify_failed` |
| `properties_found` | integer | YES | — | Count of properties extracted |
| `error_message` | text | YES | — | Error details if failed |
| `raw_payload` | jsonb | YES | — | Full Mailgun webhook payload |

### `projects`

Saved filter presets with optional financial overrides.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → profiles.id |
| `name` | text | NO | — | Project display name |
| `cities` | text[] | NO | `ARRAY[]::text[]` | City filter list |
| `prop_types` | text[] | NO | `ARRAY[]::text[]` | Property type filter |
| `min_beds` | numeric | YES | — | Min bedroom filter |
| `max_beds` | numeric | YES | — | Max bedroom filter |
| `min_baths` | numeric | YES | — | Min bathroom filter |
| `max_baths` | numeric | YES | — | Max bathroom filter |
| `max_price` | numeric | YES | — | Max listing price filter |
| `down_pct` | numeric | YES | — | Override: down payment % |
| `rate` | numeric | YES | — | Override: interest rate |
| `hold_yrs` | integer | YES | — | Override: hold period (5, 10, or 15) |
| `created_at` | timestamptz | NO | `now()` | |

**Filtering is client-side.** The `projectFilter(property, project)` function checks each property against all non-null filter criteria. All criteria must match (AND logic). Null criteria are skipped.

### `neighborhoods`

ZIP-level neighborhood data for Texas (1,990 ZCTAs).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `zip` | text | NO | — | PK, 5-digit ZIP/ZCTA |
| `area_name` | text | YES | — | "City, County" description |
| `schools` | numeric | YES | — | School quality score (future) |
| `crime_safety` | numeric | YES | — | Crime safety score (future) |
| `walk_score` | integer | YES | — | Walk Score (future) |
| `rent_growth` | numeric | YES | — | Annual rent growth % (future) |
| `appreci_1yr` | numeric | YES | — | 1-year ZHVI appreciation % |
| `appreci_3yr` | numeric | YES | — | 3-year ZHVI appreciation % |
| `appreci_5yr` | numeric | YES | — | 5-year ZHVI appreciation % |
| `zhvi_current` | numeric | YES | — | Current Zillow Home Value Index |
| `updated_at` | date | YES | — | Last data refresh |

**Data sources:**
- `zip`, `area_name`: SimpleMaps (loaded 2026-03-10)
- `zhvi_current`, `appreci_*`: Zillow ZHVI CSV (loaded 2026-03-12)
- `schools`, `crime_safety`, `walk_score`, `rent_growth`: Not yet populated

---

## Key Relationships

```
profiles (1) ──── (N) mailboxes
    │                    │
    │                    │
    ├──── (N) properties ┘ (via mailbox_id)
    │         │
    │         └── neighborhoods (via zip, LEFT JOIN, no FK)
    │
    ├──── (N) projects
    │
    └──── (N) email_log
```

---

## Current Stats (2026-03-13)

- **78** properties (all geocoded)
- **25** distinct cities
- **1,990** neighborhood ZIP records
- **3** projects
- **1** active mailbox
