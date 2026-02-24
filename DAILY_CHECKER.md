# Real Estate Daily Property Checker

## To Enable Daily 11 AM Check

Since cron may not be available in all environments, here's how to set it up:

### Option 1: System Cron (Linux/WSL)

```bash
# Edit crontab
crontab -e

# Add this line for 11 AM daily:
0 11 * * * cd /home/claw/.openclaw/workspace/real-estate-scanner && python3 daily_checker.py >> daily.log 2>&1
```

### Option 2: Systemd Timer (Linux)

```bash
# Create timer unit
sudo nano /etc/systemd/system/property-check.timer

# Add:
[Timer]
OnCalendar=*-*-* 11:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Option 3: Run Manually

```bash
cd /home/claw/.openclaw/workspace/real-estate-scanner
python3 daily_checker.py
```

---

## Current Status

- Cron daemon: May not be running
- Manual run: Available anytime
- OpenClaw heartbeat: Could use for periodic checks

---

## Sources Checked

1. Fort Worth Focused - renn.fortworthfocused.com
2. DFW Real Estate Source - dfwrealestatesource.com
3. Zillow - zillow.com (via web_fetch)

---

## Output

Logs saved to: `daily.log`
