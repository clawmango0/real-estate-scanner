#!/usr/bin/env python3
"""
Real Estate Investment Analyzer - CLI Tool
Usage: python analyzer_cli.py --price 200000 --rent 2000 --strategy standard
       python analyzer_cli.py --price 200000 --rent 2000 --strategy brrrr --rehab 15000
       python analyzer_cli.py --price 200000 --rent 2000 --strategy house-hack --rental-rent 1200
       python analyzer_cli.py --price 200000 --rent 2000 --strategy seller-fin --sf-down 20000 --sf-rate 0.05 --sf-term 10
"""

import argparse
import json
import sys
from property_analyzer_template import PropertyAnalyzer

def format_currency(amount):
    return f"${amount:,.2f}"

def run_standard(price, rent, sqft, beds, baths, address, zip_code):
    prop = PropertyAnalyzer(price, rent, sqft, beds, baths, address, zip_code)
    result = prop.analyze_standard()
    
    print(f"\n{'='*60}")
    print(f"📊 STANDARD BUY & HOLD ANALYSIS")
    print(f"{'='*60}")
    print(f"Property: {address or 'N/A'}")
    print(f"Price: {format_currency(price)} | Rent: {format_currency(rent)}/mo")
    print(f"{'-'*60}")
    print(f"DOWN PAYMENT:     {format_currency(result['down_payment'])}")
    print(f"LOAN AMOUNT:      {format_currency(result['loan_amount'])}")
    print(f"MORTGAGE:         {format_currency(result['monthly_mortgage'])}/mo")
    print(f"EXPENSES:         {format_currency(result['monthly_expenses'])}/mo")
    print(f"{'-'*60}")
    print(f"💰 MONTHLY CASH FLOW: {format_currency(result['monthly_cash_flow'])}")
    print(f"📈 ANNUAL CASH FLOW:  {format_currency(result['annual_cash_flow'])}")
    print(f"{'-'*60}")
    print(f"CASH-ON-CASH:     {result['cash_on_cash']:.2f}%")
    print(f"CAP RATE:         {result['cap_rate']:.2f}%")
    print(f"PRICE-TO-RENT:    {result['price_to_rent']:.1f}x")
    print(f"{'='*60}")
    
    if result['monthly_cash_flow'] > 0:
        print("✅ POSITIVE CASH FLOW - Good deal!")
    else:
        print("⚠️ NEGATIVE CASH FLOW - Need to negotiate harder or pass")
    print()

def run_brrrr(price, rent, sqft, beds, baths, address, zip_code, rehab):
    prop = PropertyAnalyzer(price, rent, sqft, beds, baths, address, zip_code)
    result = prop.analyze_brrrr(rehab)
    
    print(f"\n{'='*60}")
    print(f"🏠 BRRRR ANALYSIS (Buy, Rehab, Rent, Refinance, Repeat)")
    print(f"{'='*60}")
    print(f"Property: {address or 'N/A'}")
    print(f"{'-'*60}")
    print(f"PURCHASE PRICE:   {format_currency(result['purchase_price'])}")
    print(f"REHAB COST:      {format_currency(result['rehab_cost'])}")
    print(f"TOTAL INVESTMENT: {format_currency(result['total_investment'])}")
    print(f"CASH AT CLOSE:    {format_currency(result['cash_at_close'])}")
    print(f"{'-'*60}")
    print(f"REFINANCE (75%):  {format_currency(result['refinance_amount'])}")
    print(f"CASH OUT:         {format_currency(result['cash_out'])}")
    print(f"NEW MORTGAGE:     {format_currency(result['monthly_mortgage'])}/mo")
    print(f"{'-'*60}")
    print(f"💰 MONTHLY CASH FLOW: {format_currency(result['monthly_cash_flow'])}")
    print(f"📈 ANNUAL CASH FLOW:  {format_currency(result['annual_cash_flow'])}")
    print(f"{'='*60}")
    
    if result['cash_out'] > 0:
        print(f"✅ You get {format_currency(result['cash_out'])} CASH BACK at refinance!")
        print("   Reinvest in the next property!")
    else:
        print("⚠️ Cash out is negative - not a good BRRRR candidate")
    print()

def run_house_hack(price, rent, sqft, beds, baths, address, zip_code, rental_rent):
    prop = PropertyAnalyzer(price, rent, sqft, beds, baths, address, zip_code)
    result = prop.analyze_house_hacking(rental_rent)
    
    print(f"\n{'='*60}")
    print(f"🏡 HOUSE HACKING ANALYSIS")
    print(f"{'='*60}")
    print(f"Property: {address or 'N/A'}")
    print(f"Type: Multi-unit (or single with rental unit)")
    print(f"{'-'*60}")
    print(f"TOTAL MORTGAGE:   {format_currency(result['total_mortgage'])}/mo")
    print(f"RENTAL INCOME:    {format_currency(result['rental_income'])}/mo")
    print(f"YOUR SHARE:       {format_currency(result['your_share'])}/mo")
    print(f"{'-'*60}")
    print(f"💰 YOU SAVE:      {format_currency(-result['monthly_savings'])}/mo")
    print(f"📈 ANNUAL SAVINGS: {format_currency(-result['annual_savings'])}")
    print(f"{'='*60}")
    print(f"✅ {result['note']}")
    print()

def run_seller_finance(price, rent, sqft, beds, baths, address, zip_code, sf_down, sf_rate, sf_term):
    prop = PropertyAnalyzer(price, rent, sqft, beds, baths, address, zip_code)
    result = prop.analyze_seller_finance(sf_down, sf_rate, sf_term)
    
    print(f"\n{'='*60}")
    print(f"💵 SELLER FINANCING ANALYSIS")
    print(f"{'='*60}")
    print(f"Property: {address or 'N/A'}")
    print(f"Terms: {sf_down/price*100:.0f}% down, {sf_rate*100}%, {sf_term} years")
    print(f"{'-'*60}")
    print(f"DOWN PAYMENT:     {format_currency(result['down_payment'])}")
    print(f"LOAN AMOUNT:      {format_currency(result['loan_amount'])}")
    print(f"MONTHLY PAYMENT:  {format_currency(result['monthly_payment'])}/mo")
    print(f"{'-'*60}")
    print(f"💰 MONTHLY CASH FLOW: {format_currency(result['monthly_cash_flow'])}")
    print(f"📈 ANNUAL CASH FLOW:  {format_currency(result['annual_cash_flow'])}")
    print(f"CASH-ON-CASH:     {result['cash_on_cash']:.2f}%")
    print(f"{'='*60}")
    print(f"ℹ️  {result['note']}")
    print()

def run_section8(price, rent, sqft, beds, baths, address, zip_code, voucher):
    prop = PropertyAnalyzer(price, rent, sqft, beds, baths, address, zip_code)
    result = prop.analyze_section8(voucher)
    
    print(f"\n{'='*60}")
    print(f"🏠 SECTION 8 ANALYSIS")
    print(f"{'='*60}")
    print(f"Property: {address or 'N/A'}")
    print(f"VOUCHER PAYMENT:  {format_currency(voucher)}/mo (guaranteed!)")
    print(f"{'-'*60}")
    print(f"💰 MONTHLY CASH FLOW: {format_currency(result['monthly_cash_flow'])}")
    print(f"📈 ANNUAL CASH FLOW:  {format_currency(result['annual_cash_flow'])}")
    print(f"{'='*60}")
    print(f"✅ Guaranteed rent - no vacancy risk!")
    print(f"✅ 1-2 year lease terms")
    print()

def main():
    parser = argparse.ArgumentParser(description='Real Estate Investment Analyzer CLI')
    parser.add_argument('--price', type=float, required=True, help='Purchase price')
    parser.add_argument('--rent', type=float, required=True, help='Monthly rent')
    parser.add_argument('--sqft', type=float, default=0, help='Square footage')
    parser.add_argument('--beds', type=int, default=0, help='Number of bedrooms')
    parser.add_argument('--baths', type=float, default=0, help='Number of bathrooms')
    parser.add_argument('--address', type=str, default='', help='Property address')
    parser.add_argument('--zip', type=str, default='', help='ZIP code')
    
    # Strategy options
    parser.add_argument('--strategy', type=str, default='standard',
                       choices=['standard', 'brrrr', 'house-hack', 'seller-fin', 'section8', 'all'],
                       help='Analysis strategy')
    
    # BRRRR
    parser.add_argument('--rehab', type=float, default=15000, help='Rehab cost (for BRRRR)')
    
    # House hacking
    parser.add_argument('--rental-rent', type=float, default=1000, help='Rental unit rent (for house hacking)')
    
    # Seller financing
    parser.add_argument('--sf-down', type=float, default=None, help='Seller finance down payment')
    parser.add_argument('--sf-rate', type=float, default=0.05, help='Seller finance interest rate')
    parser.add_argument('--sf-term', type=int, default=10, help='Seller finance term in years')
    
    # Section 8
    parser.add_argument('--voucher', type=float, default=None, help='Section 8 voucher amount')
    
    # Output
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    # Set defaults
    if args.sf_down is None:
        args.sf_down = args.price * 0.10
    if args.voucher is None:
        args.voucher = args.rent
    
    if args.strategy == 'standard':
        run_standard(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip)
    elif args.strategy == 'brrrr':
        run_brrrr(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.rehab)
    elif args.strategy == 'house-hack':
        run_house_hack(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.rental_rent)
    elif args.strategy == 'seller-fin':
        run_seller_finance(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.sf_down, args.sf_rate, args.sf_term)
    elif args.strategy == 'section8':
        run_section8(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.voucher)
    elif args.strategy == 'all':
        run_standard(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip)
        run_brrrr(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.rehab)
        run_house_hack(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.rental_rent)
        run_seller_finance(args.price, args.rent, args.sqft, args.beds, args.baths, args.address, args.zip, args.sf_down, args.sf_rate, args.sf_term)

if __name__ == "__main__":
    main()
