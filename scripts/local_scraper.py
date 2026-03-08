#!/usr/bin/env python3
"""
Free Local Scraper using PatchRight (headless Chrome)
Drop-in replacement for ScraperAPI

Usage:
    python local_scraper.py <url>
    python local_scraper.py "https://example.com"
"""

import asyncio
import sys
import json
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'

async def scrape(url, wait_time=3000):
    """Scrape a URL using headless Chrome"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        )
        
        page = await browser.new_page()
        
        try:
            await page.goto(url, timeout=60000, wait_until='domcontentloaded')
            await page.wait_for_timeout(wait_time)
            
            content = await page.content()
            
            await browser.close()
            return {
                'success': True,
                'status': 200,
                'content': content
            }
        except Exception as e:
            await browser.close()
            return {
                'success': False,
                'error': str(e)
            }

async def main():
    if len(sys.argv) < 2:
        print("Usage: python local_scraper.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    print(f"Scraping: {url}")
    
    result = await scrape(url)
    
    if result['success']:
        print(f"Success! Got {len(result['content'])} bytes")
        # Print first 500 chars
        print(result['content'][:500])
    else:
        print(f"Error: {result.get('error')}")

if __name__ == '__main__':
    asyncio.run(main())
