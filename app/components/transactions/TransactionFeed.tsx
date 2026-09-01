'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, RefreshCw, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';
import { verifyTransactionFeed } from '@/lib/verification';
import { VerificationSummary } from '../verification/VerificationInspector';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: string;
  status: 'confirmed';
}

interface TxResponse {
  transactions: Transaction[];
  count: number;
  mock: boolean;
  updatedAt: string;
}

function truncateAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function truncateHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function TransactionFeed() {
  const [data, setData] = useState<TxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTx = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions?limit=10', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TxResponse;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTx();
  }, [fetchTx]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void fetchTx(), 10000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchTx]);

  const verification = verifyTransactionFeed({
    data: data
      ? {
          count: data.count,
          mock: data.mock,
          updatedAt: data.updatedAt,
          itemCount: data.transactions.length,
        }
      : null,
    error,
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <ArrowLeftRight className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              TRANSACTION <span className="text-indigo-400 font-normal">FEED</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
              Latest On-Chain Transfers & Contract Calls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.mock && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              MOCK DATA
            </span>
          )}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            AUTO {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => void fetchTx()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-300 text-xs font-mono rounded-lg border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
         <div className="mt-4 w-full max-w-md sm:mt-0 sm:max-w-sm">
           <VerificationSummary result={verification} label="Transaction verification" />
         </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Recent Transactions
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            {data?.count ?? 0} records
          </span>
        </div>

        {!data && !error ? (
          <div className="py-16 text-center text-slate-600 text-xs font-mono">
            Loading transactions...
          </div>
        ) : data && data.transactions.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {data.transactions.map((tx) => (
              <div
                key={tx.hash}
                className="px-5 py-3.5 hover:bg-[#050505] transition group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white truncate">
                          {truncateHash(tx.hash)}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-500">
                        <span className="text-indigo-400">{truncateAddr(tx.from)}</span>
                        <span className="text-slate-600">{'->'}</span>
                        <span className="text-purple-300">{truncateAddr(tx.to)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {tx.value}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Block #{tx.blockNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400">
                        {timeAgo(tx.timestamp)}
                      </div>
                      <div className="text-[9px] font-mono text-emerald-400/70 uppercase">
                        confirmed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-600 text-xs font-mono">
            No transactions found
          </div>
        )}
      </div>
    </div>
  );
}
