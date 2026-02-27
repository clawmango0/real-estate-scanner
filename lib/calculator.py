"""
Investment Property Calculator
=============================
Calculates key investment metrics for property analysis.

All calculations follow standard real estate investment formulas.
"""

import assumptions


def calculate_monthly_mortgage(loan_amount: float, rate: float = assumptions.INTEREST_RATE, 
                                years: int = assumptions.LOAN_TERM_YEARS) -> float:
    """
    Calculate monthly P&I mortgage payment.
    
    Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    Where:
        P = Principal (loan amount)
        r = Monthly interest rate
        n = Total number of payments
    """
    if loan_amount <= 0:
        return 0
    
    monthly_rate = rate / 12
    num_payments = years * 12
    
    if monthly_rate == 0:
        return loan_amount / num_payments
    
    payment = loan_amount * (monthly_rate * (1 + monthly_rate) ** num_payments) / \
              ((1 + monthly_rate) ** num_payments - 1)
    
    return round(payment, 2)


def calculate_total_cash_needed(purchase_price: float, down_payment_pct: float = 0.25,
                                closing_costs_pct: float = 0.03, rehab_budget: float = 0) -> dict:
    """
    Calculate total cash needed to close and rehab property.
    
    Returns breakdown of costs.
    """
    down_payment = purchase_price * down_payment_pct
    closing_costs = purchase_price * closing_costs_pct
    total = down_payment + closing_costs + rehab_budget
    
    return {
        "down_payment": down_payment,
        "closing_costs": closing_costs,
        "rehab_budget": rehab_budget,
        "total_cash_needed": total
    }


def calculate_monthly_expenses(rent: float, property_value: float, 
                               mortgage_payment: float) -> dict:
    """
    Calculate all monthly expenses.
    
    Returns breakdown and total.
    """
    property_tax = (property_value * assumptions.PROPERTY_TAX_RATE) / 12
    insurance = assumptions.INSURANCE_MONTHLY
    hoa = assumptions.HOA_MONTHLY
    maintenance = rent * assumptions.MAINTENANCE_RATE
    vacancy = rent * assumptions.VACANCY_RATE
    management = rent * assumptions.PROPERTY_MANAGEMENT_RATE
    
    total = mortgage_payment + property_tax + insurance + hoa + \
            maintenance + vacancy + management
    
    return {
        "mortgage": mortgage_payment,
        "property_tax": property_tax,
        "insurance": insurance,
        "hoa": hoa,
        "maintenance": maintenance,
        "vacancy": vacancy,
        "property_management": management,
        "total": total
    }


def calculate_cash_flow(rent: float, expenses: dict) -> float:
    """Calculate monthly cash flow (Net Operating Income - Debt Service)."""
    return rent - expenses["total"]


def calculate_cash_on_cash(annual_cash_flow: float, total_cash_invested: float) -> float:
    """
    Calculate Cash-on-Cash Return.
    
    Formula: Annual Cash Flow / Total Cash Invested
    
    This is the return on your actual cash invested,
    not including loan principal paydown or appreciation.
    """
    if total_cash_invested <= 0:
        return 0
    return annual_cash_flow / total_cash_invested


def calculate_cap_rate(noi: float, purchase_price: float) -> float:
    """
    Calculate Capitalization Rate.
    
    Formula: NOI / Purchase Price
    
    Measures property's ability to generate income relative to its price.
    """
    if purchase_price <= 0:
        return 0
    return noi / purchase_price


def calculate_dscr(noi: float, annual_debt_service: float) -> float:
    """
    Calculate Debt Service Coverage Ratio.
    
    Formula: NOI / Annual Debt Service
    
    Measures ability to cover debt payments.
    - > 1.25 = Good (25% buffer)
    - 1.0-1.25 = Marginal
    - < 1.0 = Negative cash flow
    """
    if annual_debt_service <= 0:
        return float('inf')  # No debt = infinite coverage
    return noi / annual_debt_service


def calculate_grm(purchase_price: float, annual_rent: float) -> float:
    """
    Calculate Gross Rent Multiplier.
    
    Formula: Purchase Price / Annual Gross Rent
    
    Lower is better - shows how many years of rent to pay off property.
    - < 10 = Excellent
    - 10-15 = Good
    - > 15 = High (long payoff)
    """
    if annual_rent <= 0:
        return float('inf')
    return purchase_price / annual_rent


def check_1_percent_rule(price: float, rent: float) -> bool:
    """
    Check 1% Rule.
    
    Monthly rent should be at least 1% of purchase price.
    This is a quick screening tool.
    """
    if price <= 0:
        return False
    return (rent / price) >= assumptions.MIN_1_PERCENT_RULE


def analyze_property(listing_price: float, rent_estimate: float, 
                   property_type: str = "SFR", sqft: int = 0,
                   rehab_budget: float = 0) -> dict:
    """
    Full property analysis.
    
    Returns all metrics and pass/fail status.
    """
    # Apply discount strategy
    offer_price = assumptions.get_offer_price(listing_price)
    
    # Calculate costs
    costs = calculate_total_cash_needed(
        offer_price, 
        down_payment_pct=0.25,
        closing_costs_pct=0.03,
        rehab_budget=rehab_budget
    )
    
    # Loan details
    loan_amount = offer_price * 0.75  # 75% financing
    monthly_mortgage = calculate_monthly_mortgage(loan_amount)
    
    # Monthly expenses
    expenses = calculate_monthly_expenses(rent_estimate, offer_price, monthly_mortgage)
    
    # Cash flow
    cash_flow = calculate_cash_flow(rent_estimate, expenses)
    annual_cash_flow = cash_flow * 12
    
    # Key metrics
    coc = calculate_cash_on_cash(annual_cash_flow, costs["total_cash_needed"])
    
    # NOI (Net Operating Income) = Rent - Operating Expenses (excluding mortgage)
    noi_annual = (rent_estimate * 12) - ((expenses["total"] - monthly_mortgage) * 12)
    cap_rate = calculate_cap_rate(noi_annual, offer_price)
    
    annual_debt = monthly_mortgage * 12
    dscr = calculate_dscr(noi_annual, annual_debt)
    
    grm = calculate_grm(offer_price, rent_estimate * 12)
    
    price_per_sqft = offer_price / sqft if sqft > 0 else 0
    
    # Pass/Fail checks
    passes = {
        "cash_flow": cash_flow >= assumptions.MIN_CASH_FLOW,
        "coc": coc >= assumptions.MIN_COC_RETURN,
        "dscr": dscr >= assumptions.MIN_DSCR,
        "grm": grm <= assumptions.MAX_GRM,
        "price_sqft": price_per_sqft <= assumptions.MAX_PRICE_PER_SQFT if sqft > 0 else True,
    }
    
    overall_pass = all(passes.values())
    
    return {
        # Inputs
        "listing_price": listing_price,
        "offer_price": offer_price,
        "rent": rent_estimate,
        "type": property_type,
        "sqft": sqft,
        
        # Costs
        "total_cash_needed": costs["total_cash_needed"],
        "down_payment": costs["down_payment"],
        "loan_amount": loan_amount,
        "monthly_mortgage": monthly_mortgage,
        
        # Results
        "cash_flow": cash_flow,
        "annual_cash_flow": annual_cash_flow,
        "coc": coc,
        "cap_rate": cap_rate,
        "dscr": dscr,
        "grm": grm,
        "price_per_sqft": price_per_sqft,
        
        # Pass/Fail
        "passes": passes,
        "overall_pass": overall_pass
    }


# Quick test
if __name__ == "__main__":
    # Test with duplex
    result = analyze_property(
        listing_price=200_000,
        rent_estimate=2_600,  # Two units at $1,300 each
        property_type="DUPLEX",
        sqft=2_200
    )
    
    print(f"Analysis Results:")
    print(f"  Cash Flow: ${result['cash_flow']}/mo")
    print(f"  CoC: {result['coc']*100:.1f}%")
    print(f"  Pass: {result['overall_pass']}")
