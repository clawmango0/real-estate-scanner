#!/bin/bash
# refresh-zillow.sh — Download Zillow ZHVI/ZORI CSVs, extract target ZIPs, upload to LockBoxIQ
# Run monthly from your Mac: ./scripts/refresh-zillow.sh

set -e
ENDPOINT="https://tgborqvdkujajsggfbcy.supabase.co/functions/v1/refresh-data?phase=zillow"
REFRESH_KEY="lockboxiq-refresh-2026"
TMPDIR=$(mktemp -d)

echo "=== LockBoxIQ Zillow Data Refresh ==="
echo "Downloading ZHVI CSV..."
curl -s -o "$TMPDIR/zhvi.csv" "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
echo "Downloading ZORI CSV..."
curl -s -o "$TMPDIR/zori.csv" "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_sm_month.csv"

echo "Extracting DFW ZIP data..."
python3 -c "
import csv, json, sys

# Get all ZIPs from our neighborhoods table (we'll match against the CSV)
# For now, extract all Texas ZIPs (7xxxx range) — the edge function filters to tracked ZIPs
result = {}

for metric, filepath in [('zhvi', '$TMPDIR/zhvi.csv'), ('zori', '$TMPDIR/zori.csv')]:
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        # Find the last date column (most recent value)
        date_cols = [h for h in headers if h and h[:2] == '20']
        if not date_cols:
            print(f'No date columns found in {metric} CSV', file=sys.stderr)
            continue
        latest_col = date_cols[-1]
        prev_col = date_cols[-13] if len(date_cols) >= 13 else date_cols[0]

        count = 0
        for row in reader:
            zip_code = row.get('RegionName', '').strip().zfill(5)
            state = row.get('StateName', '').strip()
            # Filter to Texas ZIPs
            if state != 'TX' and not zip_code.startswith('7'):
                continue
            val = row.get(latest_col, '').strip()
            if not val:
                continue
            try:
                current = round(float(val))
            except ValueError:
                continue
            if zip_code not in result:
                result[zip_code] = {}
            result[zip_code][metric] = current
            count += 1
        print(f'{metric}: {count} Texas ZIPs extracted (latest: {latest_col})')

# Write JSON payload
payload = json.dumps({'zillow': result})
with open('$TMPDIR/payload.json', 'w') as f:
    f.write(payload)
print(f'Total: {len(result)} ZIPs in payload ({len(payload)} bytes)')
"

echo "Uploading to LockBoxIQ..."
RESPONSE=$(curl -s --max-time 60 -X POST "$ENDPOINT" \
  -H "x-refresh-key: $REFRESH_KEY" \
  -H "Content-Type: application/json" \
  -d @"$TMPDIR/payload.json")
echo "Response: $RESPONSE"

# Also run score recalculation
echo "Recalculating market scores..."
curl -s --max-time 30 -X POST "https://tgborqvdkujajsggfbcy.supabase.co/functions/v1/refresh-data?phase=score" \
  -H "x-refresh-key: $REFRESH_KEY"

echo ""
echo "=== Done ==="
rm -rf "$TMPDIR"
