#!/usr/bin/env python3
"""
Real Estate Investment Calculator
Implements key calculations from INVESTMENT_STRATEGIES.md
"""

import argparse

def calculate_cash_on_cash(annual_cash_flow, total_cash_invested):
    """Calculate Cash-on-Cash Return"""
    if total_cash_invested == 0:
        return 0
    return (annual_cash_flow / total_cash_invested) * 100

def calculate_cap_rate(noi, property_value):
    """Calculate Capitalization Rate"""
    if property_value == 0:
        return 0
    return (noi / property_value) * 100

def calculate_grm(property_price, annual_gross_rent):
    """Calculate Gross Rent Multiplier"""
    if annual_gross_rent == 0:
        return 0
    return property_price / annual_gross_rent

def calculate_dscr(noi, annual_debt_service):
    """Calculate Debt Service Coverage Ratio"""
    if annual_debt_service == 0:
        return 0
    return noi / annual_debt_service

def calculate_mortgage(principal, annual_rate, years):
    """Calculate monthly mortgage payment"""
    if principal == 0:
        return 0
    monthly_rate = annual_rate / 12
    num_payments = years * 12
    payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    return payment

def calculate_50_expense_rule(monthly_rent):
    """Calculate expenses using 50% rule"""
    return monthly_rent * 0.5

def calculate_1_percent_rule(purchase_price):
    """Calculate minimum rent using 1% rule"""
    return purchase_price * 0.01

def calculate_brrr(arv, purchase_rehab_cost, refinance_ltv=0.75):
    """Calculate BRRRR potential cash out"""
    max_refinance = arv * refinance_ltv
    cash_out = max_refinance - purchase_rehab_cost
    return {
        'arv': arv,
        'max_refinance': max_refinance,
        'purchase_rehab': purchase_rehab_cost,
        'cash_out': cash_out
    }

def analyze_property(price, down_payment, monthly_rent, interest_rate=0.0625, property_tax_rate=0.019):
    """Comprehensive property analysis"""
    
    # Loan details
    loan_amount = price - down_payment
    monthly_mortgage = calculate_mortgage(loan_amount, interest_rate, 30)
    monthly_tax = (price * property_tax_rate) / 12
    
    # 50% rule expenses
    expenses = calculate_50_expense_rule(monthly_rent)
    
    # Cash flow
    monthly_cf = monthly_rent - expenses - monthly_mortgage - monthly_tax
    annual_cf = monthly_cf * 12
    
    # Key metrics
    coc = calculate_cash_on_cash(annual_cf, down_payment)
    noi = (monthly_rent - expenses) * 12
    cap = calculate_cap_rate(noi, price)
    annual_debt = monthly_mortgage * 12
    dscr = calculate_dscr(noi, annual_debt)
    
    return {
        'price': price,
        'down_payment': down_payment,
        'loan_amount': loan_amount,
        'monthly_rent': monthly_rent,
        'monthly_mortgage': monthly_mortgage,
        'monthly_tax': monthly_tax,
        'monthly_expenses': expenses,
        'monthly_cash_flow': monthly_cf,
        'annual_cash_flow': annual_cf,
        'cash_on_cash': coc,
        'cap_rate': cap,
        'dscr': dscr
    }

def print_analysis(results):
    """Print property analysis results"""
    print("\n" + "="*50)
    print("PROPERTY ANALYSIS")
    print("="*50)
    print(f"Purchase Price:     ${results['price']:,.0f}")
    print(f"Down Payment:        ${results['down_payment']:,.0f}")
    print(f"Loan Amount:        ${results['loan_amount']:,.0f}")
    print("-"*50)
    print(f"Monthly Rent:        ${results['monthly_rent']:,.0f}")
    print(f"Monthly Mortgage:   ${results['monthly_mortgage']:,.0f}")
    print(f"Monthly Tax:         ${results['monthly_tax']:,.0f}")
    print(f"Monthly Expenses:    ${results['monthly_expenses']:,.0f}")
    print("-"*50)
    print(f"MONTHLY CASH FLOW:  ${results['monthly_cash_flow']:,.0f}")
    print(f"ANNUAL CASH FLOW:   ${results['annual_cash_flow']:,.0f}")
    print("-"*50)
    print(f"Cash-on-Cash:        {results['cash_on_cash']:.1f}%")
    print(f"Cap Rate:           {results['cap_rate']:.2f}%")
    print(f"DSCR:               {results['dscr']:.2f}")
    print("="*50)
    
    if results['monthly_cash_flow'] > 0:
        print("✅ POSITIVE CASH FLOW")
    else:
        print("❌ NEGATIVE CASH FLOW")
    print()

def main():
    parser = argparse.ArgumentParser(description='Real Estate Investment Calculator')
    parser.add_argument('--price', type=float, default=200000, help='Purchase price')
    parser.add_argument('--down', type=float, default=50000, help='Down payment')
    parser.add_argument('--rent', type=float, default=2000, help='Monthly rent')
    parser.add_argument('--rate', type=float, default=0.0625, help='Interest rate (decimal or percentage)')
    parser.add_argument('--tax', type=float, default=0.019, help='Property tax rate')
    
    args = parser.parse_args()
    
    # Handle percentage input
    rate = args.rate if args.rate < 1 else args.rate / 100
    
    results = analyze_property(args.price, args.down, args.rent, rate, args.tax)
    print_analysis(results)

if __name__ == "__main__":
    main()
