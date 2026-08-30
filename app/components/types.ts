export interface MagicOrbPayload {
  energyLevel: number;
  resonanceFrequency: number;
  harmonicState: string;
  coherenceIndex: number;
  activeNodesConnected: number;
  entropyHash: string;
  rawPayload: {
    quantumState: string;
    signature: string;
    pulseId: string;
  };
}

export interface ComPortBridgeItem {
  id: string;
  name: string;
  port: string;
  deviceType: string;
  baudRate: number | null;
  status: 'connected' | 'offline' | 'unknown';
  latencyMs: number | null;
  source: 'live-probe' | 'identity-only';
  identity: 'configured';
}

export interface RelayLogEntry {
  id: string;
  from_node: string;
  to_node: string;
  payload: string;
  source: string;
  created_at: string;
}

export interface AggregatedStats {
  updatedAt: string;
  node: {
    status: string;
    blockHeight: number;
    chainId: number;
    chainName: string;
    uptimeFormatted: string;
    peerCount: number;
    lastBlockHash: string;
  };
  api: {
    status: string;
    latencyMs: number;
    requestsPerMinute: number;
    errorRatePercent: number;
    cacheHitRatio: number;
  };
  rpc: {
    status: string;
    blockHeight: number;
    latencyMs: number;
    gasPriceGwei: number;
    tps: number;
    pendingTransactions: number;
    upstreamUrl: string;
  };
}

export interface TestItem {
  id: string;
  name: string;
  suite: string;
  status: 'idle' | 'running' | 'passed' | 'failed' | 'not_implemented';
  durationMs: number;
  details: string;
  error?: string;
}

export interface ProductionFile {
  id: string;
  name: string;
  category: string;
  language: string;
  targetPath: string;
  description: string;
  content: string;
}