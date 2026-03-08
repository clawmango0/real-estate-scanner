#!/usr/bin/env python3
"""
Stealth Headless Browser Scraper for Property Sites
Uses PatchRight with enhanced stealth settings
"""

import asyncio
import re
import json
from datetime import datetime
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'

async def stealth_browser():
    """Create a stealthy browser instance"""
    browser = await async_playwright().chromium.launch(
        headless=True,
        executable_path=CHROME_PATH,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
    )
    
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale='en-US',
        timezone_id='America/Chicago',
    )
    
    page = await context.new_page()
    
    # Additional stealth
    await page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    """)
    
    return browser, context, page

async def scrape_site(name, url, wait_time=5000):
    """Scrape a site with stealth settings"""
    print(f"\n📍 Scraping {name}...")
    
    try:
        p = await async_playwright().start()
        browser = await p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox', 
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
            ]
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        )
        
        page = await context.new_page()
        
        # Go to page with retry logic
        for attempt in range(3):
            try:
                await page.goto(url, timeout=45000, wait_until='domcontentloaded')
                await page.wait_for_timeout(wait_time)
                break
            except Exception as e:
                if attempt < 2:
                    await page.wait_for_timeout(3000)
                    continue
                raise
        
        content = await page.content()
        
        # Extract data
        prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', content)
        prices = sorted(set([int(p.replace(',','')) for p in prices if 50000 <= int(p.replace(',','')) <= 1000000]))
        
        # Get links
        links = await page.query_selector_all('a[href]')
        listing_links = []
        for link in links[:50]:
            href = await link.get_attribute('href')
            if href and ('listing' in href.lower() or 'property' in href.lower() or 'fort-worth' in href.lower()):
                listing_links.append(href)
        
        result = {
            'site': name,
            'url': url,
            'success': True,
            'prices': prices[:10],
            'listing_links': listing_links[:5],
            'content_length': len(content)
        }
        
        print(f"   ✅ {len(content)} chars, {len(prices)} prices")
        
        await browser.close()
        await p.stop()
        
        return result
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:50]}")
        return {
            'site': name,
            'url': url,
            'success': False,
            'error': str(e)
        }

async def main():
    print("=" * 60)
    print("🔍 STEALTH PROPERTY SCRAPER")
    print("=" * 60)
    
    sites = [
        ("Fort Worth Focused", "https://www.fortworthfocused.com"),
        ("Fort Worth Focused Properties", "https://www.fortworthfocused.com/properties"),
        ("TX Property", "https://www.txproperty.com"),
        ("Texas MLS", "https://www.ntreis.net"),
    ]
    
    results = []
    for name, url in sites:
        result = await scrape_site(name, url)
        results.append(result)
        await asyncio.sleep(2)  # Delay between sites
    
    # Save
    output = f"stealth_results_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(output, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Saved to {output}")

if __name__ == "__main__":
    asyncio.run(main())
