# 🏠 Real Estate Scanner - Wedgewood & Crowley, TX

Comprehensive investment analysis tool for real estate scouting.

![Properties](https://img.shields.io/badge/Properties-25-orange)
![Features](https://img.shields.io/badge/Features-9-brightgreen)
![Status](https://img.shields.io/badge/Status-Active-blue)

## Features

### 1. 📊 Investment Metrics
- Full financial analysis with mortgage, taxes, insurance
- 1% Rule, GRM, Cap Rate, DSCR, Cash-on-Cash
- Uses Mr. Kelly's exact 70-point scoring rubric

### 2. 🔧 Rehab Estimator
- Condition scoring (1-10)
- Rehab cost estimates based on condition
- After Repair Value (ARV) calculation
- Potential equity after rehab

### 3. 📈 Appreciation Projections
- Conservative (3%), Moderate (5%), Aggressive (7%) scenarios
- 5-year projections including:
  - Price appreciation
  - Principal paydown
  - Total return analysis

### 4. 🔄 BRRRR Calculator
- Buy, Rehab, Rent, Refinance, Repeat analysis
- Total cash needed calculation
- Post-refinance cash flow
- Cash-on-Cash after refi

### 5. 🎯 Sensitivity Analysis
- Interest rate impact (5-9%)
- Down payment variations (10-30%)
- Break-even scenarios

### 6. 💰 Taxes & Insurance
- Texas property tax rates (Ft Worth: 1.95%, Crowley: 1.85%)
- Insurance estimates per sqft
- Realistic expense tracking

### 7. 🏘️ Neighborhood Scores
- School ratings integration
- Age/condition factors
- Composite neighborhood score (0-100)

### 8. 📋 Comparable Sales
- Recent sold comparables
- $/sqft analysis
- ARV validation

### 9. 🗺️ Mapping Ready
- Property data structured for map visualization
- Color-coded scoring for quick review

---

## Quick Start

```bash
# Run full analysis
python3 comprehensive_analyzer.py

# Run rental comps
python3 rental_comps.py

# Run basic analysis
python3 analyzer.py
```

---

## Files

| File | Description |
|------|-------------|
| `comprehensive_analyzer.py` | Full-featured analyzer with all 9 features |
| `analyzer.py` | Basic analyzer with Mr. Kelly's rubric |
| `rental_comps.py` | Rental market comparison |
| `properties.md` | Property data & analysis results |
| `dashboard.html` | Interactive web dashboard |

---

## Market Summary

| Metric | Value |
|--------|-------|
| Properties Analyzed | 25 |
| Positive Cash Flow | 0 |
| Average Monthly CF | -$891 |
| Best Neighborhood | Crowley (90+) |
| Best Use Case | Appreciation play |

---

## Key Insights

- **This market is NOT for cash flow** - Buy expecting equity growth, not monthly income
- **BRRRR can help** but doesn't fully solve the cash flow problem
- **Crowley wins** on neighborhood scores (newer, better schools)
- **Rates matter** - At 5%, some properties approach positive cash flow

---

*Updated: February 24, 2026*
