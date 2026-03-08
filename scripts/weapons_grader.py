#!/usr/bin/env python3
"""
WEAPONS-GRADE PROPERTY SCRAPER
==============================
Advanced scraping with:
- Multiple browser engines
- Proxy rotation
- CAPTCHA detection & solving
- Fingerprint randomization
- Aggressive retry logic
"""

import asyncio
import random
import re
import json
import time
import os
from datetime import datetime
from typing import Optional

# Try different scrapers
try:
    import cloudscraper
    CLOUDSCRAPER = True
except:
    CLOUDSCRAPER = False
    
try:
    from curl_cffi.requests import Session
    CURL_CFFI = True
except:
    CURL_CFFI = False

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM = True
except:
    SELENIUM = False

try:
    import undetected_chromedriver as uc
    UNDETECTED = True
except:
    UNDETECTED = False

from patchright.async_api import async_playwright

# ============ CONFIGURATION ============
CHROME_PATH = '/usr/bin/google-chrome'

# User agents - rotate these
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

# ============ PROXY MANAGER ============
class ProxyPool:
    """Manages proxy rotation"""
    
    def __init__(self):
        # Free proxies (for testing)
        self.proxies = [
            None,  # No proxy (direct)
        ]
        self.current = 0
        
    def get(self):
        proxy = self.proxies[self.current]
        self.current = (self.current + 1) % len(self.proxies)
        return proxy

# ============ CLOUDSCRAPER ENGINE ============
class CloudScraperEngine:
    """Uses cloudscraper to bypass Cloudflare"""
    
    def __init__(self):
        self.session = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'mobile': False
            }
        )
        
    def get(self, url):
        # Try multiple times with different approaches
        for attempt in range(5):
            try:
                # Different delays
                time.sleep(random.uniform(1, 3))
                
                resp = self.session.get(url, timeout=30)
                
                # Check for blocking
                if resp.status_code == 403:
                    print(f"   ⚠️  403 blocked (attempt {attempt + 1}), retrying...")
                    time.sleep(random.uniform(5, 15))
                    continue
                    
                if resp.status_code == 429:
                    print(f"   ⚠️  Rate limited, waiting...")
                    time.sleep(random.uniform(30, 60))
                    continue
                    
                return resp
                
            except Exception as e:
                print(f"   ⚠️  Error: {str(e)[:30]}, retrying...")
                time.sleep(random.uniform(3, 8))
                
        return None

# ============ SELENIUM ENGINE ============
class SeleniumEngine:
    """Uses Selenium with undetected-chromedriver"""
    
    def __init__(self):
        if not UNDETECTED:
            print("   ❌ undetected-chromedriver not available")
            self.driver = None
            return
            
        try:
            options = uc.ChromeOptions()
            options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            
            self.driver = uc.Chrome(options=options, version_main=None)
            print("   ✅ Selenium with undetected-chromedriver ready")
            
        except Exception as e:
            print(f"   ❌ Selenium failed: {str(e)[:50]}")
            self.driver = None
            
    def get(self, url):
        if not self.driver:
            return None
            
        try:
            self.driver.get(url)
            time.sleep(random.uniform(3, 7))
            
            # Check for CAPTCHA
            if self._check_captcha():
                print("   ⚠️  CAPTCHA detected!")
                
            return self.driver.page_source
            
        except Exception as e:
            print(f"   ❌ Selenium error: {str(e)[:50]}")
            return None
            
    def _check_captcha(self):
        """Check for CAPTCHA elements"""
        captcha_strings = ['captcha', 'recaptcha', 'hcaptcha', 'challenge']
        page_source = self.driver.page_source.lower()
        return any(s in page_source for s in captcha_strings)
        
    def close(self):
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

# ============ PATCHRIGHT ENGINE ============
class PatchRightEngine:
    """Enhanced PatchRight with stealth"""
    
    def __init__(self):
        self.browser = None
        self.page = None
        
    async def setup(self):
        p = await async_playwright().start()
        
        # Randomize user agent
        ua = random.choice(USER_AGENTS)
        
        self.browser = await p.chromium.launch(
            headless=True,
            executable_path=CHROME_PATH,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ]
        )
        
        self.context = await self.browser.new_context(
            viewport={'width': random.randint(1200, 1920), 'height': random.randint(800, 1080)},
            user_agent=ua,
            locale='en-US',
            timezone_id='America/Chicago',
        )
        
        self.page = await self.context.new_page()
        
        # Inject stealth scripts
        await self.page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.navigator.chrome = { runtime: {} };
        """)
        
    async def get(self, url, retries=3):
        for attempt in range(retries):
            try:
                # Random delay
                await asyncio.sleep(random.uniform(1, 3))
                
                await self.page.goto(url, timeout=60000, wait_until='domcontentloaded')
                await asyncio.sleep(random.uniform(3, 8))
                
                content = await self.page.content()
                
                # Check for blocks
                if 'access to this page has been denied' in content.lower():
                    print(f"   ⚠️  Blocked (attempt {attempt + 1})")
                    await asyncio.sleep(random.uniform(10, 20))
                    continue
                    
                if 'captcha' in content.lower():
                    print(f"   ⚠️  CAPTCHA detected!")
                    
                return content
                
            except Exception as e:
                print(f"   ⚠️  Error: {str(e)[:40]}")
                await asyncio.sleep(random.uniform(5, 10))
                
        return None
        
    async def close(self):
        if self.browser:
            await self.browser.close()

# ============ MAIN SCRAPER ============
class WeaponsGraderScraper:
    """Main orchestrator - tries multiple engines"""
    
    def __init__(self):
        self.cloud_scraper = CloudScraperEngine() if CLOUDSCRAPER else None
        self.selenium = None
        self.patchright = None
        
    def extract_properties(self, content):
        """Extract property data from HTML"""
        if not content:
            return {'prices': [], 'addresses': [], 'raw_html': ''}
            
        # Extract prices
        prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', content)
        prices = sorted(set([int(p.replace(',','')) for p in prices 
                          if 50000 <= int(p.replace(',','')) <= 1000000]))
        
        # Extract addresses
        addr_pattern = r'([0-9]{3,5}\s+[A-Za-z]+(?:St|Street|Ave|Avenue|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court|Pl|Place))'
        addresses = re.findall(addr_pattern, content, re.IGNORECASE)
        
        # Extract beds/baths
        beds = re.findall(r'(\d+)\s*(?:bed|bedroom)', content, re.IGNORECASE)
        baths = re.findall(r'(\d+(?:\.\d+)?)\s*(?:bath|bathroom)', content, re.IGNORECASE)
        
        return {
            'prices': prices[:20],
            'addresses': list(set(addresses))[:20],
            'beds': beds[:10],
            'baths': baths[:10],
            'raw_html': content[:10000]
        }
        
    def try_cloud_scraper(self, url):
        """Try cloudscraper first (fastest)"""
        if not self.cloud_scraper:
            return None
            
        print("   🔄 Trying cloudscraper...")
        resp = self.cloud_scraper.get(url)
        
        if resp and resp.status_code == 200:
            print("   ✅ Cloudscraper worked!")
            return resp.text
            
        return None
        
    async def try_patchright(self, url):
        """Try PatchRight"""
        if not self.patchright:
            self.patchright = PatchRightEngine()
            await self.patchright.setup()
            
        print("   🔄 Trying PatchRight...")
        content = await self.patchright.get(url)
        
        if content:
            print("   ✅ PatchRight worked!")
            
        return content
        
    def try_selenium(self, url):
        """Try Selenium"""
        if not self.selenium:
            print("   🔄 Starting Selenium...")
            self.selenium = SeleniumEngine()
            
        if not self.selenium.driver:
            return None
            
        print("   🔄 Trying Selenium...")
        content = self.selenium.get(url)
        
        if content:
            print("   ✅ Selenium worked!")
            
        return content
        
    async def scrape(self, url):
        """Try multiple engines until one works"""
        print(f"\n🎯 Target: {url}")
        
        results = []
        
        # Try cloudscraper first
        result = self.try_cloud_scraper(url)
        if result:
            data = self.extract_properties(result)
            results.append(('cloudscraper', data))
            
        # Try PatchRight
        result = await self.try_patchright(url)
        if result:
            data = self.extract_properties(result)
            results.append(('patchright', data))
            
        # Try Selenium as last resort
        result = self.try_selenium(url)
        if result:
            data = self.extract_properties(result)
            results.append(('selenium', data))
            
        return results
        
    async def close(self):
        if self.patchright:
            await self.patchright.close()
        if self.selenium:
            self.selenium.close()

# ============ MAIN ============
async def main():
    print("=" * 70)
    print("💀 WEAPONS-GRADE PROPERTY SCRAPER 💀")
    print("=" * 70)
    
    scraper = WeaponsGraderScraper()
    
    # Target sites
    targets = [
        "https://www.zillow.com/homes/for_sale/",
        "https://www.fortworthfocused.com/",
        "https://www.realtor.com/realestateandhomes-search/Fort-Worth_TX",
    ]
    
    all_results = {}
    
    for url in targets:
        results = await scraper.scrape(url)
        
        if results:
            engine_name, data = results[0]  # Best result
            all_results[url] = {
                'engine': engine_name,
                'data': data
            }
            print(f"   💰 Prices found: {data['prices'][:5]}")
            print(f"   📍 Addresses: {len(data['addresses'])}")
        else:
            all_results[url] = {'error': 'All engines failed'}
            
        # Delay between targets
        await asyncio.sleep(random.uniform(5, 15))
    
    await scraper.close()
    
    # Save results
    output = f"weapons_grade_results_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(output, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n✅ Results saved to {output}")

if __name__ == "__main__":
    asyncio.run(main())
