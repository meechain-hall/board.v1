import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serializeError } from '@/lib/verification/types';

interface RelayLogEntry {
  id: string;
  from_node: string;
  to_node: string;
  payload: string;
  source: string;
  created_at: string;
}

function getServerEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE URL or service role key');
  }
  return { url, key };
}

function getSupabaseAdmin() {
  const { url, key } = getServerEnv();
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get('limit'));
  const limit =
    Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('relay_log')
      .select('id, from_node, to_node, payload, source, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      entries: (data as RelayLogEntry[]) ?? [],
      count: data?.length ?? 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, key } = getServerEnv();
    const res = await fetch(`${url}/functions/v1/relay-packet`, {
      method: 'POST',
      headers: {
       'Content-Type': 'application/json',
      apikey: key,
      },
      body: JSON.stringify({ ...body, source: body.source || 'dashboard' }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Edge function error ${res.status}`);

    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}
