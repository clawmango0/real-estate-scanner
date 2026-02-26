#!/usr/bin/env python3
"""
Zillow Scraper v2 - Using ScraperAPI
Extracts actual listing data properly
"""

import requests
import re
import json
import time
from datetime import datetime
from typing import List, Dict

API_KEY = "0b281e9035c595a332e175b172d8b36e"

def scrape_zillow(location: str = "Fort Worth, TX", filters: dict = None):
    """Scrape Zillow for property listings"""
    
    base_url = "https://www.zillow.com"
    
    # Build search URL based on location
    if location == "Fort Worth, TX":
        search_url = f"{base_url}/homes/for_sale/?searchQueryState=%7B%22usersSearchTerm%22%3A%22Fort%20Worth%2C%20TX%22%2C%22filterstate%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22days%22%7D%2C%22rs%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Atrue%7D%2C%22fsbo%22%3A%7B%22value%22%3Atrue%7D%2C%22nc%22%3A%7B%22value%22%3Atrue%7D%2C%22cmsn%22%3A%7B%22value%22%3Atrue%7D%2C%22auc%22%3A%7B%22value%22%3Atrue%7D%2C%22fore%22%3A%7B%22value%22%3Atrue%7D%7D%7D"
    else:
        search_url = f"{base_url}/homes/for_sale/?searchQueryState=%7B%22usersSearchTerm%22%3A%22{location.replace(',', '%2C')}%22%7D"
    
    print(f"📡 Scraping Zillow for {location}...")
    print(f"   URL: {search_url[:80]}...")
    
    # Use ScraperAPI
    api_url = f"https://api.scraperapi.com?api_key={API_KEY}&url={requests.utils.quote(search_url)}&render=true"
    
    resp = requests.get(api_url, timeout=90)
    
    if resp.status_code != 200:
        print(f"❌ Error: {resp.status_code}")
        return None
    
    html = resp.text
    
    # Find the embedded JSON data - look for searchResults
    listings = []
    
    # Pattern 1: Find listResults array
    pattern1 = r'"listResults"\s*:\s*\[(.*?)\]'
    match1 = re.search(pattern1, html, re.DOTALL)
    
    if match1:
        try:
            # Try to parse each item individually
            items_text = "[" + match1.group(1) + "]"
            
            # Find individual listing objects
            listing_pattern = r'\{[^{}]*(?:price|address|streetAddress)[^{}]*\}'
            matches = re.findall(listing_pattern, items_text)
            
            for m in matches:
                try:
                    # Parse the individual item
                    item_json = "{" + m + "}"
                    item = json.loads(item_json)
                    
                    price = item.get('price') or item.get('unformattedPrice')
                    if not price:
                        continue
                    
                    address = item.get('address', {}).get('streetAddress') or item.get('streetAddress', 'N/A')
                    beds = item.get('beds')
                    baths = item.get('baths')
                    sqft = item.get('sqft') or item.get('livingArea')
                    
                    listings.append({
                        'price': price,
                        'address': address,
                        'beds': beds,
                        'baths': baths,
                        'sqft': sqft
                    })
                except:
                    continue
                    
        except Exception as e:
            print(f"   ⚠️  Parse error: {e}")
    
    # If no structured data, fall back to basic extraction
    if not listings:
        print("   ⚠️  No structured data found, using basic extraction...")
        
        # Extract prices
        price_pattern = r'\$(\d{1,3}(?:,\d{3})*)'
        prices = re.findall(price_pattern, html)
        prices = sorted(set([int(p.replace(',', '')) for p in prices if 30000 <= int(p.replace(',', '')) <= 1000000]))
        
        # Extract bed counts  
        beds_pattern = r'(\d+)\s*(?:bed|beds|bedroom)'
        beds = re.findall(beds_pattern, html, re.IGNORECASE)
        
        for i, price in enumerate(prices[:20]):
            listings.append({
                'price': price,
                'address': f'Property {i+1}',
                'beds': beds[i] if i < len(beds) else None,
                'baths': None,
                'sqft': None
            })
    
    print(f"   ✅ Found {len(listings)} listings")
    
    # Filter for investment criteria if specified
    if filters:
        min_price = filters.get('min_price', 0)
        max_price = filters.get('max_price', 999999999)
        min_beds = filters.get('min_beds', 0)
        
        filtered = [l for l in listings 
                   if min_price <= l['price'] <= max_price 
                   and (not l['beds'] or l['beds'] >= min_beds)]
        
        print(f"   🎯 {len(filtered)} match investment criteria")
        return filtered
    
    return listings

def analyze_investment(listings: List[Dict]):
    """Analyze listings for investment potential"""
    print("\n" + "=" * 60)
    print("📊 INVESTMENT ANALYSIS")
    print("=" * 60)
    
    # Sort by price
    listings = sorted(listings, key=lambda x: x.get('price', 0))
    
    # Calculate metrics
    prices = [l['price'] for l in listings if l.get('price')]
    if prices:
        avg_price = sum(prices) / len(prices)
        min_price = min(prices)
        max_price = max(prices)
        
        print(f"\n💰 Price Range: ${min_price:,} - ${max_price:,}")
        print(f"   Average: ${avg_price:,.0f}")
    
    # Show top candidates
    print(f"\n🎯 TOP CANDIDATES (Sorted by Price):")
    for i, l in enumerate(listings[:10], 1):
        price_str = f"${l['price']:,}" if l.get('price') else "N/A"
        beds_str = f"{l['beds']}bd" if l.get('beds') else ""
        baths_str = f"{l['baths']}ba" if l.get('baths') else ""
        sqft_str = f"{l['sqft']}sqft" if l.get('sqft') else ""
        
        print(f"   {i}. {price_str:>10} | {l['address'][:30]:<30} | {beds_str} {baths_str} {sqft_str}")
    
    return listings

# Run
if __name__ == "__main__":
    filters = {
        'min_price': 100000,
        'max_price': 300000,
        'min_beds': 3
    }
    
    listings = scrape_zillow("Fort Worth, TX", filters)
    
    if listings:
        analyze_investment(listings)
        
        # Save
        output = {
            'timestamp': datetime.now().isoformat(),
            'source': 'Zillow via ScraperAPI',
            'location': 'Fort Worth, TX',
            'filters': filters,
            'listings': listings
        }
        
        filename = f"zillow_investment_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"\n✅ Saved to {filename}")
