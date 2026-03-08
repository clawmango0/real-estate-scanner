# Property Scout

Real estate investment property scanner for Fort Worth, TX area.

## Quick Links

- **Website:** https://clawmango0.github.io/real-estate-scanner/
- **Property Index:** [properties/README.md](properties/README.md)

## Project Structure

```
real-estate-scanner/
├── data/                   # Raw data files
│   ├── properties.csv      # All properties with basic metrics
│   ├── deals.json          # Deal tracking
│   ├── hud_rents.csv       # HUD rental data
│   └── sfr_rent_data.json # Rent data
│
├── properties/             # Individual property analysis files
│   ├── README.md           # Property index sorted by cash flow
│   └── [address].md        # Individual property analysis
│
├── deals/                  # Detailed deal analysis & email alerts
│   ├── *.md                # Detailed property writeups
│   └── email-alerts/       # Raw email alerts
│
├── docs/                   # Website files
│   ├── index.html          # Main dashboard
│   ├── properties.json      # Properties data for website
│   └── server.js           # Local API server
│
├── scripts/                # Utility scripts
│   ├── scraper.py          # Property scraper
│   ├── analyzer.py          # Property analyzer
│   ├── daily_property_email.sh  # Daily email cron job
│   └── ...
│
└── lib/                   # Shared libraries
    └── calculator.py       # Investment calculations
```

## Getting Started

### View Properties

1. **GitHub Pages (Live):** https://clawmango0.github.io/real-estate-scanner/
2. **Local Development:** 
   ```bash
   cd docs
   node server.js
   # Open http://localhost:3000
   ```

### Add New Property

1. Add to `data/properties.csv`
2. Run: `python3 scripts/generate_property_files.py`

### Daily Workflow

- Run scrapers to find new properties
- Analyze with `analyzer.py`
- Results go to `properties/` and `data/properties.csv`
- Push to GitHub to update website

## Property Analysis Format

Each property in `properties/` includes:
- Basic info (address, price, beds, baths, sqft)
- Investment analysis (NOI, cash flow, CoC, cap rate)
- Decision matrix (pass/fail criteria)
- Notes section for tracking

## Tech Stack

- **Website:** Plain HTML/CSS/JS (no framework)
- **Data:** CSV + JSON
- **Scripts:** Python + Node.js

## License

MIT
