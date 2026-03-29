import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const UA = "Mozilla/5.0 (compatible; LockBoxIQ/1.0)";

// ── Address Geocoding — US Census Bureau (free, no key) ──
async function geocodeAddress(address: string, city?: string, state?: string): Promise<{city?:string;state?:string;zip?:string;lat?:number;lng?:number}|null> {
  const parts = [address]; if (city) parts.push(city); parts.push(state || 'TX');
  const query = parts.join(', ').replace(/,\s*,/g, ',').trim();
  if (query.length < 5) return null;
  try {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 8000);
    const r = await fetch(`https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`, { signal: ac.signal, headers: { "User-Agent": UA } });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match) return null;
    const addr = match.addressComponents || {}; const geo = match.coordinates || {};
    return { city: addr.city, state: addr.state, zip: addr.zip, lat: geo.y ? Number(geo.y) : undefined, lng: geo.x ? Number(geo.x) : undefined };
  } catch { return null; }
}

// Backfill null zip/city on properties (non-blocking, runs after GET response)
async function backfillMissingGeo(supabase: ReturnType<typeof createClient>) {
  try {
    const { data: rows } = await supabase.from("properties").select("id, address, city, state, zip").or("zip.is.null,city.is.null,city.eq.").limit(5);
    if (!rows?.length) return;
    console.log(`Backfill: ${rows.length} properties with missing zip/city`);
    for (const row of rows) {
      const geo = await geocodeAddress(String(row.address || ''), String(row.city || ''), String(row.state || 'TX'));
      if (!geo) continue;
      const updates: Record<string, unknown> = {};
      if ((!row.zip || row.zip === '') && geo.zip) updates.zip = geo.zip;
      if ((!row.city || row.city === '') && geo.city) updates.city = geo.city;
      if (geo.lat) updates.latitude = geo.lat;
      if (geo.lng) updates.longitude = geo.lng;
      if (Object.keys(updates).length) {
        await supabase.from("properties").update(updates).eq("id", row.id);
        console.log(`Backfill: ${row.address} → ${geo.city}, ${geo.state} ${geo.zip}`);
      }
    }
  } catch (e) { console.error("Backfill error:", e); }
}
const cors = {
  "Access-Control-Allow-Origin": "https://lockboxiq.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const propertyId = parts[parts.length - 1];
  const isCollection = !propertyId || propertyId === "properties";

  try {
    if (req.method === "GET" && isCollection) {
      const { data, error } = await supabase
        .from("properties")
        .select("*, neighborhoods(area_name, schools, crime_safety, walk_score, rent_growth, appreci_1yr, appreci_3yr, appreci_5yr, zhvi_current)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fire-and-forget: backfill any properties with null zip/city
      backfillMissingGeo(supabase).catch(e => console.error("Backfill launch error:", e));
      return new Response(JSON.stringify((data || []).map(shapeProperty)), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (req.method === "POST" && isCollection) {
      const body = await req.json();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      const allowed = ["address", "city", "state", "zip", "listed_price", "beds", "baths", "sqft", "lot_size",
                        "property_type", "listing_url", "source", "rent_estimate", "monthly_rent"];
      const insert: Record<string, unknown> = { user_id: user.id };
      for (const k of allowed) if (k in body) insert[k] = body[k];
      if (!insert.address) return new Response(JSON.stringify({ error: "address is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      const { data, error } = await supabase.from("properties").insert(insert).select("*, neighborhoods(area_name, schools, crime_safety, walk_score, rent_growth, appreci_1yr, appreci_3yr, appreci_5yr, zhvi_current)").single();
      if (error) return new Response(JSON.stringify({ error: error.message, code: error.code }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      return new Response(JSON.stringify(shapeProperty(data)), { status: 201, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (req.method === "PATCH" && !isCollection) {
      const body = await req.json();
      const allowed = ["monthly_rent", "condition", "improvement", "status", "curated", "notes", "price_drop", "price_drop_amt",
                       "rent_estimate", "beds", "baths", "sqft", "lot_size", "listed_price", "address", "latitude", "longitude",
                       "property_type", "is_new", "city", "state", "zip", "listing_url", "pipeline_stage"];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) if (k in body) updates[k] = body[k];
      let { data, error } = await supabase.from("properties").update(updates).eq("id", propertyId).select().single();
      // If pipeline_stage column doesn't exist yet, retry without it
      if (error && updates.pipeline_stage !== undefined && String(error.message).includes("pipeline_stage")) {
        delete updates.pipeline_stage;
        ({ data, error } = await supabase.from("properties").update(updates).eq("id", propertyId).select().single());
      }
      if (error) throw error;
      return new Response(JSON.stringify(shapeProperty(data)), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (req.method === "DELETE" && !isCollection) {
      const { error } = await supabase.from("properties").delete().eq("id", propertyId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response("Not found", { status: 404, headers: cors });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

function shapeProperty(row: Record<string, unknown>) {
  const hood = row.neighborhoods as Record<string, unknown> | null;
  const t = (s: string) => {
    const u = s?.toUpperCase() || "";
    if (u.includes("DUPLEX"))  return "DUPLEX";
    if (u.includes("TRIPLEX")) return "TRIPLEX";
    if (u.includes("QUAD"))    return "QUAD";
    if (u.includes("LOT"))     return "LOT";
    if (u.includes("CONDO"))   return "CONDO";
    return "SFR";
  };
  const _city = String(row.city || '').trim();
  const _state = String(row.state || 'TX').trim();
  const _zip = row.zip ? String(row.zip).trim() : '';
  const cityDisplay = _city
    ? `${_city}, ${_state}${_zip ? ' ' + _zip : ''}`
    : (hood ? String(hood.area_name || `${_state}${_zip ? ' ' + _zip : ''}`) : `${_state}${_zip ? ' ' + _zip : ''}`);

  // Strip embedded city/state/zip from address to produce a clean street address.
  // DB address field often contains full "123 Main St, City, TX 76XXX".
  let streetAddr = String(row.address || '').trim();
  const stateStr = _state;
  const zipStr   = _zip;
  const cityStr  = _city;
  if (zipStr) {
    streetAddr = streetAddr.replace(new RegExp(',?\\s+' + stateStr + '\\s+' + zipStr + '$'), '').trim();
  }
  if (cityStr) {
    const esc = cityStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    streetAddr = streetAddr.replace(new RegExp(',?\\s+' + esc + '$', 'i'), '').trim();
  }
  streetAddr = streetAddr.replace(/,\s*$/, '').replace(/,\s*,/g, ',').trim();

  const rentEst = row.rent_estimate as number | null;
  const rentRange = rentEst
    ? { low: Math.round(rentEst * 0.88 / 25) * 25, high: Math.round(rentEst * 1.12 / 25) * 25, source: "estimate" }
    : null;
  return {
    id: row.id, address: streetAddr,
    city: cityDisplay,
    rawCity: (row.city as string || "").trim(),
    listed: row.listed_price,
    type: t(row.property_type as string),
    beds: row.beds, baths: row.baths, sqft: row.sqft, lotSize: row.lot_size,
    monthlyRent: row.monthly_rent,
    rentRange,
    condition: row.condition || "good",
    improvement: row.improvement || "asis",
    status: row.status || "new",
    source: row.source || "zillow",
    listingUrl: row.listing_url,
    isNew: row.is_new,
    priceDrop: row.price_drop,
    dropAmt: row.price_drop_amt || 0,
    curated: row.curated,
    stage: row.pipeline_stage || (row.curated === 'fav' ? 'shortlist' : row.curated === 'ni' ? 'archived' : row.curated === 'blk' ? 'archived' : 'inbox'),
    notes: row.notes,
    lat: row.latitude, lng: row.longitude,
    createdAt: row.created_at,
    hood: hood ? {
      area: hood.area_name, schools: hood.schools,
      crime: hood.crime_safety, walkScore: hood.walk_score,
      rentGrowth: hood.rent_growth,
      appreci1: hood.appreci_1yr, appreci3: hood.appreci_3yr,
      appreci5: hood.appreci_5yr, zhvi: hood.zhvi_current,
      zip: row.zip
    } : null,
  };
}
