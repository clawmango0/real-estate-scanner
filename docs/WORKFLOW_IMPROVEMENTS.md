# Workflow Improvements Plan

Six improvements to the LockBoxIQ user experience, ordered by implementation priority (dependencies flow downward).

---

## 1. Persist STR/Commercial/Passive Inputs

**Priority:** First — fixes a data-loss bug that blocks entire strategies.

### Problem
Project-specific inputs (`_str_adr`, `_str_occ`, `_str_clean`, `_str_plat`, `_ws_assign`, `_ws_rehab`, `_comm_units`, `_comm_rpu`, `_comm_vac`, `_pass_invest`, `_pass_pref`, `_pass_hold`, `_pass_eqm`) are stored on the in-memory `activeProject` object but never saved to the database. They vanish on page refresh.

### Schema Change
```sql
ALTER TABLE projects ADD COLUMN strategy_params jsonb DEFAULT '{}';
```

Single JSONB column is simpler and more flexible than 13 individual columns. The frontend reads/writes a flat object:
```json
{
  "str_adr": 150, "str_occ": 0.70, "str_clean": 75, "str_plat": 0.03,
  "ws_assign": 0.07, "ws_rehab": 0.10,
  "comm_units": 4, "comm_rpu": 800, "comm_vac": 0.05,
  "pass_invest": 50000, "pass_pref": 0.08, "pass_hold": 5, "pass_eqm": 2.0
}
```

### Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/properties/index.ts` | Add `strategy_params` to project CRUD whitelist |
| `docs/js/projects.js` | `saveProject()`: serialize `_str_*` etc. into `strategy_params` before POST. `renderProjectCards()` / `_applyProjectGP()`: hydrate `_str_*` from `strategy_params` on load |
| `docs/js/modal.js` | Strategy-specific input `onchange` handlers: write to `activeProject._str_*` AND mark project dirty for save |

### Migration
Backwards-compatible: existing projects get `{}` default, frontend falls back to hardcoded defaults when keys are missing.

---

## 2. Inline Deal Summary (Expand Row)

**Priority:** Second — biggest daily-use friction reduction.

### Concept
Click a row's expand arrow (or press Space) to reveal a summary panel below the row without opening the full modal. Shows:
- One-line verdict: "Strong cash flow in a B+ neighborhood" / "Overpriced by $35K — Walk Away"
- Key metrics for active strategy (Buy & Hold: CoC, CF/mo, tier classification; Flipper: ROI, MAO vs list; etc.)
- Neighborhood score breakdown (mini bar: schools/safety/growth)
- Rent estimate source + confidence ("Zillow Zestimate" vs "Local estimate (Mid)")

### Files to Modify
| File | Change |
|------|--------|
| `docs/js/render.js` | Add expand toggle to each `<tr>`, insert `<tr class="expand-row">` after each property row (hidden by default). New `_expandRow(p, it)` function generates summary HTML. |
| `docs/js/financial.js` | New `verdict(p)` function: returns a one-line string based on tier classification + neighborhood score + CoC |
| `docs/css/style.css` | `.expand-row` styles: slide-down animation, dark bg, grid layout for metrics |
| `docs/js/state.js` | `expandedIds` Set to track which rows are expanded |

### Interaction
- Click expand arrow (chevron at row start) or press `Space` when row is focused
- Expanding a row does NOT open the modal
- Only one row expanded at a time (accordion behavior)
- Clicking the expand row itself opens the full modal

### Verdict Logic
```
if CoC >= cocStrong && nbScore >= 68 → "Strong buy — excellent cash flow in a top neighborhood"
if CoC >= cocMin && nbScore >= 50    → "Passing deal — solid returns, decent area"
if CoC >= cocMin && nbScore < 50     → "Good cash flow but weaker neighborhood — verify area"
if listed <= tiers.consider           → "Near target price — worth deeper analysis"
if listed > tiers.stretch             → "Overpriced by $X — would need to drop to $Y"
```

---

## 3. Smart Resurfacing

**Priority:** Third — turns existing data into new opportunities.

### Concept
Properties get flagged for re-evaluation when circumstances change:
1. **Price drop on skipped property**: User set `curated='ni'` but a new email shows a lower price → flag it
2. **Status flip**: GP or rent mode change causes a property to move from `fail` → `pass`
3. **Stale skip**: Property was skipped > 30 days ago and price has dropped since

### Implementation

#### New property field
```sql
ALTER TABLE properties ADD COLUMN resurface boolean DEFAULT false;
ALTER TABLE properties ADD COLUMN resurface_reason text;
```

#### Detection triggers

**Price drop on skip** — already detected in `inbound-email/index.ts` upsert flow. Add:
```typescript
// After upsert, if the property was curated='ni' and price dropped:
if (upserted && isPriceDrop) {
  const { data: existing } = await supabase.from('properties')
    .select('curated').eq('id', upserted.id).single();
  if (existing?.curated === 'ni') {
    await supabase.from('properties')
      .update({ resurface: true, resurface_reason: 'Price dropped since you skipped this' })
      .eq('id', upserted.id);
  }
}
```

**Status flip** — client-side in `recomputeRents()`:
```javascript
function recomputeOne(p) {
  const oldStatus = p.status;
  // ... existing recomputation ...
  if (oldStatus === 'fail' && p.status === 'pass' && p.curated === 'ni') {
    p._resurface = true;
    p._resurfaceReason = 'Now passes criteria with current settings';
  }
}
```

#### UI
- New filter chip: **"🔄 Revisit"** — shows properties where `resurface=true` or `_resurface=true`
- Badge on the filter chip with count
- Dismissing: when user opens the property modal or re-curates, clear the resurface flag

### Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/inbound-email/index.ts` | Set `resurface=true` on price-drop upserts for skipped properties |
| `supabase/functions/properties/index.ts` | Add `resurface`, `resurface_reason` to PATCH whitelist |
| `docs/js/state.js` | `recomputeOne()`: detect fail→pass flips on skipped props |
| `docs/js/render.js` | New "Revisit" filter chip, resurface badge in table rows |
| `docs/js/modal.js` | Clear resurface on modal open |
| `docs/js/data.js` | Map `resurface` + `resurface_reason` from API response |

---

## 4. Project Templates

**Priority:** Fourth — lowers barrier to entry for new users.

### Concept
Pre-built project configurations shown in the project creation modal. One click to populate all fields, then customize.

### Templates
```javascript
const PROJECT_TEMPLATES = [
  {
    name: 'DFW Cash Flow Starter',
    investment_type: 'buyhold',
    cities: ['Fort Worth', 'Arlington', 'Crowley', 'Burleson'],
    prop_types: ['SFR'],
    max_price: 250000,
    down_pct: 0.25,
    rate: null,  // use global default
    description: 'Single-family homes under $250K in south/west Fort Worth suburbs. Focus on cash flow with 25% down.'
  },
  {
    name: 'DFW Flip Finder',
    investment_type: 'flipper',
    cities: ['Fort Worth', 'Dallas', 'Hurst', 'Euless'],
    prop_types: ['SFR'],
    max_price: 200000,
    description: 'Distressed SFR under $200K in established neighborhoods. Look for cosmetic-to-moderate rehab opportunities.'
  },
  {
    name: 'Multi-Family Builder',
    investment_type: 'commercial',
    cities: [],
    prop_types: ['DUPLEX', 'TRIPLEX', 'QUAD'],
    max_price: 400000,
    description: 'Duplexes, triplexes, and quads. Evaluate on cap rate and DSCR.'
  },
  {
    name: 'BRRRR Strategy',
    investment_type: 'brrrr',
    cities: [],
    prop_types: ['SFR'],
    max_price: 180000,
    description: 'Underpriced SFR for buy-rehab-rent-refi-repeat. Target properties that appraise 25%+ above purchase after rehab.'
  },
  {
    name: 'STR / Airbnb Play',
    investment_type: 'str',
    cities: [],
    prop_types: ['SFR', 'CONDO'],
    max_price: 350000,
    strategy_params: { str_adr: 175, str_occ: 0.65, str_clean: 85, str_plat: 0.03 },
    description: 'Short-term rental candidates. Evaluate on RevPAR and gross revenue potential.'
  }
];
```

### Files to Modify
| File | Change |
|------|--------|
| `docs/js/projects.js` | Add `PROJECT_TEMPLATES` array. In `openProjMod()`, render template picker above the form. `useTemplate(idx)` pre-fills all form fields. |
| `docs/css/style.css` | Template card styles (small cards in a row, each with name + short description + "Use" button) |

### No backend changes needed — templates are client-side only. They just pre-fill the existing project creation form.

---

## 5. Pipeline Stages (replaces binary curation)

**Priority:** Fifth — requires more UI/UX rethinking, depends on resurfacing (#3).

### Current State
`curated` column: `null` (inbox) | `fav` (favorite) | `ni` (not interested) | `blk` (blocked)

### Proposed Pipeline
```
inbox → shortlist → diligence → offer → contract → closed
                                                      ↘ archived (replaces blk + ni)
```

### Schema Change
```sql
-- Add pipeline stage column (keep curated for backwards compat during migration)
ALTER TABLE properties ADD COLUMN stage text DEFAULT 'inbox'
  CHECK (stage IN ('inbox','shortlist','diligence','offer','contract','closed','archived'));

-- Migrate existing data
UPDATE properties SET stage = 'shortlist' WHERE curated = 'fav';
UPDATE properties SET stage = 'archived' WHERE curated IN ('ni', 'blk');
```

### UI Changes

**Tab bar** replaces All/Favs/Skip with pipeline stages:
```
[Inbox 23] [Shortlist 8] [Diligence 3] [Offer 1] [Contract 0] [Closed 0] [Archived]
```

**Curation buttons** in table rows and modal become stage-advance buttons:
- In Inbox: `→ Shortlist` | `Archive`
- In Shortlist: `→ Due Diligence` | `← Inbox` | `Archive`
- In Diligence: `→ Offer` | `← Shortlist` | `Archive`
- etc.

**Keyboard shortcuts**: `→` advances stage, `←` moves back, `x` archives

### Files to Modify
| File | Change |
|------|--------|
| DB migration | Add `stage` column, migrate from `curated` |
| `supabase/functions/properties/index.ts` | Add `stage` to PATCH whitelist |
| `docs/js/curation.js` | Replace `curate()` with `setStage(id, stage)`. Keep `curate()` as alias during transition. |
| `docs/js/render.js` | Tab bar renders stage tabs. `vis()` filters by stage. Row buttons show stage transitions. |
| `docs/js/modal.js` | Stage selector in modal header |
| `docs/js/state.js` | `aV` state values change from `all/favs/ni` to stage names |
| `docs/js/data.js` | Map `stage` from API, handle missing (default 'inbox') |

### Backwards Compatibility
- Keep `curated` column readable for 1 release cycle
- Frontend reads `stage` if present, falls back to mapping `curated` → stage
- Pipeline stage analytics (funnel conversion) goes into the analytics tab

---

## 6. Export / Sharing

**Priority:** Sixth — nice-to-have, can ship after core workflow is solid.

### CSV Export
Export current table view (respects project filter, tab, sort) as downloadable CSV.

```javascript
function exportCSV() {
  const list = vis();  // current filtered/sorted view
  const headers = ['Address','City','Zip','Price','Beds','Baths','Sqft','Type',
                   'Rent','CoC','Cash Flow/mo','NB Score','Status','Source'];
  const rows = list.map(p => [
    p.address, p.city, p.zip, p.listed, p.beds, p.baths, p.sqft, p.type,
    effectiveRent(p), p._cocL ? (p._cocL*100).toFixed(1)+'%' : '',
    p._cfL ? p._cfL.toFixed(0) : '', p._nbScore, p.status, p.source
  ]);
  const csv = [headers, ...rows].map(r => r.map(c =>
    `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lockboxiq-${activeProject?.name||'all'}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Deal Packet (Single Property)
The print button already exists in the modal (`printMod()`). Enhance it:
- Cleaner print stylesheet (already exists in style.css)
- Add "Share Link" that copies a deep link: `https://lockboxiq.com/?prop=<id>` (requires auth to view)
- Future: PDF generation via browser print-to-PDF

### Files to Modify
| File | Change |
|------|--------|
| `docs/js/render.js` | Add export button to toolbar. `exportCSV()` function. |
| `docs/index.html` | Export button in `.tbar` |
| `docs/css/style.css` | Export button styles |

---

## Implementation Order

```
1. Persist STR/Commercial inputs     (bug fix, 1-2 hours)
2. Inline Deal Summary               (new feature, 3-4 hours)
3. Smart Resurfacing                  (new feature, 2-3 hours)
4. Project Templates                  (new feature, 1-2 hours)
5. Pipeline Stages                    (refactor, 4-6 hours)
6. Export / Sharing                   (new feature, 1-2 hours)
```

Features 1-4 are independent and can be built in parallel.
Feature 5 (Pipeline) touches the most files and should be done after 1-3 are stable.
Feature 6 is standalone and can ship anytime.
