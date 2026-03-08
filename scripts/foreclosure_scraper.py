#!/usr/bin/env python3
"""
Foreclosure/Auction Property Scraper
Uses PatchRight to scrape RealtyTrac for investment properties
"""

import asyncio
import re
import json
from datetime import datetime
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'

async def scrape_foreclosures():
    """Scrape foreclosure listings"""
    
    p = await async_playwright().start()
    browser = await p.chromium.launch(
        headless=True,
        executable_path=CHROME_PATH,
        args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    context = await browser.new_context()
    page = await context.new_page()
    
    # Try Texas + Fort Worth
    urls = [
        'https://www.realtytrac.com/texas/fort-worth',
        'https://www.realtytrac.com/texas/tarrant-county',
        'https://www.realtytrac.com/texas/denton-county',
    ]
    
    all_properties = []
    
    for url in urls:
        print(f"\n📍 Scraping {url}...")
        
        try:
            await page.goto(url, timeout=45000)
            await page.wait_for_timeout(5000)
            content = await page.content()
            
            # Extract property data
            # Look for addresses
            addrs = re.findall(r'([0-9]{4,5}\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court))', content)
            
            # Extract prices
            prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', content)
            prices = [int(p.replace(',','')) for p in prices if 50000 <= int(p.replace(',','')) <= 1000000]
            
            print(f"   Found {len(addrs)} addresses, {len(prices)} prices")
            print(f"   Prices: {sorted(set(prices))[:10]}")
            
            # Try to get listing links
            links = await page.query_selector_all('a[href*="/property"]')
            listing_urls = []
            for link in links[:20]:
                href = await link.get_attribute('href')
                if href:
                    listing_urls.append(href)
            
            print(f"   Listing links: {len(listing_urls)}")
            
            all_properties.append({
                'source': url,
                'addresses': addrs[:10],
                'prices': sorted(set(prices))[:20],
                'listing_links': listing_urls[:10]
            })
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:50]}")
    
    await browser.close()
    await p.stop()
    
    return all_properties

async def main():
    print("=" * 60)
    print("🏠 FORECLOSURE PROPERTY SCRAPER")
    print("=" * 60)
    
    results = await scrape_foreclosures()
    
    output = f"foreclosure_results_{datetime.now().strftime('%Y%m%d')}.json"
    with open(output, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Results saved to {output}")

if __name__ == "__main__":
    asyncio.run(main())
