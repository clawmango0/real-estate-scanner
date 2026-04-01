// ── Data Sources Page ────────────────────────────────────────────────────────

function openDataSources(){
  if(typeof trackDataSources==='function') trackDataSources();
  document.getElementById('ds-body').innerHTML=_buildDataSourcesHTML();
  document.getElementById('dsov').classList.add('open');
}
function closeDataSources(e){
  if(e&&e.target!==document.getElementById('dsov')) return;
  document.getElementById('dsov').classList.remove('open');
}

function _buildDataSourcesHTML(){
  return `
  <div class="ds-hero">
    <div class="ds-hero-title">LockBoxIQ — Texas Property Analyst</div>
    <div class="ds-hero-points">
      <div class="ds-hero-item">All financial calculations run in your browser — nothing is sent to external servers</div>
      <div class="ds-hero-item">Your property data is stored securely in Supabase with row-level security</div>
      <div class="ds-hero-item">No data is shared with third parties</div>
    </div>
  </div>
  <div class="ds-intro">
    LockBoxIQ combines data from <strong>7 independent sources</strong> to give you a comprehensive view of every property and market.
    No single source tells the whole story — our power comes from layering property listings, neighborhood intelligence,
    financial modeling, and AI analysis into one unified investment decision platform.
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Property Listing Data</div>
    <div class="ds-subtitle">Where your properties come from</div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">Zillow</div>
        <a href="https://www.zillow.com" target="_blank" rel="noopener" class="ds-link">zillow.com ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Property listings, price, beds, baths, sqft, lot size, property type, Rent Zestimate, listing URL, latitude/longitude, listing agent info
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Primary property data for properties from Zillow email alerts. We parse Zillow's <code>__NEXT_DATA__</code> JSON structure and extract the <code>gdpClientCache</code> property object for structured data. The Rent Zestimate provides an initial rent baseline before our own estimation model runs.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Real-time (new listings)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Within minutes of email alert</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">Realtor.com</div>
        <a href="https://www.realtor.com" target="_blank" rel="noopener" class="ds-link">realtor.com ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Property listings, price, beds, baths, sqft, lot size, property type, listing agent details (name, phone, license, brokerage)
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Parsed from Realtor.com's <code>initialReduxState</code> in __NEXT_DATA__. Provides cross-source validation — when a property appears on both Zillow and Realtor.com, we can verify data accuracy.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Real-time (new listings)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Within minutes of email alert</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">Redfin</div>
        <a href="https://www.redfin.com" target="_blank" rel="noopener" class="ds-link">redfin.com ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Property listings via JSON-LD structured data (RealEstateListing schema), price, beds, baths, sqft, floor plan, property category, geo coordinates, listing agents
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Redfin email alerts use tracking URLs that we follow through redirect chains to reach the property page. We parse the JSON-LD <code>RealEstateListing</code> block for structured property data. Redfin's accommodation categories help classify multi-family vs. single-family.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Real-time (new listings)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Within minutes of email alert</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">HAR (Houston Association of Realtors)</div>
        <a href="https://www.har.com" target="_blank" rel="noopener" class="ds-link">har.com ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Property listings from HAR email alerts
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Parsed via our Claude AI extraction pipeline when structured data isn't available. Provides additional coverage for Texas markets.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Real-time (new listings)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Within minutes of email alert</div>
      </div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Neighborhood Intelligence</div>
    <div class="ds-subtitle">Market context for every ZIP code</div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">Zillow Research — ZHVI</div>
        <a href="https://www.zillow.com/research/data/" target="_blank" rel="noopener" class="ds-link">zillow.com/research/data ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Zillow Home Value Index (ZHVI) — the typical home value for the 35th-65th percentile in each ZIP code. Available nationally at the ZIP level back to 2000.
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        ZHVI anchors our property valuation context. We compare each property's list price to the ZIP's typical home value to identify under/overpriced properties. ZHVI changes over 1, 3, and 5 years power our appreciation rate estimates used in exit analysis (5/10/15-year hold projections).
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Monthly (mid-month)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> On neighborhood data refresh</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">NCES & Texas Education Agency</div>
        <a href="https://nces.ed.gov" target="_blank" rel="noopener" class="ds-link">nces.ed.gov ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        School quality ratings (1-10 scale) per ZIP code, derived from NCES school district performance data and TEA accountability ratings
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        School score is 35% of our Neighborhood Score (0-100). High-quality schools (8-10) add a 6-12% premium to our rent estimates. A-rated districts command higher rents and attract quality tenants, directly impacting cash-on-cash returns.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Annually (fall release)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Annual neighborhood refresh</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">FBI UCR & Bureau of Justice Statistics</div>
        <a href="https://ucr.fbi.gov" target="_blank" rel="noopener" class="ds-link">ucr.fbi.gov ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Crime safety score (1-10 scale) per ZIP code, derived from FBI Uniform Crime Reporting and BJS community safety data
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Crime safety is 35% of our Neighborhood Score. High-crime areas face higher vacancy rates, lower tenant quality, and depressed rents. This directly affects our cash flow projections and risk assessment for each property.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Annually</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Annual neighborhood refresh</div>
      </div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Address Verification & Geocoding</div>
    <div class="ds-subtitle">Ensuring every property has verified location data</div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">U.S. Census Bureau Geocoder</div>
        <a href="https://geocoding.geo.census.gov" target="_blank" rel="noopener" class="ds-link">geocoding.geo.census.gov ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        USPS-verified street address, city, state, ZIP code, and precise latitude/longitude coordinates
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Every property with a missing ZIP code or city is automatically geocoded through the Census Bureau's address matching service. This ensures no property is stored with incomplete location data — which would prevent neighborhood scoring, rent estimation, and project filtering from working correctly. Also provides lat/lng for map visualization.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Continuously maintained</div>
        <div class="ds-freq"><span class="ds-freq-label">Our ingestion</span> Real-time (on every property ingest + backfill on page load)</div>
      </div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">AI-Powered Analysis</div>
    <div class="ds-subtitle">Where machine intelligence augments the data</div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">Claude AI (Anthropic)</div>
        <a href="https://www.anthropic.com" target="_blank" rel="noopener" class="ds-link">anthropic.com ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Structured property data extraction from unstructured email content, HTML pages, and Google search snippets. Also provides AI-powered rent estimation when neighborhood data is available.
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        <strong>Email parsing:</strong> When structured parsers (regex, __NEXT_DATA__, JSON-LD) can't extract property details from an email, Claude reads the raw content and extracts address, price, beds, baths, sqft, and property type — handling every email format from Zillow digests to Redfin marketing copy.<br><br>
        <strong>Fallback scraping:</strong> When web scraping returns a JS-only shell without structured data, Claude extracts property details from raw HTML as a last resort.<br><br>
        <strong>Rent estimation:</strong> Our AI rent estimation API uses Claude to analyze property specs + neighborhood data (schools, crime, walkability, rent growth, ZHVI) and produce a market-calibrated rent estimate with low/high confidence range.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Model</span> Claude Sonnet 4 (claude-sonnet-4-20250514)</div>
        <div class="ds-freq"><span class="ds-freq-label">Usage</span> On-demand per property (email parse, scrape fallback, rent estimate)</div>
      </div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Financial Modeling Engine</div>
    <div class="ds-subtitle">All calculations run locally — your data never leaves your browser</div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">IRS Tax Tables (2025)</div>
        <a href="https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2025" target="_blank" rel="noopener" class="ds-link">irs.gov ↗</a>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we get</div>
        Federal income tax brackets, standard deductions, LTCG rates, depreciation schedules (27.5-year), cost segregation rules, Section 179 limits, passive activity loss limits
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Powers our full <strong>Schedule E tax worksheet</strong> — the same form you'd file with the IRS. We calculate depreciation (straight-line + cost segregation + bonus depreciation), passive activity loss deductions (with $25K phase-out at AGI $100K-$150K), tax savings per year, and depreciation recapture at sale. This feeds into 5/10/15-year exit analysis showing total after-tax returns.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Source updates</span> Annually (Rev. Proc. release)</div>
        <div class="ds-freq"><span class="ds-freq-label">Our update</span> Annual (coded into financial.js)</div>
      </div>
    </div>

    <div class="ds-card">
      <div class="ds-card-header">
        <div class="ds-source-name">DFW Market Calibration</div>
      </div>
      <div class="ds-what">
        <div class="ds-label">What we compute</div>
        Local rent estimation model calibrated to the Dallas-Fort Worth market using multi-factor analysis
      </div>
      <div class="ds-how">
        <div class="ds-label">How we use it</div>
        Our rent estimation engine uses <strong>9 factors</strong>: base yield by price tier, ZHVI comparison, property type multiplier (duplex 1.10x, condo 0.92x), bed/bath adjustment, property condition, improvement plan, market heat (appreciation rate), school district premium (A-rated +12%), and per-sqft floor/cap ($0.80-$1.40/sqft for DFW). The result is rounded to the nearest $25 with a ±12% confidence range.
      </div>
      <div class="ds-meta">
        <div class="ds-freq"><span class="ds-freq-label">Calibration</span> DFW metropolitan area</div>
        <div class="ds-freq"><span class="ds-freq-label">Factors</span> 9 inputs per property</div>
      </div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Investment Strategies</div>
    <div class="ds-subtitle">7 analysis frameworks powered by the data above</div>
    <div class="ds-strategies">
      <div class="ds-strat"><strong>Buy & Hold</strong> — CoC return, cash flow, offer tiers (strong/consider/stretch), 5-year Schedule E, exit analysis</div>
      <div class="ds-strat"><strong>Fix & Flip</strong> — ARV from condition/improvement matrix, 70% MAO rule, holding costs, net profit & ROI</div>
      <div class="ds-strat"><strong>BRRRR</strong> — Buy-rehab-rent-refi-repeat: ARV, refi at 75% LTV after 6-month seasoning, capital recycled, adjusted CoC</div>
      <div class="ds-strat"><strong>Short-Term Rental</strong> — RevPAR, gross revenue, platform fees (3%), management (20%), NOI, STR-specific CoC</div>
      <div class="ds-strat"><strong>Wholesale</strong> — Assignment fee calculation, MAO, offer price, spread analysis</div>
      <div class="ds-strat"><strong>Commercial/Multi</strong> — Cap rate, DSCR, GRM, price-per-unit, NOI with vacancy adjustment</div>
      <div class="ds-strat"><strong>Passive/Syndication</strong> — IRR via Newton's method, equity multiple, preferred return, annual distributions</div>
    </div>
  </div>

  <div class="ds-section">
    <div class="ds-section-title">Data Quality</div>
    <div class="ds-subtitle">How we ensure accuracy across the pipeline</div>
    <div class="ds-quality">
      <div class="ds-q-item"><strong>Multi-parser fallback chain</strong> — Each property goes through up to 6 parsing methods (site-specific JSON → JSON-LD → meta tags → regex → Claude AI → address search) with a quality score gate. We stop when we hit sufficient data quality.</div>
      <div class="ds-q-item"><strong>Address verification</strong> — Every property is geocoded through the U.S. Census Bureau to verify city, state, and ZIP code. No property is stored with null location data.</div>
      <div class="ds-q-item"><strong>Deduplication</strong> — Properties are deduplicated on (user_id, address) with upsert-on-conflict. Price drops are detected automatically when a new email shows a lower price for an existing property.</div>
      <div class="ds-q-item"><strong>Cross-source validation</strong> — Properties appearing on multiple listing sites (Zillow + Realtor + Redfin) are merged, with empty fields filled from whichever source has the data.</div>
      <div class="ds-q-item"><strong>User-curated fields preserved</strong> — Your manual edits (condition, improvement plan, confirmed rent, notes) are never overwritten by automated data updates.</div>
    </div>
  </div>

  <div class="ds-footer">
    Built for Texas real estate investors
  </div>`;
}
