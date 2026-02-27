# Fort Worth Property Scout
# Investment Property Analysis System
# 
# Architecture Overview:
# ====================
# 
# SCRAPERS/
#   zillow.py       - Zillow property data extraction (uses ScraperAPI)
# 
# LIB/
#   calculator.py   - Investment calculations (CoC, Cap Rate, DSCR, etc.)
#   assumptions.py  - Investment criteria constants
# 
# DATA/
#   deals.json      - All property data (source of truth for website)
# 
# DOCS/
#   index.html     - Public website (generated from deals.json)
# 
# RUN.py           - Main entry point for running analysis
#
# Dependencies:
# - Python 3.8+
# - requests (HTTP calls)
# - ScraperAPI (for bypassing CAPTCHAs)
#
# Usage:
#   python RUN.py --url "https://www.zillow.com/homedetails/..."
#   python RUN.py --scrape-all
#
# Environment Variables:
#   SCRAPER_API_KEY - API key for ScraperAPI service

"""
Fort Worth Property Scout - Clean Architecture
=============================================

This system identifies investment properties in the Fort Worth, TX area
that meet our investment criteria.

Key Principles:
1. Single source of truth (deals.json)
2. Minimize external dependencies
3. Clear separation of concerns
4. Well-documented calculations
"""

# Main entry point
if __name__ == "__main__":
    print("Fort Worth Property Scout")
    print("See README.md for usage")
