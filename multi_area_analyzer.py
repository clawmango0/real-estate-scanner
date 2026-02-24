#!/usr/bin/env python3
"""
Multi-Area Real Estate Analyzer
Analyzes 3 separate areas + combined analysis
"""

# Area definitions with approximate property data
# In production, this would come from scraped data

AREAS = {
    "wedgewood_crowley": {
        "name": "Wedgewood & Crowley (SW Fort Worth)",
        "center": {"lat": 32.634, "lng": -97.41},
        "zoom": 14,
        "description": "Southwest Fort Worth - established neighborhoods, good schools",
        "properties": [
            {"id": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "condition": 6, "year_built": 1958},
            {"id": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "condition": 7, "year_built": 1962},
            {"id": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "condition": 5, "year_built": 1955},
            {"id": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "condition": 7, "year_built": 1965},
            {"id": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "condition": 8, "year_built": 2005},
            {"id": 6, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "condition": 5, "year_built": 1956},
            {"id": 7, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "condition": 4, "year_built": 1952},
            {"id": 8, "address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "condition": 7, "year_built": 1968},
            {"id": 9, "address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "condition": 5, "year_built": 1958},
            {"id": 10, "address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "condition": 6, "year_built": 1963},
        ]
    },
    "denton": {
        "name": "Denton area (North)",
        "center": {"lat": 32.874, "lng": -97.20},
        "zoom": 13,
        "description": "Denton - college town, University of North Texas, growing market",
        "properties": [
            {"id": 101, "address": "1812 Sherman Dr, Denton", "price": 265000, "beds": 3, "baths": 2, "sqft": 1450, "condition": 7, "year_built": 1985},
            {"id": 102, "address": "2305 Scripture St, Denton", "price": 245000, "beds": 3, "baths": 2, "sqft": 1320, "condition": 6, "year_built": 1978},
            {"id": 103, "address": "809 Elm St, Denton", "price": 295000, "beds": 4, "baths": 2, "sqft": 1800, "condition": 7, "year_built": 1990},
            {"id": 104, "address": "1521 Locust St, Denton", "price": 275000, "beds": 3, "baths": 2, "sqft": 1550, "condition": 6, "year_built": 1982},
            {"id": 105, "address": "3405 W Oak St, Denton", "price": 235000, "beds": 3, "baths": 2, "sqft": 1280, "condition": 7, "year_built": 1988},
            {"id": 106, "address": "1205 Fry St, Denton", "price": 310000, "beds": 4, "baths": 2, "sqft": 1950, "condition": 8, "year_built": 2005},
            {"id": 107, "address": "907 Rio Grande Ave, Denton", "price": 225000, "beds": 3, "baths": 2, "sqft": 1200, "condition": 5, "year_built": 1975},
            {"id": 108, "address": "2512 N Elm St, Denton", "price": 285000, "beds": 3, "baths": 2, "sqft": 1650, "condition": 7, "year_built": 1995},
            {"id": 109, "address": "1800 University Dr, Denton", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "condition": 6, "year_built": 1980},
            {"id": 110, "address": "4521 Minter St, Denton", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "condition": 6, "year_built": 1983},
        ]
    },
    "downtown_fw": {
        "name": "Downtown Fort Worth",
        "center": {"lat": 32.718, "lng": -97.36},
        "zoom": 15,
        "description": "Central Fort Worth - urban core, Sundance Square, growing",
        "properties": [
            {"id": 201, "address": "1500 Commerce St, Ft Worth", "price": 320000, "beds": 2, "baths": 2, "sqft": 1200, "condition": 8, "year_built": 2010},
            {"id": 202, "address": "2151 Riverfront Dr, Ft Worth", "price": 385000, "beds": 3, "baths": 2, "sqft": 1450, "condition": 8, "year_built": 2015},
            {"id": 203, "address": "801 Main St, Ft Worth", "price": 295000, "beds": 2, "baths": 2, "sqft": 1100, "condition": 7, "year_built": 2008},
            {"id": 204, "address": "1624 Park Place Ave, Ft Worth", "price": 265000, "beds": 3, "baths": 2, "sqft": 1350, "condition": 6, "year_built": 1995},
            {"id": 205, "address": "2500 W 8th St, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1250, "condition": 6, "year_built": 1992},
            {"id": 206, "address": "1925 Houston St, Ft Worth", "price": 355000, "beds": 3, "baths": 2, "sqft": 1600, "condition": 7, "year_built": 2005},
            {"id": 207, "address": "625 W Weatherford St, Ft Worth", "price": 275000, "beds": 2, "baths": 2, "sqft": 1150, "condition": 7, "year_built": 2000},
            {"id": 208, "address": "1100 Throckmorton St, Ft Worth", "price": 340000, "beds": 2, "baths": 2, "sqft": 1300, "condition": 8, "year_built": 2012},
            {"id": 209, "address": "1751 River Oaks Blvd, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "condition": 6, "year_built": 1998},
            {"id": 210, "address": "900 W Belknap St, Ft Worth", "price": 285000, "beds": 3, "baths": 2, "sqft": 1500, "condition": 7, "year_built": 2003},
        ]
    }
}

def get_market_rent(beds, sqft):
    base_rents = {2: 1450, 3: 1750, 4: 2000}
    base = base_rents.get(beds, 1650)
    avg_sqft = {2: 1100, 3: 1400, 4: 1700}
    avg = avg_sqft.get(beds, 1400)
    adjustment = (sqft - avg) / avg * 0.1
    return int(base * (1 + adjustment))

def estimate_rehab(condition, sqft):
    if condition <= 3: return sqft * 75
    elif condition <= 6: return sqft * 35
    elif condition <= 8: return sqft * 15
    else: return sqft * 5

def analyze_area(area_key, down_payment=100000):
    """Analyze a single area"""
    area = AREAS[area_key]
    results = []
    
    for prop in area["properties"]:
        price = prop["price"]
        beds = prop["beds"]
        sqft = prop["sqft"]
        rent = get_market_rent(beds, sqft)
        
        # $100K down payment scenario
        down = min(down_payment, price * 0.99)
        loan = price - down
        
        # Mortgage
        monthly_rate = 0.07 / 12
        num_payments = 30 * 12
        mortgage = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1) if loan > 0 else 0
        
        # Cash flow (50% rule)
        noi = (rent * 12) * 0.50
        monthly_cf = (noi / 12) - mortgage
        annual_cf = monthly_cf * 12
        
        # CoC
        total_cash = down + (price * 0.03)
        coc = (annual_cf / total_cash) * 100 if total_cash > 0 else 0
        
        # 1% rule
        one_percent = (rent / price) * 100
        
        results.append({
            **prop,
            "rent": rent,
            "down_payment": down,
            "loan": loan,
            "mortgage": mortgage,
            "monthly_cf": monthly_cf,
            "annual_cf": annual_cf,
            "coc": coc,
            "one_percent": one_percent,
        })
    
    # Sort by cash flow
    results.sort(key=lambda x: x["monthly_cf"], reverse=True)
    return results

def analyze_all_areas(down_payment=100000):
    """Analyze all areas and create combined view"""
    all_results = {}
    
    for area_key in AREAS:
        all_results[area_key] = analyze_area(area_key, down_payment)
    
    return all_results

def print_report():
    print("\n" + "="*90)
    print("🏠 MULTI-AREA REAL ESTATE ANALYSIS")
    print("   Wedgewood/Crowley | Denton | Downtown Fort Worth")
    print("   With $100,000 Down Payment")
    print("="*90)
    
    all_results = analyze_all_areas(100000)
    
    # Each area
    for area_key, area_data in AREAS.items():
        results = all_results[area_key]
        
        print(f"\n{'='*90}")
        print(f"📍 AREA: {area_data['name']}")
        print(f"   📌 Center: {area_data['center']['lat']}, {area_data['center']['lng']}")
        print(f"   📝 {area_data['description']}")
        print("="*90)
        
        # Stats
        prices = [r["price"] for r in results]
        cfs = [r["monthly_cf"] for r in results]
        positive_cf = len([r for r in results if r["monthly_cf"] > 0])
        
        print(f"\n📊 AREA STATS:")
        print(f"   Properties: {len(results)}")
        print(f"   Avg Price: ${sum(prices)/len(prices):,.0f}")
        print(f"   Price Range: ${min(prices):,} - ${max(prices):,}")
        print(f"   Positive CF: {positive_cf}/{len(results)} ({positive_cf/len(results)*100:.0f}%)")
        print(f"   Avg Monthly CF: ${sum(cfs)/len(cfs):,.0f}")
        
        print(f"\n🏆 TOP 3 DEALS:")
        for i, r in enumerate(results[:3], 1):
            emoji = "🟢" if r["monthly_cf"] > 0 else "🔴"
            print(f"\n   {i}. {r['address']}")
            print(f"      Price: ${r['price']:,} | Rent: ${r['rent']:,}/mo")
            print(f"      Loan: ${r['loan']:,} | Mortgage: ${r['mortgage']:,.0f}")
            print(f"      Monthly CF: ${r['monthly_cf']:,.0f} {emoji} | CoC: {r['coc']:.1f}%")
    
    # Combined analysis
    print(f"\n{'='*90}")
    print("📊 COMBINED ANALYSIS - ALL 3 AREAS")
    print("="*90)
    
    combined = []
    for area_key, results in all_results.items():
        area_name = AREAS[area_key]["name"]
        for r in results:
            combined.append({**r, "area": area_name})
    
    combined.sort(key=lambda x: x["monthly_cf"], reverse=True)
    
    # Overall stats
    all_prices = [r["price"] for r in combined]
    all_cfs = [r["monthly_cf"] for r in combined]
    all_positive = len([r for r in combined if r["monthly_cf"] > 0])
    
    print(f"\n📊 OVERALL STATS:")
    print(f"   Total Properties: {len(combined)}")
    print(f"   Overall Avg Price: ${sum(all_prices)/len(all_prices):,.0f}")
    print(f"   Overall Positive CF: {all_positive}/{len(combined)} ({all_positive/len(combined)*100:.0f}%)")
    print(f"   Overall Avg Monthly CF: ${sum(all_cfs)/len(all_cfs):,.0f}")
    
    # Best overall
    print(f"\n🏆 TOP 10 DEALS ACROSS ALL AREAS:")
    for i, r in enumerate(combined[:10], 1):
        emoji = "🟢" if r["monthly_cf"] > 0 else "🔴"
        print(f"\n   {i}. {r['address']} ({r['area'].split('(')[0].strip()})")
        print(f"      Price: ${r['price']:,} | CF: ${r['monthly_cf']:,.0f}/mo {emoji} | CoC: {r['coc']:.1f}%")
    
    # By area comparison
    print(f"\n📈 AREA COMPARISON:")
    print("-"*60)
    for area_key, results in all_results.items():
        area_name = AREA_NAMES.get(area_key, area_key)
        cfs = [r["monthly_cf"] for r in results]
        positive = len([r for r in results if r["monthly_cf"] > 0])
        best = max(cfs)
        print(f"   {area_name}: {positive}/{len(results)} positive | Best CF: ${best:,.0f}/mo")

# Area name mapping for display
AREA_NAMES = {
    "wedgewood_crowley": "Wedgewood/Crowley",
    "denton": "Denton",
    "downtown_fw": "Downtown FW"
}

if __name__ == "__main__":
    print_report()
