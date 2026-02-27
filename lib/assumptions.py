"""
Investment Assumptions and Criteria
===================================
Central configuration for all investment calculations.

All values should be defined here - used by calculator and website.
"""

# =============================================================================
# TARGET MARKET
# =============================================================================

TARGET_LOCATION = "Fort Worth, TX"  # Primary target area
TARGET_COUNTIES = ["Tarrant", "Denton"]  # Counties to focus on

# =============================================================================
# PRICING STRATEGY
# =============================================================================

MAX_LISTING_PRICE = 270_000  # Maximum listing price to consider
DISCOUNT_EXPECTED = 0.15  # Expected discount from listing (15%)
# Offer price = Listing * (1 - DISCOUNT_EXPECTED)

# =============================================================================
# FINANCING
# =============================================================================

INTEREST_RATE = 0.0525  # 5.25% interest rate (Feb 2026)
LOAN_TERM_YEARS = 30  # 30-year conventional loan
MAX_CASH_OUT = 100_000  # Maximum cash out of pocket (down + rehab combined)

# =============================================================================
# MONTHLY EXPENSE ESTIMATES (Percentages and Fixed Costs)
# =============================================================================

PROPERTY_TAX_RATE = 0.019  # 1.9% of value annually
INSURANCE_MONTHLY = 100  # $100/month average
HOA_MONTHLY = 0  # No HOA in target areas
MAINTENANCE_RATE = 0.05  # 5% of rent
VACANCY_RATE = 0.05  # 5% vacancy allowance
PROPERTY_MANAGEMENT_RATE = 0.10  # 10% property management

# =============================================================================
# INVESTMENT CRITERIA (Pass/Fail Thresholds)
# =============================================================================

# Cash-on-Cash Return (annual cash flow / total cash invested)
MIN_COC_RETURN = 0.08  # Minimum 8% CoC

# Net Cash Flow must be positive
MIN_CASH_FLOW = 0  # Must be > $0/month

# Debt Service Coverage Ratio (NOI / Debt Service)
# Should be > 1.25 (25% buffer above debt payments)
MIN_DSCR = 1.25

# 1% Rule: Monthly rent should be at least 1% of purchase price
MIN_1_PERCENT_RULE = 0.01

# Gross Rent Multiplier (Purchase Price / Annual Rent)
# Lower is better - want to recover investment faster
MAX_GRM = 12

# Price per square foot
MAX_PRICE_PER_SQFT = 195

# =============================================================================
# PROPERTY TYPE PREFERENCES
# =============================================================================

PREFERRED_TYPES = ["DUPLEX", "MULTI-FAMILY", "DUPL"]
ACCEPTABLE_TYPES = ["SFR", "TOWNHOME"]
REJECTED_TYPES = ["LOT", "COMMERCIAL"]

# =============================================================================
# DATA SOURCE CONFIGURATION
# =============================================================================

# ScraperAPI - for Zillow scraping
# Sign up at https://scraperapi.com
# Free tier: 5000 requests/month
SCRAPERAPI_URL = "https://api.scraperapi.com"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_offer_price(listing_price: float) -> float:
    """Calculate expected offer price based on discount strategy."""
    return listing_price * (1 - DISCOUNT_EXPECTED)


def format_currency(amount: float) -> str:
    """Format number as USD currency."""
    return f"${amount:,.0f}"
