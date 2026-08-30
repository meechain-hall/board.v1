import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Activity,
  Code2,
} from 'lucide-react';
import { MagicOrbPayload } from '../types';

interface MagicOrbViewProps {
  chaosMode: boolean;
}

export function MagicOrbView({ chaosMode: _chaosMode }: MagicOrbViewProps) {
  const [data, setData] = useState<MagicOrbPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [resonating, setResonating] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [pulseLog, setPulseLog] = useState<Array<{ id: string; time: string; freq: number; energy: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchOrbData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);

    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        setRetryCount(attempt);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('/api/magic/orb', {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json: MagicOrbPayload = await res.json();
        
        if (
          typeof json.energyLevel !== 'number' ||
          typeof json.resonanceFrequency !== 'number' ||
          !json.harmonicState ||
          !json.rawPayload?.quantumState
        ) {
          throw new Error('API Contract Violation: invalid or missing payload keys');
        }

        setData(json);
        setLastUpdated(new Date());
        setError(null);
        setRetryCount(0);
        success = true;

        setPulseLog((prev) => [
          {
            id: json.rawPayload.pulseId,
            time: new Date().toLocaleTimeString(),
            freq: json.resonanceFrequency,
            energy: json.energyLevel,
          },
          ...prev.slice(0, 7),
        ]);
      } catch (err: unknown) {
        attempt++;
        if (attempt >= maxRetries) {
          setError(err instanceof Error ? err.message : 'MeeChain Magic Orb API Offline');
        } else {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrbData();
    const interval = setInterval(() => {
      fetchOrbData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchOrbData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 70;
      const currentEnergy = data ? data.energyLevel : 74.2;
      const currentFreq = data ? data.resonanceFrequency : 432;

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 100, centerY);
      ctx.lineTo(centerX + 100, centerY);
      ctx.moveTo(centerX, centerY - 100);
      ctx.lineTo(centerX, centerY + 100);
      ctx.stroke();

      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        const waveRadius = radius + i * 20;
        ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = error
          ? `rgba(244, 63, 94, ${0.25 / i})`
          : `rgba(99, 102, 241, ${0.35 / i})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        5,
        centerX,
        centerY,
        radius + (currentEnergy / 15)
      );

      if (error) {
        gradient.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
        gradient.addColorStop(0.5, 'rgba(225, 29, 72, 0.4)');
        gradient.addColorStop(1, 'rgba(159, 18, 57, 0)');
      } else {
        gradient.addColorStop(0, '#818cf8');
        gradient.addColorStop(0.3, '#6366f1');
        gradient.addColorStop(0.7, '#8b5cf6');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + Math.sin(angle * 2) * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const nodeCount = 6;
      for (let p = 0; p < nodeCount; p++) {
        const pAngle = angle + (p * (Math.PI * 2 / nodeCount));
        const pRadius = radius + 28;
        const px = centerX + Math.cos(pAngle) * pRadius;
        const py = centerY + Math.sin(pAngle) * pRadius;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = error ? '#f43f5e' : '#a78bfa';
        ctx.shadowColor = error ? '#f43f5e' : '#818cf8';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      angle += 0.015 * (currentFreq / 400);
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, error]);

  const triggerResonance = async () => {
    setResonating(true);
    try {
      const res = await fetch('/api/magic/orb/resonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchOrbData(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResonating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  MAGIC ORB <span className="text-indigo-400 font-normal">RESONANCE</span>
                </h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                  Quantum Coherence Matrix & Autonomous Node Sync
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {loading && !data ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" /> CALIBRATING
              </span>
            ) : error ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-mono rounded-full">
                <WifiOff className="w-3 h-3" /> BACKEND OFFLINE (RETRY {retryCount}/3)
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold text-emerald-400">
                  CONTRACT VERIFIED
                </span>
              </div>
            )}

            <button
              onClick={() => fetchOrbData(false)}
              className="p-2 bg-[#050505] hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 ${
                showRawJson
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              {showRawJson ? 'HIDE CONTRACT' : 'INSPECT JSON'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-rose-200">Orb Stream Disconnected: </span>
                  <span className="text-rose-300/80">{error}</span>
                  {lastUpdated && (
                    <p className="text-[10px] text-rose-400/60 font-mono mt-0.5">
                      Last Verified: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchOrbData(false)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono rounded-lg transition"
              >
                RECONNECT
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-3 bg-[#050505] border border-slate-800 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 pl-1">
                Orb Resonance State
              </h3>
              <div className="space-y-3 pl-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Harmonic State</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {data?.harmonicState || 'Resonant'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resonance Freq</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {data?.resonanceFrequency || 432.0} Hz
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Coherence Index</span>
                  <span className="font-mono text-white">
                    {(Number(data?.coherenceIndex || 0.985) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Connected Peers</span>
                  <span className="font-mono text-white">{data?.activeNodesConnected || 128}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 mt-4 pl-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Quantum State
              </span>
              <span className="text-[11px] font-mono text-indigo-300 bg-[#0a0a0a] p-1.5 rounded block truncate border border-slate-800">
                {data?.rawPayload?.quantumState || 'COHERENT_HARMONIC_MATRIX'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#050505] border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center p-6 min-h-[300px] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="w-60 h-60 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-pulse" />
              <div className="absolute inset-3 rounded-full border border-purple-500/30" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-t from-indigo-900/40 to-transparent backdrop-blur-xl flex items-center justify-center shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]">
                <div className="text-center z-10">
                  <span className="block text-[10px] uppercase tracking-widest text-indigo-300 opacity-70 mb-0.5">
                    Magic Orb
                  </span>
                  <span className="block text-3xl font-bold text-white font-mono">
                    {data?.energyLevel || 74.2}
                  </span>
                  <span className="block text-[9px] text-emerald-400 font-mono tracking-wider">
                    SYNCING REAL-TIME
                  </span>
                </div>
              </div>

              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />

              <canvas
                ref={canvasRef}
                width={240}
                height={240}
                className="w-full h-full object-contain pointer-events-none absolute inset-0 opacity-70"
              />
            </div>

            <div className="mt-4 text-center w-full px-4">
              <p className="text-xs text-slate-400 italic font-serif leading-relaxed">
                &quot;MeeChain does not build walls to control difference, but builds bridges so that difference can work together.&quot;
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 bg-[#050505] border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                Decentralized Entropy
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Entropy Hash</span>
                  <span className="font-mono text-[11px] text-slate-300 break-all block">
                    {data?.entropyHash || '0x4f882a...981c'}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase">EIP-191 Signature</span>
                  <span className="font-mono text-[11px] text-indigo-300 break-all block">
                    {data?.rawPayload?.signature || '0x3a9f1b...8f02'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={triggerResonance}
                disabled={resonating || !!error}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Zap className={`w-3.5 h-3.5 ${resonating ? 'animate-bounce' : ''}`} />
                {resonating ? 'RESONATING...' : 'TRIGGER PULSE'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-[#050505] border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <div className="p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Error Rate</span>
            <span className="text-xl font-mono font-bold text-white mt-1">0.02%</span>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Requests/s</span>
            <span className="text-xl font-mono font-bold text-white mt-1">1.4k</span>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Verified Origin</span>
            <span className="text-xs font-mono text-indigo-300 mt-2 truncate">*.vercel.app</span>
          </div>
          <div className="p-3.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Last Verified</span>
            <span className="text-xs font-mono text-white mt-2">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Live'}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {showRawJson && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-4 border-t border-slate-800"
            >
              <div className="bg-[#050505] rounded-xl p-4 border border-slate-800 text-xs font-mono">
                <div className="flex justify-between text-slate-400 mb-2">
                  <span className="text-indigo-400 font-semibold uppercase">API Contract: /api/magic/orb</span>
                  <span className="text-emerald-400 text-[10px]">HTTP 200 OK</span>
                </div>
                <pre className="text-slate-300 overflow-x-auto p-2 bg-[#080808] rounded-lg">
                  {JSON.stringify(data || { status: 'waiting_for_contract' }, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 text-white">
        <h3 className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          Harmonic Pulse Stream Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-2 text-[10px] uppercase">Pulse ID</th>
                <th className="pb-2 text-[10px] uppercase">Time</th>
                <th className="pb-2 text-[10px] uppercase">Freq</th>
                <th className="pb-2 text-[10px] uppercase">Energy</th>
                <th className="pb-2 text-[10px] uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pulseLog.map((pulse, idx) => (
                <tr key={pulse.id + idx} className="hover:bg-slate-900/40">
                  <td className="py-2 text-indigo-300">{pulse.id}</td>
                  <td className="py-2 text-slate-400">{pulse.time}</td>
                  <td className="py-2 text-white">{pulse.freq} Hz</td>
                  <td className="py-2 text-amber-300">{pulse.energy}%</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      DELIVERED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
