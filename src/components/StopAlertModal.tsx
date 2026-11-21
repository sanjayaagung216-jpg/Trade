import { ShieldAlert, X } from 'lucide-react';
import type { MonthlyRiskEvaluation } from '../types/trading';
import { formatIDR, formatMonthID } from '../utils/tradingLogic';

interface StopAlertModalProps {
  open: boolean;
  risk: MonthlyRiskEvaluation;
  onClose: () => void;
}

export function StopAlertModal({ open, risk, onClose }: StopAlertModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="stop-alert-title"
      data-testid="stop-alert-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border-2 border-red-500 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-red-500/40 bg-red-950/60 px-5 py-4">
          <div className="flex items-center gap-2.5 text-red-200">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <h2 id="stop-alert-title" className="text-base font-extrabold tracking-tight">
              PERINGATAN KERAS: STOP TRADING!
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup peringatan stop trading"
            className="rounded-md p-1 text-red-200/80 hover:bg-red-900/50 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-base font-bold text-red-200">
            Batas Loss Maksimal Bulan Ini Telah Tercapai / Terlampaui!
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">
            Kerugian Anda pada <span className="font-semibold">{formatMonthID(risk.monthStr)}</span> telah mencapai{' '}
            <span className="font-mono-num font-bold text-red-300">{formatIDR(risk.usedLoss)}</span> ({risk.pctUsed.toFixed(1)}% dari batas maksimal{' '}
            <span className="font-mono-num font-bold text-amber-300">{formatIDR(risk.limit)}</span>). Segera hentikan seluruh aktivitas trading XAUUSD bulan ini untuk menyelamatkan modal Anda.
          </p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-red-500/35 bg-[#090d16] p-3.5">
            <div>
              <div className="text-xs text-slate-400">Loss Terakumulasi</div>
              <div className="font-mono-num text-lg font-bold text-red-400">
                {formatIDR(risk.usedLoss)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Batas Loss Bulanan</div>
              <div className="font-mono-num text-lg font-bold text-amber-400">
                {formatIDR(risk.limit)}
              </div>
            </div>
          </div>

          <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-300">
            <li>Jangan menaikkan lot untuk mengejar balik modal (Revenge Trade).</li>
            <li>Evaluasi kembali jurnal log bulan ini untuk mencari pola kesalahan.</li>
            <li>Istirahat dan mulai kembali dengan pikiran jernih di bulan berikutnya.</li>
          </ul>
        </div>

        <div className="flex justify-end border-t border-slate-800 bg-[#0d1320] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-red-500/60 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 cursor-pointer"
          >
            Saya Mengerti &amp; Akan Berhenti Trading
          </button>
        </div>
      </div>
    </div>
  );
}
