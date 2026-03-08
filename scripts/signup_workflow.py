#!/usr/bin/env python3
"""
Signup Workflow Generator
Generates step-by-step signup guides for scraping services
"""

import os
import json
from datetime import datetime

SERVICES = {
    "scraperapi": {
        "name": "ScraperAPI",
        "tagline": "Easiest to Start",
        "url": "https://app.scraperapi.com/auth/sign-up",
        "free": "5,000 free requests on sign up",
        "pricing": "$20/month for 100k requests",
        "features": [
            "Handles CAPTCHAs automatically",
            "Works with Zillow, Realtor, etc",
            "Simple API - just add ?api_key=xxx to URL",
            "Residential proxies included"
        ],
        "steps": [
            "1. Go to https://app.scraperapi.com/auth/sign-up",
            "2. Click 'Sign up with Google'",
            "3. Complete the Google sign-in",
            "4. You'll see your dashboard with API key",
            "5. Copy the API key (starts with something like 'abc123')",
            "6. Tell Mango the API key"
        ]
    },
    "brightdata": {
        "name": "Bright Data",
        "tagline": "Best for Zillow",
        "url": "https://dashboard.brightdata.com/auth/sign-up",
        "free": "7-day free trial",
        "pricing": "$15/month for scraping",
        "features": [
            "Web Unlocker - beats all protections",
            "CAPTCHA solving included",
            "Residential proxies",
            "Best for Zillow, Airbnb, etc"
        ],
        "steps": [
            "1. Go to https://dashboard.brightdata.com/auth/sign-up",
            "2. Sign up with Google",
            "3. Verify email",
            "4. Start free trial (select 'Web Unlocker')",
            "5. Get your zone credentials",
            "6. Tell Mango the credentials"
        ]
    },
    "smartproxy": {
        "name": "SmartProxy",
        "tagline": "Residential Proxies",
        "url": "https://dashboard.smartproxy.com/register",
        "free": "14-day free trial",
        "pricing": "$50/month",
        "features": [
            "Residential proxies",
            "Good success rate",
            "Rotating IPs"
        ],
        "steps": [
            "1. Go to https://dashboard.smartproxy.com/register",
            "2. Sign up with Google",
            "3. Start free trial",
            "4. Get proxy credentials",
            "5. Tell Mango the credentials"
        ]
    }
}

def generate_guide(service_id):
    """Generate signup guide for a service"""
    if service_id not in SERVICES:
        print(f"Unknown service: {service_id}")
        return
        
    s = SERVICES[service_id]
    
    print("\n" + "=" * 70)
    print(f"📝 SIGNUP GUIDE: {s['name'].upper()}")
    print("=" * 70)
    print(f"\n{s['tagline']}")
    print(f"🎁 {s['free']}")
    print(f"💰 {s['pricing']}")
    print("\nFeatures:")
    for f in s['features']:
        print(f"  ✅ {f}")
    
    print("\n" + "-" * 70)
    print("STEP-BY-STEP:")
    print("-" * 70)
    for step in s['steps']:
        print(f"  {step}")
    
    print("\n" + "-" * 70)
    print(f"🌐 Signup URL: {s['url']}")
    print("-" * 70)

def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║              SCRAPING SERVICE SIGNUP WORKFLOW                        ║
╚══════════════════════════════════════════════════════════════════════╝

I'll walk you through signing up for a scraping service.
These services handle CAPTCHAs and blocks for us.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVAILABLE SERVICES:

  1. ScraperAPI     - 5,000 free requests | Easiest to start
  2. Bright Data    - 7-day free trial    | Best for Zillow
  3. SmartProxy     - 14-day free trial   | Residential proxies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What to do:

  1. Choose a service above
  2. I'll generate the signup guide
  3. You click the link and sign up
  4. Get your API key / credentials
  5. Tell me the key and I'll configure everything

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Which service do you want to sign up for?

  - Tell me: "ScraperAPI" or "BrightData" or "SmartProxy"

""")

def generate_all():
    """Generate all guides"""
    for service_id in SERVICES:
        generate_guide(service_id)
        print("\n")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        generate_guide(sys.argv[1].lower())
    else:
        main()
