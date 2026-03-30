# LockBoxIQ Architecture Improvement Plan

**Goal:** Bring every dimension to at minimum "GOOD" rating across 6 phases.

---

## Phase 1 — Foundation (Week 1)
*Tests + critical security + accessibility foundation*

### 6.1 Set up Vitest test runner (S)
- Add `vitest` to devDependencies, create `vitest.config.js`
- Add `npm test` and `npm run test:watch` scripts

### 6.2 Test financial.js pure functions (M)
- Create `tests/financial.test.js`
- Test: `pmt()`, `cocCalc()`, `maxPrice()`, `getTiers()`, `classify()`, `schedE()`, `flipCalc()`, `brrrrCalc()`, `localRentEstimate()`, `nbScore()`, `agiToRates()`
- Add conditional `module.exports` to `financial.js` for Vitest import

### 8.1 Add ARIA landmarks and roles (S)
- `role="main"` on `#app`, `role="banner"` on header
- `role="dialog"` + `aria-modal="true"` on every `.ov` overlay
- `role="tablist"` on `#stage-tabs`, `role="tab"` on each tab
- `aria-label` on icon-only buttons (+, print, edit, close)
- `aria-live="polite"` on `#props-container`

### 1.1 Audit and sanitize all innerHTML (M)
- Add `safeHTML` tagged template helper to `config.js`
- Audit all 44 `innerHTML=` assignments across 8 JS files
- Ensure every dynamic string passes through `esc()`

### 1.2 Add server-side input validation (M)
- Add validators to `properties/index.ts` PATCH and POST
- Validate types and ranges: price (0-50M), beds (0-20), baths (0-20), sqft (0-100K), stage (enum), notes (max 10K chars)

### 10.1 Add ESLint (S)
- Add `eslint` + `@eslint/js` to devDependencies
- Create `eslint.config.js` with browser globals + no-undef + eqeqeq
- Add `npm run lint` script

---

## Phase 2 — Safety & Quality (Week 2)
*Accessibility keyboard nav + security headers + code quality*

### 8.2 Keyboard navigation for modals (M)
- Focus trap: Tab cycles within modal, Shift+Tab wraps
- On open: focus close button
- On close: return focus to trigger element

### 8.4 Fix color contrast (S)
- Bump `--text3` from `#6B7D94` to `#8B9DB4` (5.2:1 ratio)
- Bump `--text2` from `#8899AD` to `#94A7BD` (4.8:1 ratio)

### 1.4 Add CSP headers via Cloudflare `_headers` file (S)
- New file: `docs/_headers`
- Lock `script-src` to self + CDN origins + PostHog
- Lock `connect-src` to self + Supabase + PostHog + Census geocoder
- Add `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

### 5.3 Stop auto-setting monthly_rent (S)
- `autoEstimateAll()`: set `rentRange` only, not `monthlyRent`
- Users must explicitly confirm rent (cleaner data, less confusion)

### 10.2 Extract magic numbers to named constants (M)
- `RENT_ESTIMATE_LOW_FACTOR = 0.88`, `FLIP_MAO_RULE = 0.70`, etc.
- Replace all bare numbers in `financial.js`

### 10.3 Add JSDoc to core financial functions (M)
- Document params, return types, and business logic for: `cocCalc`, `maxPrice`, `getTiers`, `schedE`, `exitAt`, `flipCalc`, `brrrrCalc`, `localRentEstimate`

---

## Phase 3 — Performance & Architecture (Week 3)
*Event bus + quick performance/mobile wins*

### 2.1 Introduce event bus (S)
- Add 15-line `Bus` pub/sub to `config.js`
- Replace direct `renderApp()` / `renderProjectCards()` / `renderAnalytics()` calls in `state.js` with `Bus.emit('stateChanged')`
- Register listeners in each module

### 3.3 Defer non-critical JS loading (S)
- Add `defer` to `analytics.js`, `datasources.js`, `export.js`, `tracking.js`
- Move PostHog snippet to end of `<body>`

### 3.4 Ensure all hot paths use updateRow() (M)
- Audit every `renderApp()` call site
- Replace with `updateRow(id)` where only one property changed
- Keep full `renderApp()` for filter/sort/tab changes

### 7.2 Add database indexes (S)
- `idx_properties_user_created` on `(user_id, created_at DESC)`
- `idx_properties_zip` on `(zip)`
- `idx_properties_listed_price` on `(listed_price)`

### 7.3 Throttle backfill to once per session (S)
- Check `sessionStorage.getItem('lbiq_backfilled')` before running
- Reduces unnecessary API calls on every page load

### 9.2 Horizontal scroll for tabs and filter chips on mobile (S)
- `overflow-x:auto` + `-webkit-overflow-scrolling:touch` + hidden scrollbar

---

## Phase 4 — Major Features (Week 4)
*Mobile card view + modal split + data integrity + CI*

### 9.3 Card view for properties on mobile (L)
- Detect `window.innerWidth < 768` in `renderApp()`
- Render cards instead of table rows: address, price, CoC, rent, badges
- Cards tap to open modal

### 2.2 Split modal.js into 3 files (M)
- `modal-core.js` — lifecycle (buildMod, openM, closeMod, toggleEdit)
- `modal-financial.js` — Schedule E, exit analysis, tax scenarios
- `modal-map.js` — Leaflet neighborhood map

### 5.1 Add optimistic concurrency with updated_at (M)
- Migration: add `updated_at` column + trigger
- PATCH accepts `If-Match` header with timestamp
- On conflict: return 409, frontend shows "updated elsewhere" toast

### 6.3 Test shapeProperty (S)
- Extract to `supabase/functions/properties/shape.ts`
- Test: address stripping, city fallback, rent range, type normalization, stage migration

### 6.4 Test edge function request handling (M)
- Mock Supabase client
- Test: GET, POST validation, PATCH field stripping, DELETE, 401

### 6.5 Add GitHub Actions CI (S)
- Run `npm test` + `npm run lint` on push and PR

---

## Phase 5 — Scale & Batch (Week 5)
*Batch API + pagination + rate limiting*

### 3.1 Batch auto-estimate saves (S)
- Replace 100+ concurrent `saveProperty()` calls with chunks of 20
- `await Promise.all(chunk.map(...))`

### 3.2 Add batch PATCH endpoint (M)
- `PATCH /properties` (collection) accepts array of `{id, ...updates}`
- Max 50 items per request
- Same validation as single PATCH

### 7.1 Add server-side pagination (M)
- Backend: `?limit=500&offset=0` with `X-Total-Count` header
- Frontend: fetch in pages, render after first page arrives

### 1.5 Add rate limiting (M)
- `rate_limits` table: `(user_id, endpoint, window_start, count)`
- Check < 60 per minute on POST/PATCH, return 429 if exceeded

### 5.2 Normalize addresses before dedup (S)
- `normalizeAddress()`: Street→St, Drive→Dr, collapse whitespace
- Apply on INSERT/UPSERT before conflict check

### 9.1 Responsive header with hamburger menu (M)
- Hide header buttons at 768px, show in dropdown panel
- `☰` toggle button

---

## Phase 6 — Polish (Week 6)
*Namespace, skip link, dead code, rename vars*

### 2.3 Namespace global state (S)
- Wrap all globals into `AppState` object
- Keep old names as property aliases for backwards compat

### 8.3 Arrow-key navigation for tab bar (S)
- Left/Right arrows move focus between tabs

### 8.5 Add skip-to-content link (S)
- `<a href="#props-container" class="skip-link">Skip to properties</a>`
- Visible on focus, hidden otherwise

### 9.4 Touch-friendly stage selector on mobile (S)
- Increase `<select>` hit target: `font-size:.75rem; padding:.5rem; min-height:36px`

### 10.4 Remove dead code (S)
- Delete unused `createMailbox()` in `session.js`
- Verify no other dead functions exist

### 10.5 Rename cryptic state variables (M)
- `aV` → `currentView`, `aF` → `currentFilter`, `sCol` → `sortColumn`
- Use `Object.defineProperty` aliases for backwards compat
- Migrate callsites incrementally

### 1.3 Replace localStorage token with sessionStorage (S)
- Change `localStorage.setItem('lbiq_token',...)` to `sessionStorage`
- Update bookmarklet to read from `sessionStorage`

---

## Summary

| Phase | Tasks | Effort | Key Outcome |
|-------|-------|--------|-------------|
| **1** | 6 tasks | ~4 days | Tests exist, XSS hardened, ARIA landmarks, linting |
| **2** | 6 tasks | ~3 days | Keyboard a11y, CSP headers, cleaner rent flow, JSDoc |
| **3** | 6 tasks | ~3 days | Event bus decoupling, faster renders, DB indexes |
| **4** | 6 tasks | ~5 days | Mobile cards, modal split, CI pipeline, data integrity |
| **5** | 6 tasks | ~5 days | Batch API, pagination, rate limiting, address normalization |
| **6** | 7 tasks | ~3 days | Clean globals, keyboard nav polish, dead code removal |

**Total: 37 tasks across 6 weeks**

All changes are incremental and non-breaking. No full rewrite required.
Each phase can be shipped independently — later phases don't block earlier ones.
