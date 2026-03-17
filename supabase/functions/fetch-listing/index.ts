import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SCRAPER_KEY   = Deno.env.get("SCRAPER_API_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

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

// ── Fetch HTML ───────────────────────────────────────────
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  let html = "";

  // Try direct fetch first
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow",
    });
    if (r.ok) html = await r.text();
    console.log(`Direct fetch: status=${r.status}, len=${html.length}`);
  } catch (e) { console.error("direct fetch error:", e); }

  // Fall back to ScraperAPI if we didn't get useful property data
  // Direct fetch often returns a captcha page or JS-only shell for Zillow/Realtor
  const hasUsefulData = html.length > 5000 && (
    html.includes("gdpClientCache") ||         // Zillow __NEXT_DATA__
    html.includes("initialReduxState") ||      // Realtor __NEXT_DATA__
    html.includes("ldp-page-content") ||       // Realtor rendered content
    html.includes('"list_price"') ||           // Realtor JSON data
    html.includes("RealEstateListing") ||      // Redfin JSON-LD
    (html.includes('"price"') && html.includes('"bedrooms"')) // Generic property data
  );
  if (!hasUsefulData && SCRAPER_KEY) {
    // Try ScraperAPI without render first (faster, works when __NEXT_DATA__ is in static HTML)
    console.log("Using ScraperAPI (no render) for:", url.slice(0, 100));
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 25000);
      const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&country_code=us`;
      const r = await fetch(scraperUrl, { signal: ac.signal });
      clearTimeout(timer);
      if (r.ok) {
        html = await r.text();
        console.log(`ScraperAPI (no render): status=${r.status}, len=${html.length}, has__NEXT_DATA__=${html.includes("__NEXT_DATA__")}`);
      } else {
        console.error(`ScraperAPI (no render) error: status=${r.status}`);
      }
    } catch (e) { console.error("scraperapi (no render) error:", e); }

    // If still no useful data, try with render=true (slower but handles JS-only pages)
    const hasDataAfterStatic = html.length > 5000 && (
      html.includes("gdpClientCache") || html.includes("initialReduxState") ||
      html.includes('"list_price"') || html.includes("RealEstateListing") ||
      (html.includes('"price"') && html.includes('"bedrooms"'))
    );
    if (!hasDataAfterStatic) {
      console.log("Using ScraperAPI (render) for:", url.slice(0, 100));
      try {
        const ac2 = new AbortController();
        const timer2 = setTimeout(() => ac2.abort(), 45000); // 45s for rendered pages
        const scraperUrl2 = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=us`;
        const r2 = await fetch(scraperUrl2, { signal: ac2.signal });
        clearTimeout(timer2);
        if (r2.ok) {
          html = await r2.text();
          console.log(`ScraperAPI (render): status=${r2.status}, len=${html.length}, has__NEXT_DATA__=${html.includes("__NEXT_DATA__")}`);
        } else {
          console.error(`ScraperAPI (render) error: status=${r2.status}`);
        }
      } catch (e) { console.error("scraperapi (render) error:", e); }
    }
  }

  return html;
}

// ── Site-specific parsers ────────────────────────────────

function parseZillowNextData(html: string, listingUrl: string): ListingDetails | null {
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
    console.error("parseZillowNextData error:", e);
    return null;
  }
}

function parseRealtorNextData(html: string, listingUrl: string): ListingDetails | null {
  // Realtor.com also uses __NEXT_DATA__ with a different structure
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!ndMatch) return null;

  try {
    const nd = JSON.parse(ndMatch[1]);
    const pp = nd?.props?.pageProps;
    if (!pp) return null;

    // Realtor stores data at initialReduxState.propertyDetails (the object IS the property)
    // with list_price as a top-level key, description.beds/baths/sqft, location.address.*
    const pd = pp.initialReduxState?.propertyDetails || pp.property || pp.listing;
    if (!pd) {
      console.log("Realtor __NEXT_DATA__: no property found, keys:", Object.keys(pp).join(","));
      if (pp.initialReduxState) console.log("  initialReduxState keys:", Object.keys(pp.initialReduxState).join(","));
      return null;
    }

    const loc = pd.location?.address || pd.address || {};
    const street = loc.line || loc.street_address || loc.streetAddress;
    const city = loc.city;
    const state = loc.state_code || loc.state;
    const zip = loc.postal_code || loc.zipcode || loc.zip;

    let address: string | undefined;
    if (street) {
      address = [street, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean).join(", ");
    }

    const desc = pd.description || {};
    const homeType = desc.type || pd.prop_type || pd.property_type;
    const typeMap: Record<string, string> = {
      single_family: "SFR", townhomes: "SFR", condos: "CONDO", condo: "CONDO",
      multi_family: "DUPLEX", duplex_triplex: "DUPLEX", land: "LOT", mobile: "SFR",
    };
    const ptype = homeType ? (typeMap[String(homeType).toLowerCase()] || "SFR") : undefined;

    // list_price is a TOP-LEVEL key on propertyDetails, NOT inside description
    const listPrice = pd.list_price || desc.list_price || pd.price;

    return {
      price: listPrice ? Number(listPrice) : undefined,
      beds: (desc.beds ?? pd.beds) ? Number(desc.beds ?? pd.beds) : undefined,
      baths: (desc.baths_consolidated ?? desc.baths ?? pd.baths) ? Number(desc.baths_consolidated ?? desc.baths ?? pd.baths) : undefined,
      sqft: (desc.sqft ?? pd.sqft) ? Number(desc.sqft ?? pd.sqft) : undefined,
      lot_size: desc.lot_sqft ? Number(desc.lot_sqft) : undefined,
      listing_url: listingUrl,
      address, city, state, zip,
      property_type: ptype,
    };
  } catch (e) {
    console.error("parseRealtorNextData error:", e);
    return null;
  }
}

function parseJsonLd(html: string, listingUrl: string): ListingDetails | null {
  try {
    const ldBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of ldBlocks) {
      const content = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
      try {
        const ld = JSON.parse(content);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          const isListing = types.some((t: string) =>
            ["SingleFamilyResidence","Residence","Product","RealEstateListing"].includes(t));
          if (!isListing) continue;

          // Redfin nests property in mainEntity; others put it at top level
          const entity = item.mainEntity || item;
          const addr = entity.address || item.address || {};
          const price = item.offers?.price || entity.offers?.price;

          const catMap: Record<string, string> = {
            "single family residential": "SFR", "townhouse": "SFR",
            "condo/co-op": "CONDO", "multi-family": "DUPLEX", "vacant land": "LOT",
          };
          const cat = entity.accommodationCategory || "";
          const ptype = cat ? (catMap[cat.toLowerCase()] || "SFR") : undefined;

          return {
            price: price ? Number(price) : undefined,
            beds: entity.numberOfBedrooms ? Number(entity.numberOfBedrooms) : (entity.numberOfRooms ? Number(entity.numberOfRooms) : undefined),
            baths: entity.numberOfBathroomsTotal ? Number(entity.numberOfBathroomsTotal) : undefined,
            sqft: entity.floorSize?.value ? Number(entity.floorSize.value) : undefined,
            address: addr.streetAddress ? [addr.streetAddress, addr.addressLocality, `${addr.addressRegion} ${addr.postalCode}`].filter(Boolean).join(", ") : undefined,
            city: addr.addressLocality,
            state: addr.addressRegion,
            zip: addr.postalCode,
            listing_url: listingUrl,
            property_type: ptype,
          };
        }
      } catch {}
    }
    return null;
  } catch { return null; }
}

function regexFallback(html: string, listingUrl: string): ListingDetails | null {
  try {
    // Realtor.com specific patterns
    const realtorPrice = html.match(/list_price["\s:]+(\d+)/i) || html.match(/\$\s*([\d,]+)\s*<\/span>/);
    const realtorBeds = html.match(/(\d+)\s*(?:bd|bed|Bed)/);
    const realtorBaths = html.match(/([\d.]+)\s*(?:ba|bath|Bath)/);
    const realtorSqft = html.match(/([\d,]+)\s*(?:sqft|sq\s*ft)/i);

    // Zillow specific patterns
    const zillowPrice = html.match(/data-testid="price"[^>]*>\$?([\d,]+)/);
    const zillowRent = html.match(/Rent Zestimate[^$]*\$([\d,]+)/i);

    const priceMatch = zillowPrice || realtorPrice;
    const bedsMatch = realtorBeds;
    const bathsMatch = realtorBaths;
    const sqftMatch = realtorSqft;
    const rentMatch = zillowRent;

    if (priceMatch || bedsMatch || bathsMatch || sqftMatch) {
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

// ── Claude AI fallback ───────────────────────────────────
async function claudeFallback(html: string, listingUrl: string): Promise<ListingDetails | null> {
  if (!ANTHROPIC_KEY) return null;

  try {
    // Trim HTML to first 30k chars to stay within limits
    const trimmed = html.slice(0, 30000);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Extract property listing details from this HTML page. Return ONLY a JSON object with these fields (omit any you can't find): price (number), beds (number), baths (number), sqft (number), lot_size (number, in sqft), address (string, full street address), city (string), state (string, 2-letter), zip (string, 5-digit), property_type (one of: SFR, DUPLEX, TRIPLEX, QUAD, CONDO, LOT). No markdown, just JSON.\n\nURL: ${listingUrl}\n\nHTML:\n${trimmed}`
        }],
      }),
    });

    if (!resp.ok) {
      console.error("Claude API error:", resp.status);
      return null;
    }

    const result = await resp.json();
    const text = result.content?.[0]?.text || "";
    // Extract JSON from response (might have surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Claude parsed:", JSON.stringify(parsed));

    return {
      price: parsed.price ? Number(parsed.price) : undefined,
      beds: parsed.beds ? Number(parsed.beds) : undefined,
      baths: parsed.baths ? Number(parsed.baths) : undefined,
      sqft: parsed.sqft ? Number(parsed.sqft) : undefined,
      lot_size: parsed.lot_size ? Number(parsed.lot_size) : undefined,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip,
      property_type: parsed.property_type,
      listing_url: listingUrl,
    };
  } catch (e) {
    console.error("claudeFallback error:", e);
    return null;
  }
}

// ── Main scrape orchestrator ─────────────────────────────
async function scrapeListing(url: string): Promise<ListingDetails | null> {
  const html = await fetchHtml(url);
  if (!html) { console.log("No HTML obtained"); return null; }

  const isZillow = url.includes("zillow.com");
  const isRealtor = url.includes("realtor.com");

  console.log(`Scraping: isZillow=${isZillow}, isRealtor=${isRealtor}, htmlLen=${html.length}, has__NEXT_DATA__=${html.includes("__NEXT_DATA__")}, hasJsonLd=${html.includes("application/ld+json")}`);

  // Try site-specific parsers first
  if (isZillow) {
    const d = parseZillowNextData(html, url);
    if (d) { console.log("Zillow __NEXT_DATA__ success"); return d; }
  }

  if (isRealtor) {
    const d = parseRealtorNextData(html, url);
    if (d) { console.log("Realtor __NEXT_DATA__ success"); return d; }
  }

  // Try JSON-LD (works for many sites)
  const ld = parseJsonLd(html, url);
  if (ld) { console.log("JSON-LD success"); return ld; }

  // Try regex patterns
  const rx = regexFallback(html, url);
  if (rx) { console.log("Regex fallback success"); return rx; }

  // Last resort: Claude AI extraction
  console.log("All parsers failed, trying Claude AI fallback");
  const ai = await claudeFallback(html, url);
  if (ai) { console.log("Claude AI fallback success"); return ai; }

  return null;
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

    // Resolve short links (redf.in → redfin.com)
    let cleanUrl = url.replace(/\?.*$/, "").replace(/\/$/, "");
    if (cleanUrl.includes("redf.in")) {
      try {
        const r = await fetch(cleanUrl, { redirect: "manual", headers: { "User-Agent": UA } });
        const loc = r.headers.get("location");
        if (loc && loc.includes("redfin.com")) {
          cleanUrl = loc.replace(/\?.*$/, "").replace(/\/$/, "");
          console.log(`Resolved redf.in → ${cleanUrl}`);
        }
      } catch (e) { console.error("redf.in resolve error:", e); }
    }

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
