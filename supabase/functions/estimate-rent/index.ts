import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const cors = {
  "Access-Control-Allow-Origin": "https://lockboxiq.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

  // Verify the user is authenticated
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

  if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const { address, city, zip, beds, baths, sqft, listed_price, property_type, neighborhood } = body;

    if (!address) return new Response(JSON.stringify({ error: "address is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Build neighborhood context
    let hoodCtx = "";
    if (neighborhood) {
      const parts: string[] = [];
      if (neighborhood.schools != null) parts.push(`Schools rating: ${neighborhood.schools}/10`);
      if (neighborhood.crime != null) parts.push(`Crime safety: ${neighborhood.crime}/10`);
      if (neighborhood.walkScore != null) parts.push(`Walk score: ${neighborhood.walkScore}`);
      if (neighborhood.rentGrowth != null) parts.push(`Rent growth: ${neighborhood.rentGrowth}%/yr`);
      if (neighborhood.zhvi != null) parts.push(`Typical home value (ZHVI): $${Number(neighborhood.zhvi).toLocaleString()}`);
      if (parts.length) hoodCtx = "\n\nNeighborhood data:\n- " + parts.join("\n- ");
    }

    const prompt = `You are a real estate rental analysis expert specializing in Texas properties. You have deep knowledge of rental markets across DFW, Houston, San Antonio, Austin, and surrounding areas.

Estimate the monthly rent for this property:
- Address: ${address}, ${city || ""}, TX ${zip || ""}
- Type: ${property_type || "SFR"}
- Beds: ${beds || "unknown"}, Baths: ${baths || "unknown"}, Sqft: ${sqft || "unknown"}
- Listed Price: $${Number(listed_price || 0).toLocaleString()}${hoodCtx}

Consider comparable rentals in this ZIP code and surrounding area. Factor in the property size, bedroom/bathroom count, property type, listed price (as a proxy for quality/condition), and neighborhood characteristics.

Return ONLY valid JSON with no other text: {"estimate": <midpoint_monthly_rent_integer>, "low": <conservative_monthly_rent_integer>, "high": <optimistic_monthly_rent_integer>, "reasoning": "<1-2 sentence explanation of how you arrived at this estimate>"}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30000);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }]
      }),
      signal: ac.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      return new Response(JSON.stringify({ error: "AI estimation failed" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();

    let parsed: { estimate: number; low: number; high: number; reasoning: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Failed to parse Claude response:", text);
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Validate the response has required fields and reasonable values
    if (!parsed.estimate || parsed.estimate < 200 || parsed.estimate > 50000) {
      return new Response(JSON.stringify({ error: "AI returned unreasonable estimate" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      estimate: Math.round(parsed.estimate),
      low: Math.round(parsed.low || parsed.estimate * 0.88),
      high: Math.round(parsed.high || parsed.estimate * 1.12),
      reasoning: parsed.reasoning || ""
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("estimate-rent error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
