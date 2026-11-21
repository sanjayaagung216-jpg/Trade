import { AlertTriangle, ShieldAlert, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { MonthlyRiskEvaluation } from '../types/trading';
import { formatIDR, formatMonthID } from '../utils/tradingLogic';

interface RiskBannerProps {
  risk: MonthlyRiskEvaluation;
  onOpenSettings: () => void;
}

export function RiskBanner({ risk, onOpenSettings }: RiskBannerProps) {
  const isExceeded = risk.status === 'EXCEEDED';
  const isApproaching = risk.status === 'APPROACHING';

  const containerStyle = isExceeded
    ? 'border-red-500/70 bg-gradient-to-br from-red-950/60 via-[#111827] to-[#111827]'
    : isApproaching
      ? 'border-orange-500/60 bg-gradient-to-br from-orange-950/50 via-[#111827] to-[#111827]'
      : 'border-emerald-500/35 bg-gradient-to-br from-emerald-950/35 via-[#111827] to-[#111827]';

  const iconBoxStyle = isExceeded
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : isApproaching
      ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  const barColor = isExceeded
    ? 'bg-red-500'
    : isApproaching
      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
      : 'bg-emerald-500';

  const statusLabel = isExceeded
    ? 'Bahaya · Batas Loss Bulanan Terlampaui'
    : isApproaching
      ? 'Peringatan · Mendekati Batas Loss Bulanan'
      : 'Status Risiko Bulan Ini · Aman';

  const statusTextClass = isExceeded
    ? 'text-red-300'
    : isApproaching
      ? 'text-orange-300'
      : 'text-emerald-300';

  const headline = isExceeded
    ? 'STOP TRADING SEKARANG! Jangan Entry XAUUSD Lagi Bulan Ini'
    : isApproaching
      ? 'Hati-hati! Kerugian Bulan Ini Hampir Menyentuh Batas Maksimal'
      : risk.netPnL > 0
        ? `Performa Positif — Net Profit Bulan Ini ${formatIDR(risk.netPnL, true)}`
        : 'Kerugian Masih Dalam Batas Aman';

  const description = isExceeded
    ? `Kerugian bulan ${formatMonthID(risk.monthStr)} sudah mencapai ${formatIDR(risk.usedLoss)} (${risk.pctUsed.toFixed(1)}% dari batas ${formatIDR(risk.limit)}). Tutup platform trading Anda hingga bulan depan untuk menjaga modal.`
    : isApproaching
      ? `Anda sudah menggunakan ${risk.pctUsed.toFixed(1)}% dari batas loss bulanan (${formatIDR(risk.usedLoss)} dari ${formatIDR(risk.limit)}). Sisa toleransi hanya ${formatIDR(risk.remaining)}. Kecilkan lot atau berhenti trading sementara!`
      : `Anda masih memiliki sisa toleransi loss sebesar ${formatIDR(risk.remaining)} untuk bulan ${formatMonthID(risk.monthStr)}. Tetap patuhi trading plan XAUUSD Anda.`;

  const clampedPct = Math.min(100, Math.max(0, risk.pctUsed));

  return (
    <section
      aria-label="Status Proteksi Batas Loss Bulanan"
      data-testid="risk-banner"
      data-risk-status={risk.status}
      className={`rounded-xl border p-5 transition-colors duration-200 ${containerStyle}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3.5 max-w-3xl">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${iconBoxStyle}`}
            aria-hidden="true"
          >
            {isExceeded ? (
              <ShieldAlert className="h-5 w-5" />
            ) : isApproaching ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-semibold tracking-wide ${statusTextClass}`}>
              {statusLabel}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-50 sm:text-lg [text-wrap:balance]">
              {headline}
            </h2>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 lg:justify-end shrink-0">
          <div className="lg:text-right">
            <div className="text-xs text-slate-400">
              {risk.lossCalcMode === 'gross' ? 'Gross Loss Bulan Ini' : 'Net Loss Bulan Ini'}
            </div>
            <div
              data-testid="risk-used-val"
              className={`font-mono-num text-base font-bold ${risk.usedLoss > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {formatIDR(risk.usedLoss)}
            </div>
          </div>

          <div className="lg:text-right">
            <div className="text-xs text-slate-400">Batas Max / Bulan</div>
            <div data-testid="risk-limit-val" className="font-mono-num text-base font-bold text-amber-400">
              {formatIDR(risk.limit)}
            </div>
          </div>

          <div className="lg:text-right">
            <div className="text-xs text-slate-400">Sisa Toleransi</div>
            <div
              className={`font-mono-num text-base font-bold ${
                risk.remaining === 0
                  ? 'text-red-400'
                  : isApproaching
                    ? 'text-amber-300'
                    : 'text-emerald-400'
              }`}
            >
              {formatIDR(risk.remaining)}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#1a2234] px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-amber-500/60 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Atur Batas
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div
          className="h-2.5 w-full overflow-hidden rounded-md bg-slate-950/80 border border-slate-800"
          role="progressbar"
          aria-valuenow={Math.round(clampedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Persentase batas loss bulanan terpakai"
        >
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${clampedPct.toFixed(1)}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Pengawasan: {formatMonthID(risk.monthStr)} · Net P&L Bulan Ini:{' '}
            <span
              className={`font-mono-num font-semibold ${
                risk.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatIDR(risk.netPnL, risk.netPnL > 0)}
            </span>{' '}
            · {risk.lossCalcMode === 'gross' ? 'Mode Gross Loss' : 'Mode Net Loss'}
          </span>
          <span className="font-mono-num font-semibold text-slate-300">
            Terpakai: {risk.pctUsed.toFixed(1)}% · Ambang Peringatan: {risk.warningThresholdPct}%
          </span>
        </div>
      </div>
    </section>
  );
}
