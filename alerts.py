#!/usr/bin/env python3
"""
Property Alert System
Scans properties and alerts when they match criteria
"""

import json
import os
from datetime import datetime

# Alert configuration - customize these thresholds
ALERT_CRITERIA = {
    "min_cash_flow": 200,        # $/month minimum
    "min_coc": 2.0,              # Minimum CoC return %
    "max_price": 250000,         # Maximum price
    "min_beds": 3,               # Minimum bedrooms
    "allowed_types": ["sfh", "duplex"],  # Property types
}

# Properties database (would be fetched from API in production)
PROPERTIES = [
    {"id": 1, "address": "4813 Sandage Ave, Ft Worth", "price": 182000, "beds": 3, "baths": 2, "sqft": 1011, "cf": 280, "coc": 3.2, "type": "sfh", "score": 24},
    {"id": 2, "address": "5808 Wales Ave, Ft Worth", "price": 195000, "beds": 3, "baths": 2, "sqft": 1664, "cf": 234, "coc": 2.7, "type": "sfh", "score": 25},
    {"id": 3, "address": "3636 Saint Louis Ave, Ft Worth", "price": 200000, "beds": 4, "baths": 2, "sqft": 1392, "cf": 243, "coc": 2.7, "type": "sfh", "score": 24},
    {"id": 4, "address": "5736 Wedgmont Cir N, Ft Worth", "price": 230000, "beds": 3, "baths": 2, "sqft": 1984, "cf": -50, "coc": -0.5, "type": "sfh", "score": 20},
    {"id": 5, "address": "125 Roundtree Dr, Crowley", "price": 220000, "beds": 3, "baths": 2, "sqft": 1113, "cf": -50, "coc": -0.5, "type": "sfh", "score": 20},
    {"id": 11, "address": "4125 Campus Dr, Ft Worth", "price": 175000, "beds": 3, "baths": 2, "sqft": 1050, "cf": 330, "coc": 3.8, "type": "sfh", "score": 28},
    {"id": 12, "address": "3341 Evans Ave, Ft Worth", "price": 188000, "beds": 3, "baths": 1, "sqft": 1200, "cf": 252, "coc": 2.9, "type": "sfh", "score": 22},
    {"id": 18, "address": "3145 Hulen St, Ft Worth", "price": 195000, "beds": 2, "baths": 2, "sqft": 950, "cf": 180, "coc": 2.0, "type": "sfh", "score": 21},
    {"id": 22, "address": "2245 Miller Ave, Ft Worth", "price": 185000, "beds": 2, "baths": 1, "sqft": 900, "cf": 220, "coc": 2.5, "type": "sfh", "score": 23},
]

# Alert history file
ALERT_HISTORY_FILE = "alert_history.json"

def load_alert_history():
    """Load previous alerts to avoid duplicates"""
    if os.path.exists(ALERT_HISTORY_FILE):
        with open(ALERT_HISTORY_FILE, 'r') as f:
            return json.load(f)
    return {"alerts": [], "last_check": None}

def save_alert_history(history):
    """Save alert history"""
    with open(ALERT_HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def check_property(prop, criteria):
    """Check if property matches all criteria"""
    checks = []
    
    # Check cash flow
    cf_pass = prop.get("cf", 0) >= criteria.get("min_cash_flow", 0)
    checks.append(("Cash Flow $" + str(criteria.get("min_cash_flow", 0)), cf_pass))
    
    # Check CoC
    coc_pass = prop.get("coc", 0) >= criteria.get("min_coc", 0)
    checks.append(("CoC " + str(criteria.get("min_coc", 0)) + "%", coc_pass))
    
    # Check price
    price_pass = prop.get("price", 999999) <= criteria.get("max_price", 999999)
    checks.append(("Price < $" + str(criteria.get("max_price", 999999)), price_pass))
    
    # Check beds
    beds_pass = prop.get("beds", 0) >= criteria.get("min_beds", 0)
    checks.append(("Beds >= " + str(criteria.get("min_beds", 0)), beds_pass))
    
    # Check type
    type_pass = prop.get("type", "") in criteria.get("allowed_types", ["sfh"])
    checks.append(("Type OK", type_pass))
    
    all_pass = all(c[1] for c in checks)
    
    return {
        "passes": all_pass,
        "checks": checks,
        "failing": [c[0] for c in checks if not c[1]]
    }

def generate_alert(prop, criteria):
    """Generate alert message for property"""
    cf = prop.get("cf", 0)
    coc = prop.get("coc", 0)
    price = prop.get("price", 0)
    
    message = f"""
🏠 PROPERTY ALERT - MATCHES ALL CRITERIA!

📍 {prop['address']}
💰 Price: ${price:,}
🛏️ Beds: {prop.get('beds', 'N/A')} | 🚿 Baths: {prop.get('baths', 'N/A')}
📐 Sqft: {prop.get('sqft', 'N/A'):,}

💵 Monthly Cash Flow: ${cf:,}/mo
📈 Cash-on-Cash Return: {coc}%
⭐ Score: {prop.get('score', 'N/A')}/100

Your Criteria:
  ✅ Min Cash Flow: ${criteria.get('min_cash_flow', 0)}/mo
  ✅ Min CoC: {criteria.get('min_coc', 0)}%
  ✅ Max Price: ${criteria.get('max_price', 0):,}
  ✅ Min Beds: {criteria.get('min_beds', 0)}

---
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    return message

def run_alert_scan(new_properties=None, send_alerts=True):
    """Run the alert scan"""
    print("="*60)
    print("🔔 PROPERTY ALERT SYSTEM")
    print("="*60)
    
    properties = new_properties if new_properties else PROPERTIES
    history = load_alert_history()
    
    # Check each property
    matching = []
    for prop in properties:
        result = check_property(prop, ALERT_CRITERIA)
        if result["passes"]:
            matching.append((prop, result))
    
    print(f"\n📊 SCAN RESULTS")
    print(f"   Properties Checked: {len(properties)}")
    print(f"   Matching Criteria: {len(matching)}")
    
    if matching:
        print(f"\n✅ PROPERTIES MATCHING ALL CRITERIA:")
        print("-"*60)
        for prop, result in matching:
            print(f"\n   📍 {prop['address']}")
            print(f"      Price: ${prop['price']:,} | CF: ${prop['cf']}/mo | CoC: {prop['coc']}%")
        
        # Check for new alerts
        new_alerts = []
        for prop, _ in matching:
            if prop['id'] not in [a['property_id'] for a in history.get('alerts', [])]:
                new_alerts.append(prop)
        
        if new_alerts and send_alerts:
            print(f"\n🔔 {len(new_alerts)} NEW ALERTS!")
            for prop in new_alerts:
                alert_msg = generate_alert(prop, ALERT_CRITERIA)
                print(alert_msg)
                
                # Save to history
                history["alerts"].append({
                    "property_id": prop["id"],
                    "address": prop["address"],
                    "timestamp": datetime.now().isoformat(),
                    "criteria_met": list(ALERT_CRITERIA.keys())
                })
                
                # TODO: Send actual notification (email, WhatsApp, etc.)
                # send_email(alert_msg)
                # send_whatsapp(alert_msg)
            
            history["last_check"] = datetime.now().isoformat()
            save_alert_history(history)
            print("\n✅ Alerts saved to history!")
        else:
            print("\nℹ️ No new properties match (already alerted)")
    else:
        print("\n❌ No properties match your criteria")
    
    # Show criteria being used
    print(f"\n📋 CURRENT ALERT CRITERIA:")
    for key, value in ALERT_CRITERIA.items():
        print(f"   {key}: {value}")
    
    return matching

def update_criteria(new_criteria):
    """Update alert criteria"""
    global ALERT_CRITERIA
    ALERT_CRITERIA.update(new_criteria)
    print("✅ Criteria updated!")
    print(ALERT_CRITERIA)

def add_test_property():
    """Add a test property and run scan"""
    test_props = PROPERTIES + [
        {"id": 999, "address": "999 NEW PROPERTY, Ft Worth", "price": 180000, "beds": 3, "baths": 2, "sqft": 1200, "cf": 350, "coc": 4.0, "type": "sfh", "score": 30},
    ]
    return test_props

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Test with new property
        print("🧪 Running test with new property...")
        props = add_test_property()
        run_alert_scan(props)
    else:
        # Normal scan
        run_alert_scan()
