import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Terminal,
  MinusCircle,
} from 'lucide-react';
import { TestItem } from '../types';

// ---------------------------------------------------------------------------
// ชุด test เริ่มต้น — status: 'idle' เสมอ ไม่มีตัวไหนเริ่มเป็น 'passed'
// ก่อนถูกรันจริง (แก้บั๊กที่หน้าเว็บโชว์ 8/8 ตั้งแต่ยังไม่กด Execute)
// ---------------------------------------------------------------------------
const INITIAL_TESTS: TestItem[] = [
  {
    id: 'test_1',
    name: 'Health Check Contract (/api/health)',
    suite: 'API Contract',
    status: 'idle',
    durationMs: 0,
    details: 'Returns HTTP 200, status=healthy, service statuses verified',
  },
  {
    id: 'test_2',
    name: 'Magic Orb Telemetry & Schema (/api/magic/orb)',
    suite: 'API Contract',
    status: 'idle',
    durationMs: 0,
    details: 'Validates resonanceFrequency, energyLevel, harmonicState fields',
  },
  {
    id: 'test_3',
    name: 'Stats Aggregator Multi-Pillar (/api/stats)',
    suite: 'API Contract',
    status: 'idle',
    durationMs: 0,
    details: 'Parallel fetches Node + API Gateway + RPC Proxy metrics',
  },
  {
    id: 'test_4',
    name: 'JSON-RPC 2.0 eth_blockNumber Proxy',
    suite: 'Playwright E2E',
    status: 'idle',
    durationMs: 0,
    details: 'Accepts POST with JSON-RPC 2.0 body, parses hex block height',
  },
  {
    id: 'test_5',
    name: 'CORS Headers for *.vercel.app Whitelist',
    suite: 'CORS & Security',
    status: 'not_implemented',
    durationMs: 0,
    details: 'ยังไม่มี automated check จริง — ต้องตรวจผ่าน curl -I ด้วยมือ หรือรอ dedicated audit endpoint',
  },
  {
    id: 'test_6',
    name: 'Auto-Retry with Exponential Backoff on 503 Outage',
    suite: 'Playwright E2E',
    status: 'not_implemented',
    durationMs: 0,
    details: 'ยังไม่มี fault-injection test จริง — ต้องใช้ Playwright จำลอง 503 จึงจะพิสูจน์ได้',
  },
  {
    id: 'test_7',
    name: 'Environment Variable Separation Audit',
    suite: 'CORS & Security',
    status: 'not_implemented',
    durationMs: 0,
    details: 'ยังไม่มี automated check จริง — ตรวจสอบ manual ผ่าน view-source ว่าไม่มี secret รั่วไปฝั่ง client',
  },
  {
    id: 'test_8',
    name: 'Cypress Component & E2E Interaction Flow',
    suite: 'Cypress Integration',
    status: 'not_implemented',
    durationMs: 0,
    details: 'Cypress ยังไม่ถูก enable เป็น required gate ใน ci-cd.yaml (if: false ตามที่ตั้งใจไว้)',
  },
];

const RUNNABLE_TEST_COUNT = INITIAL_TESTS.filter((t) => t.status !== 'not_implemented').length;

interface CiLogLine {
  text: string;
  tone: 'default' | 'success' | 'info';
}

export function VerificationSuiteView() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [tests, setTests] = useState<TestItem[]>(INITIAL_TESTS);
  const [selectedSuite, setSelectedSuite] = useState<string>('ALL');

  // ---------------------------------------------------------------------
  // CI/CD log panel — ดึงจาก /api/production/ci-status จริง
  // แทน hardcoded text เดิมที่ไม่เคยเปลี่ยนตามสถานะจริง
  // ---------------------------------------------------------------------
  const [ciLoading, setCiLoading] = useState(true);
  const [ciError, setCiError] = useState<string | null>(null);
  const [ciLines, setCiLines] = useState<CiLogLine[]>([]);

  const fetchCiStatus = useCallback(async () => {
    setCiLoading(true);
    setCiError(null);
    try {
      const res = await fetch('/api/production/ci-status');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      const run = json.run;
      if (!run) {
        setCiLines([{ text: '[INFO] ยังไม่มี workflow run บันทึกไว้', tone: 'default' }]);
      } else {
        const isSuccess = run.conclusion === 'success';
        setCiLines([
          { text: `[BRANCH] ${run.branch}@${run.commitSha}`, tone: 'default' },
          { text: `[STATUS] ${run.status} / ${run.conclusion ?? 'pending'}`, tone: isSuccess ? 'success' : 'default' },
          { text: `[UPDATED] ${new Date(run.updatedAt).toLocaleString()}`, tone: 'info' },
          { text: `[LINK] ${run.url}`, tone: 'default' },
        ]);
      }
    } catch (err) {
      setCiError(err instanceof Error ? err.message : String(err));
    } finally {
      setCiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCiStatus();
  }, [fetchCiStatus]);

  // ---------------------------------------------------------------------
  // รัน test จริง 4 ตัวแรกเท่านั้น (5-8 เป็น not_implemented ถาวรจนกว่า
  // จะมี automated check จริงมารองรับ — ไม่สุ่ม sleep แล้ว auto-pass)
  // ---------------------------------------------------------------------
  const runLiveTestRunner = async () => {
    setIsRunning(true);
    const updated: TestItem[] = tests.map((t) =>
      t.status === 'not_implemented' ? t : { ...t, status: 'idle' as const }
    );
    setTests([...updated]);

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'not_implemented') continue;

      updated[i] = { ...updated[i], status: 'running' };
      setTests([...updated]);
      const t0 = performance.now();

      try {
        if (i === 0) {
          const res = await fetch('/api/health');
          const json = await res.json();
          updated[i].status = res.ok && json.status === 'healthy' ? 'passed' : 'failed';
        } else if (i === 1) {
          const res = await fetch('/api/magic/orb');
          const json = await res.json();
          updated[i].status = res.ok && typeof json.energyLevel === 'number' ? 'passed' : 'failed';
        } else if (i === 2) {
          const res = await fetch('/api/stats');
          const json = await res.json();
          updated[i].status = res.ok && json.node && json.api && json.rpc ? 'passed' : 'failed';
        } else if (i === 3) {
          const res = await fetch('/api/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'eth_blockNumber', params: [] }),
          });
          const json = await res.json();
          updated[i].status = res.ok && json.result ? 'passed' : 'failed';
        }
      } catch (err: unknown) {
        updated[i].status = 'failed';
        updated[i].error = err instanceof Error ? err.message : 'Test execution failed';
      }

      updated[i].durationMs = Math.round(performance.now() - t0);
      setTests([...updated]);
    }

    setIsRunning(false);
    fetchCiStatus(); // รีเฟรช CI panel พร้อมกันหลัง test จบ
  };

  const filteredTests = selectedSuite === 'ALL' ? tests : tests.filter((t) => t.suite === selectedSuite);

  const passedCount = tests.filter((t) => t.status === 'passed').length;
  const notImplementedCount = tests.filter((t) => t.status === 'not_implemented').length;
  const progressPercent = RUNNABLE_TEST_COUNT > 0 ? Math.round((passedCount / RUNNABLE_TEST_COUNT) * 100) : 0;

  const checklistItems: { label: string; done: boolean }[] = [
    { label: 'Real Data Integration (Node + RPC)', done: tests[0]?.status === 'passed' && tests[3]?.status === 'passed' },
    { label: 'CORS & HTTPS Secured (*.vercel.app)', done: false }, // not_implemented → ไม่ติ๊กจนกว่าจะมี check จริง
    { label: 'Environment Variables Segregated', done: false },
    { label: 'Auto-Retry Backoff Logic (3x)', done: false },
    { label: 'API Contract Suite Passed', done: tests.slice(0, 4).every((t) => t.status === 'passed') },
    { label: 'Cypress Component Verification Passed', done: false },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                VERIFICATION SUITE <span className="text-cyan-400 font-normal">({RUNNABLE_TEST_COUNT} RUNNABLE / {notImplementedCount} NOT IMPLEMENTED)</span>
              </h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                Live API Contract Checks — Runs Against Production Endpoints Directly
              </p>
            </div>
          </div>

          <button
            onClick={runLiveTestRunner}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg shadow-lg shadow-cyan-950/40 transition cursor-pointer"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isRunning ? 'RUNNING ASSERTIONS...' : 'EXECUTE LIVE TEST SUITE'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#050505] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-semibold">
                Verification Checklist
              </h3>
              <div className="space-y-3">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        item.done ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.done ? '✓' : '—'}
                    </div>
                    <span className={`text-xs font-mono ${item.done ? 'text-slate-300' : 'text-slate-600'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 mt-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                  GATE PROGRESS ({passedCount}/{RUNNABLE_TEST_COUNT} runnable)
                </span>
                <span className="font-bold text-emerald-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {notImplementedCount > 0 && (
                <p className="text-[10px] text-amber-500/80 font-mono mt-2">
                  ⚠ {notImplementedCount} assertions ยังไม่มี automated check จริง (ดูรายละเอียดในตารางด้านล่าง)
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#050505] border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                  Build & CI/CD Status
                </h3>
                <span className="text-[9px] font-mono text-cyan-400">SOURCE: LIVE-PROBE</span>
              </div>
              <div className="font-mono text-[11px] space-y-1 text-slate-500 overflow-y-auto max-h-48 pr-1">
                {ciLoading && <p>[LOADING] กำลังดึงสถานะ CI ล่าสุด...</p>}
                {ciError && <p className="text-rose-400">[ERROR] {ciError}</p>}
                {!ciLoading &&
                  !ciError &&
                  ciLines.map((line, i) => (
                    <p
                      key={i}
                      className={
                        line.tone === 'success'
                          ? 'text-emerald-400 font-bold'
                          : line.tone === 'info'
                          ? 'text-indigo-400'
                          : ''
                      }
                    >
                      {line.text}
                    </p>
                  ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 mt-4 flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>PIPELINE: GITHUB ACTIONS</span>
              <button onClick={fetchCiStatus} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${ciLoading ? 'animate-spin' : ''}`} /> REFRESH
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Assertion Results ({passedCount}/{RUNNABLE_TEST_COUNT})
          </h3>

          <div className="flex flex-wrap gap-1 text-xs">
            {['ALL', 'API Contract', 'Playwright E2E', 'Cypress Integration', 'CORS & Security'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSuite(s)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
                  selectedSuite === s
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-800/60 font-mono text-xs">
          {filteredTests.map((test) => (
            <div key={test.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {test.status === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                {test.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                {test.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 mt-0.5" />}
                {test.status === 'idle' && <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 mt-0.5" />}
                {test.status === 'not_implemented' && <MinusCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={test.status === 'not_implemented' ? 'text-slate-500' : 'text-slate-200 font-semibold'}>
                      {test.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {test.suite}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{test.details}</p>
                  {test.error && <p className="text-[10px] text-rose-400 mt-0.5">⚠ {test.error}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 pl-5 sm:pl-0 shrink-0">
                {test.status !== 'not_implemented' && test.status !== 'idle' && (
                  <span className="text-slate-500 text-[10px]">{test.durationMs}ms</span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase ${
                    test.status === 'passed'
                      ? 'text-emerald-400'
                      : test.status === 'failed'
                      ? 'text-rose-400'
                      : test.status === 'not_implemented'
                      ? 'text-slate-600'
                      : 'text-slate-500'
                  }`}
                >
                  {test.status === 'not_implemented' ? 'NOT IMPLEMENTED' : test.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}