import { X } from 'lucide-react';
import type { TradeEntry } from '../types/trading';
import { formatDateID, formatIDR } from '../utils/tradingLogic';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger = true,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1a2234] px-5 py-4">
          <h2 id="confirm-modal-title" className="text-base font-bold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup konfirmasi"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 text-sm text-slate-300 leading-relaxed">{message}</div>
        <div className="flex justify-end gap-2.5 border-t border-slate-800 bg-[#0d1320] px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-[#1a2234] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-xs font-bold cursor-pointer ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface NoteModalProps {
  trade: TradeEntry | null;
  onClose: () => void;
}

export function NoteModal({ trade, onClose }: NoteModalProps) {
  if (!trade) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1a2234] px-5 py-4">
          <h2 id="note-modal-title" className="text-base font-bold text-slate-100">
            XAUUSD {trade.direction} · {formatDateID(trade.date)} ({trade.time || '-'} WIB)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail catatan"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5 text-sm text-slate-200">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-[#0d1320] p-3 text-xs">
            <div>
              <span className="text-slate-400">Sesi Market:</span>{' '}
              <span className="font-semibold">{trade.session}</span>
            </div>
            <div>
              <span className="text-slate-400">Volume:</span>{' '}
              <span className="font-mono-num font-semibold">{Number(trade.lot).toFixed(2)} Lot</span>
            </div>
            <div>
              <span className="text-slate-400">Setup:</span>{' '}
              <span className="font-semibold">{trade.setup || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">Hasil P&amp;L:</span>{' '}
              <span
                className={`font-mono-num font-bold ${
                  trade.pnl > 0 ? 'text-emerald-400' : trade.pnl < 0 ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {formatIDR(trade.pnl, trade.pnl > 0)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Emosi / Psikologi:</span>{' '}
              <span className="font-semibold">{trade.emotion || '-'}</span>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-400">Catatan Evaluasi</div>
            <p className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-[#0d1320] p-3 text-sm text-slate-200 leading-relaxed">
              {trade.notes || 'Tidak ada catatan tambahan.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-800 bg-[#0d1320] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-[#1a2234] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
