#!/usr/bin/env python3
"""
Headless Browser Property Scraper using PatchRight
Uses existing Chrome installation to scrape property listings

Usage:
    python headless_scraper.py
"""

import asyncio
import re
import json
import os
from datetime import datetime
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'

async def scrape_with_patchright(url, wait_time=5000):
    """Scrape a URL using headless Chrome via PatchRight"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        )
        
        page = await browser.new_page()
        
        try:
            await page.goto(url, timeout=60000, wait_until='domcontentloaded')
            await page.wait_for_timeout(wait_time)
            
            content = await page.content()
            
            await browser.close()
            return {
                'url': url,
                'success': True,
                'length': len(content),
                'content': content[:50000]  # First 50k chars
            }
        except Exception as e:
            await browser.close()
            return {
                'url': url,
                'success': False,
                'error': str(e)
            }

def extract_properties(content):
    """Extract property data from HTML content"""
    properties = []
    
    # Extract prices ($XXX,XXX pattern)
    prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', content)
    prices = [int(p.replace(',','')) for p in prices if 50000 <= int(p.replace(',','')) <= 1000000]
    
    # Extract addresses
    addr_pattern = r'([0-9]+)\s+([A-Za-z]+(?:St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place|Blvd|Boulevard))'
    addresses = re.findall(addr_pattern, content)
    
    # Extract beds/baths
    beds = re.findall(r'(\d+)\s*(?:bed|bedroom|Bed|Bedroom)', content)
    baths = re.findall(r'(\d+(?:\.\d+)?)\s*(?:bath|bathroom|Bath|Bathroom)', content)
    
    return {
        'prices': sorted(set(prices))[:20],
        'addresses': addresses[:10],
        'beds': beds[:10],
        'baths': baths[:10]
    }

async def main():
    print("=" * 60)
    print("🏠 HEADLESS BROWSER PROPERTY SCRAPER")
    print("=" * 60)
    
    # Sites to try
    sites = [
        # ERA
        ("ERA Fort Worth", "https://www.era.com/for-sale/fort-worth-tx/"),
        # Century 21
        ("Century 21", "https://www.century21.com/property/fort-worth-tx"),
        # REMAX
        ("REMAX", "https://www.remax.com/fort-worth-tx/real-estate"),
        # Texas real estate
        ("Texas Real Estate", "https://www.texasrealestate.com/"),
        # Fort Worth focused
        ("FW Focused", "https://www.fortworthfocused.com/"),
    ]
    
    results = []
    
    for name, url in sites:
        print(f"\n📍 Scraping {name}...")
        result = await scrape_with_patchright(url)
        
        if result['success']:
            extracted = extract_properties(result['content'])
            print(f"   ✅ Got {result['length']} chars")
            print(f"   💰 Prices found: {extracted['prices'][:5]}")
            print(f"   📍 Addresses: {len(extracted['addresses'])}")
            
            results.append({
                'site': name,
                'url': url,
                'extracted': extracted
            })
        else:
            print(f"   ❌ Error: {result.get('error', 'Unknown')}")
    
    # Save results
    output_file = f"scraper_results_{datetime.now().strftime('%Y%m%d')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Results saved to {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
