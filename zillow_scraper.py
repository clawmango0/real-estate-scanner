#!/usr/bin/env python3
"""
Zillow Scraper using ScraperAPI
Now with working API key!
"""

import requests
import re
import json
import time
from datetime import datetime
from typing import List, Dict, Optional

# API Key from Mr. Kelly
import os
API_KEY = os.environ.get('SCRAPER_API_KEY', '')

class ZillowScraper:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.scraperapi.com"
        
    def scrape(self, url: str, render: bool = True) -> Optional[str]:
        """Scrape a URL using ScraperAPI"""
        params = {
            "api_key": self.api_key,
            "url": url,
            "render": str(render).lower()
        }
        
        try:
            resp = requests.get(self.base_url, params=params, timeout=90)
            if resp.status_code == 200:
                return resp.text
            else:
                print(f"Error: {resp.status_code}")
                return None
        except Exception as e:
            print(f"Exception: {e}")
            return None
            
    def extract_listings(self, html: str) -> List[Dict]:
        """Extract property listings from HTML"""
        listings = []
        
        # Look for price patterns
        price_pattern = r'\$(\d{1,3}(?:,\d{3})*)'
        prices = re.findall(price_pattern, html)
        
        # Look for addresses
        addr_pattern = r'([0-9]{3,5}\s+[A-Za-z]+(?:St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Blvd|Boulevard)[,\s]*(?:Fort\s*Worth|TX|Texas)?)'
        addresses = re.findall(addr_pattern, html, re.IGNORECASE)
        
        # Look for beds/baths
        beds_pattern = r'(\d+)\s*(?:bed|beds|bedroom|bedrooms)'
        baths_pattern = r'(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom|bathrooms)'
        
        beds = re.findall(beds_pattern, html, re.IGNORECASE)
        baths = re.findall(baths_pattern, html, re.IGNORECASE)
        
        # Try to extract structured data from JSON
        json_pattern = r'\"price\"[:\s]*(\d+)'
        json_prices = re.findall(json_pattern, html)
        
        # Look for sqft
        sqft_pattern = r'([\d,]+)\s*(?:sqft|sq\.ft|square\s*feet)'
        sqfts = re.findall(sqft_pattern, html, re.IGNORECASE)
        
        # Clean up prices
        all_prices = []
        for p in prices:
            try:
                val = int(p.replace(',', ''))
                if 30000 <= val <= 1000000:
                    all_prices.append(val)
            except:
                pass
        
        all_prices = sorted(set(all_prices))
        
        # Build listing data
        print(f"  Found {len(all_prices)} prices: ${min(all_prices):,} - ${max(all_prices):,}")
        print(f"  Found {len(addresses)} addresses")
        print(f"  Found {len(beds)} bed counts")
        
        # Create simplified listing objects
        for i, price in enumerate(all_prices[:20]):
            listing = {
                "price": price,
                "address": addresses[i] if i < len(addresses) else "Unknown",
                "beds": int(beds[i]) if i < len(beds) else None,
                "baths": float(baths[i]) if i < len(baths) else None,
            }
            listings.append(listing)
        
        return listings

def scrape_fort_worth():
    """Scrape Fort Worth listings"""
    scraper = ZillowScraper(API_KEY)
    
    # Fort Worth, TX
    url = "https://www.zillow.com/homes/for_sale/?searchQueryState=%7B%22usersSearchTerm%22%3A%22Fort%20Worth%2C%20TX%22%2C%22filterstate%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22days%22%7D%2C%22rs%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Atrue%7D%2C%22fsbo%22%3A%7B%22value%22%3Atrue%7D%2C%22nc%22%3A%7B%22value%22%3Atrue%7D%2C%22cmsn%22%3A%7B%22value%22%3Atrue%7D%2C%22auc%22%3A%7B%22value%22%3Atrue%7D%2C%22fore%22%3A%7B%22value%22%3Atrue%7D%7D%7D"
    
    print("=" * 60)
    print("🏠 SCRAPING FORT WORTH, TX ON ZILLOW")
    print("=" * 60)
    print("\n📡 Connecting to ScraperAPI...")
    
    html = scraper.scrape(url)
    
    if html:
        print("✅ Connected! Extracting data...\n")
        listings = scraper.extract_listings(html)
        
        # Filter for investment-worthy properties
        investment_listings = [
            l for l in listings 
            if l["price"] and 100000 <= l["price"] <= 300000
        ]
        
        print(f"\n📊 Results:")
        print(f"  Total listings found: {len(listings)}")
        print(f"  In investment range ($100k-$300k): {len(investment_listings)}")
        
        # Save results
        output = {
            "timestamp": datetime.now().isoformat(),
            "source": "Zillow via ScraperAPI",
            "location": "Fort Worth, TX",
            "total_listings": len(listings),
            "listings": listings,
            "investment_candidates": investment_listings
        }
        
        filename = f"zillow_fortworth_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"\n✅ Saved to {filename}")
        
        # Print top candidates
        if investment_listings:
            print(f"\n🎯 TOP INVESTMENT CANDIDATES:")
            for i, l in enumerate(investment_listings[:5], 1):
                print(f"  {i}. ${l['price']:,} - {l['address'][:40]}")
        
        return output
    else:
        print("❌ Failed to get data")
        return None

if __name__ == "__main__":
    scrape_fort_worth()
