'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Activity, ShieldCheck, FileCode2, Layers3, Terminal, Radio, ArrowLeftRight, Trophy } from 'lucide-react';
import { MagicOrbView } from './components/magic/MagicOrbView';
import { MagicHallView } from './components/magic/MagicHallView';
import { StatsMonitorView } from './components/stats/StatsMonitorView';
import { VerificationSuiteView } from './components/verification/VerificationSuiteView';
import { ProductionCodeHub } from './components/production/ProductionCodeHub';
import { JsonRpcTerminal } from './components/rpc/JsonRpcTerminal';
import { LiveQueryPanel } from './components/live/LiveQueryPanel';
import { TransactionFeed } from './components/transactions/TransactionFeed';
import { QuestLeaderboard } from './components/leaderboard/QuestLeaderboard';
import { AggregatedStats } from './components/types';

type TabId = 'orb' | 'hall' | 'stats' | 'rpc' | 'live' | 'tx' | 'leaderboard' | 'verification' | 'production';

const TABS: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: 'orb', label: 'Magic Orb', icon: Sparkles },
  { id: 'hall', label: 'Magic Hall', icon: Layers3 },
  { id: 'stats', label: 'Telemetry', icon: Activity },
  { id: 'rpc', label: 'RPC Terminal', icon: Terminal },
  { id: 'live', label: 'Live Query', icon: Radio },
  { id: 'tx', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'production', label: 'Production Files', icon: FileCode2 },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('orb');
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AggregatedStats;
      setStats(data);
    } catch (err: unknown) {
      setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    const interval = window.setInterval(() => void fetchStats(), 30000);
    return () => window.clearInterval(interval);
  }, [fetchStats]);

  return (
    <main className="min-h-screen bg-background text-foreground magic-shell">
      <div className="magic-backdrop" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
        <header className="magic-header mb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="magic-seal"><Layers3 className="h-7 w-7" /></div>
              <div>
                <p className="magic-kicker">MeeChain Magic Hall</p>
                <h1 className="font-serif text-2xl font-bold tracking-wide text-foreground sm:text-3xl">Network of Rituals</h1>
                <p className="mt-1 text-xs text-muted-foreground">A living archive of quests, relics, and guardians</p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div className="magic-live"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> NETWORK LIVE</div>
              <div className="magic-badge">AI-GENERATED</div>
            </div>
          </div>
        </header>

        <nav className="magic-nav mb-7" aria-label="Magic Hall sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-current={isActive ? 'page' : undefined}
                className={`magic-tab ${isActive ? 'magic-tab-active' : ''}`}>
                <Icon className="h-4 w-4" /> <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'orb' && <MagicOrbView chaosMode={false} />}
          {activeTab === 'hall' && <MagicHallView />}
          {activeTab === 'stats' && (
            <StatsMonitorView stats={stats} loading={statsLoading} error={statsError} onRefresh={fetchStats} />
          )}
          {activeTab === 'rpc' && <JsonRpcTerminal />}
          {activeTab === 'live' && <LiveQueryPanel />}
          {activeTab === 'tx' && <TransactionFeed />}
          {activeTab === 'leaderboard' && <QuestLeaderboard />}
          {activeTab === 'verification' && <VerificationSuiteView />}
          {activeTab === 'production' && <ProductionCodeHub />}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-4 pb-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono text-slate-600">
          <span>MeeChain Network Operations Center</span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500" /> Monitoring Active
          </span>
        </footer>
      </div>
    </main>
  );
}
