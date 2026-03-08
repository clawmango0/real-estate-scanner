#!/usr/bin/env python3
"""
Real Estate Analyzer - Mr. Kelly's Real Investment Scenarios
With $100K down OR rehab budget included
"""

PROPERTIES = [
    {"id": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "year_built": 1958, "condition": 6},
    {"id": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "year_built": 1962, "condition": 7},
    {"id": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "year_built": 1955, "condition": 5},
    {"id": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "year_built": 1965, "condition": 7},
    {"id": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "year_built": 2005, "condition": 8},
    {"id": 6, "address": "5521 Lubbock Ave, Ft Worth", "price": 250000, "beds": 3, "baths": 2, "sqft": 1295, "year_built": 1960, "condition": 5},
    {"id": 7, "address": "2705 W Fuller Ave, Ft Worth", "price": 235000, "beds": 4, "baths": 3, "sqft": 1977, "year_built": 1970, "condition": 6},
    {"id": 8, "address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "year_built": 1968, "condition": 7},
    {"id": 9, "address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "year_built": 1958, "condition": 5},
    {"id": 10, "address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "year_built": 1963, "condition": 6},
    {"id": 11, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "year_built": 1956, "condition": 5},
    {"id": 12, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "year_built": 1952, "condition": 4},
    {"id": 13, "address": "6021 Whitman Ave, Ft Worth", "price": 210000, "beds": 3, "baths": 2, "sqft": 1450, "year_built": 1961, "condition": 6},
    {"id": 14, "address": "2217 Matthews Rd, Ft Worth", "price": 265000, "beds": 4, "baths": 2, "sqft": 1800, "year_built": 1972, "condition": 6},
    {"id": 15, "address": "5528 Lubbock Ave, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "year_built": 1959, "condition": 5},
    {"id": 16, "address": "4518 Fair Park Blvd, Ft Worth", "price": 229000, "beds": 3, "baths": 2, "sqft": 1300, "year_built": 1957, "condition": 5},
    {"id": 17, "address": "6008 Wheaton Dr, Ft Worth", "price": 258000, "beds": 3, "baths": 2, "sqft": 1650, "year_built": 1966, "condition": 7},
    {"id": 18, "address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "year_built": 1960, "condition": 5},
    {"id": 19, "address": "4721 Sandage Ave, Ft Worth", "price": 215000, "beds": 3, "baths": 2, "sqft": 1250, "year_built": 1959, "condition": 6},
    {"id": 20, "address": "1234 Crowley Rd, Crowley", "price": 240000, "beds": 3, "baths": 2, "sqft": 1400, "year_built": 2008, "condition": 8},
    {"id": 21, "address": "5601 Wedgmont Ct, Ft Worth", "price": 270000, "beds": 3, "baths": 2, "sqft": 1900, "year_built": 1964, "condition": 7},
    {"id": 22, "address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "year_built": 1954, "condition": 4},
    {"id": 23, "address": "3821 Saint Louis Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "year_built": 1958, "condition": 5},
    {"id": 24, "address": "6345 Crowley Cleburne Rd, Crowley", "price": 290000, "beds": 4, "baths": 2, "sqft": 1950, "year_built": 2010, "condition": 8},
    {"id": 25, "address": "1542 Hulen Park Dr, Ft Worth", "price": 205000, "beds": 3, "baths": 2, "sqft": 1100, "year_built": 1962, "condition": 5},
]

DUPLEXES = [
    {"id": 101, "address": "2847 W Seminary Dr, Ft Worth", "price": 285000, "units": 2, "sqft": 2400, "condition": 6, "rent_total": 2800},
    {"id": 102, "address": "5123 Crowley Rd, Crowley", "price": 295000, "units": 2, "sqft": 2800, "condition": 8, "rent_total": 3000},
    {"id": 103, "address": "3901 Hulen St, Ft Worth", "price": 275000, "units": 2, "sqft": 2200, "condition": 6, "rent_total": 2600},
    {"id": 104, "address": "6234 Crowley Cleburne, Crowley", "price": 265000, "units": 2, "sqft": 2000, "condition": 7, "rent_total": 2500},
    {"id": 105, "address": "4521 Evans Ave, Ft Worth", "price": 300000, "units": 4, "sqft": 2400, "condition": 6, "rent_total": 3600},
]

INTEREST_RATE = 0.07
CLOSING_COSTS = 0.03
OER = 0.50

# Mr. Kelly's investment scenarios
FIXED_DOWN_PAYMENT = 100000  # $100K down payment regardless of price
REHAB_BUDGET_INCLUDED = True  # Full rehab investment included

def get_market_rent(beds, sqft):
    base_rents = {2: 1350, 3: 1700, 4: 1850}
    base = base_rents.get(beds, 1600)
    avg_sqft = {2: 950, 3: 1400, 4: 1700}
    avg = avg_sqft.get(beds, 1400)
    adjustment = (sqft - avg) / avg * 0.1
    return int(base * (1 + adjustment))

def calculate_taxes(price):
    return price * 0.0195  # 1.95% TX average

def calculate_insurance(sqft):
    return 1800 + (sqft * 0.15)

def estimate_rehab(condition, sqft):
    if condition <= 3: return sqft * 75
    elif condition <= 6: return sqft * 35
    elif condition <= 8: return sqft * 15
    else: return sqft * 5

def analyze_scenario_a(prop):
    """
    Scenario A: $100K Down Payment
    (Whatever the property price, put $100K down)
    """
    price = prop.get("price", 200000)
    beds = prop.get("beds", 3)
    sqft = prop.get("sqft", 1400)
    rent = get_market_rent(beds, sqft)
    
    # $100K down regardless of price
    down_payment = min(FIXED_DOWN_PAYMENT, price * 0.99)  # Cap at price
    loan = price - down_payment
    
    # Loan calc
    if loan > 0:
        monthly_rate = INTEREST_RATE / 12
        num_payments = 30 * 12
        monthly_mortgage = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    else:
        monthly_mortgage = 0
    
    # Expenses - 50% rule ALREADY includes all operating expenses
    # NOI = rent - 50% (which includes taxes, insurance, maintenance, vacancy, etc.)
    annual_rent = rent * 12
    noi = annual_rent * 0.50  # 50% rule - covers EVERYTHING except mortgage
    monthly_cash_flow = (noi / 12) - monthly_mortgage
    
    # Metrics
    one_percent = (rent / price) * 100
    grm = price / annual_rent
    cap_rate = (noi / price) * 100
    
    # Total cash in (closing costs + down payment)
    total_cash = down_payment + (price * CLOSING_COSTS)
    coc = ((noi - (monthly_mortgage * 12)) / total_cash) * 100 if total_cash > 0 else 0
    
    return {
        "scenario": "$100K Down",
        "price": price,
        "down_payment": down_payment,
        "loan": loan,
        "rent": rent,
        "monthly_mortgage": monthly_mortgage,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": monthly_cash_flow * 12,
        "one_percent": one_percent,
        "grm": grm,
        "cap_rate": cap_rate,
        "coc": coc,
        "total_cash": total_cash,
    }

def analyze_scenario_b(prop):
    """
    Scenario B: Full Rehab Investment
    (Cover rehab costs + standard 20% down)
    """
    price = prop.get("price", 200000)
    beds = prop.get("beds", 3)
    sqft = prop.get("sqft", 1400)
    condition = prop.get("condition", 6)
    rent = get_market_rent(beds, sqft)
    
    # Rehab cost
    rehab_cost = estimate_rehab(condition, sqft)
    
    # Standard 20% down
    down_payment = price * 0.20
    loan = price - down_payment
    
    # Loan calc
    monthly_rate = INTEREST_RATE / 12
    num_payments = 30 * 12
    monthly_mortgage = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # NOI = rent - 50% (which includes taxes, insurance, maintenance, vacancy, etc.)
    annual_rent = rent * 12
    noi = annual_rent * 0.50
    
    # Monthly cash flow = NOI/12 - mortgage
    monthly_cash_flow = (noi / 12) - monthly_mortgage
    
    # Metrics
    one_percent = (rent / price) * 100
    grm = price / annual_rent
    cap_rate = (noi / price) * 100
    
    # Total cash in (down + closing + rehab)
    total_cash = down_payment + (price * CLOSING_COSTS) + rehab_cost
    coc = ((noi - (monthly_mortgage * 12)) / total_cash) * 100 if total_cash > 0 else 0
    
    return {
        "scenario": "Full Rehab",
        "price": price,
        "rehab_cost": rehab_cost,
        "down_payment": down_payment,
        "loan": loan,
        "rent": rent,
        "monthly_mortgage": monthly_mortgage,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": monthly_cash_flow * 12,
        "one_percent": one_percent,
        "grm": grm,
        "cap_rate": cap_rate,
        "coc": coc,
        "total_cash": total_cash,
    }

def analyze_scenario_c(prop):
    """
    Scenario C: $100K Down + Rehab (Full investment)
    """
    price = prop.get("price", 200000)
    beds = prop.get("beds", 3)
    sqft = prop.get("sqft", 1400)
    condition = prop.get("condition", 6)
    rent = get_market_rent(beds, sqft)
    
    # Rehab cost
    rehab_cost = estimate_rehab(condition, sqft)
    
    # $100K down
    down_payment = min(FIXED_DOWN_PAYMENT, price * 0.99)
    loan = max(0, price - down_payment)
    
    # Loan calc
    if loan > 0:
        monthly_rate = INTEREST_RATE / 12
        num_payments = 30 * 12
        monthly_mortgage = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    else:
        monthly_mortgage = 0
    
    # Expenses - rent could be higher after rehab!
    annual_rent = rent * 12
    operating_expenses = annual_rent * OER
    property_taxes = calculate_taxes(price)
    insurance = calculate_insurance(sqft)
    total_expenses = operating_expenses + property_taxes + insurance
    
    # NOI & Cash Flow
    noi = annual_rent - total_expenses
    monthly_cash_flow = (noi / 12) - monthly_mortgage
    
    # Metrics
    one_percent = (rent / price) * 100
    grm = price / annual_rent
    cap_rate = (noi / price) * 100
    
    # Total cash in
    total_cash = down_payment + (price * CLOSING_COSTS) + rehab_cost
    coc = ((noi - (monthly_mortgage * 12)) / total_cash) * 100 if total_cash > 0 else 0
    
    return {
        "scenario": "$100K + Rehab",
        "price": price,
        "rehab_cost": rehab_cost,
        "down_payment": down_payment,
        "loan": loan,
        "rent": rent,
        "monthly_mortgage": monthly_mortgage,
        "monthly_cash_flow": monthly_cash_flow,
        "annual_cash_flow": monthly_cash_flow * 12,
        "one_percent": one_percent,
        "grm": grm,
        "cap_rate": cap_rate,
        "coc": coc,
        "total_cash": total_cash,
    }

def print_analysis():
    print("\n" + "="*90)
    print("🏠 REAL ESTATE ANALYZER - MR. KELLY'S SCENARIOS")
    print("   Comparing: $100K Down vs Full Rehab vs $100K + Rehab")
    print("="*90)
    
    # Analyze all scenarios for top properties
    print("\n" + "="*90)
    print("📊 SCENARIO A: $100K DOWN PAYMENT (Regardless of Price)")
    print("="*90)
    
    results_a = []
    for prop in PROPERTIES:
        r = analyze_scenario_a(prop)
        results_a.append({**prop, **r})
    
    results_a.sort(key=lambda x: x["monthly_cash_flow"], reverse=True)
    
    print(f"\n🏆 TOP 5 BY MONTHLY CASH FLOW ($100K Down)")
    print("-"*90)
    for p in results_a[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n   {p['address']}")
        print(f"      Price: ${p['price']:,} | Down: ${p['down_payment']:,} | Loan: ${p['loan']:,}")
        print(f"      Rent: ${p['rent']:,}/mo | Mortgage: ${p['monthly_mortgage']:,.0f}")
        print(f"      Monthly CF: ${p['monthly_cash_flow']:,.0f} {cf_emoji} | Annual: ${p['annual_cash_flow']:,.0f}")
        print(f"      CoC Return: {p['coc']:.1f}% | Cap Rate: {p['cap_rate']:.1f}%")
    
    pos_cf_a = len([p for p in results_a if p["monthly_cash_flow"] > 0])
    print(f"\n📊 Properties with Positive Cash Flow: {pos_cf_a}/25")
    
    # Scenario B
    print("\n" + "="*90)
    print("📊 SCENARIO B: FULL REHAB INVESTMENT (20% Down + Rehab Costs)")
    print("="*90)
    
    results_b = []
    for prop in PROPERTIES:
        r = analyze_scenario_b(prop)
        results_b.append({**prop, **r})
    
    results_b.sort(key=lambda x: x["monthly_cash_flow"], reverse=True)
    
    print(f"\n🏆 TOP 5 BY MONTHLY CASH FLOW (Full Rehab)")
    print("-"*90)
    for p in results_b[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n   {p['address']}")
        print(f"      Price: ${p['price']:,} | Rehab: ${p['rehab_cost']:,} | Total Cash: ${p['total_cash']:,}")
        print(f"      Rent: ${p['rent']:,}/mo | Mortgage: ${p['monthly_mortgage']:,.0f}")
        print(f"      Monthly CF: ${p['monthly_cash_flow']:,.0f} {cf_emoji} | Annual: ${p['annual_cash_flow']:,.0f}")
        print(f"      CoC Return: {p['coc']:.1f}%")
    
    pos_cf_b = len([p for p in results_b if p["monthly_cash_flow"] > 0])
    print(f"\n📊 Properties with Positive Cash Flow: {pos_cf_b}/25")
    
    # Scenario C
    print("\n" + "="*90)
    print("📊 SCENARIO C: $100K DOWN + FULL REHAB")
    print("="*90)
    
    results_c = []
    for prop in PROPERTIES:
        r = analyze_scenario_c(prop)
        results_c.append({**prop, **r})
    
    results_c.sort(key=lambda x: x["monthly_cash_flow"], reverse=True)
    
    print(f"\n🏆 TOP 5 BY MONTHLY CASH FLOW ($100K + Rehab)")
    print("-"*90)
    for p in results_c[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n   {p['address']}")
        print(f"      Price: ${p['price']:,} | Rehab: ${p['rehab_cost']:,}")
        print(f"      Down: ${p['down_payment']:,} | Loan: ${p['loan']:,}")
        print(f"      Total Cash In: ${p['total_cash']:,}")
        print(f"      Monthly CF: ${p['monthly_cash_flow']:,.0f} {cf_emoji} | Annual: ${p['annual_cash_flow']:,.0f}")
        print(f"      CoC Return: {p['coc']:.1f}%")
    
    pos_cf_c = len([p for p in results_c if p["monthly_cash_flow"] > 0])
    print(f"\n📊 Properties with Positive Cash Flow: {pos_cf_c}/25")
    
    # Duplexes with $100K down
    print("\n" + "="*90)
    print("🔶 DUPLEXES WITH $100K DOWN")
    print("="*90)
    
    for d in DUPLEXES:
        r = analyze_scenario_a(d)
        cf_emoji = "🟢" if r["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n   {d['address']} ({d['units']} units)")
        print(f"      Price: ${r['price']:,} | Down: ${r['down_payment']:,} | Loan: ${r['loan']:,}")
        print(f"      Rent: ${r['rent']:,}/mo | Monthly CF: ${r['monthly_cash_flow']:,.0f} {cf_emoji}")
        print(f"      CoC: {r['coc']:.1f}% | Cap: {r['cap_rate']:.1f}%")
    
    # Summary
    print("\n" + "="*90)
    print("📈 SUMMARY COMPARISON")
    print("="*90)
    print(f"\n   Scenario A ($100K Down):        {pos_cf_a}/25 positive cash flow")
    print(f"   Scenario B (Full Rehab):        {pos_cf_b}/25 positive cash flow")
    print(f"   Scenario C ($100K + Rehab):     {pos_cf_c}/25 positive cash flow")
    
    print("\n💡 KEY INSIGHT:")
    print("   With $100K down payment, you can positively cash flow MANY properties!")
    print("   The lower loan amount = lower mortgage = more cash flow!")

if __name__ == "__main__":
    print_analysis()
