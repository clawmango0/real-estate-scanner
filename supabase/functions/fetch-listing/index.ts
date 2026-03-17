import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SCRAPER_KEY   = Deno.env.get("SCRAPER_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Types ────────────────────────────────────────────────
interface ListingDetails {
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  rent_estimate?: number;
  listing_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
}

// ── Scraping ─────────────────────────────────────────────
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function scrapeListing(url: string): Promise<ListingDetails | null> {
  let html = "";

  // Try direct fetch first
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow",
    });
    if (r.ok) html = await r.text();
    console.log(`Direct fetch: status=${r.status}, len=${html.length}`);
  } catch (e) { console.error("direct fetch error:", e); }

  // Fall back to ScraperAPI
  if ((!html || !html.includes("gdpClientCache")) && SCRAPER_KEY) {
    console.log("Using ScraperAPI for:", url.slice(0, 100));
    try {
      const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=us`;
      const r = await fetch(scraperUrl);
      if (r.ok) {
        html = await r.text();
        console.log(`ScraperAPI: status=${r.status}, len=${html.length}`);
      } else {
        console.error(`ScraperAPI error: status=${r.status}`);
      }
    } catch (e) { console.error("scraperapi error:", e); }
  }

  if (!html) return null;

  // Try Zillow __NEXT_DATA__
  const details = parseNextData(html, url);
  if (details) return details;

  // Try JSON-LD / regex fallback
  return regexFallback(html, url);
}

function parseNextData(html: string, listingUrl: string): ListingDetails | null {
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!ndMatch) return null;

  try {
    const nd = JSON.parse(ndMatch[1]);
    const pp = nd?.props?.pageProps ?? {};
    const gdp = pp.gdpClientCache ?? pp.componentProps?.gdpClientCache;
    if (!gdp) return null;

    const cache = typeof gdp === "string" ? JSON.parse(gdp) : gdp;
    let prop: Record<string, unknown> | null = null;
    for (const key of Object.keys(cache)) {
      const entry = cache[key] as Record<string, unknown>;
      if (entry?.property) { prop = entry.property as Record<string, unknown>; break; }
    }
    if (!prop) return null;

    let lot_size: number | undefined;
    if (prop.lotAreaValue) {
      const v = Number(prop.lotAreaValue);
      const u = String(prop.lotAreaUnits || "").toLowerCase();
      lot_size = u.includes("acre") ? Math.round(v * 43560) : Math.round(v);
    }

    const addr = prop.address as Record<string, unknown> | undefined;
    const street = addr?.streetAddress ? String(addr.streetAddress) : undefined;
    const city   = addr?.city ? String(addr.city) : undefined;
    const state  = addr?.state ? String(addr.state) : undefined;
    const zip    = addr?.zipcode ? String(addr.zipcode) : undefined;
    let address: string | undefined;
    if (street) {
      address = [street, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean).join(", ");
    }

    const homeType = prop.homeType ? String(prop.homeType) : undefined;
    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: "SFR", TOWNHOUSE: "SFR", CONDO: "CONDO",
      MULTI_FAMILY: "DUPLEX", MANUFACTURED: "SFR", LOT: "LOT", APARTMENT: "CONDO",
    };

    return {
      price: prop.price ? Number(prop.price) : undefined,
      beds: prop.bedrooms ? Number(prop.bedrooms) : undefined,
      baths: prop.bathrooms ? Number(prop.bathrooms) : undefined,
      sqft: prop.livingArea ? Number(prop.livingArea) : undefined,
      lot_size,
      rent_estimate: prop.rentZestimate ? Number(prop.rentZestimate) : undefined,
      listing_url: listingUrl,
      address, city, state, zip,
      property_type: homeType ? (typeMap[homeType] || "SFR") : undefined,
    };
  } catch (e) {
    console.error("parseNextData error:", e);
    return null;
  }
}

function regexFallback(html: string, listingUrl: string): ListingDetails | null {
  try {
    // JSON-LD
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld["@type"] === "SingleFamilyResidence" || ld["@type"] === "Product") {
          return {
            price: ld.offers?.price ? Number(ld.offers.price) : undefined,
            beds: ld.numberOfRooms ? Number(ld.numberOfRooms) : undefined,
            sqft: ld.floorSize?.value ? Number(ld.floorSize.value) : undefined,
            listing_url: listingUrl,
          };
        }
      } catch {}
    }

    // HTML regex patterns
    const priceMatch = html.match(/data-testid="price"[^>]*>\$?([\d,]+)/);
    const bedsMatch  = html.match(/(\d+)\s*(?:bd|bed|Bed)/);
    const bathsMatch = html.match(/([\d.]+)\s*(?:ba|bath|Bath)/);
    const sqftMatch  = html.match(/([\d,]+)\s*(?:sqft|sq\s*ft)/i);
    const rentMatch  = html.match(/Rent Zestimate[^$]*\$([\d,]+)/i);

    if (priceMatch || bedsMatch || bathsMatch) {
      return {
        price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined,
        beds: bedsMatch ? Number(bedsMatch[1]) : undefined,
        baths: bathsMatch ? Number(bathsMatch[1]) : undefined,
        sqft: sqftMatch ? Number(sqftMatch[1].replace(/,/g, "")) : undefined,
        rent_estimate: rentMatch ? Number(rentMatch[1].replace(/,/g, "")) : undefined,
        listing_url: listingUrl,
      };
    }
    return null;
  } catch { return null; }
}

// ── Handler ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Clean tracking params from URL
    const cleanUrl = url.replace(/\?.*$/, "").replace(/\/$/, "");

    console.log(`fetch-listing: scraping ${cleanUrl}`);
    const details = await scrapeListing(cleanUrl);

    if (!details) {
      return new Response(JSON.stringify({ error: "Could not fetch listing details", url: cleanUrl }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(details), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("fetch-listing error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
