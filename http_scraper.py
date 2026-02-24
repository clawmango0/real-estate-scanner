#!/usr/bin/env python3
"""
Real Estate Scraper using curl_cffi
Lightweight alternative to browser-based scraping
"""

from curl_cffi.requests import Session
import re
import json

def create_stealth_session():
    """Create a stealthy session that mimics a real browser"""
    session = Session(
        impersonate="chrome110",
        proxies=None,
        timeout=30
    )
    return session

def scrape_with_curl_cffi():
    """Use curl_cffi to scrape - no browser needed"""
    print("🔍 Testing curl_cffi (HTTP-based scraper)...")
    
    session = create_stealth_session()
    
    # Test with example
    try:
        r = session.get("https://example.com")
        print(f"   ✅ Example.com: {r.status_code}")
    except Exception as e:
        print(f"   ❌ Example failed: {e}")
        return
    
    # Try Zillow (likely blocked)
    print("\n🔍 Trying Zillow...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        r = session.get("https://zillow.com", headers=headers)
        print(f"   Zillow: {r.status_code}")
        if r.status_code == 200:
            print(f"   Page length: {len(r.text):,}")
        elif r.status_code == 403:
            print("   ❌ Blocked by anti-bot")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Try simpler sites
    print("\n🔍 Trying less-protected sites...")
    
    sites = [
        ("Realtor.com", "https://www.realtor.com/realestateandhomes-search/Fort-Worth_TX"),
        ("Movoto", "https://www.movoto.com/tx/fort-worth"),
        ("Point2 Homes", "https://www.point2homes.com/US/TX/Fort-Worth-real-estate.html"),
    ]
    
    for name, url in sites:
        try:
            r = session.get(url, headers=headers, timeout=20)
            print(f"   {name}: {r.status_code} ({len(r.text):,} chars)")
            
            # Extract prices if successful
            if r.status_code == 200:
                prices = re.findall(r'\$[\d,]+', r.text)[:10]
                if prices:
                    print(f"      Found prices: {prices[:5]}")
        except Exception as e:
            print(f"   {name}: ❌ {str(e)[:50]}")

def fetch_url(url, session=None):
    """Simple URL fetcher"""
    if session is None:
        session = create_stealth_session()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    try:
        r = session.get(url, headers=headers, timeout=20)
        return r
    except Exception as e:
        return None

if __name__ == "__main__":
    print("="*60)
    print("🕷️ CURL_CFFI SCRAPER TEST")
    print("="*60)
    scrape_with_curl_cffi()
