#!/bin/bash
# Property Alert Daily Scanner
# Run this daily via cron: 0 8 * * * /path/to/daily_scan.sh

cd /home/claw/.openclaw/workspace/real-estate-scanner

echo "========================================"
echo "🏠 Property Scanner - Daily Scan"
echo "   $(date)"
echo "========================================"

# Run the alert scanner
python3 alerts.py

# If there are new alerts, you could add notification here
# For example, send email or WhatsApp message

echo ""
echo "✅ Daily scan complete!"
