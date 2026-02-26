#!/usr/bin/env python3
"""
CAPTCHA Solver using 2Captcha
Solves PerimeterX, reCAPTCHA, hCaptcha, etc.
"""

import os
import time
import json
from pathlib import Path

# 2Captcha configuration
# Get your API key from https://2captcha.com/
TWO_CAPTCHA_KEY = os.environ.get('TWO_CAPTCHA_KEY', '')

class TwoCaptchaSolver:
    """2Captcha solver wrapper"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or TWO_CAPTCHA_KEY
        self.base_url = "http://2captcha.com"
        
    def solve_perimeterx(self, site_url, site_key, url=None):
        """
        Solve PerimeterX CAPTCHA
        Returns token if solved, None if failed
        """
        if not self.api_key:
            print("⚠️  No 2Captcha API key configured")
            return None
            
        # Submit the CAPTCHA
        submit_url = f"{self.base_url}/in.php"
        params = {
            'key': self.api_key,
            'method': 'perimeterx',
            'siteurl': site_url,
            'px': site_key,
            'json': 1
        }
        
        # This would submit and get a CAPTCHA ID
        # Then we'd poll for results
        # Note: PerimeterX solving costs ~$2.99 per solve
        
        print(f"📝 Submitting PerimeterX CAPTCHA for {site_url}")
        print(f"   Cost: ~$2.99 per solve")
        
        return None
        
    def solve_recaptcha(self, site_url, site_key):
        """Solve reCAPTCHA v2"""
        if not self.api_key:
            print("⚠️  No 2Captcha API key configured")
            return None
            
        print(f"📝 Submitting reCAPTCHA for {site_url}")
        print(f"   Cost: ~$2.99 per solve")
        
        return None
        
    def get_balance(self):
        """Get account balance"""
        if not self.api_key:
            return None
            
        import requests
        resp = requests.get(
            f"{self.base_url}/res",
            params={'key': self.api_key, 'action': 'getbalance'}
        )
        
        if resp.status_code == 200:
            try:
                data = resp.json()
                return data.get('request', 0)
            except:
                pass
                
        return None

# Alternative: Try to bypass without solving
class BypassEngine:
    """Try to bypass without solving CAPTCHA"""
    
    def __init__(self):
        self.session = None
        
    def try_browser_headers(self):
        """Try with more realistic browser headers"""
        import cloudscraper
        
        return cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'mobile': False,
                'desktop': True,
                'headers': {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br, zstdd',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                }
            }
        )
        
    def try_residential_proxy(self):
        """Try using residential proxy (would need paid service)"""
        # BrightData, SmartProxy, etc. would go here
        pass
        
    def try_mobile_user_agent(self):
        """Try as mobile device (sometimes less protected)"""
        import cloudscraper
        
        return cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'android',
                'mobile': True,
            }
        )

def setup_2captcha():
    """Instructions for setting up 2Captcha"""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║                    2CAPTCHA SETUP INSTRUCTIONS                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Go to https://2captcha.com/                                 ║
║  2. Sign up for an account                                      ║
║  3. Add funds (minimum ~$10 recommended)                         ║
║  4. Get your API key from the dashboard                          ║
║  5. Set environment variable:                                    ║
║                                                                  ║
║     export TWO_CAPTCHA_KEY=your_api_key_here                    ║
║                                                                  ║
║  Or add to ~/.bashrc:                                           ║
║                                                                  ║
║     echo 'export TWO_CAPTCHA_KEY=xxx' >> ~/.bashrc             ║
║     source ~/.bashrc                                             ║
║                                                                  ║
║  Pricing:                                                        ║
║  - PerimeterX: $2.99/solve                                      ║
║  - reCAPTCHA: $2.99/solve                                        ║
║  - hCaptcha: $2.99/solve                                        ║
║                                                                  ║
║  For Zillow (PerimeterX): ~$3 per successful scrape             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""")

if __name__ == "__main__":
    import os
    
    # Check if API key is set
    if 'TWO_CAPTCHA_KEY' in os.environ:
        print(f"✅ 2Captcha key configured")
        solver = TwoCaptchaSolver()
        balance = solver.get_balance()
        if balance:
            print(f"   Balance: ${balance}")
    else:
        print("❌ No 2Captcha API key found")
        setup_2captcha()
