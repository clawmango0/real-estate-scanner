import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const UA = "Mozilla/5.0 (compatible; LockBoxIQ/1.0)";

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: Zillow ZHVI + ZORI (free CSV downloads)
// ═══════════════════════════════════════════════════════════════

// Zillow publishes CSV data at these URLs (ZIP-level, all homes)
const ZHVI_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv";
const ZORI_URL = "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_sm_month.csv";

async function fetchZillowData(csvUrl: string, targetZips: Set<string>): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);
    const resp = await fetch(csvUrl, { signal: ac.signal, headers: { "User-Agent": UA } });
    clearTimeout(timer);
    if (!resp.ok) { console.error(`Zillow CSV fetch: ${resp.status}`); return results; }
    const text = await resp.text();
    const lines = text.split("\n");
    if (lines.length < 2) return results;

    // Parse header to find date columns (last 12 months)
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    const zipIdx = headers.findIndex(h => h === "RegionName");
    // Date columns are at the end, format: "YYYY-MM-DD" or "YYYY-MM"
    const dateIdxs: number[] = [];
    for (let i = headers.length - 1; i >= 0 && dateIdxs.length < 13; i--) {
      if (/^\d{4}-\d{2}/.test(headers[i])) dateIdxs.unshift(i);
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
      const zip = cols[zipIdx]?.padStart(5, "0");
      if (!zip || !targetZips.has(zip)) continue;

      // Get current value (last column) and 12-month-ago value
      const current = parseFloat(cols[dateIdxs[dateIdxs.length - 1]]) || null;
      const prev12 = parseFloat(cols[dateIdxs[0]]) || null;
      // Build last 12 months history
      const history: { date: string; value: number }[] = [];
      for (const idx of dateIdxs) {
        const val = parseFloat(cols[idx]);
        if (!isNaN(val)) history.push({ date: headers[idx], value: val });
      }

      results.set(zip, { current, prev12, history, change12: current && prev12 ? ((current - prev12) / prev12) : null });
    }
    console.log(`Zillow CSV: ${results.size} ZIPs matched from ${lines.length - 1} rows`);
  } catch (e) { console.error("fetchZillowData error:", e); }
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: Redfin Market Data (free TSV downloads)
// ═══════════════════════════════════════════════════════════════

// Redfin weekly data at ZIP level
const REDFIN_URL = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz";

async function fetchRedfinData(targetZips: Set<string>): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  try {
    // Redfin files are large (~200MB gzipped). Use a targeted approach:
    // Fetch from their API endpoint instead which supports filtering
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);

    // Use Redfin's data center download for most recent period
    // The full TSV is too large; instead use their summary endpoint
    const url = "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz";
    const resp = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA, "Accept-Encoding": "gzip" } });
    clearTimeout(timer);

    if (!resp.ok) {
      console.log(`Redfin TSV: status=${resp.status}, trying alternate approach`);
      // Fallback: use individual ZIP lookups via Redfin's stingray API
      for (const zip of targetZips) {
        try {
          const r = await fetch(`https://www.redfin.com/zipcode/${zip}/housing-market`, {
            headers: { "User-Agent": UA, "Accept": "text/html" }
          });
          if (!r.ok) continue;
          const html = await r.text();
          // Extract key metrics from the page
          const inventory = html.match(/homes?\s+for\s+sale[^<]*?(\d[\d,]*)/i)?.[1]?.replace(/,/g, "");
          const dom = html.match(/median\s+days\s+on\s+market[^<]*?(\d+)/i)?.[1];
          const priceCut = html.match(/([\d.]+)%\s+of\s+listings?\s+had\s+price\s+(?:cut|drop)/i)?.[1];
          const medPrice = html.match(/median\s+(?:sale\s+)?price[^$]*\$([\d,]+)/i)?.[1]?.replace(/,/g, "");
          if (inventory || dom || medPrice) {
            results.set(zip, {
              active_inventory: inventory ? parseInt(inventory) : null,
              days_on_market: dom ? parseInt(dom) : null,
              price_cut_pct: priceCut ? parseFloat(priceCut) : null,
              median_sale_price: medPrice ? parseInt(medPrice) : null,
            });
          }
        } catch { /* skip individual ZIP errors */ }
      }
      console.log(`Redfin scrape: ${results.size} ZIPs matched`);
      return results;
    }

    // Parse the gzipped TSV
    const ds = new DecompressionStream("gzip");
    const reader = resp.body!.pipeThrough(ds).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let headerParsed = false;
    let headers: string[] = [];
    let zipCol = -1, invCol = -1, domCol = -1, pcCol = -1, mpCol = -1, nlCol = -1, periodCol = -1;
    const latestByZip = new Map<string, Record<string, unknown>>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!headerParsed) {
          headers = line.split("\t").map(h => h.replace(/"/g, "").trim());
          zipCol = headers.findIndex(h => /region.*id|zip/i.test(h) && !/parent/i.test(h));
          if (zipCol < 0) zipCol = headers.findIndex(h => /region/i.test(h));
          periodCol = headers.findIndex(h => /period_begin/i.test(h));
          invCol = headers.findIndex(h => /active_listing/i.test(h) || /inventory/i.test(h));
          domCol = headers.findIndex(h => /median_dom/i.test(h));
          pcCol = headers.findIndex(h => /price_drop/i.test(h) || /price_reduced/i.test(h));
          mpCol = headers.findIndex(h => /median_sale_price/i.test(h));
          nlCol = headers.findIndex(h => /new_listing/i.test(h));
          headerParsed = true;
          continue;
        }
        const cols = line.split("\t").map(c => c.replace(/"/g, "").trim());
        const zip = cols[zipCol]?.padStart(5, "0");
        if (!zip || !targetZips.has(zip)) continue;

        const row: Record<string, unknown> = {
          active_inventory: invCol >= 0 ? (parseInt(cols[invCol]) || null) : null,
          days_on_market: domCol >= 0 ? (parseInt(cols[domCol]) || null) : null,
          price_cut_pct: pcCol >= 0 ? (parseFloat(cols[pcCol]) || null) : null,
          median_sale_price: mpCol >= 0 ? (parseInt(cols[mpCol]) || null) : null,
          new_listings: nlCol >= 0 ? (parseInt(cols[nlCol]) || null) : null,
          period: periodCol >= 0 ? cols[periodCol] : null,
        };
        // Keep only the latest period per ZIP
        const existing = latestByZip.get(zip);
        if (!existing || (row.period as string) > (existing.period as string)) {
          latestByZip.set(zip, row);
        }
      }
    }
    for (const [zip, data] of latestByZip) results.set(zip, data);
    console.log(`Redfin TSV: ${results.size} ZIPs matched`);
  } catch (e) { console.error("fetchRedfinData error:", e); }
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: Census ACS Demographics (free API, key optional)
// ═══════════════════════════════════════════════════════════════

async function fetchCensusData(targetZips: Set<string>): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  try {
    // ACS 5-Year: B19013_001E = median household income, B01003_001E = population, B25001_001E = housing units
    // The API returns all ZCTAs in one call (no need to filter in URL)
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);
    const url = "https://api.census.gov/data/2023/acs/acs5?get=B19013_001E,B01003_001E,B25001_001E&for=zip%20code%20tabulation%20area:*";
    const resp = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA } });
    clearTimeout(timer);
    if (!resp.ok) { console.error(`Census API: ${resp.status}`); return results; }
    const data = await resp.json();
    // First row is headers: ["B19013_001E","B01003_001E","B25001_001E","zip code tabulation area"]
    for (let i = 1; i < data.length; i++) {
      const zip = data[i][3]?.padStart(5, "0");
      if (!zip || !targetZips.has(zip)) continue;
      results.set(zip, {
        median_income: data[i][0] ? parseInt(data[i][0]) : null,
        population: data[i][1] ? parseInt(data[i][1]) : null,
        housing_units: data[i][2] ? parseInt(data[i][2]) : null,
      });
    }
    console.log(`Census ACS: ${results.size} ZIPs matched from ${data.length - 1} ZCTAs`);
  } catch (e) { console.error("fetchCensusData error:", e); }
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 4: LockBoxIQ Market Score (computed)
// ═══════════════════════════════════════════════════════════════

function computeMarketScore(row: Record<string, unknown>): number {
  // Score 0-100: higher = better market for buyers
  // Components (weighted):
  let score = 50; // neutral baseline

  // 1. Inventory trend (20%) — more inventory = more buyer power
  const inv = row.active_inventory as number | null;
  if (inv != null) {
    if (inv > 200) score += 10;       // high inventory
    else if (inv > 100) score += 5;
    else if (inv < 30) score -= 10;   // very tight market
    else if (inv < 60) score -= 5;
  }

  // 2. Days on Market (20%) — longer DOM = cooling market (good for buyers)
  const dom = row.days_on_market as number | null;
  if (dom != null) {
    if (dom > 60) score += 10;
    else if (dom > 40) score += 5;
    else if (dom < 15) score -= 10;
    else if (dom < 25) score -= 5;
  }

  // 3. Price cuts (15%) — high cuts = motivated sellers
  const pc = row.price_cut_pct as number | null;
  if (pc != null) {
    if (pc > 30) score += 8;
    else if (pc > 20) score += 4;
    else if (pc < 10) score -= 5;
  }

  // 4. Appreciation momentum (20%) — declining appreciation = better entry point
  const zhviChange = row.zhvi_12mo_change as number | null;
  if (zhviChange != null) {
    if (zhviChange < -0.05) score += 10;    // prices falling 5%+
    else if (zhviChange < 0) score += 5;     // slight decline
    else if (zhviChange > 0.10) score -= 10; // rapid appreciation
    else if (zhviChange > 0.05) score -= 5;
  }

  // 5. Affordability (15%) — price-to-income ratio
  const afford = row.affordability_ratio as number | null;
  if (afford != null) {
    if (afford < 3) score += 8;       // very affordable
    else if (afford < 4) score += 4;
    else if (afford > 6) score -= 8;  // unaffordable
    else if (afford > 5) score -= 4;
  }

  // 6. Population growth proxy via rent growth (10%)
  const rentGrowth = row.rent_growth as number | null;
  if (rentGrowth != null) {
    if (rentGrowth > 3) score += 5;    // strong demand
    else if (rentGrowth > 1) score += 2;
    else if (rentGrowth < -1) score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  // Simple auth: require service key header
  const authHeader = req.headers.get("x-refresh-key");
  if (authHeader !== "lockboxiq-refresh-2026") {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const results: string[] = [];

  try {
    // Get all ZIP codes we track
    const { data: hoods } = await supabase.from("neighborhoods").select("zip, zhvi_current, rent_growth");
    if (!hoods?.length) { return new Response(JSON.stringify({ error: "No neighborhoods" }), { status: 404 }); }
    const targetZips = new Set(hoods.map(h => String(h.zip).padStart(5, "0")));
    results.push(`Target ZIPs: ${targetZips.size}`);

    // Phase 1: Zillow ZHVI + ZORI
    const [zhviData, zoriData] = await Promise.all([
      fetchZillowData(ZHVI_URL, targetZips),
      fetchZillowData(ZORI_URL, targetZips),
    ]);
    results.push(`ZHVI: ${zhviData.size} ZIPs, ZORI: ${zoriData.size} ZIPs`);

    // Phase 2: Redfin market data
    const redfinData = await fetchRedfinData(targetZips);
    results.push(`Redfin: ${redfinData.size} ZIPs`);

    // Phase 3: Census ACS demographics
    const censusData = await fetchCensusData(targetZips);
    results.push(`Census: ${censusData.size} ZIPs`);

    // Phase 4: Merge all data and compute market scores, then update DB
    let updated = 0;
    for (const hood of hoods) {
      const zip = String(hood.zip).padStart(5, "0");
      const updates: Record<string, unknown> = {};

      // ZHVI
      const zhvi = zhviData.get(zip);
      if (zhvi) {
        if (zhvi.current) updates.zhvi_current = Math.round(zhvi.current as number);
        if (zhvi.history) updates.zhvi_history = zhvi.history;
        if (zhvi.change12 != null) {
          // Update appreciation rates from actual ZHVI data
          updates.appreci_1yr = Math.round((zhvi.change12 as number) * 10000) / 100; // store as percentage
        }
      }

      // ZORI
      const zori = zoriData.get(zip);
      if (zori) {
        if (zori.current) updates.zori_current = Math.round(zori.current as number);
        if (zori.change12 != null) updates.zori_12mo_change = Math.round((zori.change12 as number) * 10000) / 100;
      }

      // Redfin
      const redfin = redfinData.get(zip);
      if (redfin) {
        if (redfin.active_inventory != null) updates.active_inventory = redfin.active_inventory;
        if (redfin.days_on_market != null) updates.days_on_market = redfin.days_on_market;
        if (redfin.price_cut_pct != null) updates.price_cut_pct = redfin.price_cut_pct;
        if (redfin.median_sale_price != null) updates.median_sale_price = redfin.median_sale_price;
        if (redfin.new_listings != null) updates.new_listings = redfin.new_listings;
      }

      // Census
      const census = censusData.get(zip);
      if (census) {
        if (census.median_income != null) updates.median_income = census.median_income;
        if (census.population != null) updates.population = census.population;
        if (census.housing_units != null) updates.housing_units = census.housing_units;
        // Compute affordability ratio
        const zhviVal = (updates.zhvi_current || hood.zhvi_current) as number;
        const income = census.median_income as number;
        if (zhviVal && income && income > 0) {
          updates.affordability_ratio = Math.round((zhviVal / income) * 100) / 100;
        }
      }

      // Phase 4: Compute market score from all available data
      const scoreInput = { ...hood, ...updates, zhvi_12mo_change: zhvi?.change12 };
      updates.market_score = computeMarketScore(scoreInput);
      updates.data_updated_at = new Date().toISOString();

      if (Object.keys(updates).length > 1) { // more than just data_updated_at
        const { error } = await supabase.from("neighborhoods").update(updates).eq("zip", hood.zip);
        if (error) { console.error(`Update ${zip}:`, error.message); }
        else updated++;
      }
    }

    results.push(`Updated: ${updated}/${hoods.length} neighborhoods`);
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg, results }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
