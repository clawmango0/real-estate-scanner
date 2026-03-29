import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const UA = "Mozilla/5.0 (compatible; LockBoxIQ/1.0)";

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: Zillow ZHVI + ZORI — stream CSV, extract target ZIPs
// ═══════════════════════════════════════════════════════════════

// Zillow ZHVI/ZORI: accept pre-processed data via POST body
// The Zillow CSV is too large for edge functions (~100MB).
// Instead, data is extracted locally and POSTed to this endpoint.
// POST body: { zillow: { "76039": { zhvi: 285000, zori: 1850 }, ... } }
// When no body data, skip Zillow phase silently.

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
      // Accept pre-processed Zillow data via POST body
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* no body */ }
      const zillowBody = body.zillow as Record<string, Record<string, number>> | undefined;
      if (zillowBody) {
        for (const [zip, vals] of Object.entries(zillowBody)) {
          const z = zip.padStart(5, "0");
          if (!targetZips.has(z)) continue;
          if (vals.zhvi) zhviData.set(z, { current: vals.zhvi, prev12: null, history: [], change12: null });
          if (vals.zori) zoriData.set(z, { current: vals.zori, prev12: null, history: [], change12: null });
        }
        results.push(`ZHVI: ${zhviData.size}, ZORI: ${zoriData.size} (from POST body)`);
      } else {
        results.push("Zillow: no data in POST body. Use scripts/refresh-zillow.sh to extract and upload.");
      }
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
