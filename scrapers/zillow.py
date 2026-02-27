"""
Zillow Property Scraper
======================
Extracts property data from Zillow using ScraperAPI.

Usage:
    python scrapers/zillow.py "https://www.zillow.com/homedetails/..."

Environment:
    SCRAPER_API_KEY - API key from scraperapi.com
"""

import os
import sys
import re
import requests

# Add parent to path for lib imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_api_key() -> str:
    """Get ScraperAPI key from environment."""
    key = os.environ.get("SCRAPER_API_KEY", "")
    if not key:
        raise ValueError("SCRAPER_API_KEY environment variable not set")
    return key


def scrape_zillow(url: str, api_key: str = None) -> dict:
    """
    Scrape a Zillow property page.
    
    Args:
        url: Full Zillow property URL
        api_key: ScraperAPI key (optional if env var set)
    
    Returns:
        dict with property details
    """
    if not api_key:
        api_key = get_api_key()
    
    # Build ScraperAPI URL
    target = f"https://api.scraperapi.com?api_key={api_key}&url={url}&render=true"
    
    response = requests.get(target, timeout=90)
    
    if response.status_code != 200:
        raise Exception(f"ScraperAPI error: {response.status_code}")
    
    text = response.text
    
    # Extract data using regex (simple but reliable)
    data = {
        "url": url,
        "source": "zillow",
    }
    
    # Price
    price_match = re.search(r'"price":\s*(\d+)', text)
    if price_match:
        data["price"] = int(price_match.group(1))
    
    # Extract address from URL if not in page
    addr_match = re.search(r'/(\d+-[A-Za-z]+-[A-Za-z]+)', url)
    if addr_match:
        data["address_from_url"] = addr_match.group(1)
    
    # Beds
    beds_match = re.search(r'(\d+)\s*(?:bed|beds|bedroom)', text, re.I)
    if beds_match:
        data["beds"] = int(beds_match.group(1))
    
    # Baths
    baths_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom)', text, re.I)
    if baths_match:
        data["baths"] = float(baths_match.group(1))
    
    # Sqft
    sqft_match = re.search(r'([\d,]+)\s*(?:sqft|sq\.ft|square feet)', text, re.I)
    if sqft_match:
        data["sqft"] = int(sqft_match.group(1).replace(",", ""))
    
    # Year built
    year_match = re.search(r'built[a-zA-Z\s]*(\d{4})', text, re.I)
    if year_match:
        data["year_built"] = year_match.group(1)
    
    return data


def estimate_rent(beds: int, baths: int, sqft: int = 0) -> int:
    """
    Estimate market rent based on bedrooms/bathrooms.
    
    Rough estimates for Fort Worth area (Feb 2026):
    - 1BR: $1,100-1,300
    - 2BR: $1,300-1,500
    - 3BR: $1,500-1,750
    - 4BR: $1,800-2,200
    """
    rent_by_beds = {
        1: 1200,
        2: 1500,
        3: 1650,
        4: 2000,
        5: 2400,
        6: 2800,
    }
    
    base = rent_by_beds.get(beds, 1500)
    
    # Adjust for bathrooms
    if baths >= 3:
        base += 150
    
    return base


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python zillow.py <zillow_url>")
        print("Example:")
        print("  python zillow.py https://www.zillow.com/homedetails/123-Main-St/123456_zpid/")
        sys.exit(1)
    
    url = sys.argv[1]
    
    print(f"Scraping: {url}")
    
    try:
        data = scrape_zillow(url)
        
        print("\nProperty Data:")
        for key, value in data.items():
            print(f"  {key}: {value}")
        
        # Estimate rent if we have beds/baths
        if "beds" in data:
            rent = estimate_rent(data["beds"], data.get("baths", 2))
            print(f"\nEstimated Rent: ${rent}/mo")
            
            # Run investment analysis if we have price
            if "price" in data:
                import lib.calculator as calc
                analysis = calc.analyze_property(
                    listing_price=data["price"],
                    rent_estimate=rent,
                    property_type="SFR",
                    sqft=data.get("sqft", 0)
                )
                
                print(f"\nInvestment Analysis:")
                print(f"  Offer Price: ${analysis['offer_price']:,.0f}")
                print(f"  Cash Flow: ${analysis['cash_flow']:,.0f}/mo")
                print(f"  Cash-on-Cash: {analysis['coc']*100:.1f}%")
                print(f"  PASS: {'YES' if analysis['overall_pass'] else 'NO'}")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
