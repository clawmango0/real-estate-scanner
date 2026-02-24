# 🏠 Real Estate Scanner - Wedgewood & Crowley, TX

Comprehensive investment analysis tool for real estate scouting.

![Properties](https://img.shields.io/badge/Properties-25-orange)
![Features](https://img.shields.io/badge/Features-10-brightgreen)
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

### 3. 📈 Appreciation Projections
- Conservative (3%), Moderate (5%), Aggressive (7%) scenarios
- 5-year projections including price appreciation + principal paydown

### 4. 🔄 BRRRR Calculator
- Buy, Rehab, Rent, Refinance, Repeat analysis
- Total cash needed calculation

### 5. 🎯 Sensitivity Analysis
- Interest rate impact (5-9%)
- Down payment variations (10-30%)

### 6. 💰 Taxes & Insurance
- Texas property tax rates integrated
- Insurance estimates per sqft

### 7. 🏘️ Neighborhood Scores
- School ratings integration
- Age/condition factors

### 8. 📋 Comparable Sales
- Recent sold data for validation

### 9. 🗺️ Map-Ready Data
- Structured for visualization

### 10. 🔍 Web Scraper (Setup Required)
- Scrapling-based scraper included (requires Playwright browsers)
- Simple HTTP scraper as fallback

---

## Quick Start

```bash
# Run full analysis
python3 comprehensive_analyzer.py

# Run rental comparison
python3 rental_comps.py

# Run basic analysis
python3 analyzer.py
```

---

## Adding New Data

See `DATA_FORMAT.md` for easy formats to add:
- Properties for sale
- Rental comps
- Recently sold comparables
- Duplexes/multi-unit

---

## Files

| File | Description |
|------|-------------|
| `comprehensive_analyzer.py` | Main analyzer with all 10 features |
| `analyzer.py` | Basic analyzer with scoring rubric |
| `rental_comps.py` | Rental market comparison |
| `scraper.py` | Scrapling-based scraper (requires setup) |
| `simple_scraper.py` | Basic HTTP scraper |
| `properties.md` | Analysis results |
| `DATA_FORMAT.md` | Data entry formats |

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

- **This market is NOT for cash flow** - Buy expecting equity growth
- **BRRRR can help** but doesn't fully solve cash flow
- **Crowley wins** on neighborhood scores
- **Rates matter** - At 5%, some properties approach positive CF

---

*Updated: February 24, 2026*
