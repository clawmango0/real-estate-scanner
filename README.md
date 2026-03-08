# Real Estate Investment Analyzer

A comprehensive real estate investment analysis tool for the Fort Worth area (Wedgewood, Crowley, Mid Cities). Analyzes properties using Mr. Kelly's investment criteria with real market data.

## Quick Start

```bash
# Analyze a property
python3 analyzer.py

# Run comprehensive analysis
python3 comprehensive_analyzer.py

# Calculate investment scenarios
python3 investor_scenarios.py
```

---

# Investment Metrics Guide

This guide explains each calculation used in the analyzer and why it matters for your investment decisions.

---

## 1. Cash on Cash Return (CoC)

**What it is:** Annual pre-tax cash flow divided by the total cash invested.

**Formula:**  
```
CoC = (Annual Cash Flow) / (Total Cash Invested)
```

**What it shows:**  
The return on the actual cash you put into the deal. If you invest $100K and make $5K/year, that's 5% CoC.

**Why it matters:**  
- Tells you the **true yield** on your money
- Compare different deals on equal footing
- Higher CoC = better return on your capital

**Target:** >8% is good, >12% is great

**Example:**
- You invest $100K (down payment + closing costs)
- Property cash flows $300/mo = $3,600/year
- CoC = $3,600 / $100,000 = **3.6%**

---

## 2. Cap Rate (Capitalization Rate)

**What it is:** Net Operating Income (NOI) divided by property value.

**Formula:**
```
Cap Rate = (NOI) / (Property Value)
```

**What it shows:**  
The return you'd get if you bought the property in all cash - no mortgage.

**Why it matters:**  
- Measures the **raw income potential** of the property
- Ignores financing to compare properties fairly
- Higher cap rate = more income per dollar invested

**Target:** 5-8% is typical for rental properties

**Example:**
- Property value: $200,000
- NOI (income after expenses, before mortgage): $12,000/year
- Cap Rate = $12,000 / $200,000 = **6%**

---

## 3. Gross Rent Multiplier (GRM)

**What it is:** Property price divided by annual gross rent.

**Formula:**
```
GRM = Property Price / (Monthly Rent × 12)
```

**What it shows:**  
How many years of gross rent to pay off the property.

**Why it matters:**  
- Quick way to compare property values
- Lower GRM = cheaper relative to rent
- Typical range: 8-15 years

**Target:** <10 is good, <8 is excellent

**Example:**
- Price: $200,000
- Rent: $1,500/mo = $18,000/year
- GRM = $200,000 / $18,000 = **11.1 years**

---

## 4. The 1% Rule

**What it is:** Monthly rent should be at least 1% of the purchase price.

**Formula:**
```
Rent ≥ Price × 0.01
```

**What it shows:**  
A quick screening tool - if rent is less than 1% of price, the deal is likely to have negative cash flow.

**Why it matters:**  
- Fast filter for potential deals
- Properties meeting 1% rule usually cash flow
- Houston/Dallas market often breaks this rule

**Target:** ≥1% is the goal

**Example:**
- Price: $200,000
- 1% Rule: Rent should be ≥ $2,000/mo
- If rent is only $1,500 → **FAILS** the 1% test

---

## 5. Operating Expense Ratio (OER)

**What it is:** Operating expenses divided by gross income.

**Formula:**
```
OER = (Operating Expenses) / (Gross Rent)
```

**What it shows:**  
What percentage of rent goes to expenses (not including mortgage).

**Why it matters:**  
- High OER = thin margins
- Typical range: 40-60% for SFRs
- The "50% rule" assumes 50% OER

**Target:** <50% is excellent, >60% is risky

**Example:**
- Gross rent: $1,500/mo = $18,000/year
- Expenses (taxes, insurance, maintenance, vacancy, management): $7,200/year
- OER = $7,200 / $18,000 = **40%**

---

## 6. Debt Service Coverage Ratio (DSCR)

**What it is:** NOI divided by annual debt service (mortgage).

**Formula:**
```
DSCR = NOI / Annual Mortgage Payment
```

**What it shows:**  
How easily the property covers the mortgage. DSCR of 1.0 means you break even.

**Why it matters:**  
- Lenders want DSCR > 1.25
- Measures **ability to pay** the loan
- <1.0 = negative cash flow

**Target:** >1.25 is safe, >1.5 is great

**Example:**
- NOI: $12,000/year
- Mortgage: $9,600/year
- DSCR = $12,000 / $9,600 = **1.25**

---

## 7. Monthly Cash Flow

**What it is:** Money left over after all expenses and mortgage.

**Formula:**
```
Cash Flow = Rent - (Mortgage + Taxes + Insurance + Expenses)
```

**What it shows:**  
Your actual monthly profit (or loss).

**Why it matters:**  
- The number that pays your bills
- Positive = money in pocket
- Negative = you're paying to own it

**Target:** Positive is required!

---

## 8. Cash Flow Analysis (50% Rule)

**What it is:** Estimating expenses at 50% of rent (simplified).

**Why it works:**  
The 50% rule is a conservative shortcut that bundles:
- Property taxes
- Insurance
- Maintenance (5-10%)
- Vacancy (5-8%)
- Property management (8-10%)
- Capital reserves

**Formula:**
```
Cash Flow = (Rent × 0.50) - Mortgage
```

**What it shows:**  
A quick "back of napkin" analysis before detailed numbers.

---

## Analysis Model Used

| Factor | Value | Notes |
|--------|-------|-------|
| Down Payment | $100,000 | Mr. Kelly's typical investment |
| Market Discount | 5-15% | Based on days on market |
| Interest Rate | 7% | Current market rate |
| Loan Term | 30 years | Standard fixed |
| Expense Ratio | 50% | Conservative estimate |
| Property Tax | 1.9% | Texas average |
| HOA | When listed | Added when applicable |

---

## Scoring System (70-Point Rubric)

Properties are scored on investment quality:

| Metric | Max Points | Threshold |
|--------|-----------|-----------|
| 1% Rule | 10 | ≥1% = 10pts |
| GRM | 10 | <8 = 10pts |
| OER | 10 | <45% = 10pts |
| Cap Rate | 10 | >8% = 10pts |
| DSCR | 10 | >1.5 = 10pts |
| CoC Return | 10 | >10% = 10pts |
| Monthly CF | 10 | >$200 = 10pts |

---

## Property Data Sources

- **Rent data:** Real rental listings from RentCafe
- **Property data:** Zillow listings (verified real data)
- **Tax rates:** Texas average ~1.9%

---

## Files

| File | Purpose |
|------|---------|
| `analyzer.py` | Basic property analysis with 70-pt scoring |
| `comprehensive_analyzer.py` | Full financial models, BRRRR, appreciation |
| `investor_scenarios.py` | $100K down vs full rehab scenarios |
| `rental_scraper.py` | Rent data collection |
| `PROPERTY_ANALYSIS.md` | Current property results |
| `DATA_STANDARDS.md` | Data quality guidelines |

---

## GitHub

https://github.com/clawmango0/real-estate-scanner
