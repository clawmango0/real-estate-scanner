#!/usr/bin/env python3
"""
Real Estate Analyzer - Wedgewood & Crowley
Full investment metrics with dual scenarios (20% vs 10% down)
"""

PROPERTIES = [
    {"rank": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "rent": 1650},
    {"rank": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "rent": 1850},
    {"rank": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "rent": 1700},
    {"rank": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "rent": 2000},
    {"rank": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "rent": 1700},
    {"rank": 6, "address": "5521 Lubbock Ave, Ft Worth", "price": 250000, "beds": 3, "baths": 2, "sqft": 1295, "rent": 1800},
    {"rank": 7, "address": "2705 W Fuller Ave, Ft Worth", "price": 235000, "beds": 4, "baths": 3, "sqft": 1977, "rent": 2100},
    {"rank": 8, "address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "rent": 1900},
    {"rank": 9, "address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "rent": 1700},
    {"rank": 10, "address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "rent": 1750},
    {"rank": 11, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "rent": 1550},
    {"rank": 12, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "rent": 1500},
    {"rank": 13, "address": "6021 Whitman Ave, Ft Worth", "price": 210000, "beds": 3, "baths": 2, "sqft": 1450, "rent": 1800},
    {"rank": 14, "address": "2217 Matthews Rd, Ft Worth", "price": 265000, "beds": 4, "baths": 2, "sqft": 1800, "rent": 1900},
    {"rank": 15, "address": "5528 Lubbock Ave, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "rent": 1850},
    {"rank": 16, "address": "4518 Fair Park Blvd, Ft Worth", "price": 229000, "beds": 3, "baths": 2, "sqft": 1300, "rent": 1650},
    {"rank": 17, "address": "6008 Wheaton Dr, Ft Worth", "price": 258000, "beds": 3, "baths": 2, "sqft": 1650, "rent": 1900},
    {"rank": 18, "address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "rent": 1400},
    {"rank": 19, "address": "4721 Sandage Ave, Ft Worth", "price": 215000, "beds": 3, "baths": 2, "sqft": 1250, "rent": 1700},
    {"rank": 20, "address": "1234 Crowley Rd, Crowley", "price": 240000, "beds": 3, "baths": 2, "sqft": 1400, "rent": 1800},
    {"rank": 21, "address": "5601 Wedgmont Ct, Ft Worth", "price": 270000, "beds": 3, "baths": 2, "sqft": 1900, "rent": 2000},
    {"rank": 22, "address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "rent": 1350},
    {"rank": 23, "address": "3821 Saint Louis Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "rent": 1700},
    {"rank": 24, "address": "6345 Crowley Cleburne Rd, Crowley", "price": 290000, "beds": 4, "baths": 2, "sqft": 1950, "rent": 2200},
    {"rank": 25, "address": "1542 Hulen Park Dr, Ft Worth", "price": 205000, "beds": 3, "baths": 2, "sqft": 1100, "rent": 1600},
]

DUPLEXES = [
    {"address": "2847 W Seminary Dr, Ft Worth", "price": 285000, "units": 2, "sqft": 2400, "rent": 2800},
    {"address": "5123 Crowley Rd, Crowley", "price": 295000, "units": 2, "sqft": 2800, "rent": 3000},
    {"address": "3901 Hulen St, Ft Worth", "price": 275000, "units": 2, "sqft": 2200, "rent": 2600},
    {"address": "6234 Crowley Cleburne, Crowley", "price": 265000, "units": 2, "sqft": 2000, "rent": 2500},
    {"address": "4521 Evans Ave, Ft Worth", "price": 300000, "units": 4, "sqft": 2400, "rent": 3600},
]

INTEREST_RATE = 0.07
LOAN_YEARS = 30
OER = 0.50

def calculate_metrics(prop, down_payment_pct=0.20):
    price = prop["price"]
    monthly_rent = prop.get("rent", 1800)
    annual_rent = monthly_rent * 12
    
    down_payment = price * down_payment_pct
    loan_amount = price - down_payment
    monthly_rate = INTEREST_RATE / 12
    num_payments = LOAN_YEARS * 12
    monthly_mortgage = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    annual_debt_service = monthly_mortgage * 12
    
    closing_costs = price * 0.03
    initial_rehab = 5000
    total_cash = down_payment + closing_costs + initial_rehab
    
    # 1% Rule
    one_percent = (monthly_rent / price) * 100
    
    # GRM
    grm = price / annual_rent
    
    # NOI (50% rule)
    operating_expenses = annual_rent * OER
    noi = annual_rent - operating_expenses
    
    # Cap Rate
    cap_rate = (noi / price) * 100
    
    # DSCR
    dscr = noi / annual_debt_service if annual_debt_service else 0
    
    # Cash-on-Cash
    annual_cash_flow = noi - annual_debt_service
    coc = (annual_cash_flow / total_cash) * 100 if total_cash else 0
    
    # Monthly Cash Flow
    monthly_cash_flow = (noi / 12) - monthly_mortgage
    
    return {
        "one_percent": one_percent,
        "grm": grm,
        "noi": noi,
        "cap_rate": cap_rate,
        "dscr": dscr,
        "coc": coc,
        "monthly_cash_flow": monthly_cash_flow,
        "monthly_mortgage": monthly_mortgage,
        "total_cash": total_cash,
        "annual_cash_flow": annual_cash_flow
    }

def get_score(metrics):
    score = 0
    if metrics["one_percent"] >= 1.0: score += 25
    elif metrics["one_percent"] >= 0.8: score += 18
    elif metrics["one_percent"] >= 0.6: score += 10
    
    if metrics["grm"] <= 8: score += 25
    elif metrics["grm"] <= 10: score += 15
    elif metrics["grm"] <= 12: score += 8
    
    if metrics["cap_rate"] >= 8: score += 25
    elif metrics["cap_rate"] >= 6: score += 18
    elif metrics["cap_rate"] >= 4: score += 10
    
    if metrics["coc"] >= 10: score += 25
    elif metrics["coc"] >= 5: score += 18
    elif metrics["coc"] >= 0: score += 10
    else: score += max(-10, int(metrics["coc"]))
    
    return max(0, min(score, 100))

def analyze_all(down_payment_pct=0.20):
    results = []
    for prop in PROPERTIES:
        metrics = calculate_metrics(prop, down_payment_pct)
        score = get_score(metrics)
        results.append({**prop, **metrics, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results

def analyze_duplexes(down_payment_pct=0.20):
    results = []
    for d in DUPLEXES:
        metrics = calculate_metrics(d, down_payment_pct)
        score = get_score(metrics)
        results.append({**d, **metrics, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def print_report():
    print("\n" + "="*85)
    print("REAL ESTATE ANALYZER - WEDGEWOOD & CROWLEY, TX")
    print("Full 8-Metric Investment Analysis | 50% Expense Rule")
    print("="*85)
    
    # Conventional 20% down
    print("\n" + "="*85)
    print("SCENARIO A: CONVENTIONAL (20% DOWN)")
    print("="*85)
    
    results_20 = analyze_all(0.20)
    dupes_20 = analyze_duplexes(0.20)
    
    print(f"\nTOP 5 PROPERTIES (20% Down)")
    print("-"*85)
    for p in results_20[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n#{p['rank']}. {p['address']}")
        print(f"   Price: ${p['price']:,} | {p['beds']}bd/{p['baths']}ba | {p['sqft']}sqft")
        print(f"   1% Rule: {p['one_percent']:.2f}% | GRM: {p['grm']:.1f} | Cap: {p['cap_rate']:.1f}%")
        print(f"   Monthly Cash Flow: ${p['monthly_cash_flow']:,.0f} {cf_emoji} | CoC: {p['coc']:.1f}%")
        print(f"   DSCR: {p['dscr']:.2f} | Score: {p['score']}/100")
    
    print(f"\nTOP DUPLEX (20% Down)")
    d = dupes_20[0]
    cf_emoji = "🟢" if d["monthly_cash_flow"] > 0 else "🔴"
    print(f"   {d['address']} - ${d['price']:,}")
    print(f"   1% Rule: {d['one_percent']:.2f}% | GRM: {d['grm']:.1f} | Cap: {d['cap_rate']:.1f}%")
    print(f"   Monthly CF: ${d['monthly_cash_flow']:,.0f} {cf_emoji} | CoC: {d['coc']:.1f}%")
    
    # Investor 10% down
    print("\n" + "="*85)
    print("SCENARIO B: INVESTOR (10% DOWN) - Lower barrier to entry")
    print("="*85)
    
    results_10 = analyze_all(0.10)
    dupes_10 = analyze_duplexes(0.10)
    
    print(f"\nTOP 5 PROPERTIES (10% Down)")
    print("-"*85)
    for p in results_10[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n#{p['rank']}. {p['address']}")
        print(f"   Price: ${p['price']:,} | {p['beds']}bd/{p['baths']}ba | {p['sqft']}sqft")
        print(f"   1% Rule: {p['one_percent']:.2f}% | GRM: {p['grm']:.1f} | Cap: {p['cap_rate']:.1f}%")
        print(f"   Monthly Cash Flow: ${p['monthly_cash_flow']:,.0f} {cf_emoji} | CoC: {p['coc']:.1f}%")
        print(f"   DSCR: {p['dscr']:.2f} | Score: {p['score']}/100")
    
    print(f"\nTOP DUPLEX (10% Down)")
    d = dupes_10[0]
    cf_emoji = "🟢" if d["monthly_cash_flow"] > 0 else "🔴"
    print(f"   {d['address']} - ${d['price']:,}")
    print(f"   1% Rule: {d['one_percent']:.2f}% | GRM: {d['grm']:.1f} | Cap: {d['cap_rate']:.1f}%")
    print(f"   Monthly CF: ${d['monthly_cash_flow']:,.0f} {cf_emoji} | CoC: {d['coc']:.1f}%")
    
    # Summary
    pos_cf_20 = len([p for p in results_20 if p["monthly_cash_flow"] > 0])
    pos_cf_10 = len([p for p in results_10 if p["monthly_cash_flow"] > 0])
    
    print("\n" + "="*85)
    print("MARKET SUMMARY")
    print("="*85)
    print(f"\n   Properties with Positive Cash Flow:")
    print(f"      20% Down: {pos_cf_20}/25 ({pos_cf_20/25*100:.0f}%)")
    print(f"      10% Down: {pos_cf_10}/25 ({pos_cf_10/25*100:.0f}%)")
    print(f"\n   Reality Check: Most properties show NEGATIVE cash flow at these price points.")
    print(f"      This market is primarily an APPRECIATION play, not cash flow.")
    print(f"      Rent-to-price ratios are too low for strong cash flow with 50% expenses.")

if __name__ == "__main__":
    print_report()
