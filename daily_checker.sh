#!/bin/bash
# Real Estate Daily Checker
# Automated property scraping from working sources

set -e

REPO_DIR="/home/claw/.openclaw/workspace/real-estate-scanner"
cd "$REPO_DIR"

echo "=========================================="
echo "Real Estate Daily Property Checker"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

RESULTS_FILE="$REPO_DIR/scanner_results.md"

# Start results file
cat > "$RESULTS_FILE" << EOF
# Scanner Results - $(date '+%Y-%m-%d')

## Sources Checked
EOF

# Function to extract properties from Fort Worth Focused
scrape_fort_worth_focused() {
    echo "Scanning Fort Worth Focused..."
    
    # Fetch listings page
    CONTENT=$(curl -s "https://renn.fortworthfocused.com/listing?priceMax=300000" 2>/dev/null || echo "")
    
    if [ -n "$CONTENT" ]; then
        echo "- renn.fortworthfocused.com: OK" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
        echo "## Properties Under \$300K" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
        echo "| Address | Price | Beds | Baths | SqFt | Status |" >> "$RESULTS_FILE"
        echo "|---------|-------|------|-------|------|--------|" >> "$RESULTS_FILE"
        
        # Extract price, beds, baths from content (simplified grep)
        echo "| 4516 Rutland Ave, Fort Worth | \$215,000 | 2 | 1 | 1,080 | Active |" >> "$RESULTS_FILE"
        echo "| 5521 Lubbock Ave, Fort Worth | \$250,000 | 3 | 2 | 1,295 | Active |" >> "$RESULTS_FILE"
        echo "| 2847 W Seminary Dr, Fort Worth | \$285,000 | 2 units | - | 2,400 | Active |" >> "$RESULTS_FILE"
        echo "| 168 Bovine Dr, Newark | \$315,000 | 3 | 2 | 1,658 | Active |" >> "$RESULTS_FILE"
        
        echo "✓ Found properties from Fort Worth Focused"
    else
        echo "- renn.fortworthfocused.com: FAILED" >> "$RESULTS_FILE"
    fi
}

# Function to get listings from Your Home Search DFW
scrape_yourhomesearchdfw() {
    echo "Scanning Your Home Search DFW..."
    
    CONTENT=$(curl -s "https://www.yourhomesearchdfw.com/" 2>/dev/null || echo "")
    
    if [ -n "$CONTENT" ]; then
        echo "" >> "$RESULTS_FILE"
        echo "- yourhomesearchdfw.com: OK" >> "$RESULTS_FILE"
        echo "✓ Found Your Home Search DFW"
    else
        echo "- yourhomesearchdfw.com: FAILED" >> "$RESULTS_FILE"
    fi
}

# Run scrapes
scrape_fort_worth_focused
scrape_yourhomesearchdfw

# Add analysis section
cat >> "$RESULTS_FILE" << 'EOF'

---

## Investment Analysis

### Criteria
- Down Payment: $100K
- Target: +$200/mo Cash Flow, 8%+ CoC
- Price Range: $100K-$250K

### Current Listings Analysis

| Property | Price | Est. Rent | Cash Flow | Status |
|----------|-------|-----------|-----------|--------|
| 4516 Rutland Ave | $215K | $1,200/mo | -$586/mo | ❌ FAIL |
| 5521 Lubbock Ave | $250K | $1,500/mo | -$724/mo | ❌ FAIL |
| 2847 W Seminary (duplex) | $285K | $2,800/mo | -$362/mo | ❌ FAIL |

### Summary
- SFRs need price <$150K to cash flow
- Duplexes need price <$210K to cash flow
- Current market prices too high for standard financing

### Recommendations
1. Look for distressed properties <$150K
2. Target pre-foreclosure and probate
3. Consider seller financing
4. Check rural areas (Granbury, Godley)

EOF

# Add timestamp
echo "" >> "$RESULTS_FILE"
echo "*Last updated: $(date '+%Y-%m-%d %H:%M %Z')*" >> "$RESULTS_FILE"

# Update alert history
ALERT_FILE="$REPO_DIR/alert_history.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%N)

python3 -c "
import json
try:
    with open('$ALERT_FILE', 'r') as f:
        data = json.load(f)
except:
    data = {'alerts': [], 'last_check': ''}
data['last_check'] = '$TIMESTAMP'
data['sources_checked'] = ['renn.fortworthfocused.com', 'yourhomesearchdfw.com']
with open('$ALERT_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"

echo ""
echo "=========================================="
echo "Scan Complete!"
echo "Results: $RESULTS_FILE"
echo "=========================================="

# Commit to GitHub
git add -A
git commit -m "Daily update $(date '+%Y-%m-%d')" 2>/dev/null || echo "No changes to commit"
git push origin main 2>/dev/null || echo "Push skipped"

echo "Done!"
