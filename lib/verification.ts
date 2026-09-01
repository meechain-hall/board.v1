import type {
  AggregatedStats,
  ComPortBridgeItem,
  MagicOrbPayload,
} from '@/app/components/types';

export type VerificationStatus = 'verified' | 'degraded' | 'failed' | 'unknown';
export type EvidenceResult = 'passed' | 'failed' | 'unknown';
export type EvidenceValue = string | number | boolean | null;

export interface Evidence {
  id: string;
  what: string;
  source: string;
  value: EvidenceValue;
  check: string;
  checkedAt: string;
  result: EvidenceResult;
  metadata?: Record<string, EvidenceValue>;
}

export interface VerificationResult {
  status: VerificationStatus;
  source: string;
  checkedAt: string;
  summary: string;
  evidence: Evidence[];
  metadata?: Record<string, EvidenceValue>;
}

export interface ProductionCiSnapshot {
  run: {
    status: string;
    conclusion: string | null;
    branch: string;
    commitSha: string;
    url: string;
    updatedAt: string;
  } | null;
  error?: string;
}

export interface ProductionDeploySnapshot {
  deployment: {
    state: string;
    url: string;
    target: string;
    createdAt: number;
    commitSha?: string;
  } | null;
  latestCommit: {
    sha: string;
    shortSha: string;
    message: string;
    date: string;
  } | null;
  match: boolean | null;
  errors: {
    deployment: string | null;
    commit: string | null;
  };
}

export interface RpcVerificationSnapshot {
  method: string;
  result: unknown;
  latency: number;
  error?: string;
  checkedAt?: string;
}

export interface LiveQueryVerificationSnapshot {
  orb: {
    state: 'idle' | 'live' | 'degraded' | 'offline';
    error: string | null;
    lastUpdated: string | null;
    data: MagicOrbPayload | null;
  };
  rpc: {
    state: 'idle' | 'live' | 'degraded' | 'offline';
    error: string | null;
    lastUpdated: string | null;
    result: Record<string, unknown> | null;
  };
}

export interface FeedVerificationSnapshot {
  data: {
    count: number;
    mock: boolean;
    updatedAt: string;
    itemCount: number;
  } | null;
  error: string | null;
}

const UNKNOWN_TIME = 'Not checked yet';

function checkedAtOrFallback(checkedAt?: string | null): string {
  return checkedAt || UNKNOWN_TIME;
}

function summarizeStatus(evidence: Evidence[]): VerificationStatus {
  if (evidence.length === 0 || evidence.every((item) => item.result === 'unknown')) {
    return 'unknown';
  }
  if (evidence.some((item) => item.result === 'failed')) {
    return 'failed';
  }
  if (evidence.some((item) => item.result === 'unknown')) {
    return 'degraded';
  }
  return 'verified';
}

function evidenceResult(
  condition: boolean | null | undefined,
): EvidenceResult {
  if (condition === true) return 'passed';
  if (condition === false) return 'failed';
  return 'unknown';
}

export function verifyMagicOrb(input: {
  data: MagicOrbPayload | null;
  error: string | null;
  checkedAt?: string | null;
}): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.checkedAt);
  const contractPassed = Boolean(
    input.data &&
      typeof input.data.energyLevel === 'number' &&
      typeof input.data.resonanceFrequency === 'number' &&
      Boolean(input.data.harmonicState) &&
      Boolean(input.data.rawPayload?.quantumState),
  );
  const evidence: Evidence[] = [
    {
      id: 'orb-endpoint',
      what: 'Magic Orb endpoint response',
      source: '/api/magic/orb',
      value: input.error || (input.data ? 'HTTP 200 response' : null),
      check: 'Endpoint responds and returns a readable payload',
      checkedAt,
      result: input.error ? 'failed' : evidenceResult(input.data !== null),
    },
    {
      id: 'orb-contract',
      what: 'Magic Orb contract fields',
      source: '/api/magic/orb',
      value: input.data ? input.data.harmonicState : null,
      check: 'energyLevel, resonanceFrequency, harmonicState, and rawPayload.quantumState are present',
      checkedAt,
      result: input.error ? 'unknown' : evidenceResult(input.data ? contractPassed : null),
      metadata: {
        resonanceFrequency: input.data?.resonanceFrequency ?? null,
        energyLevel: input.data?.energyLevel ?? null,
      },
    },
    {
      id: 'orb-runtime',
      what: 'Live resonance stream',
      source: 'Magic Orb runtime',
      value: input.data?.rawPayload?.pulseId ?? null,
      check: 'A pulse identifier is available from the live runtime response',
      checkedAt,
      result: evidenceResult(input.data?.rawPayload?.pulseId ? true : input.data ? false : null),
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'Magic Orb Control Plane',
    checkedAt,
    summary: input.error
      ? 'The Orb endpoint could not be verified.'
      : input.data
        ? 'Endpoint, contract, and live runtime evidence are available.'
        : 'Waiting for the first Orb response.',
    evidence,
    metadata: {
      retryState: input.error ? 'retrying_or_failed' : input.data ? 'stable' : 'waiting',
    },
  };
}

export function verifyStats(input: {
  stats: AggregatedStats | null;
  rpcResult: string | null;
  rpcLatency: number | null;
  error?: string | null;
}): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.stats?.updatedAt);
  const evidence: Evidence[] = [
    {
      id: 'stats-node',
      what: 'Node data source',
      source: '/api/stats → node',
      value: input.error || input.stats?.node.status || null,
      check: 'Node status and block height are present in the aggregated response',
      checkedAt,
      result: input.error
        ? 'failed'
        : evidenceResult(
            Boolean(
              input.stats &&
                input.stats.node.status &&
                typeof input.stats.node.blockHeight === 'number',
            ),
          ),
    },
    {
      id: 'stats-api',
      what: 'API gateway data source',
      source: '/api/stats → api',
      value: input.stats?.api.status || null,
      check: 'Gateway status and latency are present in the aggregated response',
      checkedAt,
      result: input.error
        ? 'unknown'
        : evidenceResult(
            Boolean(
              input.stats &&
                input.stats.api.status &&
                typeof input.stats.api.latencyMs === 'number',
            ),
          ),
    },
    {
      id: 'stats-rpc',
      what: 'RPC data source',
      source: '/api/stats → rpc',
      value: input.stats?.rpc.upstreamUrl || null,
      check: 'RPC status, block height, and upstream are present',
      checkedAt,
      result: input.error
        ? 'unknown'
        : evidenceResult(
            Boolean(
              input.stats &&
                input.stats.rpc.status &&
                typeof input.stats.rpc.blockHeight === 'number' &&
                input.stats.rpc.upstreamUrl,
            ),
          ),
      metadata: {
        blockHeight: input.stats?.rpc.blockHeight ?? null,
        upstream: input.stats?.rpc.upstreamUrl ?? null,
      },
    },
    {
      id: 'stats-rpc-probe',
      what: 'Direct RPC probe',
      source: '/api/rpc',
      value: input.rpcResult ? 'Response received' : null,
      check: 'The direct JSON-RPC probe returns a response with a measured latency',
      checkedAt,
      result: evidenceResult(Boolean(input.rpcResult && input.rpcLatency !== null)),
      metadata: {
        latencyMs: input.rpcLatency,
      },
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'Telemetry Aggregator + JSON-RPC Proxy',
    checkedAt,
    summary: input.error
      ? 'Telemetry could not be fully verified.'
      : input.stats
        ? 'Node, gateway, RPC, and timestamp evidence are being tracked.'
        : 'Waiting for telemetry data.',
    evidence,
    metadata: {
      refreshed: Boolean(input.stats),
    },
  };
}

export function verifyComPorts(input: {
  ports: ComPortBridgeItem[];
  checkedAt?: string | null;
  error?: string | null;
}): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.checkedAt);
  const hasLiveProbe = input.ports.some((port) => port.source === 'live-probe');
  const hasConnectedPort = input.ports.some((port) => port.status === 'connected');
  const responsePassed = input.error ? false : input.ports.length > 0;
  const evidence: Evidence[] = [
    {
      id: 'comport-request',
      what: 'Control Plane request',
      source: '/api/control-plane/comports',
      value: input.error || (input.ports.length ? `HTTP 200 · ${input.ports.length} ports` : null),
      check: 'Control Plane returns a non-empty ComPort response',
      checkedAt,
      result: evidenceResult(responsePassed),
    },
    {
      id: 'comport-identity',
      what: 'Port identity',
      source: 'Control Plane bridge registry',
      value: input.ports.length ? input.ports.map((port) => port.name).join(', ') : null,
      check: 'Each returned port has configured identity metadata',
      checkedAt,
      result: evidenceResult(input.ports.length ? input.ports.every((port) => port.identity === 'configured') : null),
      metadata: {
        portCount: input.ports.length,
      },
    },
    {
      id: 'comport-probe',
      what: 'Live port reachability',
      source: 'Control Plane live probe',
      value: hasLiveProbe ? (hasConnectedPort ? 'connected' : 'offline') : null,
      check: 'At least one live-probed port is reachable',
      checkedAt,
      result: input.error ? 'unknown' : evidenceResult(hasLiveProbe ? hasConnectedPort : null),
    },
    {
      id: 'comport-method',
      what: 'Relay method support',
      source: '/api/control-plane/comports/relay',
      value: null,
      check: 'A relay request has been executed and a response has been recorded',
      checkedAt,
      result: 'unknown',
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'MeeChain Control Plane',
    checkedAt,
    summary: input.error
      ? 'The ComPort bridge could not be verified.'
      : input.ports.length
        ? 'Request, identity, and live reachability evidence are available.'
        : 'Waiting for the Control Plane port response.',
    evidence,
    metadata: {
      liveProbe: hasLiveProbe,
      connected: hasConnectedPort,
    },
  };
}

export function verifyProduction(input: {
  ci: ProductionCiSnapshot | null;
  deploy: ProductionDeploySnapshot | null;
}): VerificationResult {
  const ciCheckedAt = input.ci?.run?.updatedAt;
  const deployCheckedAt = input.deploy?.deployment?.createdAt
    ? new Date(input.deploy.deployment.createdAt).toISOString()
    : input.deploy?.latestCommit?.date;
  const checkedAt = checkedAtOrFallback(deployCheckedAt || ciCheckedAt);
  const ciConclusion = input.ci?.run?.conclusion ?? null;
  const deployState = input.deploy?.deployment?.state ?? null;
  const evidence: Evidence[] = [
    {
      id: 'production-source',
      what: 'Source commit identity',
      source: 'GitHub',
      value: input.deploy?.latestCommit?.shortSha || input.ci?.run?.commitSha || null,
      check: 'A current GitHub commit is available for comparison',
      checkedAt,
      result: evidenceResult(Boolean(input.deploy?.latestCommit || input.ci?.run)),
      metadata: {
        branch: input.ci?.run?.branch || null,
      },
    },
    {
      id: 'production-ci',
      what: 'CI workflow',
      source: 'GitHub Actions',
      value: ciConclusion || input.ci?.run?.status || input.ci?.error || null,
      check: 'The latest workflow conclusion is success',
      checkedAt: checkedAtOrFallback(ciCheckedAt),
      result: evidenceResult(ciConclusion ? ciConclusion === 'success' : null),
      metadata: {
        url: input.ci?.run?.url || null,
      },
    },
    {
      id: 'production-deploy',
      what: 'Deployment execution',
      source: 'Vercel',
      value: deployState || input.deploy?.errors?.deployment || null,
      check: 'The latest deployment is READY',
      checkedAt: checkedAtOrFallback(deployCheckedAt),
      result: evidenceResult(deployState ? deployState === 'READY' : null),
      metadata: {
        url: input.deploy?.deployment?.url || null,
        target: input.deploy?.deployment?.target || null,
      },
    },
    {
      id: 'production-sha',
      what: 'Deployment SHA alignment',
      source: 'GitHub ↔ Vercel comparison',
      value: input.deploy?.match ?? null,
      check: 'The deployed commit SHA matches the latest GitHub HEAD',
      checkedAt,
      result: evidenceResult(input.deploy?.match),
      metadata: {
        deployedSha: input.deploy?.deployment?.commitSha || null,
        latestSha: input.deploy?.latestCommit?.sha || null,
      },
    },
    {
      id: 'production-runtime',
      what: 'Runtime endpoint',
      source: 'Vercel deployment URL',
      value: input.deploy?.deployment?.url || null,
      check: 'A READY deployment exposes a runtime URL',
      checkedAt: checkedAtOrFallback(deployCheckedAt),
      result: evidenceResult(Boolean(deployState === 'READY' && input.deploy?.deployment?.url)),
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'GitHub Actions + Vercel + Runtime',
    checkedAt,
    summary:
      input.ci || input.deploy
        ? 'Source, CI, deployment, runtime, and SHA evidence are linked.'
        : 'Waiting for live CI and deployment status.',
    evidence,
    metadata: {
      branch: input.ci?.run?.branch || null,
      commitSha: input.ci?.run?.commitSha || input.deploy?.latestCommit?.sha || null,
    },
  };
}

export function verifyRpc(input: {
  latest: RpcVerificationSnapshot | null;
}): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.latest?.checkedAt);
  const latest = input.latest;
  const evidence: Evidence[] = [
    {
      id: 'rpc-response',
      what: 'JSON-RPC response',
      source: '/api/rpc',
      value: latest?.error || (latest ? 'Response received' : null),
      check: 'The proxy returns a response for the selected JSON-RPC method',
      checkedAt,
      result: evidenceResult(latest ? !latest.error : null),
      metadata: {
        method: latest?.method || null,
      },
    },
    {
      id: 'rpc-result',
      what: 'Method result',
      source: `JSON-RPC → ${latest?.method || 'not selected'}`,
      value: latest ? (latest.error ? latest.error : 'Result available') : null,
      check: 'The response contains a result and no JSON-RPC error',
      checkedAt,
      result: evidenceResult(latest ? !latest.error && latest.result !== null : null),
    },
    {
      id: 'rpc-latency',
      what: 'Response timing',
      source: 'MeeChain RPC proxy',
      value: latest?.latency ?? null,
      check: 'The request completes with a measured response latency',
      checkedAt,
      result: evidenceResult(latest ? latest.latency >= 0 && !latest.error : null),
      metadata: {
        unit: 'ms',
      },
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'MeeChain JSON-RPC Proxy',
    checkedAt,
    summary: latest
      ? latest.error
        ? 'The latest RPC request returned an error.'
        : 'The latest RPC method has a response and measured latency.'
      : 'Waiting for the first JSON-RPC request.',
    evidence,
    metadata: {
      latestMethod: latest?.method || null,
    },
  };
}

export function verifyLiveQuery(
  input: LiveQueryVerificationSnapshot,
): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.rpc.lastUpdated || input.orb.lastUpdated);
  const evidence: Evidence[] = [
    {
      id: 'live-orb',
      what: 'Magic Orb live stream',
      source: '/api/magic/orb',
      value: input.orb.error || input.orb.state,
      check: 'The Orb stream is live and has a contract payload',
      checkedAt: checkedAtOrFallback(input.orb.lastUpdated),
      result: evidenceResult(input.orb.state === 'live' && input.orb.data !== null),
    },
    {
      id: 'live-rpc',
      what: 'RPC ledger live stream',
      source: '/api/rpc',
      value: input.rpc.error || input.rpc.state,
      check: 'The RPC stream is live and has a latest block response',
      checkedAt: checkedAtOrFallback(input.rpc.lastUpdated),
      result: evidenceResult(input.rpc.state === 'live' && input.rpc.result !== null),
    },
    {
      id: 'live-synchronization',
      what: 'Stream synchronization',
      source: 'Live Query control loop',
      value:
        input.orb.lastUpdated && input.rpc.lastUpdated
          ? 'Both streams updated'
          : null,
      check: 'Orb and RPC streams each report a timestamp',
      checkedAt,
      result: evidenceResult(Boolean(input.orb.lastUpdated && input.rpc.lastUpdated)),
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'Live Query Control Loop',
    checkedAt,
    summary: 'Orb telemetry and RPC ledger evidence are evaluated together.',
    evidence,
    metadata: {
      orbState: input.orb.state,
      rpcState: input.rpc.state,
    },
  };
}

export function verifyTransactionFeed(
  input: FeedVerificationSnapshot,
): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.data?.updatedAt);
  const evidence: Evidence[] = [
    {
      id: 'transactions-response',
      what: 'Transaction feed response',
      source: '/api/transactions',
      value: input.error || (input.data ? `HTTP 200 · ${input.data.count} records` : null),
      check: 'The API returns a readable transaction collection',
      checkedAt,
      result: evidenceResult(Boolean(input.data && !input.error)),
    },
    {
      id: 'transactions-source',
      what: 'Transaction source',
      source: 'MeeChain transaction feed',
      value: input.data?.mock ? 'mock data' : input.data ? 'live source' : null,
      check: 'The feed is backed by a live source, not a mock fallback',
      checkedAt,
      result: input.data ? evidenceResult(!input.data.mock) : 'unknown',
    },
    {
      id: 'transactions-items',
      what: 'Confirmed transaction records',
      source: '/api/transactions',
      value: input.data?.itemCount ?? null,
      check: 'The response contains at least one confirmed record',
      checkedAt,
      result: evidenceResult(input.data ? input.data.itemCount > 0 : null),
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'MeeChain Transaction Feed',
    checkedAt,
    summary: input.error
      ? 'The transaction feed could not be verified.'
      : input.data?.mock
        ? 'Transaction shape is available, but the current source is mock data.'
        : input.data
          ? 'Transaction response, source, and record evidence are available.'
          : 'Waiting for transaction feed data.',
    evidence,
    metadata: {
      mock: input.data?.mock ?? null,
      count: input.data?.count ?? null,
    },
  };
}

export function verifyLeaderboard(
  input: FeedVerificationSnapshot,
): VerificationResult {
  const checkedAt = checkedAtOrFallback(input.data?.updatedAt);
  const evidence: Evidence[] = [
    {
      id: 'leaderboard-response',
      what: 'Leaderboard response',
      source: '/api/quest-leaderboard',
      value: input.error || (input.data ? `HTTP 200 · ${input.data.count} entries` : null),
      check: 'The API returns a readable ranking collection',
      checkedAt,
      result: evidenceResult(Boolean(input.data && !input.error)),
    },
    {
      id: 'leaderboard-source',
      what: 'Leaderboard source',
      source: 'MeeChain quest ledger',
      value: input.data?.mock ? 'mock data' : input.data ? 'live source' : null,
      check: 'The ranking is backed by a live source, not a mock fallback',
      checkedAt,
      result: input.data ? evidenceResult(!input.data.mock) : 'unknown',
    },
    {
      id: 'leaderboard-entries',
      what: 'Ranked entries',
      source: '/api/quest-leaderboard',
      value: input.data?.itemCount ?? null,
      check: 'The response contains at least one ranked entry',
      checkedAt,
      result: evidenceResult(input.data ? input.data.itemCount > 0 : null),
    },
  ];

  return {
    status: summarizeStatus(evidence),
    source: 'MeeChain Quest Leaderboard',
    checkedAt,
    summary: input.error
      ? 'The leaderboard could not be verified.'
      : input.data?.mock
        ? 'Ranking shape is available, but the current source is mock data.'
        : input.data
          ? 'Leaderboard response, source, and entry evidence are available.'
          : 'Waiting for leaderboard data.',
    evidence,
    metadata: {
      mock: input.data?.mock ?? null,
      count: input.data?.count ?? null,
    },
  };
}
