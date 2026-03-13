# LockBoxIQ Dashboard — UI Specification

*Last updated: 2026-03-13*

## Overview

Single-page application (SPA) for analyzing investment properties. Properties are ingested automatically from email alerts. The dashboard provides financial analysis, filtering, curation, and project-based grouping with interactive maps.

**URL:** [lockboxiq.com](https://lockboxiq.com/)
**Stack:** Vanilla JS (10 modules), CSS, Leaflet.js, Supabase Auth
**Theme:** Dark-only (navy/teal/silver brand palette)

---

## Screens

### 1. Auth Screen (`#auth-screen`)

- Brand logo + "LockBoxIQ" heading
- Tab toggle: Sign In / Create Account
- Email + Password fields (Enter key submits)
- Create Account adds a Full Name field
- Error messages below submit button

### 2. Setup Screen (`#setup-screen`)

Shown after first login when no mailbox exists.

- Congratulations message
- Generated `@alerts.lockboxiq.com` email address with Copy button
- 4-step onboarding instructions (Zillow, Realtor.com, HAR)
- "Open My Dashboard" button

### 3. Main Dashboard (`#app`)

#### Header
- Logo (38px) + "LockBoxIQ" brand text
- Subtitle: "Investment Analyzer · TX Schedule E · 5/10/15-Year Exit"
- Right: "My Inbox Address" button + Sign Out button (shows email)

#### Project Cards Row (`.prow`)
Horizontally scrollable row of cards:

**"All Properties" card** (always first):
- Highlighted border when active
- Shows total Props / Pass / Favs / Avg CF
- Mini-map with all geocoded properties as teal dots

**Project cards** (one per saved project):
- Project name + city/type summary
- Mini-map (70px, non-interactive) showing matching properties
- Stats grid: Props / Pass / Favs / Avg CF
- Gear icon → opens edit modal
- Click card → filters property list to matching properties
- Active card has teal left border accent

**"+ New" card** (always last):
- Opens project create modal

#### Stats Bar (`.sbar`)
Five stat cards in a row:
- Properties (total count)
- Pass Criteria (green, count passing CoC threshold)
- Favorites (amber, user-favorited count)
- New / Drops (new listings + price drops)
- Avg CF (Pass) (average monthly cash flow of passing properties)

#### Top Deal Banner (`.tdeal`)
Highlights the single best property:
- Property address
- Listed price, Strong Buy threshold, estimated rent, neighborhood name

#### Toolbar (`.tbar`)
Three rows of controls:

**View tabs:** All | Favs | Skip
**Filter chips:** All | Pass | Fail | Multi | New | Drop
**Rent mode:** Low | Midpoint | High | Mid +5%

#### Property Table (`#props-container`)
Sortable table with columns:
- Address (clickable → opens detail modal)
- City
- Beds / Baths / Sqft
- Type (SFR, DUPLEX, etc.)
- Listed Price
- Rent estimate
- CoC % (color-coded: green ≥8%, red <8%)
- Cash Flow $/mo (color-coded)
- Tier badge (Strong Buy / Consider / Stretch / Walk Away)
- Neighborhood score
- New/Drop badges
- Fav (⭐) and Skip (👎) buttons

Click any column header to sort. Click again to reverse.

---

## Modals

### Property Detail Modal

Full-page overlay with comprehensive financial analysis:

**Header:** Address + badges (New, Price Drop, SFR/Duplex, Fav)
**Edit button:** Toggle inline editing of condition, improvement, tax rate, rent

**Sections (accordion-style):**

1. **Key Stats** — Listed, $/sqft, Beds/Baths/Sqft, Lot Size
2. **Rent Estimate** — Zestimate range (low-high) with bar chart, or confirmed rent
3. **Price Tiers** — 3-column table (Conservative / Midpoint / Optimistic) × (Strong Buy / Consider / Stretch / Walk Away)
4. **At List Price** — CoC and cash flow at each rent scenario
5. **Offer Range** — Specific dollar amounts for each tier with CoC at each
6. **Neighborhood** — Score badge, area name, appreciation rates, ZHVI
7. **Texas Schedule E** — Full tax worksheet: rental income, expenses, depreciation, NOI, tax savings, after-tax cash flow
8. **Exit Scenarios** — 5/10/15 year projections: appreciation, equity, total return, annualized return
9. **Notes** — User text area
10. **Links** — Zillow listing URL, Google Maps, Zillow home details

### Project Edit Modal

**Map (250px):** Interactive Leaflet map showing:
- Teal dots = properties matching project filters
- Gray dots = all other properties (context)
- Zoom, drag, popups with address + price

**Form fields:**
- Project Name
- Cities (tag input with ✕ remove buttons)
- Property Types (toggle buttons: SFR, DUPLEX, TRIPLEX, QUAD, CONDO, LOT)
- Beds (min – max)
- Baths (min – max)
- Max Listed Price
- Financial Overrides: Down Payment %, Interest Rate %, Hold Period (5/10/15 yr)
- Save / Delete buttons

---

## Visual Design

### Brand Colors (CSS Variables)
```
--bg:      #0B1120    Navy background
--card:    #131C2E    Card surface
--border:  #1E2A3E    Subtle border
--border2: #2A3A52    Stronger border
--text:    #E2E8F0    Primary text (silver)
--text2:   #8899AA    Secondary text
--text3:   #556677    Muted text
--green:   #1CCEBB    Teal (primary accent, pass indicators)
--amber:   #F5A623    Amber (favorites, midpoint)
--red:     #E74C3C    Red (fail indicators)
```

### Typography
- **Poppins** — UI text (400/500/600/700/800/900)
- **DM Mono** — Financial numbers, code-like values
- Base size: 13px

### Card Design
- Background: `var(--card)` with `var(--border)` borders
- Border-radius: 14px (modals), 10px (cards), 6px (buttons)
- Subtle box-shadow on hover

---

## Responsive Behavior

- **Desktop (>768px):** Full table with all columns, side-by-side stats
- **Mobile (<768px):**
  - Hidden columns: City, Beds, Sqft (`.hs` class)
  - Stats bar wraps to 2 columns
  - Modal goes full-width, slides up from bottom
  - Project cards scroll horizontally (unchanged)

---

## Keyboard Shortcuts

- **Escape** — Close any open modal
- **Enter** — Submit auth form

---

## Performance Characteristics

- Initial load: ~190KB own assets + CDN (Supabase, Leaflet, Poppins font)
- Property table: Direct DOM via innerHTML (handles ~100 rows easily)
- Maps: 5-10 mini-maps × ~5 tiles each, all DFW tiles cached across cards
- No framework overhead, no build step, no virtual DOM
