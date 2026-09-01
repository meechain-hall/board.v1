'use client';

import { useState } from 'react';
import { Terminal, Send, RefreshCw, Trash2 } from 'lucide-react';
import { verifyRpc } from '@/lib/verification';
import { VerificationSummary } from '../verification/VerificationInspector';

interface RpcResponse {
  id: number;
  method: string;
  result: unknown;
  latency: number;
  error?: string;
  checkedAt: string;
}

const PRESET_METHODS = [
  'eth_blockNumber',
  'eth_chainId',
  'net_version',
  'eth_gasPrice',
  'eth_getBlockByNumber',
  'meechain_nodeInfo',
];

export function JsonRpcTerminal() {
  const [responses, setResponses] = useState<RpcResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('eth_blockNumber');
  const [customMethod, setCustomMethod] = useState('');
  const [customParams, setCustomParams] = useState('[]');

  const callRpc = async (method: string, params: unknown[] = []) => {
    setLoading(true);
    const start = performance.now();
    const id = Date.now();

    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }),
      });

      const data = await res.json();
      const latency = Math.round(performance.now() - start);

      setResponses((prev) => [
        {
          id,
          method,
          result: data.result ?? data,
          latency,
          error: data.error ? JSON.stringify(data.error) : undefined,
          checkedAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: unknown) {
      setResponses((prev) => [
        {
          id,
          method,
          result: null,
          latency: Math.round(performance.now() - start),
          error: err instanceof Error ? err.message : 'Request failed',
          checkedAt: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (method: string) => {
    setSelectedMethod(method);
    const params = method === 'eth_getBlockByNumber' ? ['latest', true] : [];
    void callRpc(method, params);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMethod.trim()) return;
    let parsedParams: unknown[];
    try {
      parsedParams = JSON.parse(customParams || '[]');
    } catch {
      parsedParams = [];
    }
    void callRpc(customMethod.trim(), parsedParams);
  };

  const formatResult = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      if (value.startsWith('0x') && value.length > 12) {
        return `${value.slice(0, 12)}...${value.slice(-6)}`;
      }
      return value;
    }
    return JSON.stringify(value, null, 2);
  };

  const verification = verifyRpc({ latest: responses[0] || null });

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                JSON-RPC <span className="text-indigo-400 font-normal">TERMINAL</span>
              </h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                Direct Proxy Testing Against MeeChain Node
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {responses.length > 0 && (
              <button
                onClick={() => setResponses([])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-mono rounded-lg border border-slate-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                CLEAR
              </button>
            )}
            <span className="text-[10px] font-mono text-slate-500">
              {responses.length} QUERIES
            </span>
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <VerificationSummary result={verification} label="RPC verification" />
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {PRESET_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => handlePreset(m)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
                selectedMethod === m && !loading
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-500/20'
                  : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              } disabled:opacity-50`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customMethod}
            onChange={(e) => setCustomMethod(e.target.value)}
            placeholder="Custom method (e.g. eth_getBalance)"
            className="flex-1 bg-[#050505] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
          />
          <input
            type="text"
            value={customParams}
            onChange={(e) => setCustomParams(e.target.value)}
            placeholder='params JSON (e.g. ["0x0", "latest"])'
            className="w-full sm:w-56 bg-[#050505] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={loading || !customMethod.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg transition"
          >
            <Send className="w-3.5 h-3.5" />
            SEND
          </button>
        </form>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            Executing RPC query...
          </div>
        )}
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-800">
          <Terminal className="w-4 h-4 text-indigo-400" />
          Response Log
        </h3>

        {responses.length === 0 && !loading ? (
          <div className="mt-6 text-center py-12 text-slate-600 text-xs font-mono">
            No queries yet. Select a method above or submit a custom call.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {responses.map((r) => (
              <div
                key={r.id}
                className="border border-slate-800 rounded-lg p-3 bg-[#050505] font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">{r.method}</span>
                    {r.error ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        ERROR
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        200 OK
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{r.latency}ms</span>
                </div>

                {r.error ? (
                  <pre className="text-rose-300 overflow-x-auto p-2 bg-[#080808] rounded">
                    {r.error}
                  </pre>
                ) : (
                  <pre className="text-slate-300 overflow-x-auto p-2 bg-[#080808] rounded max-h-48 overflow-y-auto">
                    {formatResult(r.result)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
