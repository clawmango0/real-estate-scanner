#!/usr/bin/env python3
"""
Real Estate Scraper using Scrapling + Playwright
Fetches live data from real estate sites
"""

from scrapling.fetchers import StealthyFetcher
import json
import re
import time

def scrape_zillow(location="Wedgewood, Fort Worth, TX", max_retries=2):
    """Scrape Zillow for sale listings"""
    print(f"🔍 Scraping Zillow for {location}...")
    
    search_url = f"https://www.zillow.com/homes/for_sale/?searchQueryState=%7B%22usersSearchTerm%22%3A%22{location.replace(' ', '%20')}%22%2C%22filterState%22%3A%7B%22sort%22%3A%7B%22value%22%3A%22days%22%7D%7D%7D"
    
    fetcher = StealthyFetcher()
    
    for attempt in range(max_retries):
        try:
            print(f"   Attempt {attempt + 1}...")
            response = fetcher.fetch(
                search_url, 
                headless=True, 
                network_idle=True, 
                timeout=60  # 60 second timeout
            )
            
            print(f"   ✅ Success! Page length: {len(response.text):,} chars")
            
            # Extract data - look for JSON embedded in page
            prices = re.findall(r'\$[\d,]+', response.text)[:50]
            addresses = re.findall(r'\d+\s+[\w\s]+(?:Ave|St|Dr|Blvd|Cir|Rd|Ln|Way|Ct|Pl)', response.text)[:20]
            
            # Clean up prices
            unique_prices = list(set([p.replace(',', '').replace('$', '') for p in prices if len(p) > 3]))
            numeric_prices = [int(p) for p in unique_prices if p.isdigit() and 50000 < int(p) < 500000]
            
            return {
                "source": "zillow",
                "success": True,
                "prices": numeric_prices[:20],
                "addresses": addresses[:10],
                "url": search_url
            }
            
        except Exception as e:
            print(f"   ❌ Attempt {attempt + 1} failed: {str(e)[:100]}")
            if attempt < max_retries - 1:
                time.sleep(2)
    
    return {"source": "zillow", "success": False, "error": "All attempts failed"}

def scrape_realtor(location="Fort Worth, TX"):
    """Scrape realtor.com"""
    print(f"🔍 Scraping Realtor.com for {location}...")
    
    # Try simple URL first
    url = f"https://www.realtor.com/realestateandhomes-search/{location.replace(' ', '-')}"
    
    fetcher = StealthyFetcher()
    
    try:
        response = fetcher.fetch(url, headless=True, network_idle=True, timeout=60)
        print(f"   ✅ Success! Page length: {len(response.text):,}")
        
        prices = re.findall(r'\$[\d,]+', response.text)[:30]
        return {"source": "realtor", "success": True, "prices": prices[:15]}
        
    except Exception as e:
        print(f"   ❌ Failed: {str(e)[:100]}")
        return {"source": "realtor", "success": False, "error": str(e)[:200]}

def scrape_apartments(location="Fort Worth, TX"):
    """Scrape apartments.com"""
    print(f"🔍 Scraping Apartments.com for {location}...")
    
    url = f"https://www.apartments.com/{location.lower().replace(' ', '-')}/"
    
    fetcher = StealthyFetcher()
    
    try:
        response = fetcher.fetch(url, headless=True, network_idle=True, timeout=60)
        print(f"   ✅ Success! Page length: {len(response.text):,}")
        
        prices = re.findall(r'\$[\d,]+', response.text)[:30]
        return {"source": "apartments", "success": True, "prices": prices[:15]}
        
    except Exception as e:
        print(f"   ❌ Failed: {str(e)[:100]}")
        return {"source": "apartments", "success": False, "error": str(e)[:200]}

def test_connection():
    """Test basic connectivity"""
    print("📡 Testing basic connectivity...")
    
    fetcher = StealthyFetcher()
    
    # Test with simple site
    test_urls = [
        ("Example", "https://example.com"),
    ]
    
    for name, url in test_urls:
        try:
            print(f"   Testing {name}...")
            response = fetcher.fetch(url, headless=True, timeout=30)
            print(f"   ✅ {name}: {response.status}")
        except Exception as e:
            print(f"   ❌ {name}: {str(e)[:50]}")

if __name__ == "__main__":
    print("="*60)
    print("🕷️ REAL ESTATE SCRAPER (Scrapling + Playwright)")
    print("="*60)
    
    # Test connection first
    test_connection()
    
    print("\n" + "="*60)
    
    # Try scraping
    result = scrape_zillow("Wedgewood, Fort Worth, TX")
    print(f"\n📊 Result: {json.dumps(result, indent=2)[:500]}...")
