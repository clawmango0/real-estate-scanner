# Real Estate Scanner - Wedgewood & Crowley, TX

**Updated:** 2026-02-24

## 🏆 Top Properties with Your $100K Investment

Based on your criteria: $100K down payment, looking for cash flow positive deals

| Rank | Address | Price | Your Cash | Loan | Monthly CF | CoC Return |
|------|---------|-------|-----------|------|------------|------------|
| 🥇 | 4125 Campus Dr, Ft Worth | $175K | $100K | $75K | **+$330** | 3.8% |
| 🥈 | 4813 Sandage Ave, Ft Worth | $182K | $100K | $82K | **+$280** | 3.2% |
| 🥉 | 3341 Evans Ave, Ft Worth | $188K | $100K | $88K | **+$252** | 2.9% |
| 4 | 3636 Saint Louis Ave, Ft Worth | $200K | $100K | $100K | **+$243** | 2.7% |
| 5 | 5808 Wales Ave, Ft Worth | $195K | $100K | $95K | **+$234** | 2.7% |

**13 out of 25 properties cash flow positive with $100K down!**

---

## 📁 Files

| File | Description |
|------|-------------|
| `property_map.html` | 🗺️ Interactive map with all properties |
| `alerts.py` | 🔔 Alert system - runs daily, notifies on matches |
| `investor_scenarios.py` | 💰 $100K down analysis |
| `comprehensive_analyzer.py` | 📊 Full financial analysis |
| `rental_comps.py` | 🏠 Rental market comparison |
| `properties.md` | 📋 All properties & details |
| `DATA_FORMAT.md` | 📝 Format for adding new properties |

---

## 🚀 Quick Start

```bash
# Run alert scan
python3 alerts.py

# Run investor scenarios
python3 investor_scenarios.py

# Open map
open property_map.html
```

---

## 🔧 Rehab Cost Rubric

| Condition | $/SqFt | Example |
|-----------|---------|---------|
| 10 (Like New) | $0-5 | New construction |
| 8-9 (Excellent) | $5-10 | Recently updated |
| 7 (Good) | $10-15 | Minor updates |
| 6 (Fair) | $15-25 | Some wear |
| 5 (Needs Work) | $25-35 | Paint, flooring |
| 3-4 (Major Rehab) | $50-75 | HVAC, plumbing |
| 1-2 (Tear Down) | $75-100+ | Complete gut |

---

## 🔔 Alert Criteria (Customizable)

Current settings in `alerts.py`:
- Min Cash Flow: $200/mo
- Min CoC: 2%
- Max Price: $250K
- Min Beds: 3

---

## 📊 Market Summary

- **Properties Analyzed:** 25 SFR + 5 Duplexes
- **Positive Cash Flow:** 13/25 (with $100K down)
- **Best Cash Flow:** $330/mo (4125 Campus Dr)
- **Best CoC Return:** 3.8%

---

*Built for Mr. Kelly's real estate scouting*
