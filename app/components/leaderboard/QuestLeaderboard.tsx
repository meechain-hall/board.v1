'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Crown, Medal, Award, Clock } from 'lucide-react';
import { verifyLeaderboard } from '@/lib/verification';
import { VerificationSummary } from '../verification/VerificationInspector';

interface LeaderboardEntry {
  rank: number;
  address: string;
  ritualsConfirmed: number;
  blessingsSent: number;
  relicsCreated: number;
  totalScore: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  count: number;
  mock: boolean;
  updatedAt: string;
}

function truncateAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function rankIcon(rank: number) {
  if (rank === 1) return { Icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  if (rank === 2) return { Icon: Medal, color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  if (rank === 3) return { Icon: Award, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
  return null;
}

export function QuestLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quest-leaderboard?limit=10', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as LeaderboardResponse;
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const verification = verifyLeaderboard({
    data: data
      ? {
          count: data.count,
          mock: data.mock,
          updatedAt: data.updatedAt,
          itemCount: data.leaderboard.length,
        }
      : null,
    error,
  });

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              QUEST <span className="text-amber-400 font-normal">LEADERBOARD</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
              Top Ritual Performers & Relic Crafters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.mock && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              MOCK DATA
            </span>
          )}
          {data && (
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void fetchLeaderboard()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050505] hover:bg-slate-900 text-slate-300 text-xs font-mono rounded-lg border border-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
         <div className="mt-4 w-full max-w-md sm:mt-0 sm:max-w-sm">
           <VerificationSummary result={verification} label="Leaderboard verification" />
         </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Podium for top 3 */}
      {data && data.leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[1, 0, 2].map((idx) => {
            const entry = data.leaderboard[idx];
            const rankInfo = rankIcon(entry.rank);
            if (!rankInfo) return null;
            const { Icon, color, bg, border } = rankInfo;
            const heightClass = entry.rank === 1 ? 'sm:pt-6' : '';
            return (
              <div
                key={entry.rank}
                className={`bg-[#0a0a0a] border ${border} rounded-2xl p-4 sm:p-5 text-center ${heightClass} relative overflow-hidden`}
              >
                {entry.rank === 1 && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                )}
                <div className={`w-10 h-10 ${bg} ${border} border rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className={`text-2xl font-bold font-mono ${color} mb-1`}>
                  #{entry.rank}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mb-2">
                  {truncateAddr(entry.address)}
                </div>
                <div className="text-lg font-bold font-mono text-white">
                  {entry.totalScore}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono">
                  pts
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Full Rankings
          </h3>
        </div>

        {!data && !error ? (
          <div className="py-16 text-center text-slate-600 text-xs font-mono">
            Loading leaderboard...
          </div>
        ) : data && data.leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 text-left font-semibold">Rank</th>
                  <th className="px-5 py-2.5 text-left font-semibold">Address</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Rituals</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Blessings</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Relics</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.leaderboard.map((entry) => {
                  const rankInfo = rankIcon(entry.rank);
                  return (
                    <tr key={entry.rank} className="hover:bg-[#050505] transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {rankInfo ? (
                            <rankInfo.Icon className={`w-4 h-4 ${rankInfo.color}`} />
                          ) : (
                            <span className="w-4 h-4 flex items-center justify-center text-[10px] font-mono text-slate-500">
                              {entry.rank}
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-white">
                            #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono text-slate-300">
                          {truncateAddr(entry.address)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-mono text-indigo-400">{entry.ritualsConfirmed}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-mono text-emerald-400">{entry.blessingsSent}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-mono text-purple-300">{entry.relicsCreated}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-mono font-bold text-amber-400">{entry.totalScore}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-600 text-xs font-mono">
            No leaderboard data
          </div>
        )}
      </div>
    </div>
  );
}
