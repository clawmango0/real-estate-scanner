#!/usr/bin/env python3
"""
Real Estate Scraper using Scrapling
Fetches live data from Zillow and rental sites
"""

from scrapling.fetchers import StealthyFetcher, DynamicFetcher
import json
import re
import time

def scrape_zillow_for_sale(location="Wedgewood, Fort Worth, TX", max_results=25):
    """
    Scrape Zillow for sale listings in the area
    """
    print(f"🔍 Scraping Zillow for sale listings in {location}...")
    
    # Build search URL
    search_url = f"https://www.zillow.com/homes/for_sale/?searchQueryState=%7B%22usersSearchTerm%22%3A%22{location.replace(' ', '%20')}%22%2C%22filterState%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22days%22%7D%2C%22rs%22%3A%7B%22value%22%3Atrue%7D%2C%22fsba%22%3A%7B%22value%22%3Afalse%7D%2C%22fsnb%22%3A%7B%22value%22%3Afalse%7D%2C%22cmsn%22%3A%7B%22value%22%3Afalse%7D%2C%22auc%22%3A%7B%22value%22%3Afalse%7D%2C%22fore%22%3A%7B%22value%22%3Afalse%7D%7D%7D"
    
    try:
        # Use StealthyFetcher to bypass anti-bot
        fetcher = StealthyFetcher()
        response = fetcher.fetch(search_url, headless=True, network_idle=True, timeout=30)
        
        print(f"✅ Page fetched successfully!")
        print(f"   Title: {response.css('title::text').get()}")
        
        # Try to extract property cards
        # Zillow uses various selectors, try common patterns
        properties = []
        
        # Method 1: Try JSON data embedded in page
        json_data = response.css('script::text').re(r'window\.ZillowData\s*=\s*(\{.*?\});')
        if json_data:
            print(f"   Found embedded JSON data!")
        
        # Method 2: Look for property cards
        cards = response.css('.property-card, .ListItem, . StyledPropertyCardDataWrapper')
        
        # Method 3: Search for addresses and prices
        addresses = response.css('[data-testid="property-address"]::text, .property-address::text, address::text').getall()
        prices = response.css('[data-testid="property-price"]::text, .price::text, .PropertyCardPrice::text').getall()
        
        print(f"   Found {len(addresses)} addresses, {len(prices)} prices")
        
        # Try alternative - look for any text containing addresses
        all_text = response.css('body::text').get()
        
        # Look for price patterns ($XXX,XXX)
        price_pattern = re.findall(r'\$[\d,]+', all_text)
        unique_prices = list(set(price_pattern))[:50]
        
        print(f"   Found {len(unique_prices)} unique price values")
        
        return {
            "source": "zillow",
            "location": location,
            "addresses_found": addresses[:10],
            "prices_found": unique_prices[:20],
            "raw_html_length": len(response.text),
        }
        
    except Exception as e:
        print(f"❌ Error scraping Zillow: {e}")
        return {"error": str(e)}

def scrape_rentals(location="Wedgewood, Fort Worth, TX"):
    """
    Scrape rental listings
    """
    print(f"🔍 Scraping for rentals in {location}...")
    
    search_url = f"https://www.zillow.com/homes/for_rent/?searchQueryState=%7B%22usersSearchTerm%22%3A%22{location.replace(' ', '%20')}%22%7D"
    
    try:
        fetcher = StealthyFetcher()
        response = fetcher.fetch(search_url, headless=True, network_idle=True, timeout=30)
        
        print(f"✅ Rentals page fetched!")
        
        all_text = response.css('body::text').get()
        prices = re.findall(r'\$[\d,]+', all_text)
        
        return {
            "source": "zillow_rentals",
            "prices": list(set(prices))[:30],
        }
        
    except Exception as e:
        print(f"❌ Error scraping rentals: {e}")
        return {"error": str(e)}

def scrape_craigslist(location="fort worth"):
    """
    Try Craigslist (usually less protected)
    """
    print(f"🔍 Scraping Craigslist {location}...")
    
    search_url = f"https://{location}.craigslist.org/search/apa?query=3+bedroom"
    
    try:
        fetcher = Fetcher()
        response = fetcher.fetch(search_url, timeout=15)
        
        print(f"✅ Craigslist fetched!")
        
        # Extract listings
        titles = response.css('.result-title::text').getall()
        prices = response.css('.result-price::text').getall()
        hoods = response.css('.result-hood::text').getall()
        
        listings = []
        for i in range(min(len(titles), 10)):
            listing = {
                "title": titles[i] if i < len(titles) else "",
                "price": prices[i] if i < len(prices) else "",
                "hood": hoods[i] if i < len(hoods) else "",
            }
            listings.append(listing)
        
        return {
            "source": "craigslist",
            "listings": listings,
        }
        
    except Exception as e:
        print(f"❌ Error scraping Craigslist: {e}")
        return {"error": str(e)}

def test_stealthy():
    """
    Test if scrapling can access various sites
    """
    sites = [
        ("Example", "https://example.com"),
        ("HTTPBin", "https://httpbin.org/headers"),
    ]
    
    fetcher = StealthyFetcher()
    
    for name, url in sites:
        try:
            response = fetcher.fetch(url, headless=True, timeout=10)
            print(f"✅ {name}: {response.status}")
        except Exception as e:
            print(f"❌ {name}: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🕷️ REAL ESTATE SCRAPER TEST")
    print("="*60)
    
    # Test basic connectivity
    print("\n📡 Testing connectivity...")
    test_stealthy()
    
    # Try scraping
    print("\n" + "="*60)
    result = scrape_zillow_for_sale("Wedgewood, Fort Worth, TX")
    print(f"\n📊 Result: {json.dumps(result, indent=2)[:500]}...")
