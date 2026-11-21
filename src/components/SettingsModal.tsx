import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LossCalcMode, RiskSettings } from '../types/trading';
import { formatIDR } from '../utils/tradingLogic';

interface SettingsModalProps {
  open: boolean;
  settings: RiskSettings;
  onClose: () => void;
  onSave: (next: RiskSettings) => void;
}

export function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [limit, setLimit] = useState(String(settings.monthlyLossLimit));
  const [warningPct, setWarningPct] = useState(String(settings.warningThresholdPct));
  const [calcMode, setCalcMode] = useState<LossCalcMode>(settings.lossCalcMode);
  const [capital, setCapital] = useState(String(settings.initialCapital || 0));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLimit(String(settings.monthlyLossLimit));
    setWarningPct(String(settings.warningThresholdPct));
    setCalcMode(settings.lossCalcMode);
    setCapital(String(settings.initialCapital || 0));
    setError('');
  }, [open, settings]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = Number(limit);
    const numWarn = Number(warningPct);
    const numCap = Number(capital) || 0;

    if (!Number.isFinite(numLimit) || numLimit < 10000) {
      setError('Batas maksimal loss bulanan minimal Rp 10.000.');
      return;
    }
    if (!Number.isFinite(numWarn) || numWarn < 30 || numWarn > 95) {
      setError('Ambang peringatan awal harus di antara 30% sampai 95%.');
      return;
    }

    onSave({
      monthlyLossLimit: numLimit,
      warningThresholdPct: numWarn,
      lossCalcMode: calcMode,
      initialCapital: Math.max(0, numCap),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1a2234] px-5 py-4">
          <h2 id="settings-modal-title" className="text-base font-bold text-slate-100">
            Pengaturan Batas Loss Bulanan & Modal
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan batas loss"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200"
              >
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="set-loss-limit" className="block text-xs font-semibold text-slate-300">
                Batas Maksimal Loss Bulanan (Rp)
              </label>
              <input
                id="set-loss-limit"
                type="number"
                min="10000"
                step="1"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-slate-400">
                Saat ini: <span className="font-mono-num text-amber-400">{formatIDR(Number(limit) || 0)}</span>. Jika kerugian bulan berjalan mencapai/melebihi nominal ini, peringatan otomatis STOP TRADING akan muncul.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="set-warning-pct" className="block text-xs font-semibold text-slate-300">
                  Ambang Peringatan Awal (%)
                </label>
                <input
                  id="set-warning-pct"
                  type="number"
                  min="30"
                  max="95"
                  step="1"
                  value={warningPct}
                  onChange={(e) => setWarningPct(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Default 75%. Banner peringatan oranye muncul di halaman utama.
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="set-loss-mode" className="block text-xs font-semibold text-slate-300">
                  Metode Hitung Batas Loss
                </label>
                <select
                  id="set-loss-mode"
                  value={calcMode}
                  onChange={(e) => setCalcMode(e.target.value as LossCalcMode)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="net">Net Loss Bulanan (Profit - Loss)</option>
                  <option value="gross">Gross Loss Bulanan (Loss Kotor)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="set-capital" className="block text-xs font-semibold text-slate-300">
                Modal Awal Akun Trading (Rp) — Opsional
              </label>
              <input
                id="set-capital"
                type="number"
                min="0"
                step="1"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="cth: 25000000"
                className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-xs text-slate-400">
                Digunakan untuk menghitung persentase ROI terhadap modal.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 bg-[#0d1320] px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-[#1a2234] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
