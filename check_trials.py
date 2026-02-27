#!/usr/bin/env python3
"""
Service Trial Checker
Checks for free trials on scraping/CAPTCHA services
"""

import requests

SERVICES = {
    "2Captcha": {
        "url": "https://2captcha.com/",
        "trial": "No free trial, but cheap ($2.99/solve)",
        "signup": "https://2captcha.com/authpage"
    },
    "BrightData": {
        "url": "https://brightdata.com/",
        "trial": "7-day free trial available",
        "signup": "https://dashboard.brightdata.com/auth/sign-up"
    },
    "ScraperAPI": {
        "url": "https://www.scraperapi.com/",
        "trial": "5000 free requests on sign up",
        "signup": "https://app.scraperapi.com/auth/sign-up"
    },
    "SmartProxy": {
        "url": "https://smartproxy.com/",
        "trial": "14-day free trial",
        "signup": "https://dashboard.smartproxy.com/register"
    },
    "Oxylabs": {
        "url": "https://oxylabs.io/",
        "trial": "7-day free trial",
        "signup": "https://dashboard.oxylabs.com/register"
    },
    "Infatica": {
        "url": "https://infatica.io/",
        "trial": "14-day free trial",
        "signup": "https://dashboard.infatica.io/register"
    }
}

def check_service(name, info):
    """Check if service is accessible"""
    try:
        r = requests.get(info["url"], timeout=10)
        status = "✅ UP" if r.status_code == 200 else f"❌ {r.status_code}"
    except:
        status = "❌ DOWN"
    
    return {
        "name": name,
        "status": status,
        "trial": info["trial"],
        "signup": info["signup"]
    }

def main():
    print("=" * 70)
    print("🔍 FREE TRIAL CHECK FOR SCRAPING SERVICES")
    print("=" * 70)
    print()
    
    print("Available Free Trials:")
    print("-" * 70)
    
    for name, info in SERVICES.items():
        print(f"\n{name}")
        print(f"   Status: ", end="")
        
        result = check_service(name, info)
        print(result["status"])
        print(f"   Trial: {info['trial']}")
        print(f"   Sign up: {info['signup']}")
    
    print("\n" + "=" * 70)
    print("RECOMMENDED FOR ZILLOW SCRAPING:")
    print("=" * 70)
    print("""
1. ScraperAPI (EASIEST TO START)
   - 5000 free requests on sign up
   - Just add ?api_key=xxx to any URL
   - Handles CAPTCHAs automatically
   - URL: https://app.scraperapi.com/auth/sign-up

2. BrightData (BEST FOR SCALE)
   - 7-day free trial
   - Web Unlocker + CAPTCHA solve included
   - URL: https://dashboard.brightdata.com/auth/sign-up
   
3. SmartProxy
   - 14-day free trial  
   - URL: https://dashboard.smartproxy.com/register
""")

if __name__ == "__main__":
    main()
