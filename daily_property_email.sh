#!/bin/bash
# Daily Property Summary Email
# Sends email at 8 AM with properties added to the dashboard

set -e

export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"

REPO_DIR="/home/claw/.openclaw/workspace/real-estate-scanner"
PROPS_FILE="$REPO_DIR/data/properties.csv"
EMAIL_FILE="/tmp/property_email.txt"
RECIPIENT="clawmango0@gmail.com"

# Get today's date
TODAY=$(date +%Y-%m-%d)

# Check if there are any properties added today
TODAY_COUNT=$(grep -c "^$TODAY," "$PROPS_FILE" 2>/dev/null || echo "0")

if [ "$TODAY_COUNT" = "0" ]; then
    echo "No properties added today. Skipping email."
    exit 0
fi

echo "Found $TODAY_COUNT properties added today. Generating email..."

# Build email content using Python for calculations
python3 << PYEOF
import csv

today = "$TODAY"
props = []

with open("$PROPS_FILE", "r") as f:
    reader = csv.reader(f)
    for row in reader:
        if row and row[0] == today:
            date, addr, zipcode, price, beds, baths, sqft, offer, cashflow, status = row[:10]
            props.append({
                "address": addr,
                "zip": zipcode,
                "price": int(price),
                "beds": int(beds),
                "baths": float(baths),
                "sqft": int(sqft),
                "offer": int(offer),
                "cashflow": int(cashflow),
                "status": status
            })

# Write email
with open("$EMAIL_FILE", "w") as f:
    f.write(f"Subject: [{len(props)}] Properties Added to Property Scout - $(date '+%B %d, %Y')\n")
    f.write("From: clawmango0@gmail.com\n")
    f.write(f"To: {('$RECIPIENT')}\n")
    f.write("\n")
    f.write("Daily Property Summary\n")
    f.write("=" * 50 + "\n\n")
    f.write(f"The following {len(props)} property(ies) were added to your Property Scout today:\n\n")
    
    for p in props:
        coc = (p["cashflow"] * 12 / 100000) * 100
        status_icon = "✅" if p["cashflow"] > 0 else "❌"
        
        f.write("-" * 40 + "\n")
        f.write(f"Address: {p['address']}, {p['zip']}\n")
        f.write(f"Price: \${p['price']:,} | Beds: {p['beds']} | Baths: {p['baths']} | Sqft: {p['sqft']}\n")
        f.write(f"Cash Flow: \${p['cashflow']}/mo | CoC: {coc:.1f}%\n")
        f.write(f"Status: {status_icon} {'PASS' if p['cashflow'] > 0 else 'FAIL'}\n\n")
    
    f.write("\nView all properties:\n")
    f.write("https://clawmango0.github.io/real-estate-scanner/\n\n")
    f.write("---\nProperty Scout Dashboard\n")

print(f"Email generated with {len(props)} properties")
PYEOF

# Send email using himalaya
himalaya message send -f clawmango0@gmail.com -t clawmango0@gmail.com -b "$EMAIL_FILE" 2>&1 | grep -v WARN || echo "Email command ran"

echo "Done!"

# Clean up
rm -f "$EMAIL_FILE"
