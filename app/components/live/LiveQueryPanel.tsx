'use client';

import { useEffect, useState, useCallback } from 'react';
import { Radio, RefreshCw, Zap, Boxes, Clock, Activity, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { MagicOrbPayload } from '../types';

type ConnState = 'idle' | 'live' | 'degraded' | 'offline';

interface OrbData {
  data: MagicOrbPayload | null;
  latency: number;
  state: ConnState;
  error: string | null;
  lastUpdated: string | null;
}

interface RpcData {
  result: Record<string, unknown> | null;
  latency: number;
  state: ConnState;
  error: string | null;
  lastUpdated: string | null;
}

function stateBadge(state: ConnState) {
  switch (state) {
    case 'live':
      return { label: 'LIVE', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
    case 'degraded':
      return { label: 'DEGRADED', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' };
    case 'offline':
      return { label: 'OFFLINE', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-500' };
    default:
      return { label: 'IDLE', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-500' };
  }
}

function StateIndicator({ state }: { state: ConnState }) {
  const s = stateBadge(state);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${s.bg} ${s.color} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${state === 'live' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

export function LiveQueryPanel() {
  const [orb, setOrb] = useState<OrbData>({ data: null, latency: 0, state: 'idle', error: null, lastUpdated: null });
  const [rpc, setRpc] = useState<RpcData>({ result: null, latency: 0, state: 'idle', error: null, lastUpdated: null });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrb = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/magic/orb', { cache: 'no-store' });
      const data = (await res.json()) as MagicOrbPayload;
      const latency = Math.round(performance.now() - start);
      setOrb({ data, latency, state: 'live', error: null, lastUpdated: new Date().toISOString() });
    } catch (err: unknown) {
      setOrb((prev) => ({ ...prev, state: 'offline', error: err instanceof Error ? err.message : 'Fetch failed', lastUpdated: new Date().toISOString() }));
    }
  }, []);

  const fetchRpc = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'eth_getBlockByNumber', params: ['latest', false] }),
        cache: 'no-store',
      });
      const json = await res.json();
      const latency = Math.round(performance.now() - start);
      if (json.error) {
        setRpc({ result: null, latency, state: 'degraded', error: JSON.stringify(json.error), lastUpdated: new Date().toISOString() });
      } else {
        setRpc({ result: json.result as Record<string, unknown>, latency, state: 'live', error: null, lastUpdated: new Date().toISOString() });
      }
    } catch (err: unknown) {
      setRpc((prev) => ({ ...prev, state: 'offline', error: err instanceof Error ? err.message : 'Fetch failed', lastUpdated: new Date().toISOString() }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOrb(), fetchRpc()]);
    setRefreshing(false);
  }, [fetchOrb, fetchRpc]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void refreshAll(), 5000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  const hexToDecimal = (hex: unknown): string => {
    if (typeof hex !== 'string') return '—';
    try { return BigInt(hex).toLocaleString(); } catch { return hex; }
  };

  const truncateHash = (hash: unknown): string => {
    if (typeof hash !== 'string') return '—';
    return hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : hash;
  };

  const blockNumber = rpc.result ? hexToDecimal((rpc.result as Record<string, unknown>).number) : '—';
  const blockHash = rpc.result ? truncateHash((rpc.result as Record<string, unknown>).hash) : '—';
  const blockTimestamp = rpc.result ? hexToDecimal((rpc.result as Record<string, unknown>).timestamp) : '—';
  const txCount = rpc.result ? String((rpc.result as Record<string, unknown>).transactions ?? '—') : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              LIVE QUERY <span className="text-indigo-400 font-normal">PANEL</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
              Real-Time API Telemetry & RPC Ledger Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            AUTO {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-300 text-xs font-mono rounded-lg border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Telemetry Card */}
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Magic Orb Telemetry</h3>
                <p className="text-[9px] text-slate-500 font-mono">GET /api/magic/orb</p>
              </div>
            </div>
            <StateIndicator state={orb.state} />
          </div>

          <div className="p-5">
            {orb.state === 'idle' && !orb.data ? (
              <div className="py-12 text-center text-slate-600 text-xs font-mono">Initializing telemetry stream...</div>
            ) : orb.error && !orb.data ? (
              <div className="py-8 flex flex-col items-center gap-2 text-rose-400 text-xs font-mono">
                <AlertTriangle className="w-5 h-5" />
                {orb.error}
              </div>
            ) : orb.data ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MetricCard label="Energy Level" value={`${orb.data.energyLevel}`} unit="%" accent="text-indigo-400" icon={<Zap className="w-3 h-3" />} />
                  <MetricCard label="Resonance Freq" value={`${orb.data.resonanceFrequency}`} unit="Hz" accent="text-emerald-400" icon={<Activity className="w-3 h-3" />} />
                  <MetricCard label="Coherence Index" value={`${orb.data.coherenceIndex}`} unit="" accent="text-amber-300" icon={<CheckCircle2 className="w-3 h-3" />} />
                  <MetricCard label="Active Nodes" value={`${orb.data.activeNodesConnected}`} unit="" accent="text-purple-300" icon={<Boxes className="w-3 h-3" />} />
                </div>

                <div className="space-y-1.5 mb-4">
                  <DataRow label="Harmonic State" value={orb.data.harmonicState} />
                  <DataRow label="Entropy Hash" value={truncateHash(orb.data.entropyHash)} mono />
                  <DataRow label="Pulse ID" value={orb.data.rawPayload.pulseId} mono />
                  <DataRow label="Quantum State" value={orb.data.rawPayload.quantumState} mono />
                </div>
              </>
            ) : null}

            {orb.lastUpdated && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(orb.lastUpdated).toLocaleTimeString()}</span>
                <span className={orb.latency < 500 ? 'text-emerald-400' : 'text-amber-400'}>{orb.latency}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* RPC Ledger Card */}
        <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">RPC Ledger (Latest Block)</h3>
                <p className="text-[9px] text-slate-500 font-mono">POST /api/rpc {'->'} eth_getBlockByNumber</p>
              </div>
            </div>
            <StateIndicator state={rpc.state} />
          </div>

          <div className="p-5">
            {rpc.state === 'idle' && !rpc.result ? (
              <div className="py-12 text-center text-slate-600 text-xs font-mono">Initializing RPC stream...</div>
            ) : rpc.error && !rpc.result ? (
              <div className="py-8 flex flex-col items-center gap-2 text-rose-400 text-xs font-mono">
                <XCircle className="w-5 h-5" />
                {rpc.error}
              </div>
            ) : rpc.result ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MetricCard label="Block Number" value={blockNumber} unit="" accent="text-purple-300" icon={<Boxes className="w-3 h-3" />} />
                  <MetricCard label="Timestamp" value={blockTimestamp} unit="" accent="text-emerald-400" icon={<Clock className="w-3 h-3" />} />
                  <MetricCard label="Tx Count" value={txCount} unit="" accent="text-indigo-400" icon={<Activity className="w-3 h-3" />} />
                  <MetricCard label="Latency" value={`${rpc.latency}`} unit="ms" accent="text-amber-300" icon={<Zap className="w-3 h-3" />} />
                </div>

                <div className="space-y-1.5 mb-4">
                  <DataRow label="Block Hash" value={blockHash} mono />
                  <DataRow label="Miner" value={truncateHash((rpc.result as Record<string, unknown>).miner)} mono />
                  <DataRow label="Gas Used" value={hexToDecimal((rpc.result as Record<string, unknown>).gasUsed)} mono />
                  <DataRow label="Gas Limit" value={hexToDecimal((rpc.result as Record<string, unknown>).gasLimit)} mono />
                </div>
              </>
            ) : null}

            {rpc.lastUpdated && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(rpc.lastUpdated).toLocaleTimeString()}</span>
                <span className={rpc.latency < 500 ? 'text-emerald-400' : 'text-amber-400'}>{rpc.latency}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON viewer */}
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
          <Radio className="w-4 h-4 text-indigo-400" />
          Raw JSON Stream
        </h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-mono text-slate-500 mb-1.5">{'//'} Orb Telemetry Response</div>
            <pre className="text-slate-300 overflow-x-auto p-3 bg-[#080808] rounded-lg max-h-64 overflow-y-auto text-[11px] font-mono border border-slate-800">
              {orb.data ? JSON.stringify(orb.data, null, 2) : orb.error ? `Error: ${orb.error}` : 'Awaiting data...'}
            </pre>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-500 mb-1.5">{'//'} RPC Block Response</div>
            <pre className="text-slate-300 overflow-x-auto p-3 bg-[#080808] rounded-lg max-h-64 overflow-y-auto text-[11px] font-mono border border-slate-800">
              {rpc.result ? JSON.stringify(rpc.result, null, 2) : rpc.error ? `Error: ${rpc.error}` : 'Awaiting data...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, accent, icon }: { label: string; value: string; unit: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#050505] border border-slate-800 rounded-lg p-3">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">
        {icon}
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold font-mono ${accent}`}>{value}</span>
        {unit && <span className="text-[10px] text-slate-500 font-mono">{unit}</span>}
      </div>
    </div>
  );
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className={`text-slate-200 ${mono ? 'font-mono text-[11px]' : ''} truncate ml-2 max-w-[60%] text-right`}>{value}</span>
    </div>
  );
}
