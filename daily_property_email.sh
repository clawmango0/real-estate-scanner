#!/bin/bash
# Daily Property Summary Email
# Sends email at 8 AM with properties added to the dashboard

REPO_DIR="/home/claw/.openclaw/workspace/real-estate-scanner"
PROPS_FILE="$REPO_DIR/data/properties.csv"
EMAIL_FILE="/tmp/property_email.txt"
PYTHON_SCRIPT="$REPO_DIR/send_email.py"
TODAY=$(date +%Y-%m-%d)

TODAY_COUNT=$(grep -c "^$TODAY," "$PROPS_FILE" 2>/dev/null || echo "0")

if [ "$TODAY_COUNT" = "0" ]; then
    echo "No properties added today. Skipping."
    exit 0
fi

python3 << PYEOF
import csv
from datetime import datetime

date = "$TODAY"
today_formatted = datetime.now().strftime("%B %d, %Y")

props = []
with open("$PROPS_FILE", "r") as f:
    reader = csv.reader(f)
    for row in reader:
        if row and row[0] == "$TODAY":
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

subject = f"[{today_formatted}] [{len(props)} properties added]"

body = f"""Daily Property Summary
==================================================

The following {len(props)} property(ies) were added:

"""

for p in props:
    coc = (p["cashflow"] * 12 / 100000) * 100
    status_icon = "✅" if p["cashflow"] > 0 else "❌"
    body += f"""----------------------------------------
Address: {p['address']}, {p['zip']}
Price: \${p['price']:,} | Beds: {p['beds']} | Baths: {p['baths']} | Sqft: {p['sqft']}
Cash Flow: \${p['cashflow']}/mo | CoC: {coc:.1f}%
Status: {status_icon} {'PASS' if p['cashflow'] > 0 else 'FAIL'}

"""

body += """
View all: https://clawmango0.github.io/real-estate-scanner/
"""

with open("$EMAIL_FILE", "w") as f:
    f.write(body)

print(f"Generated email with {len(props)} properties")
PYEOF

# Try to send via Python script if GMAIL_APP_PASSWORD is set
if [ -n "$GMAIL_APP_PASSWORD" ]; then
    python3 "$PYTHON_SCRIPT" ian.aloysious.kelly@gmail.com "$subject" "$EMAIL_FILE"
else
    echo "GMAIL_APP_PASSWORD not set. Email saved to $EMAIL_FILE"
    cat "$EMAIL_FILE"
fi
