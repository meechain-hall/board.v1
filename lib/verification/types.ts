export type EvidenceStatus = 'pass' | 'fail' | 'unknown';

export type EvidenceSource = 'live-probe' | 'identity-only' | 'derived';

export interface Evidence {
  type: string;
  label: string;
  value: string;
  status: EvidenceStatus;
  source: EvidenceSource;
  timestamp: string;
  detail?: Record<string, unknown>;
  error?: string;
}

export type VerificationStatus = 'verified' | 'degraded' | 'failed' | 'unknown';

export interface VerificationResult {
  id: string;
  label: string;
  status: VerificationStatus;
  summary: string;
  checkedAt: string;
  evidence: Evidence[];
}

export function deriveStatus(evidence: Evidence[]): VerificationStatus {
  if (evidence.length === 0) return 'unknown';
  if (evidence.some((e) => e.status === 'fail')) return 'failed';
  if (evidence.some((e) => e.status === 'unknown')) return 'degraded';
  return 'verified';
}

export function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

