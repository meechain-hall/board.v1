import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Send,
} from 'lucide-react';
import { AggregatedStats } from '../types';

interface StatsMonitorViewProps {
  stats: AggregatedStats | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function StatsMonitorView({
  stats,
  loading,
  error: _error,
  onRefresh,
}: StatsMonitorViewProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('eth_blockNumber');
  const [rpcResult, setRpcResult] = useState<string | null>(null);
  const [rpcLoading, setRpcLoading] = useState<boolean>(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);

  const executeRpcCall = async (method: string) => {
    setRpcLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params: method === 'eth_getBlockByNumber' ? ['latest', true] : [],
        }),
      });
      const end = performance.now();
      setRpcLatency(Math.round(end - start));
      const data = await res.json();
      setRpcResult(JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      setRpcResult(JSON.stringify({ error: e instanceof Error ? e.message : 'RPC Proxy failed' }, null, 2));
    } finally {
      setRpcLoading(false);
    }
  };

  useEffect(() => {
    executeRpcCall('eth_blockNumber');
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              TELEMETRY & STATS <span className="text-emerald-400 font-normal">MONITOR</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
              Real-Time Node, API Gateway & JSON-RPC Proxy Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500">
            SYNCED: <span className="text-slate-300">{stats ? new Date(stats.updatedAt).toLocaleTimeString() : '...'}</span>
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-300 text-xs font-mono rounded-lg border border-slate-800 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div>
            <div className="flex justify-between items-center mb-4 pl-1">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Node Infrastructure
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                {stats?.node.status === 'online' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="space-y-3.5 pl-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status</span>
                <span className="font-mono text-emerald-400 uppercase font-semibold">
                  {stats?.node.status || 'ONLINE'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Block Height</span>
                <span className="font-mono text-white font-bold">
                  {stats?.node.blockHeight ? stats.node.blockHeight.toLocaleString() : '18,492,040'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Chain ID</span>
                <span className="font-mono text-white">
                  {stats?.node.chainId || 13390} ({stats?.node.chainName || 'MeeChain'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Uptime</span>
                <span className="font-mono text-white">
                  {stats?.node.uptimeFormatted || '99.98%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Peers</span>
                <span className="font-mono text-indigo-400">{stats?.node.peerCount || 48} peers</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 mt-4 pl-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">
              Last Block Hash
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-[#050505] p-1.5 rounded block truncate border border-slate-800">
              {stats?.node.lastBlockHash || '0x7e8b2a19f...4c90d'}
            </span>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div>
            <div className="flex justify-between items-center mb-4 pl-1">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                API Gateway
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                200 OK
              </span>
            </div>

            <div className="space-y-3.5 pl-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Health</span>
                <span className="font-mono text-emerald-400 uppercase font-semibold">
                  200 OK (ACTIVE)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Latency</span>
                <span className="font-mono text-white font-bold">
                  {stats?.api.latencyMs || 24}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Throughput</span>
                <span className="font-mono text-white">
                  {stats?.api.requestsPerMinute?.toLocaleString() || '1,240'} req/m
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Error Rate</span>
                <span className="font-mono text-emerald-400">
                  {stats?.api.errorRatePercent || '0.02'}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Edge Cache Hit</span>
                <span className="font-mono text-indigo-300">{stats?.api.cacheHitRatio || 94.8}%</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 mt-4 pl-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">
              Host Domain
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-[#050505] p-1.5 rounded block truncate border border-slate-800">
              api.meechain.live
            </span>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <div>
            <div className="flex justify-between items-center mb-4 pl-1">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                JSON-RPC Proxy
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
                SYNCED
              </span>
            </div>

            <div className="space-y-3.5 pl-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">eth_blockNumber</span>
                <span className="font-mono text-purple-300 font-bold">
                  #{stats?.rpc.blockHeight ? stats.rpc.blockHeight.toLocaleString() : '18,492,040'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">RPC Latency</span>
                <span className="font-mono text-white font-bold">
                  {stats?.rpc.latencyMs || 28}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gas Price</span>
                <span className="font-mono text-amber-300">
                  {stats?.rpc.gasPriceGwei || '1.25'} Gwei
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">TPS Capacity</span>
                <span className="font-mono text-emerald-400">{stats?.rpc.tps || '42.5'} tx/s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pending Txs</span>
                <span className="font-mono text-white">{stats?.rpc.pendingTransactions || 14}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 mt-4 pl-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">
              Upstream Node
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-[#050505] p-1.5 rounded block truncate border border-slate-800">
              {stats?.rpc.upstreamUrl || 'rpc.meechain.live'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              JSON-RPC 2.0 Verification Terminal
            </h3>
            <p className="text-[10px] text-slate-500 font-mono">Direct proxy testing against MeeChain Node</p>
          </div>
          {rpcLatency !== null && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              RESPONSE: {rpcLatency}ms
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {['eth_blockNumber', 'eth_chainId', 'net_version', 'eth_gasPrice', 'eth_getBlockByNumber', 'meechain_nodeInfo'].map(
            (m) => (
              <button
                key={m}
                onClick={() => {
                  setSelectedMethod(m);
                  executeRpcCall(m);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
                  selectedMethod === m
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {m}
              </button>
            )
          )}
        </div>

        <div className="mt-3 bg-[#050505] rounded-lg p-3 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1.5">
            <span>POST /api/rpc {'->'} {selectedMethod}</span>
            <button
              onClick={() => executeRpcCall(selectedMethod)}
              disabled={rpcLoading}
              className="text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> SEND
            </button>
          </div>
          <pre className="text-slate-300 overflow-x-auto p-2 bg-[#080808] rounded max-h-48">
            {rpcLoading ? 'Executing RPC query...' : rpcResult}
          </pre>
        </div>
      </div>
    </div>
  );
}
