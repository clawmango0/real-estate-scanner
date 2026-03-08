#!/usr/bin/env python3
"""
Property Scraper using Scrapling
Run this on your local machine to scrape Fort Worth Focused listings

Setup:
    pip install scrapling

Usage:
    python scraper.py <property_url>
    
Example:
    python scraper.py "https://renn.fortworthfocused.com/listing-detail/1177727569/5521-Lubbock-Avenue-Fort-Worth-TX"
"""

import sys
import re
import json
from scrapling.fetchers import StealthyFetcher

def extract_property(url):
    """Fetch and extract property data from a listing URL"""
    
    print(f"Fetching: {url}")
    
    # Use StealthyFetcher with headless browser
    StealthyFetcher.adaptive = True
    p = StealthyFetcher.fetch(url, headless=True, network_idle=True)
    
    text = p.text
    
    # Extract data using regex patterns
    data = {
        'url': url,
        'address': '',
        'price': '',
        'beds': '',
        'baths': '',
        'sqft': '',
        'type': '',
    }
    
    # Try to find address (usually in title or h1)
    title_match = re.search(r'<h1[^>]*>([^<]+)</h1>', text, re.I)
    if title_match:
        data['address'] = title_match.group(1).strip()
    
    # Find price - look for $xxx,xxx pattern
    price_matches = re.findall(r'\$(\d{1,3}(?:,\d{3})*)', text)
    prices = [int(p.replace(',', '')) for p in price_matches if 50000 <= int(p.replace(',', '')) <= 2000000]
    if prices:
        data['price'] = max(prices)  # Take the largest (listing price, not fees)
    
    # Find beds
    beds_match = re.search(r'(\d+)\s*(?:bed|beds|Bed|Beds|bedroom)', text, re.I)
    if beds_match:
        data['beds'] = beds_match.group(1)
    
    # Find baths
    baths_match = re.search(r'(\d+\.?\d*)\s*(?:bath|baths|Bath|Baths)', text, re.I)
    if baths_match:
        data['baths'] = baths_match.group(1)
    
    # Find sqft
    sqft_match = re.search(r'([\d,]+)\s*(?:sqft|sq\.ft|square\s*feet)', text, re.I)
    if sqft_match:
        data['sqft'] = sqft_match.group(1).replace(',', '')
    
    # Property type
    type_match = re.search(r'Property Type[:\s]+([^\n<]+)', text, re.I)
    if type_match:
        data['type'] = type_match.group(1).strip()
    
    return data


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        data = extract_property(url)
        
        print("\n" + "="*50)
        print("EXTRACTED PROPERTY DATA")
        print("="*50)
        
        for key, value in data.items():
            if value:
                print(f"  {key}: {value}")
        
        # Output as JSON for easy parsing
        print("\n--- JSON ---")
        print(json.dumps(data, indent=2))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
