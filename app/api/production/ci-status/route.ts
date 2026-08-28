import { NextResponse } from 'next/server';
import { getLatestWorkflowRun } from '@/lib/github';

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export async function GET() {
  try {
    const run = await getLatestWorkflowRun();
    return NextResponse.json({ run, source: 'live-probe', updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}