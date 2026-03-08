#!/usr/bin/env python3
"""
Comprehensive Real Estate Investment Analyzer
Features: Appreciation, Comparables, Rehab, BRRRR, Sensitivity, Taxes, Schools, Maps
"""

import json
import random

# ============================================================
# PROPERTY DATA - Expand with actual listings
# ============================================================

PROPERTIES = [
    {"id": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "year_built": 1958, "lot": 0.25, "parking": 1, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "year_built": 1962, "lot": 0.30, "parking": 2, "condition": 7, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "year_built": 1955, "lot": 0.22, "parking": 1, "condition": 5, "foundation": "pier_beam", "roof": "composition", "hvac": "window", "water_heater": "tank"},
    {"id": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "year_built": 1965, "lot": 0.35, "parking": 2, "condition": 7, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "year_built": 2005, "lot": 0.20, "parking": 2, "condition": 8, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tankless"},
    {"id": 6, "address": "5521 Lubbock Ave, Ft Worth", "price": 250000, "beds": 3, "baths": 2, "sqft": 1295, "year_built": 1960, "lot": 0.28, "parking": 1, "condition": 5, "foundation": "slab", "roof": "metal", "hvac": "central", "water_heater": "tank"},
    {"id": 7, "address": "2705 W Fuller Ave, Ft Worth", "price": 235000, "beds": 4, "baths": 3, "sqft": 1977, "year_built": 1970, "lot": 0.40, "parking": 2, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 8, "address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "year_built": 1968, "lot": 0.38, "parking": 2, "condition": 7, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 9, "address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "year_built": 1958, "lot": 0.25, "parking": 1, "condition": 5, "foundation": "pier_beam", "roof": "composition", "hvac": "window", "water_heater": "tank"},
    {"id": 10, "address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "year_built": 1963, "lot": 0.27, "parking": 1, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 11, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "year_built": 1956, "lot": 0.22, "parking": 1, "condition": 5, "foundation": "pier_beam", "roof": "composition", "hvac": "window", "water_heater": "tank"},
    {"id": 12, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "year_built": 1952, "lot": 0.20, "parking": 1, "condition": 4, "foundation": "pier_beam", "roof": "metal", "hvac": "window", "water_heater": "tank"},
    {"id": 13, "address": "6021 Whitman Ave, Ft Worth", "price": 210000, "beds": 3, "baths": 2, "sqft": 1450, "year_built": 1961, "lot": 0.30, "parking": 2, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 14, "address": "2217 Matthews Rd, Ft Worth", "price": 265000, "beds": 4, "baths": 2, "sqft": 1800, "year_built": 1972, "lot": 0.45, "parking": 2, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 15, "address": "5528 Lubbock Ave, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "year_built": 1959, "lot": 0.26, "parking": 1, "condition": 5, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 16, "address": "4518 Fair Park Blvd, Ft Worth", "price": 229000, "beds": 3, "baths": 2, "sqft": 1300, "year_built": 1957, "lot": 0.24, "parking": 1, "condition": 5, "foundation": "pier_beam", "roof": "composition", "hvac": "window", "water_heater": "tank"},
    {"id": 17, "address": "6008 Wheaton Dr, Ft Worth", "price": 258000, "beds": 3, "baths": 2, "sqft": 1650, "year_built": 1966, "lot": 0.32, "parking": 2, "condition": 7, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 18, "address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "year_built": 1960, "lot": 0.18, "parking": 1, "condition": 5, "foundation": "slab", "roof": "composition", "hvac": "window", "water_heater": "tank"},
    {"id": 19, "address": "4721 Sandage Ave, Ft Worth", "price": 215000, "beds": 3, "baths": 2, "sqft": 1250, "year_built": 1959, "lot": 0.25, "parking": 1, "condition": 6, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 20, "address": "1234 Crowley Rd, Crowley", "price": 240000, "beds": 3, "baths": 2, "sqft": 1400, "year_built": 2008, "lot": 0.22, "parking": 2, "condition": 8, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tankless"},
    {"id": 21, "address": "5601 Wedgmont Ct, Ft Worth", "price": 270000, "beds": 3, "baths": 2, "sqft": 1900, "year_built": 1964, "lot": 0.33, "parking": 2, "condition": 7, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 22, "address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "year_built": 1954, "lot": 0.18, "parking": 1, "condition": 4, "foundation": "pier_beam", "roof": "metal", "hvac": "window", "water_heater": "tank"},
    {"id": 23, "address": "3821 Saint Louis Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "year_built": 1958, "lot": 0.26, "parking": 1, "condition": 5, "foundation": "pier_beam", "roof": "composition", "hvac": "central", "water_heater": "tank"},
    {"id": 24, "address": "6345 Crowley Cleburne Rd, Crowley", "price": 290000, "beds": 4, "baths": 2, "sqft": 1950, "year_built": 2010, "lot": 0.50, "parking": 2, "condition": 8, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tankless"},
    {"id": 25, "address": "1542 Hulen Park Dr, Ft Worth", "price": 205000, "beds": 3, "baths": 2, "sqft": 1100, "year_built": 1962, "lot": 0.23, "parking": 1, "condition": 5, "foundation": "slab", "roof": "composition", "hvac": "central", "water_heater": "tank"},
]

DUPLEXES = [
    {"id": 101, "address": "2847 W Seminary Dr, Ft Worth", "price": 285000, "units": 2, "sqft": 2400, "year_built": 1975, "condition": 6, "rent_total": 2800},
    {"id": 102, "address": "5123 Crowley Rd, Crowley", "price": 295000, "units": 2, "sqft": 2800, "year_built": 2008, "condition": 8, "rent_total": 3000},
    {"id": 103, "address": "3901 Hulen St, Ft Worth", "price": 275000, "units": 2, "sqft": 2200, "year_built": 1970, "condition": 6, "rent_total": 2600},
    {"id": 104, "address": "6234 Crowley Cleburne, Crowley", "price": 265000, "units": 2, "sqft": 2000, "year_built": 2005, "condition": 7, "rent_total": 2500},
    {"id": 105, "address": "4521 Evans Ave, Ft Worth", "price": 300000, "units": 4, "sqft": 2400, "year_built": 1980, "condition": 6, "rent_total": 3600},
]

# Market assumptions
INTEREST_RATE = 0.07
LOAN_YEARS = 30
DOWN_PAYMENT_PCT = 0.20
CLOSING_COSTS = 0.03
OER = 0.50  # 50% rule

# Texas property tax rates (average)
TAX_RATES = {
    "Ft Worth": 0.0195,  # 1.95%
    "Crowley": 0.0185    # 1.85%
}

# Insurance estimates (annual)
INSURANCE_BASE = 1800  # Base rate
INSURANCE_PER_SQFT = 0.15  # Per sqft

# School ratings (1-10 scale) - simplified
SCHOOLS = {
    "Ft Worth": {"elementary": 6, "middle": 5, "high": 5},
    "Crowley": {"elementary": 7, "middle": 6, "high": 6},
}

# Comparable sales (recently sold in area - simulated for demo)
COMPARABLE_SALES = [
    {"address": "4805 Sandage Ave", "sold_price": 178000, "sold_date": "2025-12-15", "sqft": 1000, "sold_price_sqft": 178},
    {"address": "5805 Wales Ave", "sold_price": 190000, "sold_date": "2025-11-20", "sqft": 1650, "sold_price_sqft": 115},
    {"address": "3630 Saint Louis Ave", "sold_price": 195000, "sold_date": "2026-01-10", "sqft": 1380, "sold_price_sqft": 141},
    {"address": "5730 Wedgmont Cir", "sold_price": 225000, "sold_date": "2025-10-05", "sqft": 1950, "sold_price_sqft": 115},
    {"address": "120 Roundtree Dr", "sold_price": 215000, "sold_date": "2025-09-15", "sqft": 1100, "sold_price_sqft": 195},
]

# Appreciation projections
HISTORICAL_APPRECIATION = 0.045  # 4.5% annual (TX historical)
CONSERVATIVE_PROJECTION = 0.03   # 3% conservative
MODERATE_PROJECTION = 0.05       # 5% moderate
AGGRESSIVE_PROJECTION = 0.07      # 7% aggressive

# ============================================================
# CALCULATIONS
# ============================================================

def get_market_rent(beds, sqft):
    """Get market rent based on bedrooms and sqft"""
    base_rents = {2: 1350, 3: 1700, 4: 1850}
    base = base_rents.get(beds, 1600)
    # Adjust for sqft variance
    avg_sqft = {2: 950, 3: 1400, 4: 1700}
    avg = avg_sqft.get(beds, 1400)
    adjustment = (sqft - avg) / avg * 0.1
    return int(base * (1 + adjustment))

def calculate_taxes(price, city):
    """Calculate annual property taxes"""
    rate = TAX_RATES.get(city, 0.019)
    return price * rate

def calculate_insurance(sqft):
    """Calculate annual insurance"""
    return INSURANCE_BASE + (sqft * INSURANCE_PER_SQFT)

def estimate_rehab_cost(condition, sqft):
    """
    Estimate rehab costs based on condition (1-10)
    1-3: Major rehab needed ($50-100/sqft)
    4-6: Moderate rehab ($20-50/sqft)
    7-8: Minor cosmetic ($10-20/sqft)
    9-10: Move-in ready ($0-10/sqft)
    """
    if condition <= 3:
        cost_per_sqft = 75
    elif condition <= 6:
        cost_per_sqft = 35
    elif condition <= 8:
        cost_per_sqft = 15
    else:
        cost_per_sqft = 5
    
    return sqft * cost_per_sqft

def calculate_investment_metrics(prop, down_pct=0.20):
    """Calculate full investment metrics"""
    price = prop.get("price", prop.get("rent_total", 200000) * 100)
    beds = prop.get("beds", 3)
    sqft = prop.get("sqft", 1400)
    
    # Get rent
    if "rent_total" in prop:
        rent = prop["rent_total"]
    else:
        rent = get_market_rent(beds, sqft)
    
    annual_rent = rent * 12
    
    # Loan
    down_payment = price * down_pct
    loan = price - down_payment
    monthly_rate = INTEREST_RATE / 12
    num_payments = LOAN_YEARS * 12
    monthly_mortgage = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # Expenses
    operating_expenses = annual_rent * OER
    property_taxes = calculate_taxes(price, "Ft Worth" if "Ft Worth" in prop["address"] else "Crowley")
    insurance = calculate_insurance(sqft)
    total_expenses = operating_expenses + property_taxes + insurance
    
    # NOI
    noi = annual_rent - total_expenses
    
    # Cash flow
    annual_debt = monthly_mortgage * 12
    annual_cash_flow = noi - annual_debt
    monthly_cash_flow = annual_cash_flow / 12
    
    # Key metrics
    one_percent = (rent / price) * 100
    grm = price / annual_rent
    cap_rate = (noi / price) * 100
    dscr = noi / annual_debt if annual_debt else 0
    
    total_cash = down_payment + (price * CLOSING_COSTS)
    coc = (annual_cash_flow / total_cash) * 100 if total_cash else 0
    
    return {
        "price": price,
        "rent": rent,
        "monthly_mortgage": monthly_mortgage,
        "property_taxes": property_taxes,
        "insurance": insurance,
        "operating_expenses": operating_expenses,
        "total_expenses": total_expenses,
        "noi": noi,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "one_percent": one_percent,
        "grm": grm,
        "cap_rate": cap_rate,
        "dscr": dscr,
        "coc": coc,
        "total_cash_needed": total_cash,
    }

def project_appreciation(prop, years=5, rate=MODERATE_PROJECTION):
    """Project equity growth over time"""
    metrics = calculate_investment_metrics(prop)
    price = metrics["price"]
    
    future_values = []
    equity = price * (1 - DOWN_PAYMENT_PCT)
    
    for year in range(1, years + 1):
        future_price = price * ((1 + rate) ** year)
        # Equity = down payment + appreciation + principal paydown
        # Simplified: assume 30yr mortgage, ~35% of payments go to principal in early years
        annual_principal = metrics["monthly_mortgage"] * 12 * 0.35 * year
        future_equity = (future_price - price) + (DOWN_PAYMENT_PCT * price) + annual_principal
        future_values.append({
            "year": year,
            "price": future_price,
            "equity": future_equity,
            "total_return": future_equity + (metrics["annual_cash_flow"] * year)
        })
    
    return future_values

def brrrr_analysis(prop):
    """BRRRR Analysis: Buy, Rehab, Rent, Refinance, Repeat"""
    metrics = calculate_investment_metrics(prop)
    rehab_cost = estimate_rehab_cost(prop.get("condition", 6), prop.get("sqft", 1400))
    
    # After Repair Value (estimate 10-20% increase post-rehab)
    arv = metrics["price"] * 1.15
    
    # Total cash needed to close + rehab
    total_cash_needed = metrics["total_cash_needed"] + rehab_cost
    
    # Refinance at 75% ARV
    refinance_amount = arv * 0.75
    cash_back = refinance_amount - metrics["price"]  # Could be negative if ARV < purchase
    
    # New cash position after refinance
    net_cash_invested = total_cash_needed - max(0, cash_back)
    
    # Recalculate with refinanced loan (25% down on ARV)
    new_down = arv * 0.25
    new_loan = arv - new_down
    monthly_rate = INTEREST_RATE / 12
    num_payments = LOAN_YEARS * 12
    new_mortgage = new_loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # Same rent, new expenses
    annual_rent = metrics["rent"] * 12
    noi = annual_rent * 0.50
    new_cf = (noi / 12) - new_mortgage
    
    return {
        "purchase_price": metrics["price"],
        "rehab_cost": rehab_cost,
        "arv": arv,
        "total_cash_needed": total_cash_needed,
        "refinance_amount": refinance_amount,
        "net_cash_invested": net_cash_invested,
        "monthly_cash_flow_after_refi": new_cf,
        "cash_on_cash_after_refi": (noi - (new_mortgage * 12)) / net_cash_invested * 100 if net_cash_invested > 0 else 0,
    }

def sensitivity_analysis(prop):
    """Show how different scenarios affect returns"""
    base = calculate_investment_metrics(prop)
    
    scenarios = []
    
    # Interest rate variations
    for rate in [0.05, 0.06, 0.07, 0.08, 0.09]:
        # Quick calc
        price = base["price"]
        rent = base["rent"]
        down = price * 0.20
        loan = price - down
        m = rate / 12
        n = 360
        mtg = loan * (m * (1 + m)**n) / ((1 + m)**n - 1)
        noi = rent * 12 * 0.50
        cf = (noi / 12) - mtg
        scenarios.append({"scenario": f"Rate {rate*100:.0f}%", "monthly_cf": cf})
    
    # Down payment variations
    for dp in [0.10, 0.15, 0.20, 0.25, 0.30]:
        price = base["price"]
        rent = base["rent"]
        down = price * dp
        loan = price - down
        m = 0.07 / 12
        n = 360
        mtg = loan * (m * (1 + m)**n) / ((1 + m)**n - 1)
        noi = rent * 12 * 0.50
        cf = (noi / 12) - mtg
        scenarios.append({"scenario": f"Down {dp*100:.0f}%", "monthly_cf": cf})
    
    return scenarios

def get_neighborhood_score(prop):
    """Calculate neighborhood score based on various factors"""
    address = prop["address"]
    
    # Base score
    score = 70
    
    # School ratings
    city = "Ft Worth" if "Ft Worth" in address else "Crowley"
    school_data = SCHOOLS.get(city, {"elementary": 5, "middle": 5, "high": 5})
    school_avg = (school_data["elementary"] + school_data["middle"] + school_data["high"]) / 3
    score += (school_avg - 5) * 5  # +2.5 per point above/below 5
    
    # Age factor (newer = slightly better scores)
    year = prop.get("year_built", 1970)
    if year >= 2000:
        score += 10
    elif year >= 1980:
        score += 5
    elif year < 1960:
        score -= 5
    
    # Condition
    cond = prop.get("condition", 6)
    score += (cond - 6) * 3
    
    return max(0, min(100, score))

# ============================================================
# MAIN ANALYSIS
# ============================================================

def run_full_analysis():
    print("\n" + "="*90)
    print("🏠 COMPREHENSIVE REAL ESTATE INVESTMENT ANALYZER")
    print("   Wedgewood (Fort Worth) & Crowley, TX")
    print("="*90)
    
    # 1. Basic Investment Metrics
    print("\n" + "="*90)
    print("📊 INVESTMENT METRICS (with Taxes & Insurance)")
    print("="*90)
    
    for prop in PROPERTIES[:5]:  # Top 5
        m = calculate_investment_metrics(prop)
        print(f"\n{prop['address']}")
        print(f"   Price: ${m['price']:,} | Rent: ${m['rent']:,}/mo")
        print(f"   Mortgage: ${m['monthly_mortgage']:,.0f} | Taxes: ${m['property_taxes']:,.0f}/yr | Ins: ${m['insurance']:,.0f}/yr")
        print(f"   NOI: ${m['noi']:,.0f}/yr | Monthly CF: ${m['monthly_cash_flow']:,.0f} ({'🟢' if m['monthly_cash_flow'] > 0 else '🔴'})")
        print(f"   Cap: {m['cap_rate']:.1f}% | CoC: {m['coc']:.1f}% | 1%: {m['one_percent']:.2f}%")
    
    # 2. Rehab Estimates
    print("\n" + "="*90)
    print("🔧 REHAB COST ESTIMATES")
    print("="*90)
    
    for prop in PROPERTIES[:5]:
        rehab = estimate_rehab_cost(prop.get("condition", 6), prop.get("sqft", 1400))
        arv = prop["price"] * 1.15
        condition = prop.get("condition", 6)
        cond_emoji = "✅" if condition >= 7 else "⚠️" if condition >= 5 else "🔴"
        print(f"\n{prop['address']}")
        print(f"   Condition: {condition}/10 {cond_emoji}")
        print(f"   Est. Rehab: ${rehab:,} (${rehab/prop['sqft']:.0f}/sqft)")
        print(f"   ARV: ${arv:,} (after rehab value)")
        print(f"   Potential Equity: ${arv - prop['price'] - rehab:,}")
    
    # 3. Appreciation Projections
    print("\n" + "="*90)
    print("📈 5-YEAR APPRECIATION PROJECTIONS")
    print("="*90)
    
    prop = PROPERTIES[0]  # Use top property
    base = calculate_investment_metrics(prop)
    
    for rate, name in [(CONSERVATIVE_PROJECTION, "Conservative 3%"), (MODERATE_PROJECTION, "Moderate 5%"), (AGGRESSIVE_PROJECTION, "Aggressive 7%")]:
        proj = project_appreciation(prop, 5, rate)
        final = proj[-1]
        print(f"\n{name}:")
        print(f"   Price in 5 years: ${final['price']:,.0f}")
        print(f"   Total Equity: ${final['equity']:,.0f}")
        print(f"   Total Return (incl. cash flow): ${final['total_return']:,.0f}")
    
    # 4. BRRRR Analysis
    print("\n" + "="*90)
    print("🔄 BRRRR ANALYSIS (Buy, Rehab, Rent, Refinance, Repeat)")
    print("="*90)
    
    for prop in PROPERTIES[:3]:
        brrrr = brrrr_analysis(prop)
        print(f"\n{prop['address']}")
        print(f"   Purchase: ${brrrr['purchase_price']:,} | Rehab: ${brrrr['rehab_cost']:,}")
        print(f"   ARV: ${brrrr['arv']:,} | Total Cash Needed: ${brrrr['total_cash_needed']:,.0f}")
        print(f"   Refinance: ${brrrr['refinance_amount']:,.0f} | Net Cash Invested: ${brrrr['net_cash_invested']:,.0f}")
        print(f"   CF After Refi: ${brrrr['monthly_cash_flow_after_refi']:,.0f}/mo | CoC: {brrrr['cash_on_cash_after_refi']:.1f}%")
    
    # 5. Sensitivity Analysis
    print("\n" + "="*90)
    print("🎯 SENSITIVITY ANALYSIS")
    print("="*90)
    
    prop = PROPERTIES[0]
    sens = sensitivity_analysis(prop)
    
    print(f"\n{prop['address']}")
    print("   Interest Rate Impact:")
    for s in sens[:5]:
        emoji = "🟢" if s["monthly_cf"] > 0 else "🔴"
        print(f"      {s['scenario']}: ${s['monthly_cf']:,.0f}/mo {emoji}")
    
    print("\n   Down Payment Impact:")
    for s in sens[5:]:
        emoji = "🟢" if s["monthly_cf"] > 0 else "🔴"
        print(f"      {s['scenario']}: ${s['monthly_cf']:,.0f}/mo {emoji}")
    
    # 6. Neighborhood Scores
    print("\n" + "="*90)
    print("🏘️ NEIGHBORHOOD SCORES")
    print("="*90)
    
    scored = [(p, get_neighborhood_score(p)) for p in PROPERTIES]
    scored.sort(key=lambda x: x[1], reverse=True)
    
    print("\nTop 5 Neighborhoods:")
    for p, score in scored[:5]:
        emoji = "🟢" if score >= 70 else "🟡" if score >= 50 else "🔴"
        print(f"   {p['address']}: {score}/100 {emoji}")
    
    print("\nBottom 5:")
    for p, score in scored[-5:]:
        emoji = "🟢" if score >= 70 else "🟡" if score >= 50 else "🔴"
        print(f"   {p['address']}: {score}/100 {emoji}")
    
    # 7. Comparable Sales
    print("\n" + "="*90)
    print("📋 COMPARABLE SALES (Recent)")
    print("="*90)
    
    for comp in COMPARABLE_SALES:
        print(f"\n   {comp['address']}")
        print(f"      Sold: ${comp['sold_price']:,} on {comp['sold_date']} (${comp['sold_price_sqft']}/sqft)")
    
    # Summary
    print("\n" + "="*90)
    print("📊 MARKET SUMMARY")
    print("="*90)
    
    all_metrics = [calculate_investment_metrics(p) for p in PROPERTIES]
    pos_cf = len([m for m in all_metrics if m["monthly_cash_flow"] > 0])
    avg_cf = sum(m["monthly_cash_flow"] for m in all_metrics) / len(all_metrics)
    avg_coc = sum(m["coc"] for m in all_metrics) / len(all_metrics)
    
    print(f"\n   Properties with Positive Cash Flow: {pos_cf}/25")
    print(f"   Average Monthly Cash Flow: ${avg_cf:,.0f}")
    print(f"   Average Cash-on-Cash Return: {avg_coc:.1f}%")
    print(f"   (Note: Including taxes & insurance in expenses)")

if __name__ == "__main__":
    run_full_analysis()
