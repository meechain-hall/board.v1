import { Evidence, VerificationResult, deriveStatus, serializeError } from './types';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.meechain.live';
const EXPECTED_CHAIN_ID_HEX = '0x344e'; // 13390
const RELAY_URL = 'https://board.meechain.live/api/control-plane/comports/relay?limit=1';

async function rpcCall(method: string, params: unknown[] = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
  });
  const json = await res.json();
  return { res, json };
}

async function checkRpcResponse(): Promise<Evidence> {
  try {
    const { res, json } = await rpcCall('eth_blockNumber');
    const ok = res.ok && typeof json.result === 'string';
    return {
      type: 'rpc-response',
      label: 'การตอบสนองของ JSON-RPC (eth_blockNumber)',
      value: ok ? json.result : `HTTP ${res.status}`,
      status: ok ? 'pass' : 'fail',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { url: RPC_URL, response: json },
    };
  } catch (err) {
    return {
      type: 'rpc-response',
      label: 'การตอบสนองของ JSON-RPC (eth_blockNumber)',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

async function checkMethodAvailability(): Promise<Evidence> {
  try {
    const { res, json } = await rpcCall('eth_chainId');
    const ok = res.ok && typeof json.result === 'string' && !json.error;
    return {
      type: 'method-availability',
      label: 'ความพร้อมของเมธอด RPC (eth_chainId)',
      value: ok ? 'รองรับ' : json.error?.message || `HTTP ${res.status}`,
      status: ok ? 'pass' : 'fail',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { url: RPC_URL, response: json },
    };
  } catch (err) {
    return {
      type: 'method-availability',
      label: 'ความพร้อมของเมธอด RPC (eth_chainId)',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

async function checkChainId(): Promise<Evidence> {
  try {
    const { res, json } = await rpcCall('eth_chainId');
    const actual = typeof json.result === 'string' ? json.result.toLowerCase() : null;
    const ok = res.ok && actual === EXPECTED_CHAIN_ID_HEX;
    return {
      type: 'chain-id',
      label: `Chain ID ตรงกับที่คาดไว้ (${EXPECTED_CHAIN_ID_HEX} = 13390)`,
      value: actual ?? `HTTP ${res.status}`,
      status: ok ? 'pass' : 'fail',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { expected: EXPECTED_CHAIN_ID_HEX, actual },
    };
  } catch (err) {
    return {
      type: 'chain-id',
      label: `Chain ID ตรงกับที่คาดไว้ (${EXPECTED_CHAIN_ID_HEX} = 13390)`,
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

async function checkRelayRuntime(): Promise<Evidence> {
  try {
    const res = await fetch(RELAY_URL, { cache: 'no-store' });
    const ok = res.ok;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ปล่อยว่างถ้า parse ไม่ได้ ไม่ทำให้ evidence พัง
    }
    return {
      type: 'runtime-health',
      label: 'สถานะรันไทม์ของ Relay Store (ComPort)',
      value: `HTTP ${res.status}`,
      status: ok ? 'pass' : 'fail',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { url: RELAY_URL, body },
    };
  } catch (err) {
    return {
      type: 'runtime-health',
      label: 'สถานะรันไทม์ของ Relay Store (ComPort)',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

export async function getComportHallVerification(): Promise<VerificationResult> {
  const [rpcResponse, methodAvailability, chainId, runtimeHealth] = await Promise.all([
    checkRpcResponse(),
    checkMethodAvailability(),
    checkChainId(),
    checkRelayRuntime(),
  ]);

  const evidence: Evidence[] = [rpcResponse, methodAvailability, chainId, runtimeHealth];
  const status = deriveStatus(evidence);

  const summaryMap: Record<typeof status, string> = {
    verified: 'RPC ตอบสนองจริง เมธอดที่จำเป็นพร้อมใช้งาน Chain ID ตรงกับที่คาดไว้ และ relay store ทำงานอยู่',
    degraded: 'บางหลักฐานของ ComPort ยังไม่สามารถยืนยันได้ครบถ้วน',
    failed: 'พบหลักฐานของ ComPort ที่ล้มเหลวอย่างน้อยหนึ่งรายการ',
    unknown: 'ไม่มีหลักฐานเพียงพอสำหรับประเมินสถานะ ComPort',
  };

  return {
    id: 'comport-hall',
    label: 'การตรวจสอบ ComPort Hall',
    status,
    summary: summaryMap[status],
    checkedAt: new Date().toISOString(),
    evidence,
  };
}
