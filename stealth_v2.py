#!/usr/bin/env python3
"""
Enhanced Stealth Scraper with Human Behavior Simulation
Avoids CAPTCHAs by behaving like a real user
"""

import asyncio
import random
import re
import json
from datetime import datetime
from patchright.async_api import async_playwright

CHROME_PATH = '/usr/bin/google-chrome'

class StealthScraper:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        
    async def setup(self):
        """Set up stealth browser with human-like behavior"""
        p = await async_playwright().start()
        
        self.browser = await p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--start-maximized',
            ]
        )
        
        # Realistic browser context
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Chicago',
            permissions=['geolocation'],
            geolocation={'latitude': 32.7555, 'longitude': -97.3308},  # Fort Worth
            color_scheme='light',
            device_scale_factor=1,
        )
        
        # Inject stealth scripts to hide automation
        self.page = await self.context.new_page()
        
        await self.page.add_init_script("""
            // Hide webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Hide automation flags
            window.navigator.chrome = {
                runtime: {}
            };
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Randomize screen properties
            Screen.prototype.availWidth = 1920;
            Screen.prototype.availHeight = 1040;
        """)
        
        # Set realistic cookies/location
        await self.context.add_cookies([{
            'name': 'timezone',
            'value': 'America/Chicago',
            'domain': '.fortworthfocused.com',
            'path': '/'
        }])
        
        print("✅ Stealth browser ready")
        
    async def human_delay(self, min_ms=500, max_ms=2000):
        """Random delay to mimic human"""
        await asyncio.sleep(random.uniform(min_ms, max_ms) / 1000)
        
    async def human_scroll(self):
        """Human-like scrolling behavior"""
        for _ in range(random.randint(2, 5)):
            await self.page.evaluate(f"window.scrollBy(0, {random.randint(200, 500)})")
            await asyncio.sleep(random.uniform(0.3, 0.8))
            
    async def human_move(self):
        """Random mouse movements"""
        for _ in range(random.randint(3, 8)):
            x = random.randint(100, 800)
            y = random.randint(100, 600)
            await self.page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.1, 0.3))
            
    async def visit_page(self, url, wait_time=5000):
        """Visit a page with human-like behavior"""
        print(f"📍 Visiting {url[:50]}...")
        
        try:
            # Navigate with referer to look like a normal visitor
            await self.page.goto(url, timeout=60000, wait_until='networkidle')
            
            # Random delay after load
            await self.human_delay(1000, 3000)
            
            # Human-like scroll
            await self.human_scroll()
            
            # Get content
            content = await self.page.content()
            
            # Extract data
            prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', content)
            prices = sorted(set([int(p.replace(',','')) for p in prices if 50000 <= int(p.replace(',','')) <= 1000000]))
            
            print(f"   ✅ {len(content)} chars, {len(prices)} prices: {prices[:5]}")
            
            return {
                'success': True,
                'content': content,
                'prices': prices,
                'url': url
            }
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:50]}")
            return {
                'success': False,
                'error': str(e),
                'url': url
            }
            
    async def solve_captcha_if_present(self):
        """Check for and handle CAPTCHAs"""
        # Check for various CAPTCHA types
        captcha_indicators = [
            'px-captcha',  # PerimeterX
            'g-recaptcha',  # reCAPTCHA
            'h-captcha',  # hCaptcha
            'captcha',  # Generic
            'challenge',  # Cloudflare
        ]
        
        content = await self.page.content()
        
        for indicator in captcha_indicators:
            if indicator in content.lower():
                print(f"⚠️  CAPTCHA detected: {indicator}")
                return True
                
        return False
        
    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()

async def main():
    print("=" * 60)
    print("🔐 ENHANCED STEALTH SCRAPER WITH HUMAN SIMULATION")
    print("=" * 60)
    
    scraper = StealthScraper()
    await scraper.setup()
    
    # Test sites
    sites = [
        "https://www.fortworthfocused.com",
        "https://www.zillow.com/homes/for_sale/",
    ]
    
    for url in sites:
        result = await scraper.visit_page(url)
        
        if result['success']:
            has_captcha = await scraper.solve_captcha_if_present()
            if has_captcha:
                print("   🔴 CAPTCHA blocked us")
        
        # Random delay between sites
        await scraper.human_delay(2000, 5000)
    
    await scraper.close()

if __name__ == "__main__":
    asyncio.run(main())
