import { NextResponse } from 'next/server';

const RPC_URL = 'https://rpc.meechain.live';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: err instanceof Error ? err.message : 'RPC Proxy failed' } },
      { status: 502 }
    );
  }
}
