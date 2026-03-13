# Deal Evaluation Framework

How properties are evaluated for go/no-go investment decisions.

---

## Pass/Fail Criteria

### Must Pass (all required)

| Metric | Threshold | Source |
|--------|-----------|--------|
| Cash Flow | > $0/mo | `financial.js` → `cocCalc()` |
| Cash-on-Cash | ≥ 8% | GP.cocMin (configurable per project) |
| DSCR | > 1.25 | Debt Service Coverage Ratio |

### Should Pass (at least 3 of 4)

| Metric | Threshold | Notes |
|--------|-----------|-------|
| Cap Rate | > 5% | NOI / Purchase Price |
| GRM | < 12 | Gross Rent Multiplier |
| 1% Rule | rent ≥ 1% of price | Quick screen |
| Vacancy risk | Low | DFW market currently ~5% |

---

## Tier Classification

Properties are auto-classified by the dashboard based on CoC at listing price:

| Tier | CoC | Action |
|------|-----|--------|
| **Strong Buy** | ≥ 10% | Move fast — submit offer at or near ask |
| **Consider** | ≥ 8% | Good deal — negotiate for better terms |
| **Stretch** | ≥ 5% | Marginal — only proceed with significant price reduction |
| **Walk Away** | < 5% | Pass unless major value-add opportunity |

---

## Scoring Formula

When comparing multiple deals:

**Score = Cash Flow (30%) + CoC (25%) + Cap Rate (15%) + DSCR (15%) + Price/Sqft (15%)**

Each metric is normalized to a 0–10 scale relative to the analysis set.

---

## Due Diligence Checklist

For any property reaching "Consider" or higher:

- [ ] Verify listing data (price, beds, baths, sqft) against MLS
- [ ] Confirm rent estimate with local comps (Zillow, Rentometer)
- [ ] Property inspection (structure, roof, HVAC, plumbing, electrical)
- [ ] Foundation inspection (Texas-specific concern)
- [ ] Insurance quotes (at least 2)
- [ ] Tax assessment verification (Tarrant County Appraisal District)
- [ ] HOA rules review (if applicable)
- [ ] Lease review (if tenant-occupied)
- [ ] Title search
- [ ] Contractor estimate for any needed repairs

---

## Historical Analysis (2026-02-24)

> **Note:** This analysis is from early project development, before the automated email ingestion pipeline was built. Included as a methodology example.

| Property | Price | Cash Flow | CoC | Decision |
|----------|-------|-----------|-----|----------|
| 7652 Colorado Creek | $212K | +$1,025/mo | 12.3% | PROCEED |
| 8812 Texas Risinger | $203K | +$1,069/mo | 12.8% | PROCEED |
| 4516 Rutland | $215K | +$701/mo | 8.4% | CAUTION |
| 5113 Bob Dr | $170K | +$596/mo | 7.2% | CONDITIONAL |
| 2933 Sycamore | $450K | −$313/mo | −3.8% | PASS |

Current deal analysis is done live on the dashboard at [lockboxiq.com](https://lockboxiq.com/).

---

*See [ASSUMPTIONS.md](../docs/ASSUMPTIONS.md) for financial parameters and [INVESTMENT_STRATEGIES.md](../docs/INVESTMENT_STRATEGIES.md) for strategy reference.*
