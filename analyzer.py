#!/usr/bin/env python3
"""
Real Estate Analyzer - Wedgewood & Crowley
Generates analysis, stats, and visualizations for property investment
"""

import json

# Property data (expandable)
PROPERTIES = [
    {"rank": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "roi": 10.9, "score": 58, "schools": 5.3},
    {"rank": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "roi": 11.4, "score": 57, "schools": 6.3},
    {"rank": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "roi": 10.2, "score": 56, "schools": 5.0},
    {"rank": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "roi": 10.4, "score": 54, "schools": 6.3},
    {"rank": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "roi": 9.3, "score": 53, "schools": 6.0},
    {"rank": 6, "address": "5521 Lubbock Ave, Ft Worth", "price": 250000, "beds": 3, "baths": 2, "sqft": 1295, "roi": 8.6, "score": 51, "schools": 6.3},
    {"rank": 7, "address": "2705 W Fuller Ave, Ft Worth", "price": 235000, "beds": 4, "baths": 3, "sqft": 1977, "roi": 10.7, "score": 51, "schools": 5.3},
    {"rank": 8, "address": "5905 Wheaton Dr, Ft Worth", "price": 242000, "beds": 3, "baths": 2, "sqft": 2071, "roi": 9.4, "score": 50, "schools": 6.3},
    {"rank": 9, "address": "4512 Fair Park Blvd, Ft Worth", "price": 239999, "beds": 3, "baths": 2, "sqft": 1372, "roi": 8.5, "score": 49, "schools": 4.3},
    {"rank": 10, "address": "5408 Waltham Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1222, "roi": 8.6, "score": 48, "schools": 6.3},
    {"rank": 11, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "roi": 10.6, "score": 55, "schools": 5.3},
    {"rank": 12, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "roi": 9.6, "score": 52, "schools": 4.3},
    {"rank": 13, "address": "6021 Whitman Ave, Ft Worth", "price": 210000, "beds": 3, "baths": 2, "sqft": 1450, "roi": 10.3, "score": 52, "schools": 6.0},
    {"rank": 14, "address": "2217 Matthews Rd, Ft Worth", "price": 265000, "beds": 4, "baths": 2, "sqft": 1800, "roi": 8.6, "score": 47, "schools": 5.3},
    {"rank": 15, "address": "5528 Lubbock Ave, Ft Worth", "price": 255000, "beds": 3, "baths": 2, "sqft": 1400, "roi": 8.7, "score": 47, "schools": 6.3},
    {"rank": 16, "address": "4518 Fair Park Blvd, Ft Worth", "price": 229000, "beds": 3, "baths": 2, "sqft": 1300, "roi": 8.6, "score": 46, "schools": 4.3},
    {"rank": 17, "address": "6008 Wheaton Dr, Ft Worth", "price": 258000, "beds": 3, "baths": 2, "sqft": 1650, "roi": 8.8, "score": 46, "schools": 6.3},
    {"rank": 18, "address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "roi": 8.6, "score": 45, "schools": 3.3},
    {"rank": 19, "address": "4721 Sandage Ave, Ft Worth", "price": 215000, "beds": 3, "baths": 2, "sqft": 1250, "roi": 9.5, "score": 45, "schools": 5.3},
    {"rank": 20, "address": "1234 Crowley Rd, Crowley", "price": 240000, "beds": 3, "baths": 2, "sqft": 1400, "roi": 9.0, "score": 44, "schools": 6.0},
    {"rank": 21, "address": "5601 Wedgmont Ct, Ft Worth", "price": 270000, "beds": 3, "baths": 2, "sqft": 1900, "roi": 8.9, "score": 44, "schools": 6.3},
    {"rank": 22, "address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "roi": 8.8, "score": 43, "schools": 4.3},
    {"rank": 23, "address": "3821 Saint Louis Ave, Ft Worth", "price": 245000, "beds": 3, "baths": 2, "sqft": 1350, "roi": 8.3, "score": 42, "schools": 5.0},
    {"rank": 24, "address": "6345 Crowley Cleburne Rd, Crowley", "price": 290000, "beds": 4, "baths": 2, "sqft": 1950, "roi": 9.1, "score": 41, "schools": 5.3},
    {"rank": 25, "address": "1542 Hulen Park Dr, Ft Worth", "price": 205000, "beds": 3, "baths": 2, "sqft": 1100, "roi": 9.4, "score": 40, "schools": 4.3},
]

DUPLEXES = [
    {"address": "2847 W Seminary Dr, Ft Worth", "price": 285000, "units": 2, "sqft": 2400, "roi": 14.0, "score": 62},
    {"address": "5123 Crowley Rd, Crowley", "price": 295000, "units": 2, "sqft": 2800, "roi": 12.0, "score": 59},
    {"address": "3901 Hulen St, Ft Worth", "price": 275000, "units": 2, "sqft": 2200, "roi": 13.0, "score": 57},
    {"address": "6234 Crowley Cleburne, Crowley", "price": 265000, "units": 2, "sqft": 2000, "roi": 12.0, "score": 54},
    {"address": "4521 Evans Ave, Ft Worth", "price": 300000, "units": 4, "sqft": 2400, "roi": 16.0, "score": 68},
]

def calculate_stats():
    """Calculate key statistics"""
    prices = [p["price"] for p in PROPERTIES]
    sqfts = [p["sqft"] for p in PROPERTIES]
    rois = [p["roi"] for p in PROPERTIES]
    scores = [p["score"] for p in PROPERTIES]
    
    stats = {
        "avg_price": sum(prices) / len(prices),
        "median_price": sorted(prices)[len(prices)//2],
        "min_price": min(prices),
        "max_price": max(prices),
        "avg_sqft": sum(sqfts) / len(sqfts),
        "avg_roi": sum(rois) / len(rois),
        "avg_score": sum(scores) / len(scores),
        "under_200k": len([p for p in PROPERTIES if p["price"] < 200000]),
        "duplex_count": len(DUPLEXES),
    }
    return stats

def get_score_color(score):
    """Return color based on score"""
    if score >= 55: return "🟢"
    elif score >= 50: return "🟡"
    elif score >= 45: return "🔴"
    else: return "⚫"

def generate_report():
    """Generate full analysis report"""
    stats = calculate_stats()
    
    print("=" * 60)
    print("🏠 REAL ESTATE SCANNER - WEDGEWOOD & CROWLEY")
    print("=" * 60)
    print(f"\n📊 KEY STATISTICS")
    print(f"  Average Price:     ${stats['avg_price']:,.0f}")
    print(f"  Median Price:      ${stats['median_price']:,.0f}")
    print(f"  Price Range:       ${stats['min_price']:,.0f} - ${stats['max_price']:,.0f}")
    print(f"  Average ROI:       {stats['avg_roi']:.1f}%")
    print(f"  Average Score:     {stats['avg_score']:.0f}")
    print(f"  Under $200K:       {stats['under_200k']} properties")
    print(f"  Duplexes Found:    {stats['duplex_count']}")
    
    print(f"\n🏆 TOP 5 PICKS")
    for p in PROPERTIES[:5]:
        color = get_score_color(p["score"])
        print(f"  {p['rank']}. {p['address']}")
        print(f"     ${p['price']:,} | {p['roi']}% ROI | Score: {p['score']} {color}")
    
    print(f"\n💰 BEST ROI LEADS")
    by_roi = sorted(PROPERTIES, key=lambda x: x["roi"], reverse=True)[:5]
    for p in by_roi:
        print(f"  {p['address']}: {p['roi']}%")
    
    print(f"\n🔶 DUPLEX OPPORTUNITIES")
    for d in sorted(DUPLEXES, key=lambda x: x["score"], reverse=True):
        print(f"  {d['address']}: ${d['price']:,} | {d['units']} units | {d['roi']}% ROI | Score: {d['score']}")
    
    print(f"\n📍 AREA INSIGHTS")
    wedgwood = [p for p in PROPERTIES if "Ft Worth" in p["address"]]
    crowley = [p for p in PROPERTIES if "Crowley" in p["address"]]
    print(f"  Wedgewood (Ft Worth): {len(wedgwood)} properties, avg score: {sum(p['score'] for p in wedgwood)/len(wedgwood):.0f}")
    print(f"  Crowley: {len(crowley)} properties, avg score: {sum(p['score'] for p in crowley)/len(crowley):.0f}")

if __name__ == "__main__":
    generate_report()
