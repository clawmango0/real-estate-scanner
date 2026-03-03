#!/usr/bin/env python3
"""
HUD Rent Lookup Tool
Usage: python rent_lookup.py <zip> <beds>
Example: python rent_lookup.py 76133 2
"""

import csv
import sys

# Load HUD rents
hud_rents = {}
try:
    with open('hud_rents.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            zip_code = row['ZIP']
            hud_rents[zip_code] = {
                '1br': int(row['BR1']) if row['BR1'] else None,
                '2br': int(row['BR2']) if row['BR2'] else None,
                '3br': int(row['BR3']) if row['BR3'] else None,
                '4br': int(row['BR4']) if row['BR4'] else None
            }
except FileNotFoundError:
    print("Error: hud_rents.csv not found")
    sys.exit(1)

def lookup_rent(zip_code, beds, market_rate=False):
    """Look up rent for a ZIP code and number of bedrooms"""
    
    zip_code = str(zip_code).strip()
    
    if zip_code not in hud_rents:
        return None
    
    rent_key = f'{beds}br'
    base_rent = hud_rents[zip_code].get(rent_key)
    
    if base_rent is None:
        return None
    
    # Add 10% for market rate (optional)
    if market_rate:
        base_rent = int(base_rent * 1.10)
    
    return base_rent

def main():
    if len(sys.argv) < 2:
        print("HUD Rent Lookup Tool")
        print("=" * 40)
        print("Usage: python rent_lookup.py <zip> [beds] [--market]")
        print("")
        print("Examples:")
        print("  python rent_lookup.py 76133          # Show all rents for ZIP")
        print("  python rent_lookup.py 76133 2         # 2BR rent for ZIP")
        print("  python rent_lookup.py 76133 2 --market # Market rate (HUD +10%)")
        print("")
        print("Available ZIPs:")
        for z in sorted(hud_rents.keys()):
            print(f"  {z}", end=" ")
        print("\n")
        return
    
    zip_code = sys.argv[1]
    beds = int(sys.argv[2]) if len(sys.argv) > 2 else None
    market = '--market' in sys.argv
    
    if zip_code not in hud_rents:
        print(f"ZIP {zip_code} not found in HUD data")
        return
    
    print(f"HUD Fair Market Rents - ZIP {zip_code}")
    print("=" * 40)
    
    if beds:
        rent = lookup_rent(zip_code, beds, market)
        label = "Market Rate" if market else "HUD FMR"
        if rent:
            print(f"{beds}BR: ${rent}/mo ({label})")
        else:
            print(f"{beds}BR: Not available")
    else:
        # Show all
        print(f"{'Beds':<10} {'HUD FMR':<15} {'Market (+10%)':<15}")
        print("-" * 40)
        for b in [1, 2, 3, 4]:
            rent = hud_rents[zip_code].get(f'{b}br')
            if rent:
                market_rent = int(rent * 1.10)
                print(f"{b}BR         ${rent}/mo        ${market_rent}/mo")

if __name__ == '__main__':
    main()
