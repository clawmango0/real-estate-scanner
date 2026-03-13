# Investment Assumptions & Financial Parameters

*Last updated: 2026-03-13*

These are the default financial parameters used by the LockBoxIQ dashboard for all property analysis. They can be overridden per-project via the project edit modal.

---

## Target Market

- **Location:** Fort Worth / DFW Metroplex (Tarrant County and surrounding)
- **Property Types:** SFR and multi-family (duplexes preferred)
- **Price Range:** Up to ~$350K (flexible via project max_price filter)

---

## Global Parameters (GP)

These defaults are defined in `docs/js/financial.js` and used for all calculations unless overridden by a project.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Down Payment | **25%** | Standard investor conventional loan |
| Interest Rate | **6.875%** | Current market rate (March 2026) |
| Loan Term | **30 years** | Standard fixed-rate mortgage |
| CoC Minimum | **8%** | Threshold for "Pass" classification |
| Vacancy | **5%** of gross rent | DFW market average |
| Maintenance | **8%** of gross rent | Conservative (covers routine repairs) |
| CapEx Reserve | **5%** of gross rent | Major repairs (roof, HVAC, etc.) |
| Management | **0%** | Self-managed (increase to 10% if hiring PM) |
| Insurance | **$175/mo** | Texas average for investment properties |
| Property Tax | **2.2%** of purchase price/year | Tarrant County average |

### Effective Expense Ratio

Total operating expenses as % of gross rent:
- Vacancy (5%) + Maintenance (8%) + CapEx (5%) + Management (0%) = **18%** of rent
- Plus fixed: Insurance ($175/mo) + Property Tax (varies by price)

This is more detailed than the simple "50% rule" — actual expenses typically run 35-45% for DFW.

---

## Tier Classification

Properties are classified by Cash-on-Cash return at listing price:

| Tier | CoC Threshold | Color | Meaning |
|------|--------------|-------|---------|
| **Strong Buy** | ≥ 10% | Green | Excellent return, move fast |
| **Consider** | ≥ 8% | Amber | Good return, worth pursuing |
| **Stretch** | ≥ 5% | Gray | Marginal, needs negotiation |
| **Walk Away** | < 5% | Red | Insufficient return |

Each tier also computes a **maximum purchase price** at the given rent, working backwards from the target CoC to determine what price delivers that return.

---

## Rent Assumptions

Four modes available (toggle in toolbar):

| Mode | Calculation | Use Case |
|------|------------|----------|
| **Low** | Bottom of Zestimate range | Conservative underwriting |
| **Midpoint** | Average of low + high | Default, balanced estimate |
| **High** | Top of Zestimate range | Optimistic scenario |
| **Mid +5%** | Midpoint × 1.05 (rounded to nearest $25) | Slight upside assumption |

**Priority:** If user enters a confirmed `monthly_rent`, it always overrides Zestimate-based estimates.

**Zestimate range:** When available from Zillow, `rent_estimate ± 15%` creates the low/high range.

---

## Schedule E Tax Modeling

Full Texas Schedule E worksheet per property:

| Line Item | Calculation |
|-----------|-------------|
| Gross Rent | Effective rent × 12 |
| Less: Vacancy | 5% of gross |
| Effective Rental Income | Gross - Vacancy |
| Less: Insurance | $175 × 12 |
| Less: Property Tax | 2.2% × purchase price |
| Less: Maintenance | 8% × gross rent |
| Less: Mortgage Interest | Amortization schedule (year-specific) |
| Less: Depreciation | (Price × 85% × improvement factor) ÷ 27.5 years |
| Taxable Income / (Loss) | Sum of above |
| Tax Savings | Loss × marginal tax rate |
| After-Tax Cash Flow | Pre-tax cash flow + tax savings |

**Tax rates (default):**
- Marginal rate: 32%
- Long-term capital gains: 15%

**Improvement factors** (multiplier on depreciable basis):
- As-is: 1.0×
- Cosmetic ($10K): adds to basis
- Moderate ($25K): adds to basis
- Major ($50K): adds to basis

---

## Exit Scenario Modeling

5, 10, and 15-year hold projections using:

| Input | Source |
|-------|--------|
| Appreciation rate | ZIP-level ZHVI data (`appreci_5yr` annualized) |
| Remaining balance | Amortization schedule at exit year |
| Selling costs | 6% of future value (agent commissions) |
| Capital gains | Future value - purchase price - improvements |
| LTCG tax | 15% of capital gains |

**Output per exit year:**
- Future property value
- Total equity (value - remaining mortgage)
- Net proceeds (after selling costs + LTCG tax)
- Total return (cash flow + equity + tax savings)
- Annualized return (IRR equivalent)

---

## Pass/Fail Criteria

A property "passes" if:

| Metric | Requirement |
|--------|-------------|
| Cash-on-Cash | ≥ 8% (configurable via GP.cocMin) |
| Cash Flow | > $0/mo (implicit from positive CoC) |

**Additional metrics displayed but not gating:**
- Price per sqft
- Neighborhood score (schools, safety, walkability)
- Appreciation rate (1yr, 3yr, 5yr)

---

*These assumptions are encoded in `docs/js/financial.js` (GP object). Project-level overrides are stored in the `projects` table (`down_pct`, `rate`, `hold_yrs` columns).*
