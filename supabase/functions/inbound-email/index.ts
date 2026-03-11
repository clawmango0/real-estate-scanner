import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SUPABASE_SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const ANTHROPIC_KEY=Deno.env.get("ANTHROPIC_API_KEY")??"";
const MAILGUN_KEY=Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY")??"";
const SCRAPER_KEY=Deno.env.get("SCRAPER_API_KEY")??"";

async function verify(ts:string,tok:string,sig:string):Promise<boolean>{if(!MAILGUN_KEY)return true;try{const v=ts+tok;const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(MAILGUN_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const s=await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(v));const c=Array.from(new Uint8Array(s)).map(b=>b.toString(16).padStart(2,"0")).join("");return c===sig;}catch{return true;}}

function getVerifyUrl(subject:string,html:string,plain:string):string|null{try{const sl=(subject||"").toLowerCase();if(!sl.includes("confirm")&&!sl.includes("verify")&&!sl.includes("verif")&&!sl.includes("activate")&&!sl.includes("subscri"))return null;const c=html||plain||"";const patterns=[/https?:\/\/[^\s"'<>]+confirm[^\s"'<>]*/gi,/https?:\/\/[^\s"'<>]+verif[^\s"'<>]*/gi,/https?:\/\/[^\s"'<>]+activate[^\s"'<>]*/gi,/https?:\/\/[^\s"'<>]+subscri[^\s"'<>]*/gi,/https?:\/\/[^\s"'<>]+token=[^\s"'<>]*/gi];for(const p of patterns){const m=c.match(p);if(m?.[0])return m[0].replace(/&amp;/g,"&").replace(/['"]/g,"");}return null;}catch{return null;}}

// Parse Zillow subject line formats:
//   "New Listing: 4844 Summer Oaks Ln Fort Worth, TX 76123. Your 'SW FTW' search"
//   "Price Cut: 1215 N Elm St, Weatherford, TX 76086. Your 'NW FTW' Search."
//   "Price Reduced: 832 Cross Timbers Dr, Fort Worth, TX 76108. Your..."
function parseSubjectLine(subject:string):any[]|null {
  try {
    // "New Listing: <street+city without comma>, STATE ZIP"
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

    // "Price Cut: <street>, <City>, STATE ZIP" or "Price Reduced: ..."
    m = subject.match(/Price (?:Cut|Reduc\w*):\s+(\d+[^,]+),\s+([^,]+),\s+([A-Z]{2})\s+(\d{5})/i);
    if (m) {
      const street = m[1].trim();
      const city   = m[2].trim();
      const state  = m[3];
      const zip    = m[4];
      return [{
        address: `${street}, ${city}, ${state} ${zip}`,
        city, state, zip,
        listed_price: null, beds: null, baths: null, sqft: null,
        property_type: "SFR", listing_url: "", source: "zillow",
        price_drop: true, price_drop_amt: 0, _from_subject: true
      }];
    }

    return null;
  } catch { return null; }
}

async function parseWithClaude(subject:string,html:string,plain:string) {
  // Prefer plain text — it's compact and Claude reads it more reliably than
  // stripped HTML (Zillow emails are 80-100KB HTML; plain is ~14KB and contains
  // the price, beds, baths clearly formatted). Fall back to stripped HTML only
  // when plain is absent or very short.
  let content: string;
  if (plain && plain.length > 200) {
    content = plain.replace(/\s+/g, " ").trim().slice(0, 20000);
  } else {
    content = (html ? html.replace(/<[^>]+>/g, " ") : plain).replace(/\s+/g, " ").trim().slice(0, 20000);
  }
  if (!content || content.length < 50) return null; // signal empty body
  const prompt=`Extract ALL property listings from this real estate alert email.
Subject: "${subject}"
Content: ${content}

Return JSON array only (no markdown). Each item: address,city,state,zip,listed_price(number),beds(number),baths(number),sqft(number),property_type(SFR/DUPLEX/etc),listing_url,source(zillow/realtor/etc),price_drop(bool),price_drop_amt(number). Return [] if none.`;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,messages:[{role:"user",content:prompt}]})});
  const data=await res.json();
  const text=(data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim();
  try{return JSON.parse(text);}catch{return[];}
}

// Extract real Zillow homedetails URL from Zillow tracking links or direct links.
// Searches both HTML and plain text since Zillow's new-listing emails sometimes
// embed homedetails URLs only in the plain-text version.
function extractZillowUrl(html: string, plain: string = ""): string | null {
  try {
    // 1. Direct homedetails URL anywhere in HTML or plain text
    for (const src of [html, plain]) {
      const direct = src.match(/https?:\/\/(?:www\.)?zillow\.com\/homedetails\/[^\s"'<>&)]+/i);
      if (direct) return direct[0].replace(/&amp;/g, "&");
    }

    // 2. Zillow tracking links whose target= param resolves to a homedetails URL
    const allSrc = html + " " + plain;
    const trackingMatches = allSrc.match(/https?:\/\/click\.mail\.zillow\.com[^\s"'<>]*/gi) || [];
    for (const link of trackingMatches) {
      try {
        const decoded = link.replace(/&amp;/g, "&");
        const u = new URL(decoded);
        const target = decodeURIComponent(u.searchParams.get("target") || u.searchParams.get("url") || "");
        if (target.includes("zillow.com/homedetails")) {
          return target.split('"')[0].split("'")[0];
        }
      } catch {}
    }

    // 3. Extract ZPID from any zillow.com URL (e.g. ?zpid=12345) and build homedetails URL
    const zpidMatch = allSrc.match(/zillow\.com[^\s"'<>]*[?&]zpid=(\d+)/i);
    if (zpidMatch) return `https://www.zillow.com/homedetails/${zpidMatch[1]}_zpid/`;

    return null;
  } catch { return null; }
}

interface ZillowDetails {
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_size?: number;
  rent_estimate?: number;
  listing_url?: string;
}

async function scrapeZillow(listingUrl: string): Promise<ZillowDetails | null> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  let html = "";

  // Try direct fetch first
  try {
    const r = await fetch(listingUrl, { headers, redirect: "follow" });
    if (r.ok) html = await r.text();
  } catch (e) { console.error("direct fetch error:", e); }

  // Fall back to ScraperAPI with JS rendering — required for Zillow CAPTCHA bypass
  if ((!html || !html.includes("gdpClientCache")) && SCRAPER_KEY) {
    try {
      const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(listingUrl)}&render=true&country_code=us`;
      const r = await fetch(scraperUrl);
      if (r.ok) html = await r.text();
    } catch (e) { console.error("scraperapi error:", e); }
  }

  if (!html) return null;

  // Extract __NEXT_DATA__ JSON
  const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!ndMatch) {
    console.log("No __NEXT_DATA__ found, len=" + html.length);
    return null;
  }

  try {
    const nd = JSON.parse(ndMatch[1]);
    // gdpClientCache can live in pageProps directly OR nested under componentProps
    const pp = nd?.props?.pageProps ?? {};
    const gdp = pp.gdpClientCache ?? pp.componentProps?.gdpClientCache;
    if (!gdp) return null;

    // gdpClientCache may be stringified JSON
    const cache = typeof gdp === "string" ? JSON.parse(gdp) : gdp;

    // Find the property object — key is usually the zpid-based key
    let prop: Record<string, unknown> | null = null;
    for (const key of Object.keys(cache)) {
      const entry = cache[key] as Record<string, unknown>;
      if (entry?.property) { prop = entry.property as Record<string, unknown>; break; }
    }
    if (!prop) return null;

    // Lot size — convert acres to sqft if needed
    let lot_size: number | undefined;
    if (prop.lotAreaValue) {
      const v = Number(prop.lotAreaValue);
      const u = String(prop.lotAreaUnits || "").toLowerCase();
      lot_size = u.includes("acre") ? Math.round(v * 43560) : Math.round(v);
    }

    return {
      price: prop.price ? Number(prop.price) : undefined,
      beds: prop.bedrooms ? Number(prop.bedrooms) : undefined,
      baths: prop.bathrooms ? Number(prop.bathrooms) : undefined,
      sqft: prop.livingArea ? Number(prop.livingArea) : undefined,
      lot_size,
      rent_estimate: prop.rentZestimate ? Number(prop.rentZestimate) : undefined,
      listing_url: listingUrl,
    };
  } catch (e) {
    console.error("parse __NEXT_DATA__ error:", e);
    return null;
  }
}

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
  console.log(`from=${sender} subj="${subject}" html=${html.length}b plain=${plain.length}b`);
  if(!await verify(ts,tok,sig))return new Response("Unauthorized",{status:401});
  let slug=recipient.split("@")[0]?.toLowerCase()??"";
  if(slug.includes("="))slug=slug.split("=")[0];
  if(!slug)return new Response("no slug",{status:400});
  const{data:mb}=await supabase.from("mailboxes").select("id,user_id,active").eq("slug",slug).maybeSingle();
  if(!mb||!mb.active)return new Response("not found",{status:200});
  const vUrl=getVerifyUrl(subject,html,plain);
  if(vUrl){
    let ok=false;
    try{const r=await fetch(vUrl,{method:"GET",headers:{"User-Agent":"Mozilla/5.0"},redirect:"follow"});ok=r.status<500;}catch(e){console.error("verify err:",e);}
    await supabase.from("email_log").insert({user_id:mb.user_id,mailbox_id:mb.id,from_address:sender,subject,parse_status:ok?"verified":"verify_failed",properties_found:0,raw_payload:{recipient,sender,subject,verify_url:vUrl.slice(0,500)}});
    return new Response(JSON.stringify({ok:true,type:"verification",auto_verified:ok}),{status:200,headers:{"Content-Type":"application/json"}});
  }
  const{data:log}=await supabase.from("email_log").insert({user_id:mb.user_id,mailbox_id:mb.id,from_address:sender,subject,parse_status:"pending",raw_payload:{recipient,sender,subject,html_len:html.length,plain_len:plain.length,plain_preview:plain.slice(0,500)}}).select("id").single();
  const logId=log?.id;

  // Extract Zillow URL from email HTML + plain text for scraping later
  const zillowEmailUrl = extractZillowUrl(html, plain);
  if (zillowEmailUrl) console.log("Found Zillow URL:", zillowEmailUrl.slice(0, 100));

  // Try Claude first, fall back to subject line parsing
  let props:any[]=[];
  try{
    const claudeResult=await parseWithClaude(subject,html,plain);
    if(claudeResult===null){
      // Empty body — parse subject line
      console.log("Empty body, trying subject parse");
      props=parseSubjectLine(subject)??[];
    } else {
      props=claudeResult;
      if(!props.length){
        // Claude found nothing — try subject as fallback
        const subjectProps=parseSubjectLine(subject);
        if(subjectProps) props=subjectProps;
      }
    }
  }catch(e){
    console.error("parse error:",e);
    if(logId)await supabase.from("email_log").update({parse_status:"failed",error_message:String(e)}).eq("id",logId);
    return new Response("error",{status:500});
  }

  if(!props.length){
    if(logId)await supabase.from("email_log").update({parse_status:"no_listings",properties_found:0}).eq("id",logId);
    return new Response("no listings",{status:200});
  }

  let n=0;
  for(const p of props){
    if(!p.address)continue;
    const{error}=await supabase.from("properties").upsert({
      user_id:mb.user_id,mailbox_id:mb.id,email_log_id:logId,
      address:p.address,city:p.city??"",state:p.state??"TX",zip:p.zip||null,
      listed_price:p.listed_price?Number(p.listed_price):null,
      beds:p.beds?Number(p.beds):null,baths:p.baths?Number(p.baths):null,sqft:p.sqft?Number(p.sqft):null,
      property_type:p.property_type??"SFR",listing_url:p.listing_url??"",source:p.source??"zillow",
      condition:"good",improvement:"asis",status:"new",is_new:true,
      price_drop:Boolean(p.price_drop),price_drop_amt:Number(p.price_drop_amt??0),raw_json:p,
    },{onConflict:"user_id,address,listed_price"});
    if(!error)n++;else console.error("upsert err:",error.message);
  }
  if(logId)await supabase.from("email_log").update({parse_status:"success",properties_found:n}).eq("id",logId);
  console.log(`inserted ${n} for ${slug}`);

  // Scrape Zillow listing for each property to get price, beds, baths, sqft, lot size, rentZestimate
  // Use URL from email HTML (most reliable) or fallback to listing_url from parsed data
  const scrapeUrl = zillowEmailUrl || (props[0]?.listing_url || "");
  if (scrapeUrl && n > 0) {
    console.log("Scraping Zillow:", scrapeUrl.slice(0, 100));
    try {
      const details = await scrapeZillow(scrapeUrl);
      if (details) {
        console.log("Zillow details:", JSON.stringify(details));
        // Update all upserted properties with scraped data
        for (const p of props) {
          if (!p.address) continue;
          const updates: Record<string, unknown> = {};
          if (details.price && !p.listed_price) updates.listed_price = details.price;
          if (details.beds && !p.beds) updates.beds = details.beds;
          if (details.baths && !p.baths) updates.baths = details.baths;
          if (details.sqft && !p.sqft) updates.sqft = details.sqft;
          if (details.lot_size) updates.lot_size = details.lot_size;
          if (details.rent_estimate) updates.rent_estimate = details.rent_estimate;
          if (details.listing_url) updates.listing_url = details.listing_url;
          if (Object.keys(updates).length > 0) {
            const { error: ue } = await supabase.from("properties")
              .update(updates)
              .eq("user_id", mb.user_id)
              .eq("address", p.address);
            if (ue) console.error("zillow update err:", ue.message);
            else console.log(`Updated ${p.address} with Zillow data`);
          }
        }
      } else {
        console.log("No Zillow details extracted");
      }
    } catch (e) {
      console.error("zillow scrape error:", e);
    }
  }

  return new Response(JSON.stringify({ok:true,properties_found:n}),{status:200,headers:{"Content-Type":"application/json"}});
});
