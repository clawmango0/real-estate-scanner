#!/usr/bin/env python3
"""
Real Rental Data Scraper using curl_cffi
Pulls REAL market data from RentCafe
"""

from curl_cffi.requests import Session
from bs4 import BeautifulSoup
import re
import json

def scrape_rentcafe(city, state='TX'):
    """Scrape rental data from RentCafe"""
    s = Session(impersonate='chrome')
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    # Handle special URLs
    city_url = city.lower().replace(' ', '-')
    url = f'https://www.rentcafe.com/apartments-for-rent/us/{state.lower()}/{city_url}/'
    
    print(f"Scraping {url}...")
    
    try:
        r = s.get(url, headers=headers, timeout=30)
        if r.status_code != 200:
            return {"error": f"HTTP {r.status_code}", "city": city}
        
        # Extract prices
        all_prices = re.findall(r'\$([\d,]+)', r.text)
        prices = [int(p.replace(',','')) for p in all_prices]
        rent_prices = [p for p in prices if 500 <= p <= 5000]
        
        # Extract addresses
        addr_pattern = r'(\d+\s+[\w\s]+(?:Ave|St|Dr|Blvd|Rd|Ln|Way|Ct|Pl)[,\s]*(?:Fort\s*Worth|TX|Denton)?)'
        addresses = re.findall(addr_pattern, r.text)
        
        # Try to extract bed/bath from the page
        beds = re.findall(r'(\d+)\s*bed', r.text, re.IGNORECASE)
        baths = re.findall(r'(\d+)\s*bath', r.text, re.IGNORECASE)
        
        return {
            "city": city,
            "state": state,
            "url": url,
            "listings_found": len(rent_prices),
            "avg_rent": round(sum(rent_prices)/len(rent_prices), 2) if rent_prices else 0,
            "min_rent": min(rent_prices) if rent_prices else 0,
            "max_rent": max(rent_prices) if rent_prices else 0,
            "median_rent": sorted(rent_prices)[len(rent_prices)//2] if rent_prices else 0,
            "price_distribution": {
                "under_1000": len([p for p in rent_prices if p < 1000]),
                "1000_1500": len([p for p in rent_prices if 1000 <= p < 1500]),
                "1500_2000": len([p for p in rent_prices if 1500 <= p < 2000]),
                "over_2000": len([p for p in rent_prices if p >= 2000]),
            },
            "sample_addresses": list(set(addresses))[:20]
        }
        
    except Exception as e:
        return {"error": str(e), "city": city}

def analyze_area(area_name, city, state='TX'):
    """Get rental data for an area"""
    return scrape_rentcafe(city, state)

if __name__ == "__main__":
    import sys
    
    # Default areas to scrape
    areas = [
        ("Wedgewood/Crowley (SW Fort Worth)", "Fort-Worth"),
        ("Denton", "Denton"),
    ]
    
    print("="*60)
    print("🏠 REAL ESTATE RENTAL DATA SCRAPER")
    print("="*60)
    
    results = []
    
    for name, city in areas:
        print(f"\n📍 {name}...")
        data = analyze_area(name, city)
        
        if "error" in data:
            print(f"   ❌ Error: {data['error']}")
        else:
            print(f"   ✅ {data['listings_found']} listings found")
            print(f"   💰 Avg Rent: ${data['avg_rent']:,.0f}")
            print(f"   📊 Range: ${data['min_rent']} - ${data['max_rent']}")
            results.append(data)
    
    # Save results
    with open('rental_market_data.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n\n✅ Data saved to rental_market_data.json")
