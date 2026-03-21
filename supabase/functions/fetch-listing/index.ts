import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SCRAPER_KEY   = Deno.env.get("SCRAPER_API_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GITHUB_PAT    = Deno.env.get("GITHUB_PAT") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "https://lockboxiq.com",
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

  // Try direct fetch first (15s timeout)
  try {
    const ac=new AbortController();const t=setTimeout(()=>ac.abort(),15000);
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow", signal: ac.signal,
    });
    clearTimeout(t);
    if (r.ok) html = await r.text();
    console.log(`Direct fetch: status=${r.status}, len=${html.length}`);
  } catch (e) { console.error("direct fetch error:", e); }

  // Fall back to ScraperAPI if we didn't get useful property data
  // Direct fetch often returns a captcha page or JS-only shell for Zillow/Realtor
  const hasUsefulData = html.length > 1000 && (
    html.includes("gdpClientCache") ||         // Zillow __NEXT_DATA__
    html.includes("initialReduxState") ||      // Realtor __NEXT_DATA__
    html.includes("ldp-page-content") ||       // Realtor rendered content
    html.includes('"list_price"') ||           // Realtor JSON data
    html.includes("RealEstateListing") ||      // Redfin JSON-LD
    (html.includes('"price"') && html.includes('"bedrooms"')) || // Generic property data
    (/listed\s+(?:at|for)\s+\$[\d,]+/i.test(html)) ||  // Meta description with price
    (/<meta\s+name="description"[^>]*(?:bed|bath|sqft)/i.test(html)) // Meta with property details
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

// ── Meta tag parser (works even on JS-only shells) ───────
function parseMetaTags(html: string, listingUrl: string): ListingDetails | null {
  try {
    // Extract meta description: "3 bed, 2 bath, 1843 sqft. single family home ... listed at $299,987"
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
                   || html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
    const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
                     || html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

    // Combine all text sources
    const texts = [descMatch?.[1], ogDescMatch?.[1], titleMatch?.[1]].filter(Boolean).join(" | ");
    if (!texts) return null;

    console.log(`Meta tag text: ${texts.slice(0, 200)}`);

    // Extract price: "listed at $299,987" or "$299,987" or "price: $299,987"
    const priceM = texts.match(/(?:listed\s+(?:at|for)|price[:\s]+|asking)\s*\$?([\d,]+)/i)
                || texts.match(/\$([\d,]{4,})/);
    // Extract beds: "3 bed" or "3 br" or "3-bed"
    const bedsM = texts.match(/(\d+)\s*[-\s]?(?:bed|br|bedroom)/i);
    // Extract baths: "2 bath" or "2 ba" or "2.5-bath"
    const bathsM = texts.match(/([\d.]+)\s*[-\s]?(?:bath|ba\b)/i);
    // Extract sqft: "1,843 sqft" or "1843 sq ft" or "1,843-sqft"
    const sqftM = texts.match(/([\d,]+)\s*[-\s]?(?:sqft|sq\.?\s*ft)/i);

    // Extract address from og:street-address or title
    const streetM = html.match(/<meta\s+property="og:street-address"\s+content="([^"]+)"/i);
    const cityM = html.match(/<meta\s+property="og:locality"\s+content="([^"]+)"/i);
    const stateM = html.match(/<meta\s+property="og:region"\s+content="([^"]+)"/i);
    const zipM = html.match(/<meta\s+property="og:postal-code"\s+content="([^"]+)"/i);

    // Also try parsing address from title: "532 Plainview Dr, Hurst, TX 76054"
    let titleAddr: { street?: string; city?: string; state?: string; zip?: string } = {};
    if (titleMatch) {
      const tm = titleMatch[1].match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})/);
      if (tm) titleAddr = { street: tm[1].trim(), city: tm[2].trim(), state: tm[3], zip: tm[4] };
    }

    // Property type from description
    let propType: string | undefined;
    if (/single\s*family/i.test(texts)) propType = "SFR";
    else if (/condo/i.test(texts)) propType = "CONDO";
    else if (/duplex/i.test(texts)) propType = "DUPLEX";
    else if (/triplex/i.test(texts)) propType = "TRIPLEX";
    else if (/multi/i.test(texts)) propType = "DUPLEX";
    else if (/lot|land/i.test(texts)) propType = "LOT";

    if (priceM || bedsM || bathsM || sqftM) {
      const d: ListingDetails = {
        price: priceM ? Number(priceM[1].replace(/,/g, "")) : undefined,
        beds: bedsM ? Number(bedsM[1]) : undefined,
        baths: bathsM ? Number(bathsM[1]) : undefined,
        sqft: sqftM ? Number(sqftM[1].replace(/,/g, "")) : undefined,
        address: streetM?.[1] || titleAddr.street,
        city: cityM?.[1] || titleAddr.city,
        state: stateM?.[1] || titleAddr.state,
        zip: zipM?.[1] || titleAddr.zip,
        property_type: propType,
        listing_url: listingUrl,
      };
      console.log("Meta tag parse success:", JSON.stringify(d));
      return d;
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
    const ac=new AbortController();const t=setTimeout(()=>ac.abort(),30000);
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
      signal: ac.signal,
    });
    clearTimeout(t);

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

// ── URL Variant Generator ────────────────────────────────
function generateUrlVariants(url: string): string[] {
  const variants: string[] = [url];
  const clean = url.replace(/\?.*$/, "").replace(/\/$/, "");
  if (clean !== url) variants.push(clean);

  if (url.includes("zillow.com")) {
    // Try mobile Zillow
    const mobile = url.replace("www.zillow.com", "m.zillow.com");
    if (mobile !== url) variants.push(mobile);
  } else if (url.includes("realtor.com")) {
    // Try with rdc client_id param
    variants.push(clean + "?client_id=rdc-x&variant=pdetails_redesign_2021");
  } else if (url.includes("redfin.com")) {
    // Try stingray API path
    const homeMatch = url.match(/\/home\/(\d+)/);
    if (homeMatch) variants.push(`https://www.redfin.com/stingray/api/home/details/belowTheFold?propertyId=${homeMatch[1]}`);
  }

  // Deduplicate, max 3
  return [...new Set(variants)].slice(0, 3);
}

// ── Parse address from URL slug ──────────────────────────
function addressFromUrl(url: string): { street: string; city: string; state: string; zip: string } | null {
  try {
    const path = new URL(url).pathname;
    // Zillow: /homedetails/6009-Maple-Springs-Dr-Fort-Worth-TX-76001/12345_zpid
    const zm = path.match(/\/homedetails\/([^/]+)\/\d+_zpid/);
    if (zm) {
      const parts = zm[1].split("-");
      const zip = parts.pop() || "";
      const state = parts.pop() || "";
      const streetTypes = /^(Dr|St|Ln|Rd|Blvd|Ave|Ct|Pl|Way|Trl|Cir|Loop|Pkwy|Cv|Run|Pass|Xing|Holw|Bnd|Pt|Ridge|Glen|Ter|Creek|Park|View|Hill|Lake|Meadow|Crk)$/i;
      let splitIdx = parts.length;
      for (let i = parts.length - 1; i >= 2; i--) { if (streetTypes.test(parts[i])) { splitIdx = i + 1; break; } }
      return { street: parts.slice(0, splitIdx).join(" "), city: parts.slice(splitIdx).join(" "), state, zip };
    }
    // Realtor: /realestateandhomes-detail/6009-Maple-Springs-Dr_Fort-Worth_TX_76001_M...
    const rm = path.match(/\/realestateandhomes-detail\/([^/]+)/);
    if (rm) {
      const slug = rm[1].replace(/_M\d[\w-]*$/, "");
      const p = slug.split("_");
      const zip = p.pop() || ""; const state = p.pop() || ""; const city = (p.pop() || "").replace(/-/g, " ");
      return { street: (p.join("_")).replace(/-/g, " "), city, state, zip };
    }
    // Redfin: /TX/Fort-Worth/6009-Maple-Springs-Dr-76001/home/12345
    const rfm = path.match(/\/([A-Z]{2})\/([^/]+)\/([^/]+?)(?:-(\d{5}))?\/(home|unit)\/\d+/);
    if (rfm) return { street: rfm[3].replace(/-/g, " "), city: rfm[2].replace(/-/g, " "), state: rfm[1], zip: rfm[4] || "" };
  } catch { /* ignore */ }
  return null;
}

// ── Merge partial results (fill empty fields only) ───────
function mergeDetails(base: ListingDetails, overlay: ListingDetails): ListingDetails {
  const out = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (v !== undefined && v !== null && v !== "" && v !== 0 && !(k in out && (out as Record<string,unknown>)[k])) {
      (out as Record<string,unknown>)[k] = v;
    }
  }
  return out;
}

function detailsQuality(d: ListingDetails | null): number {
  if (!d) return 0;
  let score = 0;
  if (d.price) score += 3;
  if (d.beds) score++;
  if (d.baths) score++;
  if (d.sqft) score += 2;
  if (d.address) score += 2;
  if (d.city) score++;
  if (d.zip) score++;
  return score;
}

// ── Google search → extract listing URLs → scrape ────────
async function searchByAddress(street: string, city: string, state: string, zip: string): Promise<ScrapeResult> {
  const query = `${street}, ${city}, ${state} ${zip}`.replace(/,\s*,/g, ",").trim();
  console.log(`searchByAddress: Google search for "${query}"`);

  // Step 1: Google search for the address
  let searchHtml = "";
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " property listing zillow OR realtor.com OR redfin")}&num=10`;
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
    const r = await fetch(searchUrl, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (r.ok) searchHtml = await r.text();
    console.log(`Google search: status=${r.status}, len=${searchHtml.length}`);
  } catch (e) { console.error("Google search fetch error:", e); }

  // Step 2: Extract real estate listing URLs from search results
  const listingUrls: string[] = [];
  if (searchHtml) {
    // Google results contain URLs in href="/url?q=..." or direct hrefs
    const urlPattern = /(?:href="\/url\?q=|href=")(https?:\/\/(?:www\.)?(?:zillow\.com|realtor\.com|redfin\.com)[^"&]+)/g;
    let m;
    while ((m = urlPattern.exec(searchHtml)) !== null) {
      let found = decodeURIComponent(m[1]).split("&")[0];
      // Only keep detail/property pages, not search/category pages
      if (found.includes("/homedetails/") || found.includes("/realestateandhomes-detail/") ||
          found.includes("/home/") || found.includes("/property/")) {
        if (!listingUrls.includes(found)) listingUrls.push(found);
      }
    }
    console.log(`Found ${listingUrls.length} listing URLs from Google:`, listingUrls.slice(0, 3));
  }

  // Step 3: Try scraping each found listing URL
  for (const tryUrl of listingUrls.slice(0, 3)) {
    try {
      console.log(`  Scraping Google result: ${tryUrl}`);
      const result = await scrapeListing(tryUrl);
      if (result.details && detailsQuality(result.details) >= 4) {
        console.log(`  searchByAddress success via ${tryUrl}`);
        // Ensure listing_url is set
        if (!result.details.listing_url) result.details.listing_url = tryUrl;
        return result;
      }
    } catch (e) { console.error(`  Scrape failed for ${tryUrl}:`, e); }
  }

  // Step 4: If no listing URLs found or all failed, try Claude on Google snippets
  if (searchHtml && ANTHROPIC_KEY) {
    console.log("Trying Claude extraction from Google search snippets");
    try {
      // Extract text snippets from search results (strip HTML tags, keep useful text)
      const snippets = searchHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 15000);

      const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 30000);
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 300,
          messages: [{ role: "user", content: `Extract property details for "${query}" from these Google search result snippets. Return ONLY a JSON object with fields (omit unknown): price (number), beds (number), baths (number), sqft (number), address (string), city (string), state (string, 2-letter), zip (string, 5-digit), property_type (SFR/DUPLEX/TRIPLEX/QUAD/CONDO/LOT). No markdown.\n\nSnippets:\n${snippets}` }],
        }),
        signal: ac.signal,
      });
      clearTimeout(t);
      if (resp.ok) {
        const result = await resp.json();
        const text = result.content?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log("Claude extracted from Google:", JSON.stringify(parsed));
          const details: ListingDetails = {
            price: parsed.price ? Number(parsed.price) : undefined,
            beds: parsed.beds ? Number(parsed.beds) : undefined,
            baths: parsed.baths ? Number(parsed.baths) : undefined,
            sqft: parsed.sqft ? Number(parsed.sqft) : undefined,
            address: parsed.address || street,
            city: parsed.city || city,
            state: parsed.state || state,
            zip: parsed.zip || zip,
            property_type: parsed.property_type,
          };
          if (detailsQuality(details) >= 3) {
            return { details, html: searchHtml, source: "google" };
          }
        }
      }
    } catch (e) { console.error("Claude Google extraction error:", e); }
  }

  // Step 5: Last resort — construct URLs from address pattern and try
  const slug = street.replace(/\s+/g, "-");
  const citySlug = (city || "").replace(/\s+/g, "-");
  const constructedUrls = [];
  if (citySlug && state) {
    constructedUrls.push(`https://www.zillow.com/homes/${slug}-${citySlug}-${state}-${zip}_rb/`);
    constructedUrls.push(`https://www.realtor.com/realestateandhomes-detail/${slug}_${citySlug}_${state}_${zip}`);
  }
  for (const tryUrl of constructedUrls) {
    try {
      console.log(`  Trying constructed URL: ${tryUrl}`);
      const result = await scrapeListing(tryUrl);
      if (result.details && detailsQuality(result.details) >= 4) {
        return result;
      }
    } catch (e) { console.error(`  Constructed URL failed: ${tryUrl}`, e); }
  }

  return { details: null, html: "", source: "search" };
}

// ── Main scrape orchestrator ─────────────────────────────
interface ScrapeResult {
  details: ListingDetails | null;
  html: string;
  source: string;  // "zillow" | "realtor" | "redfin" | "search"
}

async function scrapeListing(url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  const source = url.includes("zillow.com") ? "zillow" : url.includes("realtor.com") ? "realtor" : "redfin";
  if (!html) { console.log("No HTML obtained"); return { details: null, html: "", source }; }

  const isZillow = source === "zillow";
  const isRealtor = source === "realtor";

  console.log(`Scraping: source=${source}, htmlLen=${html.length}, has__NEXT_DATA__=${html.includes("__NEXT_DATA__")}, hasJsonLd=${html.includes("application/ld+json")}`);

  // Collect partial results and merge the best
  let merged: ListingDetails = {};

  // Try site-specific parsers first
  if (isZillow) {
    const d = parseZillowNextData(html, url);
    if (d) { console.log("Zillow __NEXT_DATA__ success"); merged = mergeDetails(merged, d); }
  }

  if (isRealtor) {
    const d = parseRealtorNextData(html, url);
    if (d) { console.log("Realtor __NEXT_DATA__ success"); merged = mergeDetails(merged, d); }
  }

  // If we have good data already, return early
  if (detailsQuality(merged) >= 6) return { details: merged, html, source };

  // Try JSON-LD (works for many sites)
  const ld = parseJsonLd(html, url);
  if (ld) { console.log("JSON-LD found"); merged = mergeDetails(merged, ld); }
  if (detailsQuality(merged) >= 6) return { details: merged, html, source };

  // Try meta tags (title, og:*, description — works even on JS-only shells)
  const mt = parseMetaTags(html, url);
  if (mt) { console.log("Meta tag parse found"); merged = mergeDetails(merged, mt); }
  if (detailsQuality(merged) >= 6) return { details: merged, html, source };

  // Try regex patterns
  const rx = regexFallback(html, url);
  if (rx) { console.log("Regex fallback found"); merged = mergeDetails(merged, rx); }
  if (detailsQuality(merged) >= 4) return { details: merged, html, source };

  // Last resort: Claude AI extraction
  console.log("Trying Claude AI fallback");
  const ai = await claudeFallback(html, url);
  if (ai) { console.log("Claude AI fallback found"); merged = mergeDetails(merged, ai); }
  if (detailsQuality(merged) >= 3) return { details: merged, html, source };

  return { details: Object.keys(merged).length > 0 ? merged : null, html, source };
}

// ── Multi-URL scrape with variants ───────────────────────
async function scrapeWithVariants(url: string): Promise<ScrapeResult & { missing?: string[] }> {
  const variants = generateUrlVariants(url);
  let bestResult: ScrapeResult = { details: null, html: "", source: "" };
  let bestScore = 0;

  for (const variant of variants) {
    console.log(`Trying variant: ${variant}`);
    try {
      const result = await scrapeListing(variant);
      const score = detailsQuality(result.details);
      if (score > bestScore) {
        bestResult = result;
        bestScore = score;
      }
      if (score >= 6) break; // Good enough, stop trying
    } catch (e) { console.error(`Variant failed: ${variant}`, e); }
  }

  // If still poor results, try address-based cross-site search
  if (bestScore < 4) {
    const addr = addressFromUrl(url);
    if (addr && addr.street) {
      console.log(`URL variants insufficient (score=${bestScore}), trying address search: ${addr.street}, ${addr.city}`);
      const searchResult = await searchByAddress(addr.street, addr.city, addr.state, addr.zip);
      const searchScore = detailsQuality(searchResult.details);
      if (searchScore > bestScore) {
        // Merge address info from URL even if search had better data
        if (searchResult.details && addr) {
          searchResult.details = mergeDetails(searchResult.details, { address: addr.street, city: addr.city, state: addr.state, zip: addr.zip, listing_url: url });
        }
        bestResult = searchResult;
        bestScore = searchScore;
      }
    }
  }

  // Compute missing fields
  const missing: string[] = [];
  if (bestResult.details) {
    if (!bestResult.details.price) missing.push("price");
    if (!bestResult.details.beds) missing.push("beds");
    if (!bestResult.details.baths) missing.push("baths");
    if (!bestResult.details.sqft) missing.push("sqft");
    if (!bestResult.details.city) missing.push("city");
    if (!bestResult.details.zip) missing.push("zip");
  }

  return { ...bestResult, missing };
}

// ── Agent/Realtor extraction ─────────────────────────────
interface AgentInfo {
  name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  dba?: string;
  source_zip?: string;
}

function extractAgentInfo(html: string, source: string, propertyZip?: string): AgentInfo[] {
  const agents: AgentInfo[] = [];
  try {
    if (source === "zillow") {
      // Zillow: prop.attributionInfo in __NEXT_DATA__
      const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
      if (ndMatch) {
        const nd = JSON.parse(ndMatch[1]);
        const pp = nd?.props?.pageProps ?? {};
        const gdp = pp.gdpClientCache ?? pp.componentProps?.gdpClientCache;
        if (gdp) {
          const cache = typeof gdp === "string" ? JSON.parse(gdp) : gdp;
          for (const key of Object.keys(cache)) {
            const entry = cache[key] as Record<string, unknown>;
            if (entry?.property) {
              const prop = entry.property as Record<string, unknown>;
              const attr = prop.attributionInfo as Record<string, unknown> | undefined;
              if (attr?.agentName) {
                agents.push({
                  name: String(attr.agentName),
                  phone: attr.agentPhoneNumber ? String(attr.agentPhoneNumber) : undefined,
                  dba: attr.brokerageName ? String(attr.brokerageName) : undefined,
                  source_zip: propertyZip,
                });
              }
              break;
            }
          }
        }
      }
    } else if (source === "realtor") {
      // Realtor: pd.advertisers[0] in __NEXT_DATA__
      const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
      if (ndMatch) {
        const nd = JSON.parse(ndMatch[1]);
        const pd = nd?.props?.pageProps?.initialReduxState?.propertyDetails;
        if (pd?.advertisers) {
          for (const adv of pd.advertisers) {
            if (!adv.name) continue;
            const office = adv.office || {};
            agents.push({
              name: String(adv.name),
              email: adv.email ? String(adv.email) : undefined,
              license_number: adv.state_license ? String(adv.state_license) : undefined,
              dba: office.name ? String(office.name) : (adv.broker?.name ? String(adv.broker.name) : undefined),
              phone: office.phones?.[0]?.number ? String(office.phones[0].number) : (adv.phone ? String(adv.phone) : undefined),
              source_zip: propertyZip,
            });
          }
        }
      }
    } else if (source === "redfin") {
      // Redfin: HTML agent-info section
      const agentSection = html.match(/agent-info-section[\s\S]*?(?:listingContactSection|listingInfoSection|listingRemarks)/);
      if (agentSection) {
        // Extract "Listed by" agent name + brokerage pairs
        const pairs = agentSection[0].matchAll(/agent-basic-details--heading">Listed by[\s\S]*?<[^>]*>([^<]+)<[\s\S]*?(?:agent-basic-details--broker">|<[^>]*>)\s*([^<]*)/gi);
        for (const m of pairs) {
          const name = m[1].trim();
          const brokerage = m[2].trim();
          if (name && name.length > 2) {
            agents.push({ name, dba: brokerage || undefined, source_zip: propertyZip });
          }
        }
      }
      // Fallback: agent-detail-name for Redfin agent
      if (!agents.length) {
        const nameMatch = html.match(/agent-detail-name">([^<]+)/);
        if (nameMatch) {
          agents.push({ name: nameMatch[1].trim(), source_zip: propertyZip });
        }
      }
    }
  } catch (e) {
    console.error("extractAgentInfo error:", e);
  }
  console.log(`Extracted ${agents.length} agents from ${source}`);
  return agents;
}

// ── GitHub repo updater ──────────────────────────────────
const REPO = "clawmango0/real-estate-data";
const REPO_BRANCH = "master";

interface RealtorRecord {
  license_number: string;
  name: string;
  license_type: string;
  status: string;
  expiration_date: string;
  phone: string;
  email: string;
  address: string;
  dba: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  source_zip: string;
  source_letter: string;
}

const CSV_HEADERS: (keyof RealtorRecord)[] = [
  "license_number","name","license_type","status","expiration_date",
  "phone","email","address","dba","company","city","state","zip",
  "source_zip","source_letter"
];

function csvEscape(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function realtorsToCsv(records: RealtorRecord[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = records.map(r => CSV_HEADERS.map(h => csvEscape(r[h] || "")).join(","));
  return header + "\n" + rows.join("\n") + "\n";
}

async function updateRealtorRepo(agents: AgentInfo[]): Promise<void> {
  if (!GITHUB_PAT || !agents.length) return;

  try {
    const ghHeaders = {
      "Authorization": `token ${GITHUB_PAT}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "LockboxIQ-Scraper",
    };

    // 1. Fetch current realtors.json (use raw URL for large files, Contents API for SHA)
    const [metaResp, rawResp] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}/contents/realtors.json?ref=${REPO_BRANCH}`, { headers: ghHeaders }),
      fetch(`https://raw.githubusercontent.com/${REPO}/${REPO_BRANCH}/realtors.json`, { headers: { "Authorization": `token ${GITHUB_PAT}` } }),
    ]);
    if (!metaResp.ok || !rawResp.ok) { console.error("GitHub GET realtors.json:", metaResp.status, rawResp.status); return; }
    const jsonFile = await metaResp.json();
    const jsonSha = jsonFile.sha;
    const jsonContent = await rawResp.text();
    const realtors: RealtorRecord[] = JSON.parse(jsonContent);
    console.log(`Loaded ${realtors.length} existing realtors from repo`);

    // 2. Build lookup indexes for dedup
    const byLicense = new Map<string, number>();
    const byName = new Map<string, number>();
    for (let i = 0; i < realtors.length; i++) {
      if (realtors[i].license_number) byLicense.set(realtors[i].license_number, i);
      byName.set(realtors[i].name.toLowerCase().trim(), i);
    }

    // 3. Merge or add each agent
    let changed = false;
    for (const agent of agents) {
      if (!agent.name || agent.name.length < 3) continue;

      // Dedup: check license first, then name
      let existingIdx = agent.license_number ? byLicense.get(agent.license_number) : undefined;
      if (existingIdx === undefined) {
        existingIdx = byName.get(agent.name.toLowerCase().trim());
      }

      if (existingIdx !== undefined) {
        // Merge: fill empty fields only
        const existing = realtors[existingIdx];
        let merged = false;
        if (!existing.phone && agent.phone) { existing.phone = agent.phone; merged = true; }
        if (!existing.email && agent.email) { existing.email = agent.email; merged = true; }
        if (!existing.license_number && agent.license_number) { existing.license_number = agent.license_number; merged = true; }
        if (!existing.dba && agent.dba) { existing.dba = agent.dba; merged = true; }
        if (!existing.source_zip && agent.source_zip) { existing.source_zip = agent.source_zip; merged = true; }
        if (merged) { changed = true; console.log(`Merged agent: ${agent.name}`); }
      } else {
        // New record
        const newRecord: RealtorRecord = {
          license_number: agent.license_number || "",
          name: agent.name,
          license_type: "",
          status: "",
          expiration_date: "",
          phone: agent.phone || "",
          email: agent.email || "",
          address: "",
          dba: agent.dba || "",
          company: agent.dba || "",
          city: "",
          state: "TX",
          zip: "",
          source_zip: agent.source_zip || "",
          source_letter: "",
        };
        realtors.push(newRecord);
        byName.set(agent.name.toLowerCase().trim(), realtors.length - 1);
        if (agent.license_number) byLicense.set(agent.license_number, realtors.length - 1);
        changed = true;
        console.log(`Added new agent: ${agent.name}`);
      }
    }

    if (!changed) { console.log("No new/updated agents — skipping repo update"); return; }

    // 4. Update realtors.json via Git Blobs API (handles large files)
    const newJson = JSON.stringify(realtors, null, 2);

    // Create blob for JSON
    const jsonBlobResp = await fetch(`https://api.github.com/repos/${REPO}/git/blobs`, {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ content: newJson, encoding: "utf-8" }),
    });
    if (!jsonBlobResp.ok) { console.error("GitHub create JSON blob:", jsonBlobResp.status); return; }
    const jsonBlob = await jsonBlobResp.json();
    // 5. Create blob for CSV
    const newCsv = realtorsToCsv(realtors);
    const csvBlobResp = await fetch(`https://api.github.com/repos/${REPO}/git/blobs`, {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ content: newCsv, encoding: "utf-8" }),
    });
    if (!csvBlobResp.ok) { console.error("GitHub create CSV blob:", csvBlobResp.status); return; }
    const csvBlob = await csvBlobResp.json();

    // 6. Get current commit SHA for the branch
    const refResp = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${REPO_BRANCH}`, { headers: ghHeaders });
    if (!refResp.ok) { console.error("GitHub GET ref:", refResp.status); return; }
    const ref = await refResp.json();
    const parentSha = ref.object.sha;

    // 7. Get the current tree
    const commitResp = await fetch(`https://api.github.com/repos/${REPO}/git/commits/${parentSha}`, { headers: ghHeaders });
    if (!commitResp.ok) { console.error("GitHub GET commit:", commitResp.status); return; }
    const parentCommit = await commitResp.json();

    // 8. Create new tree with both files
    const treeResp = await fetch(`https://api.github.com/repos/${REPO}/git/trees`, {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: parentCommit.tree.sha,
        tree: [
          { path: "realtors.json", mode: "100644", type: "blob", sha: jsonBlob.sha },
          { path: "realtors.csv", mode: "100644", type: "blob", sha: csvBlob.sha },
        ],
      }),
    });
    if (!treeResp.ok) { console.error("GitHub create tree:", treeResp.status); return; }
    const newTree = await treeResp.json();

    // 9. Create commit
    const commitMsg = `Add/update realtors: ${agents.map(a => a.name).join(", ").slice(0, 60)}`;
    const newCommitResp = await fetch(`https://api.github.com/repos/${REPO}/git/commits`, {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMsg,
        tree: newTree.sha,
        parents: [parentSha],
      }),
    });
    if (!newCommitResp.ok) { console.error("GitHub create commit:", newCommitResp.status); return; }
    const newCommit = await newCommitResp.json();

    // 10. Update branch ref
    const updateRefResp = await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/${REPO_BRANCH}`, {
      method: "PATCH",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ sha: newCommit.sha }),
    });
    if (!updateRefResp.ok) { console.error("GitHub update ref:", updateRefResp.status); return; }
    console.log(`Updated repo: ${realtors.length} realtors, commit ${newCommit.sha.slice(0, 7)}`);
  } catch (e) {
    console.error("updateRealtorRepo error:", e);
  }
}

// ── Rate limiter (in-memory, per user, 10 requests per minute) ──
const rateLimits = new Map<string, number[]>();
function checkRateLimit(userId: string, maxReqs = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = (rateLimits.get(userId) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxReqs) return false;
  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return true;
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

  // Rate limit: 10 requests per minute per user
  if (!checkRateLimit(user.id)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before trying again." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
  }

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const { url, address, city, state, zip } = body;

    // Mode 1: Address-based search (no URL required)
    if (!url && address) {
      console.log(`fetch-listing: address search mode — ${address}, ${city || ""}, ${state || "TX"}`);
      const result = await searchByAddress(
        address, city || "", state || "TX", zip || ""
      );
      if (!result.details) {
        return new Response(JSON.stringify({ error: "Could not find property by address", address }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
      }
      // Ensure address fields are populated
      result.details = mergeDetails(result.details, { address, city, state: state || "TX", zip });
      return new Response(JSON.stringify(result.details), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Mode 2: URL-based scrape
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url or address is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // SSRF protection: only allow known real estate hostnames
    const ALLOWED_HOSTS = ["zillow.com", "realtor.com", "redfin.com", "redf.in"];
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (!ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h))) {
        console.warn(`Blocked URL with disallowed host: ${host}`);
        return new Response(JSON.stringify({ error: "Only Zillow, Realtor.com, and Redfin URLs are supported" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return new Response(JSON.stringify({ error: "Invalid URL protocol" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
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

    console.log(`fetch-listing: scraping ${cleanUrl} (with variants + fallback)`);
    const { details, html: scrapedHtml, source, missing } = await scrapeWithVariants(cleanUrl);

    if (!details) {
      // Last resort: try to populate from URL pattern
      const addr = addressFromUrl(cleanUrl);
      if (addr && addr.street) {
        return new Response(JSON.stringify({
          error: "Scraping failed — partial address from URL",
          partial: { address: addr.street, city: addr.city, state: addr.state, zip: addr.zip, listing_url: cleanUrl },
          missing: ["price", "beds", "baths", "sqft"],
        }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Could not fetch listing details", url: cleanUrl }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Extract agent info and update GitHub repo (non-blocking — don't delay response)
    if (scrapedHtml) {
      const propertyZip = details.zip;
      const agents = extractAgentInfo(scrapedHtml, source, propertyZip);
      if (agents.length > 0) {
        updateRealtorRepo(agents).catch(e => console.error("Agent repo update failed:", e));
      }
    }

    // Include missing fields list so client can show warnings
    const response: Record<string, unknown> = { ...details };
    if (missing && missing.length > 0) response._missing = missing;
    return new Response(JSON.stringify(response), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("fetch-listing error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
