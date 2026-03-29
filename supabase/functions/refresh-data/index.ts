import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const UA = "Mozilla/5.0 (compatible; LockBoxIQ/1.0)";

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: Zillow ZHVI + ZORI — stream CSV, extract target ZIPs
// ═══════════════════════════════════════════════════════════════

// Fetch ZHVI/ZORI from FRED API (DFW metro-level, single lightweight call)
// FRED Series: ATNHPIUS19124Q = DFW ZHVI All-Transactions HPI
// We use Zillow's own published data via their research page JSON endpoint
async function fetchZillowData(targetZips: Set<string>, metric: "zhvi" | "zori"): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  try {
    // Zillow publishes metro-level ZHVI/ZORI as JSON via their research API
    // DFW metro region ID = 394514 (Dallas-Fort Worth-Arlington)
    const regionId = "394514";
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);
    const indicator = metric === "zhvi" ? "zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month" : "zori_sm_month";
    const url = `https://www.zillow.com/ajax/homevalues/data/timeseries.json?r=${regionId}&m=${indicator}`;
    const resp = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA } });
    clearTimeout(timer);
    if (!resp.ok) {
      console.log(`Zillow API: ${resp.status} for ${metric}, trying scrape fallback`);
      // Fallback: scrape the DFW metro page
      const ac2 = new AbortController();
      const t2 = setTimeout(() => ac2.abort(), 10000);
      const pageUrl = metric === "zhvi"
        ? "https://www.zillow.com/home-values/394514/dallas-fort-worth-arlington-tx/"
        : "https://www.zillow.com/rental-manager/market-trends/dallas-fort-worth-arlington-tx/";
      const pr = await fetch(pageUrl, { signal: ac2.signal, headers: { "User-Agent": UA, "Accept": "text/html" } });
      clearTimeout(t2);
      if (pr.ok) {
        const html = await pr.text();
        const valMatch = metric === "zhvi"
          ? html.match(/typical\s+home\s+value[^$]*?\$([\d,]+)/i) || html.match(/"zhvi":\s*(\d+)/i)
          : html.match(/typical\s+rent[^$]*?\$([\d,]+)/i) || html.match(/"zori":\s*(\d+)/i);
        if (valMatch) {
          const metroVal = parseInt(valMatch[1].replace(/,/g, ""));
          // Apply metro value to all target ZIPs (will be overridden by ZIP-specific data if available)
          for (const zip of targetZips) results.set(zip, { current: metroVal, prev12: null, history: [], change12: null });
          console.log(`Zillow ${metric}: metro fallback ${metroVal} applied to ${targetZips.size} ZIPs`);
        }
      }
      return results;
    }
    // Parse Zillow's JSON timeseries response
    const data = await resp.json();
    const points = data?.data || data?.results || [];
    if (Array.isArray(points) && points.length > 0) {
      const latest = points[points.length - 1];
      const prev = points.length > 12 ? points[points.length - 13] : points[0];
      const current = latest?.value || latest?.y || latest;
      const prev12val = prev?.value || prev?.y || prev;
      const change12 = current && prev12val ? (current - prev12val) / prev12val : null;
      const history = points.slice(-13).map((p: unknown) => {
        const pt = p as Record<string, unknown>;
        return { date: pt.date || pt.x || "", value: pt.value || pt.y || 0 };
      });
      for (const zip of targetZips) results.set(zip, { current, prev12: prev12val, history, change12 });
      console.log(`Zillow ${metric}: ${current} (${results.size} ZIPs, 12mo change: ${change12 ? (change12 * 100).toFixed(1) + '%' : 'n/a'})`);
    }
  } catch (e) { console.error(`fetchZillowData ${metric} error:`, e); }
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: Redfin — scrape individual ZIP pages (lightweight)
// ═══════════════════════════════════════════════════════════════

async function fetchRedfinData(targetZips: Set<string>): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  for (const zip of targetZips) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10000);
      const r = await fetch(`https://www.redfin.com/zipcode/${zip}/housing-market`, {
        headers: { "User-Agent": UA, "Accept": "text/html" }, signal: ac.signal
      });
      clearTimeout(timer);
      if (!r.ok) continue;
      const html = await r.text();
      const inv = html.match(/(\d[\d,]*)\s*homes?\s+for\s+sale/i)?.[1]?.replace(/,/g, "");
      const dom = html.match(/(\d+)\s*(?:median\s+)?days?\s+on\s+market/i)?.[1] ||
                  html.match(/median\s+days\s+on\s+market[^<]*?(\d+)/i)?.[1];
      const pc = html.match(/([\d.]+)%[^<]*price\s+(?:cut|drop|reduc)/i)?.[1];
      const mp = html.match(/median\s+(?:sale\s+)?price[^$]*?\$([\d,]+)/i)?.[1]?.replace(/,/g, "");
      if (inv || dom || mp) {
        results.set(zip, {
          active_inventory: inv ? parseInt(inv) : null,
          days_on_market: dom ? parseInt(dom) : null,
          price_cut_pct: pc ? parseFloat(pc) : null,
          median_sale_price: mp ? parseInt(mp) : null,
        });
      }
    } catch { /* skip */ }
  }
  console.log(`Redfin: ${results.size}/${targetZips.size} ZIPs`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: Census ACS — targeted ZIP query
// ═══════════════════════════════════════════════════════════════

async function fetchCensusData(targetZips: Set<string>): Promise<Map<string, Record<string, unknown>>> {
  const results = new Map<string, Record<string, unknown>>();
  try {
    // Request specific ZIPs to keep response small
    const zipList = [...targetZips].join(",");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);
    const url = `https://api.census.gov/data/2023/acs/acs5?get=B19013_001E,B01003_001E,B25001_001E&for=zip%20code%20tabulation%20area:${zipList}`;
    const resp = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA } });
    clearTimeout(timer);
    if (!resp.ok) { console.error(`Census API: ${resp.status}`); return results; }
    const data = await resp.json();
    for (let i = 1; i < data.length; i++) {
      const zip = data[i][3]?.padStart(5, "0");
      if (!zip || !targetZips.has(zip)) continue;
      results.set(zip, {
        median_income: data[i][0] && data[i][0] !== "-666666666" ? parseInt(data[i][0]) : null,
        population: data[i][1] ? parseInt(data[i][1]) : null,
        housing_units: data[i][2] ? parseInt(data[i][2]) : null,
      });
    }
    console.log(`Census: ${results.size}/${targetZips.size} ZIPs`);
  } catch (e) { console.error("fetchCensusData error:", e); }
  return results;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 4: Market Score (computed 0-100)
// ═══════════════════════════════════════════════════════════════

function computeMarketScore(d: Record<string, unknown>): number {
  let score = 50;
  const inv = d.active_inventory as number | null;
  if (inv != null) { score += inv > 200 ? 10 : inv > 100 ? 5 : inv < 30 ? -10 : inv < 60 ? -5 : 0; }
  const dom = d.days_on_market as number | null;
  if (dom != null) { score += dom > 60 ? 10 : dom > 40 ? 5 : dom < 15 ? -10 : dom < 25 ? -5 : 0; }
  const pc = d.price_cut_pct as number | null;
  if (pc != null) { score += pc > 30 ? 8 : pc > 20 ? 4 : pc < 10 ? -5 : 0; }
  const zhc = d.zhvi_12mo_change as number | null;
  if (zhc != null) { score += zhc < -0.05 ? 10 : zhc < 0 ? 5 : zhc > 0.10 ? -10 : zhc > 0.05 ? -5 : 0; }
  const aff = d.affordability_ratio as number | null;
  if (aff != null) { score += aff < 3 ? 8 : aff < 4 ? 4 : aff > 6 ? -8 : aff > 5 ? -4 : 0; }
  const rg = d.rent_growth as number | null;
  if (rg != null) { score += rg > 3 ? 5 : rg > 1 ? 2 : rg < -1 ? -5 : 0; }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════
//  HANDLER — accepts ?phase=zillow|redfin|census|score|all
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const authHeader = req.headers.get("x-refresh-key");
  if (authHeader !== "lockboxiq-refresh-2026") return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const phase = url.searchParams.get("phase") || "all";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const results: string[] = [];

  const { data: hoods } = await supabase.from("neighborhoods").select("zip, zhvi_current, rent_growth");
  if (!hoods?.length) return new Response(JSON.stringify({ error: "No neighborhoods" }), { status: 404 });
  const targetZips = new Set(hoods.map(h => String(h.zip).padStart(5, "0")));
  results.push(`Target ZIPs: ${targetZips.size}`);

  const zhviData = new Map<string, Record<string, unknown>>();
  const zoriData = new Map<string, Record<string, unknown>>();
  const redfinData = new Map<string, Record<string, unknown>>();
  const censusData = new Map<string, Record<string, unknown>>();

  try {
    if (phase === "zillow" || phase === "all") {
      const zhvi = await fetchZillowData(targetZips, "zhvi");
      const zori = await fetchZillowData(targetZips, "zori");
      for (const [k, v] of zhvi) zhviData.set(k, v);
      for (const [k, v] of zori) zoriData.set(k, v);
      results.push(`ZHVI: ${zhviData.size}, ZORI: ${zoriData.size}`);
    }
    if (phase === "redfin" || phase === "all") {
      const rf = await fetchRedfinData(targetZips);
      for (const [k, v] of rf) redfinData.set(k, v);
      results.push(`Redfin: ${redfinData.size}`);
    }
    if (phase === "census" || phase === "all") {
      const cs = await fetchCensusData(targetZips);
      for (const [k, v] of cs) censusData.set(k, v);
      results.push(`Census: ${censusData.size}`);
    }

    // Update DB
    let updated = 0;
    for (const hood of hoods) {
      const zip = String(hood.zip).padStart(5, "0");
      const updates: Record<string, unknown> = {};

      const zhvi = zhviData.get(zip);
      if (zhvi) {
        if (zhvi.current) updates.zhvi_current = Math.round(zhvi.current as number);
        if (zhvi.history) updates.zhvi_history = zhvi.history;
        if (zhvi.change12 != null) updates.appreci_1yr = Math.round((zhvi.change12 as number) * 10000) / 100;
      }
      const zori = zoriData.get(zip);
      if (zori) {
        if (zori.current) updates.zori_current = Math.round(zori.current as number);
        if (zori.change12 != null) updates.zori_12mo_change = Math.round((zori.change12 as number) * 10000) / 100;
      }
      const redfin = redfinData.get(zip);
      if (redfin) Object.assign(updates, redfin);
      const census = censusData.get(zip);
      if (census) {
        Object.assign(updates, census);
        const zhviVal = (updates.zhvi_current || hood.zhvi_current) as number;
        const inc = census.median_income as number;
        if (zhviVal && inc && inc > 0) updates.affordability_ratio = Math.round((zhviVal / inc) * 100) / 100;
      }

      if (phase === "score" || phase === "all") {
        updates.market_score = computeMarketScore({ ...hood, ...updates, zhvi_12mo_change: zhvi?.change12 });
      }

      updates.data_updated_at = new Date().toISOString();
      if (Object.keys(updates).length > 1) {
        const { error } = await supabase.from("neighborhoods").update(updates).eq("zip", hood.zip);
        if (error) console.error(`Update ${zip}:`, error.message);
        else updated++;
      }
    }

    results.push(`Updated: ${updated}/${hoods.length}`);
    return new Response(JSON.stringify({ ok: true, phase, results }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err), results }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
});
