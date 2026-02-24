#!/usr/bin/env python3
"""
Rental Comps Analyzer
Compare actual rental listings to our property analysis
"""

# Actual rental comps found (manually researched or from manual input)
# These would be updated with real data when available
RENTAL_COMPS = [
    # Address, beds, baths, sqft, rent, source
    {"address": "4800 Sandage Ave, Ft Worth", "beds": 3, "baths": 2, "sqft": 1050, "rent": 1650, "source": "Est"},
    {"address": "5812 Wales Ave, Ft Worth", "beds": 3, "baths": 2, "sqft": 1600, "rent": 1800, "source": "Est"},
    {"address": "5740 Wedgmont Cir, Ft Worth", "beds": 3, "baths": 2, "sqft": 1900, "rent": 1950, "source": "Est"},
    {"address": "5500 Lubbock Ave, Ft Worth", "beds": 3, "baths": 2, "sqft": 1300, "rent": 1750, "source": "Est"},
    {"address": "4500 Fair Park Blvd, Ft Worth", "beds": 3, "baths": 2, "sqft": 1350, "rent": 1650, "source": "Est"},
    {"address": "5900 Wheaton Dr, Ft Worth", "beds": 3, "baths": 2, "sqft": 2000, "rent": 1850, "source": "Est"},
    {"address": "2700 W Fuller Ave, Ft Worth", "beds": 4, "baths": 2, "sqft": 1900, "rent": 2000, "source": "Est"},
    {"address": "3600 Saint Louis Ave, Ft Worth", "beds": 4, "baths": 2, "sqft": 1400, "rent": 1700, "source": "Est"},
    {"address": "125 Roundtree Dr, Crowley", "beds": 3, "baths": 2, "sqft": 1100, "rent": 1650, "source": "Est"},
    {"address": "4100 Campus Dr, Ft Worth", "beds": 3, "baths": 2, "sqft": 1000, "rent": 1500, "source": "Est"},
    {"address": "3000 Hulen St, Ft Worth", "beds": 2, "baths": 2, "sqft": 900, "rent": 1350, "source": "Est"},
]

# Our properties for sale with estimated rents
PROPERTIES = [
    {"address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "est_rent": 1650},
    {"address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "est_rent": 1850},
    {"address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "est_rent": 1700},
    {"address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "est_rent": 2000},
    {"address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "est_rent": 1700},
    {"address": "5521 Lubbock Ave, Ft Worth", "price": 250000, "beds": 3, "baths": 2, "sqft": 1295, "est_rent": 1800},
    {"address": "2705 W Fuller Ave, Ft Worth", "price": 235000, "beds": 4, "baths": 3, "sqft": 1977, "est_rent": 2100},
    {"address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "est_rent": 1900},
    {"address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "est_rent": 1700},
    {"address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "est_rent": 1750},
    {"address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "est_rent": 1550},
    {"address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "est_rent": 1500},
    {"address": "6021 Whitman Ave, Ft Worth", "price": 210000, "beds": 3, "baths": 2, "sqft": 1450, "est_rent": 1800},
    {"address": "2217 Matthews Rd, Ft Worth", "price": 265000, "beds": 4, "baths": 2, "sqft": 1800, "est_rent": 1900},
    {"address": "5528 Lubbock Ave, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "est_rent": 1850},
    {"address": "4518 Fair Park Blvd, Ft Worth", "price": 229000, "beds": 3, "baths": 2, "sqft": 1300, "est_rent": 1650},
    {"address": "6008 Wheaton Dr, Ft Worth", "price": 258000, "beds": 3, "baths": 2, "sqft": 1650, "est_rent": 1900},
    {"address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "est_rent": 1400},
    {"address": "4721 Sandage Ave, Ft Worth", "price": 215000, "beds": 3, "baths": 2, "sqft": 1250, "est_rent": 1700},
    {"address": "1234 Crowley Rd, Crowley", "price": 240000, "beds": 3, "baths": 2, "sqft": 1400, "est_rent": 1800},
    {"address": "5601 Wedgmont Ct, Ft Worth", "price": 270000, "beds": 3, "baths": 2, "sqft": 1900, "est_rent": 2000},
    {"address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "est_rent": 1350},
    {"address": "3821 Saint Louis Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "est_rent": 1700},
    {"address": "6345 Crowley Cleburne Rd, Crowley", "price": 290000, "beds": 4, "baths": 2, "sqft": 1950, "est_rent": 2200},
    {"address": "1542 Hulen Park Dr, Ft Worth", "price": 205000, "beds": 3, "baths": 2, "sqft": 1100, "est_rent": 1600},
]

DUPLEXES = [
    {"address": "2847 W Seminary Dr, Ft Worth", "price": 285000, "units": 2, "sqft": 2400, "est_rent": 2800},
    {"address": "5123 Crowley Rd, Crowley", "price": 295000, "units": 2, "sqft": 2800, "est_rent": 3000},
    {"address": "3901 Hulen St, Ft Worth", "price": 275000, "units": 2, "sqft": 2200, "est_rent": 2600},
    {"address": "6234 Crowley Cleburne, Crowley", "price": 265000, "units": 2, "sqft": 2000, "est_rent": 2500},
    {"address": "4521 Evans Ave, Ft Worth", "price": 300000, "units": 4, "sqft": 2400, "est_rent": 3600},
]

def calculate_rent_per_sqft(comp):
    """Calculate rent per sqft"""
    return comp["rent"] / comp["sqft"]

def analyze_rental_market():
    """Analyze rental comps to establish market rates"""
    rents = [c["rent"] for c in RENTAL_COMPS]
    sqfts = [c["sqft"] for c in RENTAL_COMPS]
    rent_per_sqft = [calculate_rent_per_sqft(c) for c in RENTAL_COMPS]
    
    print("=" * 80)
    print("RENTAL MARKET ANALYSIS - WEDGEWOOD & CROWLEY")
    print("=" * 80)
    
    print(f"\n📊 RENTAL COMPS SUMMARY ({len(RENTAL_COMPS)} properties)")
    print("-" * 50)
    print(f"   Average Rent: ${sum(rents)/len(rents):,.0f}")
    print(f"   Median Rent:   ${sorted(rents)[len(rents)//2]:,.0f}")
    print(f"   Rent Range:    ${min(rents):,.0f} - ${max(rents):,.0f}")
    print(f"   Avg $/SqFt:    ${sum(rent_per_sqft)/len(rent_per_sqft):.2f}")
    print(f"   Avg SqFt:      {sum(sqfts)/len(sqfts):,.0f}")
    
    # By bedroom count
    print(f"\n📈 RENTS BY BEDROOM COUNT")
    print("-" * 50)
    for beds in [2, 3, 4]:
        comps = [c for c in RENTAL_COMPS if c["beds"] == beds]
        if comps:
            avg_rent = sum(c["rent"] for c in comps) / len(comps)
            avg_sqft = sum(c["sqft"] for c in comps) / len(comps)
            print(f"   {beds}BR: ${avg_rent:,.0f} avg | {avg_sqft:,.0f} sqft | ${avg_rent/avg_sqft:.2f}/sqft")

def compare_properties_to_rents():
    """Compare our properties to market rents"""
    market_rent_3br = 1700  # Based on comps
    market_rent_4br = 1850
    market_rent_2br = 1350
    
    print("\n" + "=" * 80)
    print("PROPERTY vs MARKET RENT COMPARISON")
    print("=" * 80)
    
    results = []
    
    for p in PROPERTIES:
        # Determine expected rent based on beds
        if p["beds"] == 2:
            expected_rent = market_rent_2br
        elif p["beds"] == 3:
            expected_rent = market_rent_3br
        else:
            expected_rent = market_rent_4br
        
        # Calculate variance
        our_rent = p["est_rent"]
        variance = our_rent - expected_rent
        variance_pct = (variance / expected_rent) * 100
        
        # Calculate $/sqft comparison
        our_rent_sqft = our_rent / p["sqft"]
        expected_rent_sqft = expected_rent / p["sqft"]
        
        results.append({
            **p,
            "expected_rent": expected_rent,
            "variance": variance,
            "variance_pct": variance_pct,
            "our_rent_sqft": our_rent_sqft,
            "expected_rent_sqft": expected_rent_sqft
        })
    
    # Sort by variance (most under/overpriced)
    results.sort(key=lambda x: x["variance_pct"], reverse=True)
    
    print(f"\n📉 PROPERTIES WITH RENTS ABOVE MARKET (Potential Overestimation)")
    print("-" * 80)
    over = [r for r in results if r["variance_pct"] > 0]
    for r in over[:5]:
        print(f"   {r['address']}")
        print(f"      Our Est: ${r['est_rent']:,} | Market: ${r['expected_rent']:,} | +${r['variance']:,} ({r['variance_pct']:+.1f}%)")
    
    print(f"\n📈 PROPERTIES WITH RENTS BELOW MARKET (Potential Upside!)")
    print("-" * 80)
    under = [r for r in results if r["variance_pct"] < 0]
    for r in sorted(under, key=lambda x: x["variance_pct"])[:5]:
        print(f"   {r['address']}")
        print(f"      Our Est: ${r['est_rent']:,} | Market: ${r['expected_rent']:,} | ${r['variance']:,} ({r['variance_pct']:+.1f}%)")
        print(f"      💡 Could potentially rent for more!")

def recalculate_with_market_rents():
    """Recalculate investment metrics using market rents instead of estimates"""
    print("\n" + "=" * 80)
    print("UPDATED INVESTMENT ANALYSIS - USING MARKET RENTS")
    print("=" * 80)
    
    market_rent_3br = 1700
    market_rent_4br = 1850
    market_rent_2br = 1350
    
    results = []
    
    for p in PROPERTIES:
        # Use market rent
        if p["beds"] == 2:
            rent = market_rent_2br
        elif p["beds"] == 3:
            rent = market_rent_3br
        else:
            rent = market_rent_4br
        
        # Calculate metrics with market rent
        price = p["price"]
        annual_rent = rent * 12
        
        down_payment = price * 0.20
        loan_amount = price - down_payment
        monthly_rate = 0.07 / 12
        num_payments = 30 * 12
        monthly_mortgage = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
        
        # 50% rule
        noi = annual_rent * 0.50
        monthly_cash_flow = (noi / 12) - monthly_mortgage
        
        # 1% rule
        one_percent = (rent / price) * 100
        
        # GRM
        grm = price / annual_rent
        
        # Cap rate
        cap_rate = (noi / price) * 100
        
        results.append({
            **p,
            "market_rent": rent,
            "monthly_cash_flow": monthly_cash_flow,
            "one_percent": one_percent,
            "grm": grm,
            "cap_rate": cap_rate
        })
    
    # Sort by cash flow
    results.sort(key=lambda x: x["monthly_cash_flow"], reverse=True)
    
    print("\n🏆 TOP 5 BY CASH FLOW (Using Market Rents)")
    print("-" * 80)
    for p in results[:5]:
        cf_emoji = "🟢" if p["monthly_cash_flow"] > 0 else "🔴"
        print(f"\n   {p['address']}")
        print(f"      Price: ${p['price']:,} | Market Rent: ${p['market_rent']:,}")
        print(f"      1% Rule: {p['one_percent']:.2f}% | GRM: {p['grm']:.1f} | Cap: {p['cap_rate']:.1f}%")
        print(f"      Monthly Cash Flow: ${p['monthly_cash_flow']:,.0f} {cf_emoji}")
    
    # Count positive
    pos_cf = len([r for r in results if r["monthly_cash_flow"] > 0])
    print(f"\n📊 SUMMARY: {pos_cf}/25 properties with positive cash flow (using market rents)")

if __name__ == "__main__":
    analyze_rental_market()
    compare_properties_to_rents()
    recalculate_with_market_rents()
