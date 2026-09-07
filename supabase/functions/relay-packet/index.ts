import { createClient, SupabaseClient } from "pnpm:@supabase/supabase-js@2.58.0";

const DEFAULT_CORS = "*";
const MAX_PAYLOAD_LEN = Number(Deno.env.get("MAX_PAYLOAD_LEN") ?? 500);

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_CORS).split(",").map(s => s.trim());

function makeCorsHeaders(origin?: string) {
  const allowOrigin = (() => {
    if (ALLOWED_ORIGINS.includes("*")) return "*";
    if (!origin) return ALLOWED_ORIGINS[0] ?? "*";
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "*";
  })();

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function jsonResponse(body: unknown, status = 200, origin?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...makeCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

// Create supabase client at module scope so it's reused across invocations
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEYS") ||
  "";

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn("supabase relay-packet: SUPABASE_URL or SUPABASE_KEY not set at startup");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? undefined;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: makeCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // quick content-type check
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ error: "Expected application/json" }, 400, origin);
  }

  try {
    const body = await req.json();
    const { from, to, payload, source } = body ?? {};

    if (
      typeof from !== "string" || !from.trim() ||
      typeof to !== "string" || !to.trim() ||
      typeof payload !== "string" || !payload.trim()
    ) {
      return jsonResponse({ error: "from, to, and payload must be non-empty strings" }, 400, origin);
    }

    if (payload.length > MAX_PAYLOAD_LEN) {
      return jsonResponse({ error: `payload exceeds ${MAX_PAYLOAD_LEN} characters` }, 400, origin);
    }

    if (!supabase) {
      // attempt to create client now if it wasn't available at startup
      if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      } else {
        return jsonResponse({ error: "Missing Supabase URL or service role key" }, 500, origin);
      }
    }

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

    return jsonResponse({ ok: true, id: data.id, timestamp: data.created_at }, 201, origin);
  } catch (err) {
    console.error("relay-packet error:", err);
    let status = 500;
    if (err && typeof err === "object" && "status" in err && typeof (err as any).status === "number") {
      status = (err as any).status;
    }
    return jsonResponse({ error: serializeError(err) }, status, origin);
  }
});
