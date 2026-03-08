# Real Estate Data Sources Research

## Executive Summary

Major sites (Zillow, Realtor.com, Loopnet) block server-side scraping. We need diverse sources and creative strategies.

---

## Sources Tested

### ✅ WORKING (HTTP 200)

| Source | Type | Data Available | Notes |
|--------|------|----------------|-------|
| RentCafe | Rental data | ✅ Yes | Already using - real market rent data |
| Dallas Craigslist | FSBO/Off-market | ❌ Blocked | Fort Worth DNS failed |
| NTREIS | MLS | ❌ JS only | Need login |
| Texas Comptroller | Tax data | ❌ JS only | Has open data portal |
| Texas Open Data | Government | ❌ JS only | ArcGIS Hub |
| Fort Worth Data | Government | ❌ JS only | ArcGIS Hub |
| Denton CAD | County | ❌ JS only | Likely login needed |
| CREXi | Commercial | ❌ JS only | Commercial only |
| PropertyShark | Paid service | ❌ JS only | Needs subscription |
| BiggerPockets | Investing | ❌ JS only | Community content |
| ERA | Real estate | ❌ JS only | Need agent |
| MailerGuy | Marketing | N/A | Not property data |

### ❌ BLOCKED/FAILED

| Source | Error |
|--------|-------|
| Fort Worth Focused | 404 (site changed/moved) |
| Zillow | 403 Forbidden |
| Realtor.com | 429 Rate Limited |
| Loopnet | 403 Forbidden |
| Homes.com | 403 Forbidden |
| Fort Worth Craigslist | DNS resolution failed |
| Tarrant County CAD | DNS resolution failed |
| Census Data | 403 Forbidden |
| Foreclosure.com | 404 |

---

## What Actually Works

### 1. RentCafe (✅ PROVEN)
- We have a working scraper in `rental_scraper.py`
- Pulls real market rent data
- Used for rental comps and cash flow analysis

### 2. Headless Browser Approaches (📋 Available)
- `scraper.py` in docs uses Scrapling (stealthy Python scraper)
- `server.js` in property-api uses curl_cffi with Chrome impersonation
- These CAN bypass JS blocking but need proper setup

---

## Strategy Recommendations

### HIGH PRIORITY

1. **Fix Fort Worth Focused** 
   - URL structure changed - need to find new site
   - Try: `fortworthfocused.com` (without "renn.")

2. **Use Headless Browser for Zillow**
   - The scraper tools can bypass JS blocking
   - Need to run with proper headers/cookies

3. **Craigslist DNS Fix**
   - Try different domain: `https://fortworth.craigslist.org/` vs `fortworth.craigslist.org`

### MEDIUM PRIORITY

4. **County Assessor APIs**
   - Tarrant CAD may have public API
   - Would give us owner, value, tax data

5. **Texas Comptroller Open Data**
   - Might have property datasets
   - Need to find correct API endpoint

### LOWER PRIORITY (Needs Money)

6. **Paid Services**
   - PropStream - $200+/month
   - PropertyShark - $200+/month
   - These have raw data APIs

---

## Action Items

### Today/This Week
- [ ] Test Fort Worth Focused new URL
- [ ] Get headless browser working with Zillow
- [ ] Fix Craigslist DNS
- [ ] Add 3 new sources to property-api

### This Month
- [ ] Set up county CAD API access
- [ ] Explore paid data services (trial?)
- [ ] Build off-market lead generation

---

## Current Best Approach

**Use what's working:**
1. RentCafe for rent comps ✅
2. The 2 duplex deals we found ✅
3. Continue analyzing properties manually from any source we can access

**Scraping reality:**
- Major sites use Cloudflare + JS rendering
- curl_cffi with Chrome impersonation helps
- Headless browser (Puppeteer/Playwright) is most reliable but heavy

---

## Updated by
Mango
Date: 2026-02-26
Status: IN PROGRESS
