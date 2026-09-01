'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Radio,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Send,
  Share2,
  Wifi,
  WifiOff,
  HelpCircle,
} from 'lucide-react';
import { ComPortBridgeItem, RelayLogEntry } from '../types';
import { verifyComPorts } from '@/lib/verification';
import { VerificationSummary } from '../verification/VerificationInspector';

export function MagicHallView() {
  const [comports, setComports] = useState<ComPortBridgeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<string>('PEER_HANDSHAKE_INIT');
  const [relayLog, setRelayLog] = useState<RelayLogEntry[]>([]);
  const [transmitting, setTransmitting] = useState(false);
  const [transmitError, setTransmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchComports = useCallback(async () => {
    try {
      const res = await fetch('/api/control-plane/comports', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setComports(data.ports || []);
        setLoadError(null);
        setLastChecked(new Date().toISOString());
        if (data.ports?.length > 0 && !selectedPort) {
          setSelectedPort(data.ports[0].id);
        }
      } else {
        setLoadError(`HTTP ${res.status}`);
        setLastChecked(new Date().toISOString());
      }
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : 'Control Plane request failed');
      setLastChecked(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [selectedPort]);

  const fetchRelayLog = useCallback(async () => {
    try {
      const res = await fetch('/api/control-plane/comports/relay?limit=10', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRelayLog((data.entries as RelayLogEntry[]) || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void fetchComports();
    void fetchRelayLog();
    const relayTimer = window.setInterval(() => void fetchRelayLog(), 4000);
    return () => window.clearInterval(relayTimer);
  }, [fetchComports, fetchRelayLog]);

  const transmitPacket = async () => {
    setTransmitting(true);
    setTransmitError(null);
    const from = selectedPort
      ? comports.find((p) => p.id === selectedPort)?.name || 'Control Plane'
      : 'Control Plane';

    try {
      const res = await fetch('/api/control-plane/comports/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: 'MeeChain Mesh Hub',
          payload: activeMessage,
          source: 'dashboard',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      void fetchRelayLog();
    } catch (e: unknown) {
      setTransmitError(e instanceof Error ? e.message : 'Relay failed');
    } finally {
      setTransmitting(false);
    }
  };

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const statusIcon = (cp: ComPortBridgeItem) => {
    if (cp.source === 'identity-only') {
      return <HelpCircle className="w-3 h-3 text-amber-400" />;
    }
    if (cp.status === 'connected') {
      return <Wifi className="w-3 h-3 text-emerald-400" />;
    }
    return <WifiOff className="w-3 h-3 text-rose-400" />;
  };

  const verification = verifyComPorts({
    ports: comports,
    checkedAt: lastChecked,
    error: loadError,
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                MEECHAIN MAGIC HALL <span className="text-purple-400 font-normal">& COMPORT CONTROL</span>
              </h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                Decentralized Multi-Resource Bridge & Autonomous Serial Relay
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-[#050505] border border-slate-800 rounded-xl text-xs font-serif italic text-slate-300">
            &quot;Bridge over walls — non-centric interoperability&quot;
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <VerificationSummary result={verification} label="ComPort verification" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[#050505] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-semibold">
                Network Topology
              </h3>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full p-2.5 bg-indigo-500/10 border border-indigo-500/40 rounded-lg flex justify-between items-center">
                  <span className="text-xs font-mono font-semibold text-white">FRONTEND</span>
                  <span className="text-[10px] font-mono text-indigo-300">Vercel Edge</span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="w-full p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg flex justify-between items-center">
                  <span className="text-xs font-mono font-semibold text-white">API GATEWAY</span>
                  <span className="text-[10px] font-mono text-slate-300">Next.js / Nginx</span>
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="w-full p-2.5 bg-purple-500/10 border border-purple-500/40 rounded-lg flex justify-between items-center">
                  <span className="text-xs font-mono font-semibold text-white">SERVICES</span>
                  <span className="text-[10px] font-mono text-purple-300">Azure VM (RPC + Anvil)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>SECURITY: TLS 1.3 / CORS</span>
              <span className="text-emerald-400">ISOLATED</span>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <h4 className="text-xs font-bold text-white font-mono uppercase mb-1 pl-1">Vercel Client Layer</h4>
              <p className="text-[11px] text-slate-400 pl-1">
                Next.js server-rendered dashboard with auto-retry and real-time state hydration.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-indigo-300 pl-1">
                DOMAIN: *.vercel.app
              </div>
            </div>

            <div className="bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-white font-mono uppercase mb-1 pl-1">Gateway & Rate Limit</h4>
              <p className="text-[11px] text-slate-400 pl-1">
                Nginx reverse proxy with 60r/s burst limit, SSL termination & CORS whitelist.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-emerald-300 pl-1">
                INGRESS: api.meechain.live
              </div>
            </div>

            <div className="bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
              <h4 className="text-xs font-bold text-white font-mono uppercase mb-1 pl-1">Azure VM & Anvil</h4>
              <p className="text-[11px] text-slate-400 pl-1">
                Execution layer hosting JSON-RPC proxy, state database, and hardware bridges.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-purple-300 pl-1">
                UPSTREAM: rpc.meechain.live
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              ComPort Channels ({comports.length})
            </h3>
            <button onClick={() => void fetchComports()} className="text-slate-400 hover:text-white transition">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {comports.map((cp) => (
              <div
                key={cp.id}
                onClick={() => setSelectedPort(cp.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedPort === cp.id
                    ? 'bg-[#101010] border-purple-500/50 shadow-md'
                    : 'bg-[#050505] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {statusIcon(cp)}
                    <span className="text-xs font-bold text-white font-mono">{cp.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800">
                    {cp.port}
                  </span>
                </div>
                <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>{cp.deviceType}</span>
                  <div className="flex items-center gap-2">
                    {cp.baudRate && <span>{cp.baudRate} bps</span>}
                    <span className={cp.source === 'live-probe' ? 'text-emerald-400' : 'text-amber-400'}>
                      {cp.source === 'live-probe' ? 'LIVE PROBE' : 'IDENTITY ONLY'}
                    </span>
                  </div>
                </div>
                {cp.source === 'live-probe' && cp.latencyMs !== null && (
                  <div className="mt-1 text-[9px] font-mono text-slate-500">
                    Latency: <span className={cp.status === 'connected' ? 'text-emerald-400' : 'text-rose-400'}>{cp.latencyMs}ms</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                Inter-Resource Packet Relay
              </h3>
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                REAL-TIME
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activeMessage}
                  onChange={(e) => setActiveMessage(e.target.value)}
                  className="flex-1 bg-[#050505] border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => void transmitPacket()}
                  disabled={transmitting || !activeMessage.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold rounded-lg transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className={`w-3 h-3 ${transmitting ? 'animate-pulse' : ''}`} /> RELAY
                </button>
              </div>

              {transmitError && (
                <div className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">
                  {transmitError}
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                {['ORB_HARMONIC_PULSE', 'ANVIL_BLOCK_PROBE', 'VERCEL_CORS_VERIFY', 'HSM_SIGNATURE_REQ'].map(
                  (msg) => (
                    <button
                      key={msg}
                      onClick={() => setActiveMessage(msg)}
                      className="text-[9px] font-mono px-2 py-0.5 bg-[#050505] text-slate-400 hover:text-white rounded border border-slate-800"
                    >
                      {msg}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2 font-semibold">
                Relay Feed ({relayLog.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                {relayLog.length === 0 ? (
                  <div className="py-6 text-center text-slate-600 text-[11px]">
                    No relay packets yet. Send one above.
                  </div>
                ) : (
                  relayLog.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-[#050505] border border-slate-800 rounded-lg flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-indigo-400 truncate">{log.from_node}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="text-purple-400 truncate">{log.to_node}</span>
                        <span className="text-white font-semibold ml-1 truncate">[{log.payload}]</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {log.source}
                        </span>
                        <span className="text-[9px] text-slate-500">{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> NON-CENTRIC BRIDGE ACTIVE
            </span>
            <span>MeeChain Magic Protocol v2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
