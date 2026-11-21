import { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { RiskSettings } from '../types/trading';
import {
  formatIDR,
  type ParsedBackupPayload,
  parseAndValidateImport,
} from '../utils/tradingLogic';

interface ImportModalProps {
  open: boolean;
  currentSettings: RiskSettings;
  onClose: () => void;
  onConfirm: (payload: ParsedBackupPayload, mode: 'replace' | 'merge') => void;
}

export function ImportModal({
  open,
  currentSettings,
  onClose,
  onConfirm,
}: ImportModalProps) {
  const [payload, setPayload] = useState<ParsedBackupPayload | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');

  useEffect(() => {
    if (!open) return;
    setPayload(null);
    setError('');
    setMode('replace');
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPayload(null);
    setError('');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || '');
        const parsed = parseAndValidateImport(text);
        setPayload(parsed);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal membaca file backup JSON.',
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#111827] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1a2234] px-5 py-4">
          <h2 id="import-modal-title" className="text-base font-bold text-slate-100">
            Import Backup Data JSON
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog import"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label htmlFor="import-json-file" className="block text-xs font-semibold text-slate-300">
              Pilih File Backup (.json)
            </label>
            <input
              id="import-json-file"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-xs text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-slate-950 hover:file:bg-amber-400"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200"
            >
              {error}
            </div>
          )}

          {payload && (
            <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-200 space-y-1">
              <div className="font-bold">File backup valid dan siap diimport!</div>
              <div>
                Jumlah Transaksi: <span className="font-mono-num font-bold">{payload.trades.length} trade</span>
              </div>
              <div>
                Batas Loss Bulanan:{' '}
                <span className="font-mono-num font-bold">
                  {formatIDR(
                    payload.settings?.monthlyLossLimit ||
                      currentSettings.monthlyLossLimit,
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="import-mode" className="block text-xs font-semibold text-slate-300">
              Metode Import
            </label>
            <select
              id="import-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'replace' | 'merge')}
              className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="replace">Timpa Semua Data Saat Ini (Replace)</option>
              <option value="merge">Gabungkan dengan Data Saat Ini (Merge)</option>
            </select>
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
            type="button"
            disabled={!payload}
            onClick={() => payload && onConfirm(payload, mode)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Jalankan Import
          </button>
        </div>
      </div>
    </div>
  );
}
