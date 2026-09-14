import { NextResponse } from 'next/server';
import { getProductionCodeHubVerification } from '@/lib/verification/productionCodeHub';
import { serializeError } from '@/lib/verification/types';

export async function GET() {
  try {
    const result = await getProductionCodeHubVerification();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}

