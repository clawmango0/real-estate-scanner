#!/usr/bin/env python3
"""
Simple Sync Scraper using subprocess + Chrome headless
Quick test version
"""

import subprocess
import sys

def scrape(url):
    """Use Chrome headless to scrape"""
    cmd = [
        '/usr/bin/google-chrome',
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--dump-dom',
        url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return result.stdout

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python simple_scraper.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    print(f"Scraping: {url}")
    
    result = scrape(url)
    print(f"Got {len(result)} bytes")
    print(result[:500])
