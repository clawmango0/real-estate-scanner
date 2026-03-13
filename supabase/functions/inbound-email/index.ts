import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const ANTHROPIC_KEY=Deno.env.get("ANTHROPIC_API_KEY")??"";
const MAILGUN_KEY=Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY")??"";
const SCRAPER_KEY=Deno.env.get("SCRAPER_API_KEY")??"";

async function verify(ts:string,tok:string,sig:string):Promise<boolean>{if(!MAILGUN_KEY)return true;try{const v=ts+tok;const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(MAILGUN_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));const c=Array.from(new Uint8Array(s)).map(b=>b.toString(16).padStart(2,"0")).join("");return c===sig;}catch{return true;}}

// Find the REAL verification/confirm link from an email.
// Old version matched ANY URL containing "confirm" — which grabbed static image
// URLs like password-reset-confirm-icon.png before the actual verify link.
function getVerifyUrl(subject:string, html:string, plain:string): string|null {
  try {
    const sl = (subject||"").toLowerCase();
    if (!sl.includes("confirm") && !sl.includes("verify") && !sl.includes("verif") &&
        !sl.includes("activate") && !sl.includes("subscri")) return null;

    const c = html || plain || "";

    // Collect ALL URLs from the email content
    const allUrls = c.match(/https?:\/\/[^\s"'<>]+/gi) || [];

    // Filter to verification-action URLs, excluding static assets
    const verifyKeyword = /confirm|verif|activate|subscri|token=/i;
    const staticAsset   = /\.(png|jpg|jpeg|gif|svg|css|js|ico|woff2?|ttf|eot)([?#]|$)/i;
    const staticDomain  = /zillowstatic\.com|\.amazonaws\.com\/static|cloudfront\.net\/static|cdn\./i;

    const candidates = allUrls
      .map(u => u.replace(/&amp;/g, "&").replace(/['"]/g, ""))
      .filter(u => verifyKeyword.test(u) && !staticAsset.test(u) && !staticDomain.test(u));

    if (!candidates.length) return null;

    // Prefer: (a) tracking links (click.mail.*) since they redirect to verify endpoint,
    //         (b) URLs with token/verification query params,
    //         (c) anything else that passed filters
    const best =
      candidates.find(u => /click\.mail\./i.test(u)) ||
      candidates.find(u => /[?&](token|t)=/i.test(u)) ||
      candidates.find(u => /VerifyEmail|verify-email|email.confirm/i.test(u)) ||
      candidates[0];

    console.log(`Verify URL candidates: ${candidates.length}, selected: ${best.slice(0, 150)}`);
    return best;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════
//  SUBJECT LINE PARSER
// ══════════════════════════════════════════════════════════
function parseSubjectLine(subject:string):any[]|null {
  try {
    // "New Listing: 4844 Summer Oaks Ln Fort Worth, TX 76123. Your 'SW FTW' search"
    let m = subject.match(/New Listing:\s+(.+?),\s+([A-Z]{2})\s+(\d{5})/i);
    if (m) {
      const fullAddr = m[1].trim();
      const state = m[2];
      const zip = m[3];
      const parts = fullAddr.split(',');
      const street = parts[0]?.trim() ?? fullAddr;
      const city = parts[1]?.trim() ?? "";
      return [{
        address: `${street}, ${city}, ${state} ${zip}`.replace(', ,', ','),
        city, state, zip,
        listed_price: null, beds: null, baths: null, sqft: null,
        property_type: "SFR", listing_url: "", source: "zillow",
        price_drop: false, price_drop_amt: 0, _from_subject: true
      }];
    }

    // "Price Cut: 1215 N Elm St, Weatherford, TX 76086. Your 'NW FTW' Search."
    m = subject.match(/Price (?:Cut|Reduc\w*):\s+(\d+[^,]+),\s+([^,]+),\s+([A-Z]{2})\s+(\d{5})/i);
    if (m) {
      return [{
        address: `${m[1].trim()}, ${m[2].trim()}, ${m[3]} ${m[4]}`,
        city: m[2].trim(), state: m[3], zip: m[4],
        listed_price: null, beds: null, baths: null, sqft: null,
        property_type: "SFR", listing_url: "", source: "zillow",
        price_drop: true, price_drop_amt: 0, _from_subject: true
      }];
    }

    return null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════
//  CLAUDE PARSER
// ══════════════════════════════════════════════════════════
// Strip zero-width Unicode junk that Zillow/Realtor emails use for tracking.
// These chars pollute tag-stripped HTML and confuse Claude parsing.
function cleanContent(s: string): string {
  return s
    .replace(/[\u034F\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u2007\u2060]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function parseWithClaude(subject:string, html:string, plain:string) {
  // Only prefer plain text when it actually contains property data
  // (prices, bed/bath counts, sqft). Zillow digest emails have plain text
  // that exceeds 200 chars due to long tracking URLs but contains no listings.
  const cleanPlain = cleanContent(plain || "");
  const plainHasData = cleanPlain.length > 100 &&
    /\$[\d,.]+K?M?|\d+\s*(?:bd|bed|ba|bath)|\d,\d{3}\s*sq/i.test(cleanPlain.slice(0, 3000));

  let content: string;
  if (plainHasData) {
    content = cleanPlain.slice(0, 30000);
  } else {
    // Use HTML (strip tags) — catches digest emails whose plain text is just junk
    content = cleanContent(html ? html.replace(/<[^>]+>/g, " ") : plain || "").slice(0, 30000);
  }
  if (!content || content.length < 50) return null;

  console.log(`Claude content: ${content.length} chars, first 200: ${content.slice(0, 200)}`);

  const prompt=`Extract ALL property listings from this real estate alert email.
Subject: "${subject}"
Content: ${content}

Rules:
- This may be a Zillow, Realtor.com, Redfin, or other real estate alert
- Convert shorthand prices: "$265K" → 265000, "$1.2M" → 1200000, "$265,000" → 265000
- "3 bd | 2 ba | 1,684 sqft" means beds:3, baths:2, sqft:1684
- zip may be null if not present; default state to "TX" for unspecified Texas cities
- Include ALL properties found even when some fields are missing
- Extract listing URLs when present; otherwise leave listing_url empty
- price_drop is true for "Price Cut" / "Price Reduced" emails
- source should be "zillow", "realtor", "redfin", etc. based on the email sender/content

Return JSON array only (no markdown). Each object: {address, city, state, zip, listed_price, beds, baths, sqft, property_type, listing_url, source, price_drop, price_drop_amt}. Return [] only if truly no property listings exist.`;

  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
  const data=await res.json();
  const text=(data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim();
  console.log(`Claude response: ${text.slice(0, 300)}`);
  try{return JSON.parse(text);}catch{ console.error("JSON parse failed:", text.slice(0, 200)); return[];}
}

// ══════════════════════════════════════════════════════════
//  ZILLOW URL EXTRACTION & RESOLUTION
// ══════════════════════════════════════════════════════════

// Scan email HTML + plain text for ALL Zillow-related URLs.
// Returns categorized: direct homedetails, tracking link targets, zpids.
interface ZillowUrlScan {
  homedetails: string[];
  trackingTargets: string[];  // decoded target= values from click.mail.zillow.com
  zpids: string[];
}

function scanZillowUrls(html: string, plain: string): ZillowUrlScan {
  const result: ZillowUrlScan = { homedetails: [], trackingTargets: [], zpids: [] };
  try {
    const allSrc = html + " " + plain;

    // 1. Direct homedetails URLs
    const directMatches = allSrc.match(/https?:\/\/(?:www\.)?zillow\.com\/homedetails\/[^\s"'<>&)]+/gi) || [];
    for (const m of directMatches) {
      const clean = m.replace(/&amp;/g, "&");
      if (!result.homedetails.includes(clean)) result.homedetails.push(clean);
    }

    // 2. Tracking link targets — decode ALL click.mail.zillow.com URLs
    const trackingMatches = allSrc.match(/https?:\/\/click\.mail\.zillow\.com[^\s"'<>]*/gi) || [];
    for (const link of trackingMatches) {
      try {
        const decoded = link.replace(/&amp;/g, "&");
        const u = new URL(decoded);
        const target = decodeURIComponent(u.searchParams.get("target") || u.searchParams.get("url") || "");
        if (!target || !target.includes("zillow.com")) continue;
        const clean = target.split('"')[0].split("'")[0];
        if (clean.includes("homedetails") && !result.homedetails.includes(clean)) {
          result.homedetails.push(clean);
        }
        if (!result.trackingTargets.includes(clean)) result.trackingTargets.push(clean);
      } catch {}
    }

    // 3. ZPIDs from any URL pattern
    const zpidMatches = allSrc.matchAll(/(\d{5,10})_zpid/gi);
    for (const m of zpidMatches) {
      if (!result.zpids.includes(m[1])) result.zpids.push(m[1]);
    }

    // 4. ?zpid= query params
    const qzpid = allSrc.matchAll(/[?&]zpid=(\d+)/gi);
    for (const m of qzpid) {
      if (!result.zpids.includes(m[1])) result.zpids.push(m[1]);
    }
  } catch {}
  return result;
}

// Follow a Zillow tracking URL redirect chain to find the actual property URL.
// At email processing time the tracking links are fresh and should redirect properly.
// click.mail.zillow.com → 302 → zillow.com/?rtoken=... → 302 → homedetails/...
async function followTrackingRedirect(trackingUrl: string): Promise<string | null> {
  try {
    let url = trackingUrl;
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      });
      const loc = r.headers.get("location");
      if (!loc) break;
      if (loc.includes("homedetails") || loc.match(/\d{5,10}_zpid/)) {
        console.log(`Redirect hop ${hop + 1} → homedetails: ${loc.slice(0, 120)}`);
        return loc;
      }
      // Extract ZPID from query params in redirects
      const zpidMatch = loc.match(/[?&]zpid=(\d+)/);
      if (zpidMatch) {
        const hdUrl = `https://www.zillow.com/homedetails/${zpidMatch[1]}_zpid/`;
        console.log(`Redirect hop ${hop + 1} → ZPID in redirect: ${hdUrl}`);
        return hdUrl;
      }
      url = loc.startsWith("http") ? loc : new URL(loc, url).href;
    }
    return null;
  } catch (e) {
    console.error("followTrackingRedirect error:", e);
    return null;
  }
}

// Look up a property on Zillow by address using their public autocomplete API.
// Returns a homedetails URL if a ZPID is found.
async function findZillowUrl(address: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(address);
    const r = await fetch(
      `https://www.zillowstatic.com/autocomplete/v3/suggestions?q=${q}&abKey=6pmtfwMkHe-ZvWGZJ6EtoQ`,
      { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
    );
    if (!r.ok) { console.log("autocomplete status:", r.status); return null; }
    const data = await r.json();
    const result = data?.results?.find((x: any) => x.metaData?.zpid);
    if (result?.metaData?.zpid) {
      const url = `https://www.zillow.com/homedetails/${result.metaData.zpid}_zpid/`;
      console.log(`Autocomplete ZPID ${result.metaData.zpid} → ${url}`);
      return url;
    }
    console.log("Autocomplete: no ZPID, results=", data?.results?.length ?? 0);
    return null;
  } catch (e) {
    console.error("findZillowUrl error:", e);
    return null;
  }
}

// Master URL resolver: tries every method to find a scrapeable homedetails URL.
// Priority: (1) direct homedetails from email, (2) ZPID from email, (3) follow
// tracking redirect chain, (4) autocomplete address lookup.
async function resolveZillowUrl(
  urlScan: ZillowUrlScan,
  trackingTargets: string[],
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<string | null> {
  // 1. Direct homedetails URL from email
  if (urlScan.homedetails.length > 0) {
    console.log("URL source: direct homedetails in email");
    return urlScan.homedetails[0];
  }

  // 2. ZPID found in email URLs
  if (urlScan.zpids.length > 0) {
    const url = `https://www.zillow.com/homedetails/${urlScan.zpids[0]}_zpid/`;
    console.log("URL source: ZPID from email →", url);
    return url;
  }

  // 3. Follow tracking link redirects (fresh at processing time)
  // Pick the first non-homepage tracking target that looks property-specific
  const propertyTargets = trackingTargets.filter(t =>
    !t.includes("utm_content=headerzillowlogo") &&
    !t.includes("utm_content=footer") &&
    !t.includes("unsubscribe") &&
    t.includes("zillow.com")
  );
  for (const target of propertyTargets.slice(0, 3)) {
    if (target.includes("rtoken") || target.includes("homedetails")) {
      const resolved = await followTrackingRedirect(target.startsWith("http") ? target : `https://${target}`);
      if (resolved) {
        console.log("URL source: tracking redirect →", resolved.slice(0, 120));
        return resolved;
      }
    }
  }

  // 4. Autocomplete address lookup (free, no key needed)
  if (address) {
    const searchAddr = [address, city, state || "TX", zip].filter(Boolean).join(" ");
    console.log("URL source: autocomplete lookup for:", searchAddr);
    const url = await findZillowUrl(searchAddr);
    if (url) return url;
  }

  return null;
}

// ══════════════════════════════════════════════════════════
//  ZILLOW SCRAPING
// ══════════════════════════════════════════════════════════

interface ZillowDetails {
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
  latitude?: number;
  longitude?: number;
}

async function scrapeZillow(listingUrl: string): Promise<ZillowDetails | null> {
  const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  let html = "";

  // Try direct fetch first (sometimes works for non-US IPs or crawl-friendly pages)
  try {
    const r = await fetch(listingUrl, {
      headers: { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow"
    });
    if (r.ok) html = await r.text();
    console.log(`Direct fetch: status=${r.status}, len=${html.length}, has_NEXT_DATA=${html.includes("__NEXT_DATA__")}`);
  } catch (e) { console.error("direct fetch error:", e); }

  // Fall back to ScraperAPI with JS rendering
  if ((!html || !html.includes("gdpClientCache")) && SCRAPER_KEY) {
    console.log("Using ScraperAPI for:", listingUrl.slice(0, 100));
    try {
      const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(listingUrl)}&render=true&country_code=us`;
      const r = await fetch(scraperUrl);
      if (r.ok) {
        html = await r.text();
        console.log(`ScraperAPI: status=${r.status}, len=${html.length}, has_NEXT_DATA=${html.includes("__NEXT_DATA__")}`);
      } else {
        console.error(`ScraperAPI error: status=${r.status}`);
      }
    } catch (e) { console.error("scraperapi error:", e); }
  }

  if (!html) { console.log("No HTML obtained for scraping"); return null; }

  // Try __NEXT_DATA__ extraction (primary method)
  const details = parseNextData(html, listingUrl);
  if (details) return details;

  // Fallback: regex extraction from raw HTML for price/beds/baths
  console.log("__NEXT_DATA__ failed, trying regex fallback");
  return regexFallback(html, listingUrl);
}

function parseNextData(html: string, listingUrl: string): ZillowDetails | null {
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!ndMatch) { console.log("No __NEXT_DATA__ found, len=" + html.length); return null; }

  try {
    const nd = JSON.parse(ndMatch[1]);
    const pp = nd?.props?.pageProps ?? {};
    const gdp = pp.gdpClientCache ?? pp.componentProps?.gdpClientCache;
    if (!gdp) { console.log("No gdpClientCache in __NEXT_DATA__"); return null; }

    const cache = typeof gdp === "string" ? JSON.parse(gdp) : gdp;

    let prop: Record<string, unknown> | null = null;
    for (const key of Object.keys(cache)) {
      const entry = cache[key] as Record<string, unknown>;
      if (entry?.property) { prop = entry.property as Record<string, unknown>; break; }
    }
    if (!prop) { console.log("No property object in gdpClientCache"); return null; }

    let lot_size: number | undefined;
    if (prop.lotAreaValue) {
      const v = Number(prop.lotAreaValue);
      const u = String(prop.lotAreaUnits || "").toLowerCase();
      lot_size = u.includes("acre") ? Math.round(v * 43560) : Math.round(v);
    }

    // Extract address from prop.address object
    const addr = prop.address as Record<string, unknown> | undefined;
    const streetAddress = addr?.streetAddress ? String(addr.streetAddress) : undefined;
    const city = addr?.city ? String(addr.city) : undefined;
    const state = addr?.state ? String(addr.state) : undefined;
    const zip = addr?.zipcode ? String(addr.zipcode) : undefined;

    // Build full address string: "123 Main St, Fort Worth, TX 76116"
    let fullAddress: string | undefined;
    if (streetAddress) {
      const parts = [streetAddress, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean);
      fullAddress = parts.join(", ");
    }

    // Determine property type from homeType
    const homeType = prop.homeType ? String(prop.homeType) : undefined;
    const typeMap: Record<string, string> = {
      SINGLE_FAMILY: "SFR", TOWNHOUSE: "Townhouse", CONDO: "Condo",
      MULTI_FAMILY: "Multi-Family", MANUFACTURED: "Manufactured",
      LOT: "Land", APARTMENT: "Apartment",
    };
    const property_type = homeType ? (typeMap[homeType] || homeType) : undefined;

    const details: ZillowDetails = {
      price: prop.price ? Number(prop.price) : undefined,
      beds: prop.bedrooms ? Number(prop.bedrooms) : undefined,
      baths: prop.bathrooms ? Number(prop.bathrooms) : undefined,
      sqft: prop.livingArea ? Number(prop.livingArea) : undefined,
      lot_size,
      rent_estimate: prop.rentZestimate ? Number(prop.rentZestimate) : undefined,
      listing_url: listingUrl,
      address: fullAddress,
      city,
      state,
      zip,
      property_type,
      latitude: prop.latitude ? Number(prop.latitude) : undefined,
      longitude: prop.longitude ? Number(prop.longitude) : undefined,
    };
    console.log("__NEXT_DATA__ parsed:", JSON.stringify(details));
    return details;
  } catch (e) {
    console.error("parseNextData error:", e);
    return null;
  }
}

// Regex fallback: extract basic property data from raw HTML when __NEXT_DATA__ fails
function regexFallback(html: string, listingUrl: string): ZillowDetails | null {
  try {
    // Look for JSON-LD structured data
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

    // Look for common Zillow HTML patterns
    const priceMatch = html.match(/data-testid="price"[^>]*>\$?([\d,]+)/);
    const bedsMatch = html.match(/(\d+)\s*(?:bd|bed|Bed)/);
    const bathsMatch = html.match(/([\d.]+)\s*(?:ba|bath|Bath)/);
    const sqftMatch = html.match(/([\d,]+)\s*(?:sqft|sq\s*ft)/i);
    const rentMatch = html.match(/Rent Zestimate[^$]*\$([\d,]+)/i);

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

// ══════════════════════════════════════════════════════════
//  MAIN WEBHOOK HANDLER
// ══════════════════════════════════════════════════════════

serve(async(req)=>{
  if(req.method!=="POST")return new Response("ok",{status:200});
  const supabase=createClient(SUPABASE_URL,SUPABASE_SERVICE);
  let fd:FormData;
  try{fd=await req.formData();}catch(e){console.error("fd error:",e);return new Response("bad request",{status:400});}
  const ts=String(fd.get("timestamp")??"");
  const tok=String(fd.get("token")??"");
  const sig=String(fd.get("signature")??"");
  const recipient=String(fd.get("recipient")??"");
  const sender=String(fd.get("sender")??"");
  const subject=String(fd.get("subject")??"");
  const html=String(fd.get("body-html")??"");
  const plain=String(fd.get("body-plain")??"");
  console.log(`══ INBOUND EMAIL ══ from=${sender} subj="${subject}" html=${html.length}b plain=${plain.length}b`);
  if(!await verify(ts,tok,sig))return new Response("Unauthorized",{status:401});
  let slug=recipient.split("@")[0]?.toLowerCase()??"";
  if(slug.includes("="))slug=slug.split("=")[0];
  if(!slug)return new Response("no slug",{status:400});
  const{data:mb}=await supabase.from("mailboxes").select("id,user_id,active").eq("slug",slug).maybeSingle();
  if(!mb||!mb.active)return new Response("not found",{status:200});

  // ── Verification emails ──
  const vUrl=getVerifyUrl(subject,html,plain);
  if(vUrl){
    let ok=false;
    let finalUrl="";
    let statusCode=0;
    try{
      // Follow full redirect chain with a real browser-like UA so Zillow/Realtor accept the click
      const r=await fetch(vUrl,{
        method:"GET",
        headers:{
          "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect:"follow"
      });
      statusCode=r.status;
      finalUrl=r.url||"";
      ok=r.status<400; // 2xx/3xx = success, 4xx/5xx = failure
      console.log(`Verify click: status=${r.status}, final=${finalUrl.slice(0,150)}`);
    }catch(e){console.error("verify err:",e);}
    await supabase.from("email_log").insert({
      user_id:mb.user_id, mailbox_id:mb.id, from_address:sender, subject,
      parse_status:ok?"verified":"verify_failed", properties_found:0,
      raw_payload:{
        recipient, sender, subject,
        verify_url: vUrl.slice(0,500),
        verify_final_url: finalUrl.slice(0,500),
        verify_status: statusCode,
      }
    });
    return new Response(JSON.stringify({ok:true,type:"verification",auto_verified:ok}),{status:200,headers:{"Content-Type":"application/json"}});
  }

  // ── Scan ALL Zillow URLs from email content ──
  const urlScan = scanZillowUrls(html, plain);
  console.log(`URL scan: ${urlScan.homedetails.length} homedetails, ${urlScan.trackingTargets.length} tracking, ${urlScan.zpids.length} zpids`);

  // ── Insert email log with URL diagnostics ──
  const{data:log}=await supabase.from("email_log").insert({
    user_id:mb.user_id, mailbox_id:mb.id, from_address:sender, subject,
    parse_status:"pending",
    raw_payload:{
      recipient, sender, subject,
      html_len: html.length, plain_len: plain.length,
      plain_preview: plain.slice(0, 500),
      zillow_urls: {
        homedetails: urlScan.homedetails.map(u => u.slice(0, 200)),
        tracking_count: urlScan.trackingTargets.length,
        tracking_samples: urlScan.trackingTargets.slice(0, 5).map(u => u.slice(0, 200)),
        zpids: urlScan.zpids,
      },
      scraper_key_set: !!SCRAPER_KEY,
    }
  }).select("id").single();
  const logId=log?.id;

  // ── Parse email for property listings ──
  let props:any[]=[];
  try{
    const claudeResult=await parseWithClaude(subject,html,plain);
    if(claudeResult===null){
      console.log("Empty body, trying subject parse");
      props=parseSubjectLine(subject)??[];
    } else {
      props=claudeResult;
      if(!props.length){
        const subjectProps=parseSubjectLine(subject);
        if(subjectProps) props=subjectProps;
      }
    }
  }catch(e){
    console.error("parse error:",e);
    if(logId)await supabase.from("email_log").update({parse_status:"failed",error_message:String(e)}).eq("id",logId);
    return new Response("error",{status:500});
  }

  // ── ZPID Fallback: if Claude found nothing but we have ZPIDs, scrape each directly ──
  if (!props.length && urlScan.zpids.length > 0) {
    console.log(`Claude returned 0 listings but found ${urlScan.zpids.length} ZPIDs — using ZPID fallback`);
    for (const zpid of urlScan.zpids) {
      const hdUrl = `https://www.zillow.com/homedetails/${zpid}_zpid/`;
      console.log(`ZPID fallback: scraping ${hdUrl}`);
      try {
        const details = await scrapeZillow(hdUrl);
        if (details?.address) {
          props.push({
            address: details.address,
            city: details.city || "",
            state: details.state || "TX",
            zip: details.zip || null,
            listed_price: details.price || null,
            beds: details.beds || null,
            baths: details.baths || null,
            sqft: details.sqft || null,
            property_type: details.property_type || "SFR",
            listing_url: details.listing_url || hdUrl,
            source: "zillow",
            price_drop: false,
            price_drop_amt: 0,
            rent_estimate: details.rent_estimate || null,
            lot_size: details.lot_size || null,
            latitude: details.latitude || null,
            longitude: details.longitude || null,
            _from_zpid_fallback: true,
          });
          console.log(`ZPID ${zpid} → ${details.address} ($${details.price || "?"})`);
        } else {
          console.log(`ZPID ${zpid}: scrape returned no address — skipping`);
        }
      } catch (e) {
        console.error(`ZPID ${zpid} scrape error:`, e);
      }
    }
    console.log(`ZPID fallback produced ${props.length} properties`);
  }

  if(!props.length){
    if(logId)await supabase.from("email_log").update({parse_status:"no_listings",properties_found:0}).eq("id",logId);
    return new Response("no listings",{status:200});
  }

  console.log(`Parsed ${props.length} properties from email`);

  // ── Upsert properties ──
  let n=0;
  for(const p of props){
    if(!p.address)continue;
    const record: Record<string, unknown> = {
      user_id:mb.user_id, mailbox_id:mb.id, email_log_id:logId,
      address:p.address, city:p.city??"", state:p.state??"TX", zip:p.zip||null,
      listed_price:p.listed_price?Number(p.listed_price):null,
      beds:p.beds?Number(p.beds):null, baths:p.baths?Number(p.baths):null,
      sqft:p.sqft?Number(p.sqft):null,
      property_type:p.property_type??"SFR", listing_url:p.listing_url??"",
      source:p.source??"zillow",
      condition:"good", improvement:"asis", status:"new", is_new:true,
      price_drop:Boolean(p.price_drop), price_drop_amt:Number(p.price_drop_amt??0),
      raw_json:p,
    };
    // ZPID fallback properties already have rent_estimate and lot_size from scraping
    if (p.rent_estimate) record.rent_estimate = Number(p.rent_estimate);
    if (p.lot_size) record.lot_size = Number(p.lot_size);
    if (p.latitude) record.latitude = Number(p.latitude);
    if (p.longitude) record.longitude = Number(p.longitude);
    const{error}=await supabase.from("properties").upsert(record,{onConflict:"user_id,address,listed_price"});
    if(!error)n++;else console.error("upsert err:",error.message);
  }
  if(logId)await supabase.from("email_log").update({parse_status:"success",properties_found:n}).eq("id",logId);
  console.log(`Upserted ${n} properties for ${slug}`);

  // ══════════════════════════════════════════════════════════
  //  ZILLOW SCRAPING — enrich each property with Zillow data
  //  (price, beds, baths, sqft, lot_size, rentZestimate)
  //
  //  For each property, resolve homedetails URL via:
  //    1. Direct homedetails URL from email (rare with new Zillow emails)
  //    2. ZPID from email URLs
  //    3. Follow tracking link redirect chain (works at email-receive time)
  //    4. Autocomplete address lookup (free, always works)
  //  Then scrape via ScraperAPI (render=true) since Zillow blocks direct fetch.
  // ══════════════════════════════════════════════════════════

  if (n > 0) {
    let scraped = 0;
    let scrapeErrors = 0;

    for (const p of props) {
      if (!p.address) continue;
      // ZPID fallback properties were already scraped during fallback — skip re-scraping
      if (p._from_zpid_fallback) { console.log(`Skipping re-scrape for ZPID fallback: ${p.address}`); continue; }

      console.log(`── Resolving URL for: ${p.address}`);
      const scrapeUrl = await resolveZillowUrl(
        urlScan, urlScan.trackingTargets,
        p.address, p.city || "", p.state || "TX", p.zip || ""
      );

      if (!scrapeUrl) {
        console.log(`No URL found for ${p.address} — skipping scrape`);
        continue;
      }

      console.log(`Scraping: ${scrapeUrl.slice(0, 120)}`);
      try {
        const details = await scrapeZillow(scrapeUrl);
        if (details) {
          const updates: Record<string, unknown> = {};
          if (details.price && !p.listed_price) updates.listed_price = details.price;
          if (details.beds && !p.beds) updates.beds = details.beds;
          if (details.baths && !p.baths) updates.baths = details.baths;
          if (details.sqft && !p.sqft) updates.sqft = details.sqft;
          if (details.lot_size) updates.lot_size = details.lot_size;
          if (details.rent_estimate) updates.rent_estimate = details.rent_estimate;
          if (details.listing_url) updates.listing_url = details.listing_url;
          if (details.latitude) updates.latitude = details.latitude;
          if (details.longitude) updates.longitude = details.longitude;
          if (Object.keys(updates).length > 0) {
            const { error: ue } = await supabase.from("properties")
              .update(updates)
              .eq("user_id", mb.user_id)
              .eq("address", p.address);
            if (ue) console.error("zillow update err:", ue.message);
            else { console.log(`✓ Updated ${p.address}: ${JSON.stringify(updates)}`); scraped++; }
          } else {
            console.log(`No new data to update for ${p.address} (already has values)`);
          }
        } else {
          console.log(`✗ No data extracted for ${p.address}`);
          scrapeErrors++;
        }
      } catch (e) {
        console.error(`Scrape error for ${p.address}:`, e);
        scrapeErrors++;
      }
    }

    console.log(`Scraping complete: ${scraped} updated, ${scrapeErrors} errors`);

    // Update email log with scrape results
    if (logId) {
      await supabase.from("email_log").update({
        raw_payload: {
          recipient, sender, subject,
          html_len: html.length, plain_len: plain.length,
          plain_preview: plain.slice(0, 500),
          zillow_urls: {
            homedetails: urlScan.homedetails.map(u => u.slice(0, 200)),
            tracking_count: urlScan.trackingTargets.length,
            tracking_samples: urlScan.trackingTargets.slice(0, 5).map(u => u.slice(0, 200)),
            zpids: urlScan.zpids,
          },
          scraper_key_set: !!SCRAPER_KEY,
          scrape_results: { scraped, errors: scrapeErrors },
        }
      }).eq("id", logId);
    }
  }

  return new Response(JSON.stringify({ok:true,properties_found:n}),{status:200,headers:{"Content-Type":"application/json"}});
});
