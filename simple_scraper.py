#!/usr/bin/env python3
"""
Real Estate Scraper - Simple HTTP Version
Uses basic requests to fetch property data
"""

import requests
import re
import json
from urllib.parse import quote

def scrape_with_requests(url, headers=None):
    """Simple request scraper"""
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        return response
    except Exception as e:
        print(f"   Error: {e}")
        return None

def scrape_realtor_com():
    """Scrape realtor.com for rentals"""
    print("🔍 Testing realtor.com...")
    
    url = "https://www.realtor.com/realestateandhomes-search/Fort-Worth_TX/show-recently-added"
    response = scrape_with_requests(url)
    
    if response:
        print(f"   Status: {response.status_code}")
        print(f"   Length: {len(response.text)}")
        
        # Look for prices
        prices = re.findall(r'\$[\d,]+', response.text)[:20]
        print(f"   Prices found: {prices[:10]}")
        
        return {"status": response.status_code, "prices": prices}
    
    return {"error": "No response"}

def scrape_craigslist():
    """Scrape Craigslist"""
    print("🔍 Testing Craigslist...")
    
    url = "https://fortworth.craigslist.org/search/apa?query=3+bedroom+fort+worth"
    response = scrape_with_requests(url)
    
    if response:
        print(f"   Status: {response.status_code}")
        
        # Extract prices
        prices = re.findall(r'\$[\d,]+', response.text)[:20]
        print(f"   Prices found: {prices[:10]}")
        
        return {"status": response.status_code, "prices": prices}
    
    return {"error": "No response"}

def scrape_facebook_marketplace():
    """Scrape Facebook Marketplace (often less protected)"""
    print("🔍 Testing Facebook Marketplace...")
    
    # Facebook often requires more complex headers
    url = "https://www.facebook.com/marketplace/fortworth/propertyforrent"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    
    response = scrape_with_requests(url, headers)
    
    if response:
        print(f"   Status: {response.status_code}")
        return {"status": response.status_code}
    
    return {"error": "No response"}

def scrape_apartments_com():
    """Scrape apartments.com"""
    print("🔍 Testing apartments.com...")
    
    url = "https://www.apartments.com/fort-worth-tx/"
    response = scrape_with_requests(url)
    
    if response:
        print(f"   Status: {response.status_code}")
        
        # Extract prices from listings
        prices = re.findall(r'\$[\d,]+', response.text)[:30]
        print(f"   Prices found: {list(set(prices))[:15]}")
        
        return {"status": response.status_code, "prices": list(set(prices))[:30]}
    
    return {"error": "No response"}

def create_manual_entry_form():
    """
    Since scraping is blocked, create a form for manual data entry
    """
    form_template = """
# Manual Data Entry Form

Since major real estate sites block automated scraping, use this form to add new data:

## For Sale Properties
| Address | Price | Beds | Baths | Sqft | Year Built | Condition (1-10) |
|---------|-------|------|-------|------|------------|-------------------|
| | | | | | | |

## Rental Comps
| Address | Beds | Baths | Sqft | Rent |
|---------|------|-------|------|------|
| | | | | |

## Recently Sold (Comps)
| Address | Sold Price | Sold Date | Sqft |
|---------|------------|-----------|------|
| | | | |

---

## Quick Add Format (Copy/Paste)

### Property
```
PROPERTY: 123 Main St, City, ST | $250000 | 3 | 2 | 1500 | 1970 | 7
```

### Rental
```
RENTAL: 123 Main St, City, ST | 3 | 2 | 1500 | $1800
```

### Comp
```
COMP: 123 Main St, City, ST | $245000 | 2025-12-15 | 1500
```
"""
    return form_template

if __name__ == "__main__":
    print("="*60)
    print("🕷️ REAL ESTATE SCRAPER TEST")
    print("="*60)
    
    results = {}
    
    # Test various sites
    results['realtor'] = scrape_realtor_com()
    print()
    results['craigslist'] = scrape_craigslist()
    print()
    results['apartments'] = scrape_apartments_com()
    
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    
    for site, result in results.items():
        status = result.get('status', 'ERROR')
        print(f"   {site}: {status}")
    
    print("\n" + "="*60)
    print("📝 MANUAL ENTRY FORM")
    print("="*60)
    print(create_manual_entry_form())
