'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronRight, CircleHelp, ShieldAlert, XCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { Evidence, EvidenceResult, VerificationResult, VerificationStatus } from '@/lib/verification';

const STATUS_META: Record<
  VerificationStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  verified: {
    label: 'VERIFIED',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'DEGRADED',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: ShieldAlert,
  },
  failed: {
    label: 'FAILED',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    icon: XCircle,
  },
  unknown: {
    label: 'UNKNOWN',
    color: 'text-slate-400 border-slate-600 bg-slate-800/50',
    icon: CircleHelp,
  },
};

const EVIDENCE_RESULT_META: Record<
  EvidenceResult,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  passed: { label: 'PASS', color: 'text-emerald-400', icon: CheckCircle2 },
  failed: { label: 'FAIL', color: 'text-rose-400', icon: XCircle },
  unknown: { label: 'UNKNOWN', color: 'text-slate-400', icon: CircleHelp },
};

function formatValue(value: Evidence['value']): string {
  if (value === null || value === undefined) return 'Not available';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function formatCheckedAt(value: string): string {
  if (value === 'Not checked yet') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function StatusBadge({
  status,
  compact = false,
}: {
  status: VerificationStatus;
  compact?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-semibold ${meta.color} ${
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {meta.label}
    </span>
  );
}

function EvidenceCard({ item }: { item: Evidence }) {
  const meta = EVIDENCE_RESULT_META[item.result];
  const Icon = meta.icon;
  return (
    <div className="rounded-xl border border-slate-800 bg-[#070707] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.color}`} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-200">{item.what}</p>
            <p className="mt-0.5 break-all font-mono text-[9px] text-slate-500">{item.source}</p>
          </div>
        </div>
        <span className={`shrink-0 font-mono text-[9px] font-semibold ${meta.color}`}>{meta.label}</span>
      </div>
      <div className="mt-3 grid gap-2 text-[10px]">
        <div className="grid grid-cols-[52px_1fr] gap-2">
          <span className="uppercase tracking-wider text-slate-600">VALUE</span>
          <span className="break-words font-mono text-slate-300">{formatValue(item.value)}</span>
        </div>
        <div className="grid grid-cols-[52px_1fr] gap-2">
          <span className="uppercase tracking-wider text-slate-600">CHECK</span>
          <span className="text-slate-400">{item.check}</span>
        </div>
        <div className="grid grid-cols-[52px_1fr] gap-2">
          <span className="uppercase tracking-wider text-slate-600">TIME</span>
          <span className="font-mono text-slate-500">{formatCheckedAt(item.checkedAt)}</span>
        </div>
      </div>
      {item.metadata && (
        <details className="mt-3 border-t border-slate-800/80 pt-2">
          <summary className="cursor-pointer font-mono text-[9px] text-slate-600 hover:text-slate-400">metadata</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[9px] text-slate-500">
            {JSON.stringify(item.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function EvidenceInspector({
  result,
  open,
  onOpenChange,
  title = 'Evidence Inspector',
}: {
  result: VerificationResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-slate-800 bg-[#0a0a0a] text-white sm:max-w-xl">
        <SheetHeader className="border-b border-slate-800 pb-5 pr-8 text-left">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-mono text-sm uppercase tracking-wider text-white">{title}</SheetTitle>
            <StatusBadge status={result.status} />
          </div>
          <SheetDescription className="text-xs leading-relaxed text-slate-400">
            Why MeeChain reports this result, and which systems supplied the evidence.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-5">
          <div className="rounded-xl border border-slate-800 bg-[#050505] p-4">
            <p className="text-sm leading-relaxed text-slate-200">{result.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div>
                <span className="block uppercase tracking-wider text-slate-600">SOURCE</span>
                <span className="mt-1 block break-words text-slate-300">{result.source}</span>
              </div>
              <div>
                <span className="block uppercase tracking-wider text-slate-600">CHECKED</span>
                <span className="mt-1 block break-words text-slate-300">{formatCheckedAt(result.checkedAt)}</span>
              </div>
              <div>
                <span className="block uppercase tracking-wider text-slate-600">EVIDENCE</span>
                <span className="mt-1 block text-slate-300">{result.evidence.length} items</span>
              </div>
              <div>
                <span className="block uppercase tracking-wider text-slate-600">STATUS</span>
                <span className="mt-1 block text-slate-300">{STATUS_META[result.status].label}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Evidence chain
              </h3>
              <span className="font-mono text-[9px] text-slate-600">WHAT · SOURCE · VALUE · CHECK · TIME</span>
            </div>
            {result.evidence.map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function VerificationSummary({
  result,
  label = 'Verification',
}: {
  result: VerificationResult;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#050505] px-3 py-2 text-left transition hover:border-indigo-500/50 hover:bg-indigo-500/5"
        aria-label={`View ${label} evidence`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <StatusBadge status={result.status} compact />
          <span className="truncate font-mono text-[10px] text-slate-400">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[9px] text-slate-500 group-hover:text-slate-300">
          {result.evidence.length} evidence
          <ChevronRight className="h-3 w-3" />
        </span>
      </button>
      <EvidenceInspector result={result} open={open} onOpenChange={setOpen} title={`${label} · Evidence Inspector`} />
    </>
  );
}
