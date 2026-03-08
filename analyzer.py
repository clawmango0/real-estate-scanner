#!/usr/bin/env python3
"""
Real Estate Analyzer - Wedgewood & Crowley
Full investment metrics using Mr. Kelly's exact scoring rubric
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
OER = 0.50  # 50% rule

# Mr. Kelly's exact scoring rubric
SCORING = {
    "1pct": {  # 1% Rule
        (1.5, float('inf')): 10,
        (1.3, 1.5): 8,
        (1.1, 1.3): 6,
        (1.0, 1.1): 5,
        (float('-inf'), 1.0): 3,
    },
    "grm": {  # GRM (lower is better, so inverted)
        (float('-inf'), 6): 10,
        (6, 7.5): 8,
        (7.5, 9): 6,
        (9, 11): 5,
        (11, float('inf')): 3,
    },
    "oer": {  # OER (lower is better)
        (float('-inf'), 40): 10,
        (40, 45): 8,
        (45, 50): 6,
        (50, 55): 5,
        (55, float('inf')): 3,
    },
    "cap": {  # Cap Rate
        (10, float('inf')): 10,
        (8, 10): 8,
        (6, 8): 6,
        (5, 6): 5,
        (float('-inf'), 5): 3,
    },
    "dscr": {  # DSCR
        (1.75, float('inf')): 10,
        (1.5, 1.75): 8,
        (1.25, 1.5): 6,
        (1.0, 1.25): 5,
        (float('-inf'), 1.0): 3,
    },
    "coc": {  # Cash-on-Cash
        (12, float('inf')): 10,
        (10, 12): 8,
        (8, 10): 6,
        (6, 8): 5,
        (float('-inf'), 6): 3,
    },
    "cf": {  # Monthly Cash Flow
        (300, float('inf')): 10,
        (200, 300): 8,
        (100, 200): 6,
        (0, 100): 5,
        (float('-inf'), 0): 0,  # Negative = 0 pts
    }
}

def get_score_for_metric(value, metric, inverted=False):
    """Get score for a metric value using Mr. Kelly's rubric"""
    ranges = SCORING[metric]
    for (low, high), score in ranges.items():
        if inverted:
            if low <= value < high:
                return score
        else:
            if low <= value < high:
                return score
    return 3  # Default lowest

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
    
    # Calculate metrics
    one_percent = (monthly_rent / price) * 100
    grm = price / annual_rent
    oer = OER * 100
    operating_expenses = annual_rent * OER
    noi = annual_rent - operating_expenses
    cap_rate = (noi / price) * 100
    dscr = noi / annual_debt_service if annual_debt_service else 0
    annual_cash_flow = noi - annual_debt_service
    coc = (annual_cash_flow / total_cash) * 100 if total_cash else 0
    monthly_cash_flow = (noi / 12) - monthly_mortgage
    
    return {
        "one_percent": one_percent,
        "grm": grm,
        "oer": oer,
        "noi": noi,
        "cap_rate": cap_rate,
        "dscr": dscr,
        "coc": coc,
        "monthly_cash_flow": monthly_cash_flow,
        "monthly_mortgage": monthly_mortgage,
        "total_cash": total_cash,
    }

def calculate_buy_score(metrics):
    """Calculate buy score using Mr. Kelly's rubric (max 70 pts)"""
    score = 0
    score += get_score_for_metric(metrics["one_percent"], "1pct")
    score += get_score_for_metric(metrics["grm"], "grm", inverted=True)
    score += get_score_for_metric(metrics["oer"], "oer", inverted=True)
    score += get_score_for_metric(metrics["cap_rate"], "cap")
    score += get_score_for_metric(metrics["dscr"], "dscr")
    score += get_score_for_metric(metrics["coc"], "coc")
    score += get_score_for_metric(metrics["monthly_cash_flow"], "cf")
    return score

def get_grade(score):
    """Convert score to letter grade"""
    if score >= 60: return "A"
    elif score >= 50: return "B"
    elif score >= 40: return "C"
    elif score >= 30: return "D"
    else: return "F"

def analyze_all(down_payment_pct=0.20):
    results = []
    for prop in PROPERTIES:
        metrics = calculate_metrics(prop, down_payment_pct)
        score = calculate_buy_score(metrics)
        results.append({**prop, **metrics, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results

def analyze_duplexes(down_payment_pct=0.20):
    results = []
    for d in DUPLEXES:
        metrics = calculate_metrics(d, down_payment_pct)
        score = calculate_buy_score(metrics)
        results.append({**d, **metrics, "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results

def print_report():
    print("\n" + "="*90)
    print("REAL ESTATE ANALYZER - WEDGEWOOD & CROWLEY, TX")
    print("Using Mr. Kelly's Exact Scoring Rubric (Max 70 Points)")
    print("="*90)
    
    print("\n📋 SCORING RUBRIC USED:")
    print("-"*90)
    print("Metric         | 10 pts (Excellent) | 8 pts (Strong) | 6 pts (Good) | 5 pts (Acceptable) | 3-0 pts (Weak)")
    print("-"*90)
    print("1% Rule        | ≥1.5%             | 1.3-1.49%     | 1.1-1.29%    | 1.0-1.09%         | <1.0%")
    print("GRM            | ≤6                | 6.1-7.5       | 7.6-9        | 9.1-11            | >11")
    print("OER            | ≤40%              | 41-45%        | 46-50%       | 51-55%            | >55%")
    print("Cap Rate       | ≥10%              | 8-9.9%        | 6-7.9%       | 5-5.9%            | <5%")
    print("DSCR           | ≥1.75             | 1.5-1.74      | 1.25-1.49    | 1.0-1.24          | <1.0")
    print("Cash-on-Cash   | ≥12%              | 10-11.9%      | 8-9.9%       | 6-7.9%            | <6%")
    print("Monthly CF     | >$300             | $200-300      | $100-199     | $0-99             | Negative")
    
    results_20 = analyze_all(0.20)
    dupes_20 = analyze_duplexes(0.20)
    
    print("\n" + "="*90)
    print("🏆 TOP 10 PROPERTIES RANKED BY BUY SCORE (20% Down)")
    print("="*90)
    
    for p in results_20[:10]:
        grade = get_grade(p["score"])
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n#{p['rank']}. {p['address']}")
        print(f"   Price: ${p['price']:,} | {p['beds']}bd/{p['baths']}ba | {p['sqft']}sqft")
        print(f"   1% Rule: {p['one_percent']:.2f}% | GRM: {p['grm']:.1f} | Cap: {p['cap_rate']:.1f}%")
        print(f"   DSCR: {p['dscr']:.2f} | CoC: {p['coc']:.1f}% | OER: {p['oer']:.0f}%")
        print(f"   Monthly Cash Flow: ${p['monthly_cash_flow']:,.0f} {cf_emoji}")
        print(f"   📊 BUY SCORE: {p['score']}/70 ({grade})")
    
    print("\n" + "="*90)
    print("🔶 DUPLEX/MULTI-UNIT RANKINGS (20% Down)")
    print("="*90)
    
    for d in dupes_20:
        grade = get_grade(d["score"])
        cf_emoji = "🟢" if d["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n🔶 {d['address']} ({d['units']} units)")
        print(f"   Price: ${d['price']:,} | {d['sqft']}sqft")
        print(f"   1% Rule: {d['one_percent']:.2f}% | GRM: {d['grm']:.1f} | Cap: {d['cap_rate']:.1f}%")
        print(f"   DSCR: {d['dscr']:.2f} | CoC: {d['coc']:.1f}%")
        print(f"   Monthly Cash Flow: ${d['monthly_cash_flow']:,.0f} {cf_emoji}")
        print(f"   📊 BUY SCORE: {d['score']}/70 ({grade})")
    
    # Summary
    pos_cf = len([p for p in results_20 if p["monthly_cash_flow"] > 0])
    avg_score = sum(p["score"] for p in results_20) / len(results_20)
    
    print("\n" + "="*90)
    print("📈 MARKET SUMMARY")
    print("="*90)
    print(f"\n   Properties with Positive Monthly Cash Flow: {pos_cf}/25 ({pos_cf/25*100:.0f}%)")
    print(f"   Average Buy Score: {avg_score:.1f}/70")
    print(f"   Highest Score: {results_20[0]['score']}/70 ({results_20[0]['address']})")
    print(f"   Best Cash Flow: ${max(p['monthly_cash_flow'] for p in results_20 + dupes_20):,.0f}/mo")

if __name__ == "__main__":
    print_report()
