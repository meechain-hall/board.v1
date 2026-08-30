'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileCode2, Copy, Check, Download, FolderTree, GitBranch, Rocket } from 'lucide-react';
import { PRODUCTION_FILES } from '../data/productionCodeFiles';

interface FileContentState {
  content: string;
  sha: string;
  size: number;
  htmlUrl: string;
  loading: boolean;
  error: string | null;
}

interface CiStatus {
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

interface DeployStatus {
  deployment: { state: string; url: string; target: string; createdAt: number; commitSha?: string } | null;
  latestCommit: { sha: string; shortSha: string; message: string; date: string } | null;
  match: boolean | null;
  errors: { deployment: string | null; commit: string | null };
}

const CI_CONCLUSION_COLOR: Record<string, string> = {
  success: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  failure: 'text-red-400 border-red-500/40 bg-red-500/10',
};

const DEPLOY_STATE_COLOR: Record<string, string> = {
  READY: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  BUILDING: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  QUEUED: 'text-slate-400 border-slate-600 bg-slate-800/50',
  ERROR: 'text-red-400 border-red-500/40 bg-red-500/10',
  CANCELED: 'text-slate-500 border-slate-700 bg-slate-900',
};

export function ProductionCodeHub() {
  const [selectedFileId, setSelectedFileId] = useState<string>(PRODUCTION_FILES[0]?.id ?? '');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);
  const [fileState, setFileState] = useState<FileContentState>({
    content: '', sha: '', size: 0, htmlUrl: '', loading: true, error: null,
  });
  const [ci, setCi] = useState<CiStatus | null>(null);
  const [deploy, setDeploy] = useState<DeployStatus | null>(null);

  const selectedMeta = PRODUCTION_FILES.find((f) => f.id === selectedFileId) || PRODUCTION_FILES[0];

  const fetchFileContent = useCallback(async (id: string) => {
    setFileState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`/api/production/file-content?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setFileState({ content: json.content, sha: json.sha, size: json.size, htmlUrl: json.htmlUrl, loading: false, error: null });
    } catch (err) {
      setFileState({ content: '', sha: '', size: 0, htmlUrl: '', loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const fetchCiStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/production/ci-status');
      const json = await res.json();
      setCi(res.ok ? { run: json.run } : { run: null, error: json.error });
    } catch (err) {
      setCi({ run: null, error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const fetchDeployStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/production/deploy-status');
      const json = await res.json();
      setDeploy(json);
    } catch {
      setDeploy(null);
    }
  }, []);

  useEffect(() => {
    if (selectedFileId) fetchFileContent(selectedFileId);
  }, [selectedFileId, fetchFileContent]);

  useEffect(() => {
    fetchCiStatus();
    fetchDeployStatus();
    const t = setInterval(() => {
      fetchCiStatus();
      fetchDeployStatus();
    }, 30000);
    return () => clearInterval(t);
  }, [fetchCiStatus, fetchDeployStatus]);

  const handleCopy = () => {
    if (!fileState.content) return;
    navigator.clipboard.writeText(fileState.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fileState.content || !selectedMeta) return;
    const blob = new Blob([fileState.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedMeta.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredFiles = filterCategory === 'ALL'
    ? PRODUCTION_FILES
    : PRODUCTION_FILES.filter((f) => f.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center text-purple-400">
            <FileCode2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              PRODUCTION FILE HUB <span className="text-purple-400 font-normal">({PRODUCTION_FILES.length} FILES · LIVE FROM GITHUB)</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
              Read-only mirror of the private repo — content, CI, and deploy status fetched live
            </p>
          </div>
        </div>

        {/* CI + Deploy status panels */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-[#050505] border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" /> GitHub Actions
              </span>
              {ci?.run && (
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${CI_CONCLUSION_COLOR[ci.run.conclusion || ''] || 'text-slate-400 border-slate-700'}`}>
                  {ci.run.conclusion?.toUpperCase() || ci.run.status.toUpperCase()}
                </span>
              )}
            </div>
            {ci?.error && <span className="text-[10px] text-red-400 font-mono">{ci.error}</span>}
            {ci?.run && (
              <span className="text-[10px] text-slate-500 font-mono">
                {ci.run.branch}@{ci.run.commitSha} · {new Date(ci.run.updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="p-3 bg-[#050505] border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5">
                <Rocket className="w-3 h-3" /> Vercel Deployment
              </span>
              {deploy?.deployment && (
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${DEPLOY_STATE_COLOR[deploy.deployment.state] || 'text-slate-400 border-slate-700'}`}>
                  {deploy.deployment.state}
                </span>
              )}
            </div>
            {deploy?.errors?.deployment && <span className="text-[10px] text-red-400 font-mono block">{deploy.errors.deployment}</span>}
            {deploy?.match !== null && deploy?.match !== undefined && (
              <span className={`text-[10px] font-mono ${deploy.match ? 'text-emerald-400' : 'text-amber-400'}`}>
                {deploy.match ? '✓ SHA ตรงกับ GitHub HEAD' : '⚠ SHA ไม่ตรงกับ HEAD ล่าสุด'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File list */}
        <div className="lg:col-span-4 bg-[#0a0a0a] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5 text-purple-400" />
              Files ({PRODUCTION_FILES.length})
            </h3>
          </div>

          <div className="my-2.5 flex flex-wrap gap-1 text-[10px] font-mono">
            {['ALL', 'Components', 'API Routes', 'Config', 'CI/CD', 'Tests'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded border transition ${
                  filterCategory === cat
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-[#050505] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`p-2.5 rounded-lg border transition cursor-pointer font-mono ${
                  selectedFileId === file.id
                    ? 'bg-[#101010] border-purple-500/50 text-white'
                    : 'bg-[#050505] border-slate-800/80 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold truncate text-white max-w-[180px]">{file.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-purple-300 border border-slate-800">
                    {file.category}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block truncate">{file.targetPath}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File content */}
        <div className="lg:col-span-8 bg-[#0a0a0a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-mono text-xs font-bold text-white flex items-center gap-2">
                  {selectedMeta?.name}
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    {selectedMeta?.language.toUpperCase()}
                  </span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {selectedMeta?.targetPath}
                  {fileState.sha && ` · ${fileState.sha.slice(0, 7)}`}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleCopy} disabled={!fileState.content} className="flex items-center gap-1 px-2.5 py-1 bg-[#050505] hover:bg-slate-900 text-slate-300 text-xs font-mono rounded border border-slate-800 transition disabled:opacity-40">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
                <button onClick={handleDownload} disabled={!fileState.content} className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono rounded transition disabled:opacity-40">
                  <Download className="w-3 h-3" /> DOWNLOAD
                </button>
              </div>
            </div>

            <div className="mt-3 bg-[#050505] rounded-lg p-3 border border-slate-800 overflow-x-auto max-h-[460px] min-h-[200px]">
              {fileState.loading && <p className="text-xs font-mono text-slate-500">กำลังดึงจาก GitHub...</p>}
              {fileState.error && <p className="text-xs font-mono text-red-400">⚠ {fileState.error}</p>}
              {!fileState.loading && !fileState.error && (
                <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                  <code>{fileState.content}</code>
                </pre>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
            <span className="truncate max-w-md">{selectedMeta?.description}</span>
            <span className="text-purple-400">SOURCE: LIVE-PROBE (GITHUB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
