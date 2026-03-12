import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS"
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
        .select("*, neighborhoods(area_name, schools, crime_safety, walk_score, rent_growth)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify((data || []).map(shapeProperty)), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (req.method === "PATCH" && !isCollection) {
      const body = await req.json();
      const allowed = ["monthly_rent", "condition", "improvement", "status", "curated", "notes", "price_drop", "price_drop_amt",
                       "rent_estimate", "beds", "baths", "sqft", "lot_size", "listed_price", "address"];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) if (k in body) updates[k] = body[k];
      const { data, error } = await supabase.from("properties").update(updates).eq("id", propertyId).select().single();
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
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
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
  const cityDisplay = row.city
    ? `${row.city}, ${row.state} ${row.zip}`
    : (hood ? String(hood.area_name || `${row.state} ${row.zip}`) : `${row.state} ${row.zip}`);

  // Strip embedded city/state/zip from address to produce a clean street address.
  // DB address field often contains full "123 Main St, City, TX 76XXX".
  let streetAddr = String(row.address || '').trim();
  const stateStr = String(row.state || 'TX');
  const zipStr   = String(row.zip   || '');
  const cityStr  = String(row.city  || '');
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
    ? { low: Math.round(rentEst * 0.88 / 25) * 25, high: Math.round(rentEst * 1.12 / 25) * 25, source: "zillow" }
    : null;
  return {
    id: row.id, address: streetAddr,
    city: cityDisplay,
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
    notes: row.notes,
    createdAt: row.created_at,
    hood: hood ? {
      area: hood.area_name, schools: hood.schools,
      crime: hood.crime_safety, walkScore: hood.walk_score,
      rentGrowth: hood.rent_growth, zip: row.zip
    } : null,
  };
}
