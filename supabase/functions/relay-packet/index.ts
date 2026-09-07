import { createClient } from "pnpm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_PAYLOAD_LEN = 500;

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { from, to, payload, source } = body ?? {};

    if (
      typeof from !== "string" || !from.trim() ||
      typeof to !== "string" || !to.trim() ||
      typeof payload !== "string" || !payload.trim()
    ) {
      return jsonResponse({ error: "from, to, and payload must be non-empty strings" }, 400);
    }

    if (payload.length > MAX_PAYLOAD_LEN) {
      return jsonResponse({ error: `payload exceeds ${MAX_PAYLOAD_LEN} characters` }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Missing Supabase URL or service role key" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("relay_log")
      .insert({
        from_node: from.trim(),
        to_node: to.trim(),
        payload: payload.trim(),
        source: typeof source === "string" && source.trim() ? source.trim() : "external-client",
      })
      .select("id, created_at")
      .single();

    if (error) throw error;

    return jsonResponse({ ok: true, id: data.id, timestamp: data.created_at }, 201);
  } catch (err) {
    // log server-side for debugging, but return sanitized message
    console.error("relay-packet error:", err);
    let status = 500;
    if (err && typeof err === "object" && "status" in err && typeof (err as any).status === "number") {
      status = (err as any).status;
    }
    return jsonResponse({ error: serializeError(err) }, status);
  }
});
