import { NextResponse } from 'next/server';
import { getComportHallVerification } from '@/lib/verification/comportHall';
import { serializeError } from '@/lib/verification/types';

export async function GET() {
  try {
    const result = await getComportHallVerification();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}
