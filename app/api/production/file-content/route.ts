import { NextRequest, NextResponse } from 'next/server';
import { getFileContentById } from '@/lib/github';
import { getRegistryEntry } from '@/lib/productionFileRegistry';

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ต้องระบุ id' }, { status: 400 });

  // เช็ค allowlist ก่อนเรียก GitHub — id ที่ไม่รู้จักตอบ 404 ทันที ไม่แตะ API จริง
  if (!getRegistryEntry(id)) {
    return NextResponse.json({ error: 'Unknown file id' }, { status: 404 });
  }

  try {
    const file = await getFileContentById(id);
    // response ไม่มี token/credential ใดๆ ปนอยู่เลย
    return NextResponse.json({ ...file, source: 'live-probe', updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: serializeError(err) }, { status: 500 });
  }
}