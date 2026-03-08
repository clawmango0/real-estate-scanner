#!/usr/bin/env python3
"""
Real Estate Investment Analyzer - Template Version
Designed for use and for sale on Fiverr/ETSY

Features:
- Property analysis with multiple strategies
- BRRRR calculator
- House hacking scenarios
- Seller financing options
- Section 8 analysis
"""

import json
from datetime import datetime

class PropertyAnalyzer:
    """Comprehensive real estate investment analyzer"""
    
    def __init__(self, price, rent, sqft=0, beds=0, baths=0, address="", zip_code=""):
        self.price = price
        self.rent = rent
        self.sqft = sqft
        self.beds = beds
        self.baths = baths
        self.address = address
        self.zip_code = zip_code
        
        # Default assumptions (configurable)
        self.down_payment_pct = 0.20
        self.interest_rate = 0.0625  # 6.25%
        self.property_tax_rate = 0.019  # 1.9%
        self.insurance_annual = 1200
        self.vacancy_rate = 0.05
        self.maintenance_rate = 0.05
        self.expense_ratio = 0.50  # 50% rule
        
    def set_financing(self, down_payment_pct=0.20, interest_rate=0.0625):
        """Set financing terms"""
        self.down_payment_pct = down_payment_pct
        self.interest_rate = interest_rate
        
    def calculate_mortgage(self, principal=None):
        """Calculate monthly mortgage payment (P&I)"""
        if principal is None:
            principal = self.price * (1 - self.down_payment_pct)
        
        if principal <= 0:
            return 0
            
        monthly_rate = self.interest_rate / 12
        num_payments = 30 * 12  # 30-year fixed
        
        payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
        return payment
    
    def analyze_standard(self):
        """Standard buy-and-hold analysis"""
        down_payment = self.price * self.down_payment_pct
        loan = self.price - down_payment
        mortgage = self.calculate_mortgage(loan)
        
        # Expenses
        property_tax = (self.price * self.property_tax_rate) / 12
        insurance = self.insurance_annual / 12
        vacancy = self.rent * self.vacancy_rate
        maintenance = self.rent * self.maintenance_rate
        operational = self.rent * (self.expense_ratio - self.vacancy_rate - self.maintenance_rate)
        
        total_expenses = property_tax + insurance + vacancy + maintenance + operational
        cash_flow = self.rent - mortgage - total_expenses
        
        # Annual metrics
        annual_cf = cash_flow * 12
        annualNOI = (self.rent * (1 - self.expense_ratio)) * 12
        coc = (annual_cf / down_payment) * 100 if down_payment > 0 else 0
        cap = (annualNOI / self.price) * 100 if self.price > 0 else 0
        
        return {
            'strategy': 'Standard Buy & Hold',
            'down_payment': down_payment,
            'loan_amount': loan,
            'monthly_mortgage': mortgage,
            'monthly_expenses': total_expenses,
            'monthly_cash_flow': cash_flow,
            'annual_cash_flow': annual_cf,
            'cash_on_cash': coc,
            'cap_rate': cap,
            'price_to_rent': self.price / (self.rent * 12) if self.rent > 0 else 0,
            'cash_flow_per_sqft': cash_flow / self.sqft if self.sqft > 0 else 0
        }
    
    def analyze_brrrr(self, rehab_cost, refinance_ltv=0.75):
        """BRRRR Analysis: Buy, Rehab, Rent, Refinance, Repeat"""
        total_investment = self.price + rehab_cost
        down_payment = self.price * self.down_payment_pct
        cash_at_close = down_payment + rehab_cost
        
        # After refinance
        refinance_amount = self.price * refinance_ltv  # Use ARV (price) for refinance
        cash_out = refinance_amount - total_investment
        
        # New loan terms
        new_loan = refinance_amount
        new_mortgage = self.calculate_mortgage(new_loan)
        
        # Same rent, new expenses
        property_tax = (self.price * self.property_tax_rate) / 12
        insurance = self.insurance_annual / 12
        vacancy = self.rent * self.vacancy_rate
        maintenance = self.rent * self.maintenance_rate
        operational = self.rent * (self.expense_ratio - self.vacancy_rate - self.maintenance_rate)
        
        total_expenses = property_tax + insurance + vacancy + maintenance + operational
        cash_flow = self.rent - new_mortgage - total_expenses
        
        return {
            'strategy': 'BRRRR',
            'purchase_price': self.price,
            'rehab_cost': rehab_cost,
            'total_investment': total_investment,
            'cash_at_close': cash_at_close,
            'refinance_amount': refinance_amount,
            'cash_out': cash_out,
            'monthly_mortgage': new_mortgage,
            'monthly_cash_flow': cash_flow,
            'annual_cash_flow': cash_flow * 12,
            'total_profit_if_sold': cash_out  # Simplified
        }
    
    def analyze_house_hacking(self, rental_unit_rent):
        """House hacking: live in one unit, rent the other"""
        # Your unit is free (included in mortgage)
        # You charge for rental unit
        your_cost = self.calculate_mortgage()
        # But you still pay property tax & insurance proportionally
        
        property_tax = (self.price * self.property_tax_rate) / 12
        insurance = self.insurance_annual / 12
        total_mortgage = self.calculate_mortgage()
        
        # Your actual cost after renting
        your_actual_cost = (total_mortgage + property_tax + insurance) / 2 - rental_unit_rent
        
        return {
            'strategy': 'House Hacking',
            'total_mortgage': total_mortgage,
            'your_share': your_actual_cost,
            'rental_income': rental_unit_rent,
            'monthly_savings': -your_actual_cost,  # Negative = you're saving money
            'annual_savings': -your_actual_cost * 12,
            'note': 'Living for FREE while someone else pays your mortgage!'
        }
    
    def analyze_seller_finance(self, down_payment, interest_rate, term_years):
        """Seller financing analysis"""
        loan = self.price - down_payment
        
        # Calculate seller financing payment
        monthly_rate = interest_rate / 12
        num_payments = term_years * 12
        
        if monthly_rate > 0:
            payment = loan * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
        else:
            payment = loan / num_payments
        
        property_tax = (self.price * self.property_tax_rate) / 12
        insurance = self.insurance_annual / 12
        vacancy = self.rent * self.vacancy_rate
        maintenance = self.rent * self.maintenance_rate
        operational = self.rent * (self.expense_ratio - self.vacancy_rate - self.maintenance_rate)
        
        total_expenses = property_tax + insurance + vacancy + maintenance + operational
        cash_flow = self.rent - payment - total_expenses
        
        return {
            'strategy': f'Seller Financing ({term_years}yr @{interest_rate*100}%)',
            'down_payment': down_payment,
            'loan_amount': loan,
            'monthly_payment': payment,
            'monthly_cash_flow': cash_flow,
            'annual_cash_flow': cash_flow * 12,
            'cash_on_cash': (cash_flow * 12 / down_payment) * 100 if down_payment > 0 else 0,
            'note': 'Often no closing costs, flexible terms'
        }
    
    def analyze_section8(self, voucher_payment):
        """Section 8 housing voucher analysis"""
        base_analysis = self.analyze_standard()
        base_analysis['strategy'] = 'Section 8'
        base_analysis['voucher_payment'] = voucher_payment
        base_analysis['guaranteed_income'] = True
        base_analysis['lease_length'] = '1-2 years'
        
        # Recalculate with voucher
        property_tax = (self.price * self.property_tax_rate) / 12
        insurance = self.insurance_annual / 12
        vacancy = 0  # Guaranteed!
        maintenance = self.rent * 0.05
        
        total_expenses = property_tax + insurance + vacancy + maintenance
        cash_flow = voucher_payment - self.calculate_mortgage() - total_expenses
        
        base_analysis['monthly_rent'] = voucher_payment
        base_analysis['monthly_cash_flow'] = cash_flow
        base_analysis['annual_cash_flow'] = cash_flow * 12
        base_analysis['vacancy'] = 0
        
        return base_analysis
    
    def generate_report(self):
        """Generate full analysis report"""
        standard = self.analyze_standard()
        
        report = {
            'property': {
                'address': self.address,
                'zip_code': self.zip_code,
                'price': self.price,
                'rent': self.rent,
                'sqft': self.sqft,
                'beds': self.beds,
                'baths': self.baths,
                'price_per_sqft': self.price / self.sqft if self.sqft > 0 else 0
            },
            'analysis': standard,
            'generated': datetime.now().isoformat()
        }
        
        return report


def quick_analyze(price, rent):
    """Quick one-liner analysis"""
    prop = PropertyAnalyzer(price, rent)
    result = prop.analyze_standard()
    
    print(f"\n{'='*50}")
    print(f"Quick Analysis: ${price:,} @ ${rent}/mo")
    print(f"{'='*50}")
    print(f"Cash Flow:     ${result['monthly_cash_flow']:,.0f}/mo")
    print(f"Cash-on-Cash:  {result['cash_on_cash']:.1f}%")
    print(f"Cap Rate:      {result['cap_rate']:.1f}%")
    print(f"{'='*50}")
    
    return result


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Command line mode
        price = float(sys.argv[1]) if len(sys.argv) > 1 else 200000
        rent = float(sys.argv[2]) if len(sys.argv) > 2 else 2000
        quick_analyze(price, rent)
    else:
        # Interactive demo
        print("Real Estate Investment Analyzer - Template")
        print("-" * 40)
        
        # Example: 7566 Kings Trl
        prop = PropertyAnalyzer(
            price=189000,
            rent=2377,
            sqft=1534,
            beds=3,
            baths=2.5,
            address="7566 Kings Trl, Fort Worth, TX 76133"
        )
        
        report = prop.generate_report()
        
        print("\n📊 STANDARD ANALYSIS:")
        std = prop.analyze_standard()
        print(f"  Cash Flow: ${std['monthly_cash_flow']}/mo")
        print(f"  CoC: {std['cash_on_cash']:.1f}%")
        print(f"  Cap Rate: {std['cap_rate']:.1f}%")
        
        print("\n🏠 HOUSE HACKING (duplex, rent one unit $1,000):")
        hh = prop.analyze_house_hacking(1000)
        print(f"  Your Cost: ${hh['your_share']}/mo")
        print(f"  You're SAVING: ${-hh['annual_savings']}/year!")
        
        print("\n💰 SELLER FINANCING (10% down, 5%, 10yr):")
        sf = prop.analyze_seller_finance(18900, 0.05, 10)
        print(f"  Cash Flow: ${sf['monthly_cash_flow']}/mo")
        print(f"  CoC: {sf['cash_on_cash']:.1f}%")
