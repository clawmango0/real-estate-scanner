#!/usr/bin/env python3
"""
Simple Property Scraper
Run locally OR on server to scrape Fort Worth Focused listings

Usage:
    python simple_scraper.py <property_url>
"""

import sys
import re
import json
import requests
from bs4 import BeautifulSoup

# Fake browser headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def scrape_property(url):
    """Fetch and extract property data"""
    
    print(f"Fetching: {url}")
    
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    
    html = response.text
    soup = BeautifulSoup(html, 'html.parser')
    
    data = {
        'url': url,
        'address': '',
        'price': '',
        'beds': '',
        'baths': '',
        'sqft': '',
        'type': '',
    }
    
    # Try to find address in title or h1
    title = soup.find('title') or soup.find('h1')
    if title:
        data['address'] = title.get_text(strip=True)
    
    # Look for price patterns in text
    text = soup.get_text()
    price_matches = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', text)
    prices = [int(p.replace(',', '')) for p in price_matches if 50000 <= int(p.replace(',', '')) <= 2000000]
    if prices:
        data['price'] = max(prices)
    
    # Beds
    beds_match = re.search(r'(\d+)\s*(?:bed|beds|bedroom)', text, re.I)
    if beds_match:
        data['beds'] = beds_match.group(1)
    
    # Baths  
    baths_match = re.search(r'(\d+\.?\d*)\s*(?:bath|baths)', text, re.I)
    if baths_match:
        data['baths'] = baths_match.group(1)
    
    # Sqft
    sqft_match = re.search(r'([\d,]+)\s*(?:sqft|sq\.ft|square\s*feet)', text, re.I)
    if sqft_match:
        data['sqft'] = sqft_match.group(1).replace(',', '')
    
    return data


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    try:
        data = scrape_property(sys.argv[1])
        print("\n" + "="*50)
        print("EXTRACTED PROPERTY DATA")
        print("="*50)
        for key, value in data.items():
            if value:
                print(f"  {key}: {value}")
        print("\n--- JSON ---")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
