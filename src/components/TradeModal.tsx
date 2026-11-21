import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type {
  MarketSession,
  TradeDirection,
  TradeEntry,
  TradeOutcome,
} from '../types/trading';
import {
  formatIDR,
  generateTradeId,
  pad2,
  toLocalDateStr,
} from '../utils/tradingLogic';

interface TradeModalProps {
  open: boolean;
  editingTrade: TradeEntry | null;
  defaultDate: string;
  isStopWarningActive: boolean;
  onClose: () => void;
  onSave: (trade: TradeEntry, isEdit: boolean) => void;
}

export function TradeModal({
  open,
  editingTrade,
  defaultDate,
  isStopWarningActive,
  onClose,
  onSave,
}: TradeModalProps) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('12:00');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [lot, setLot] = useState('0.05');
  const [session, setSession] = useState<MarketSession>('New York');
  const [setup, setSetup] = useState('');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [outcome, setOutcome] = useState<TradeOutcome>('PROFIT');
  const [nominal, setNominal] = useState('');
  const [emotion, setEmotion] = useState('Disiplin Sesuai Plan');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    if (editingTrade) {
      setDate(editingTrade.date);
      setTime(editingTrade.time || '12:00');
      setDirection(editingTrade.direction);
      setLot(String(editingTrade.lot));
      setSession(editingTrade.session || 'New York');
      setSetup(editingTrade.setup || '');
      setEntry(editingTrade.entry !== null ? String(editingTrade.entry) : '');
      setExit(editingTrade.exit !== null ? String(editingTrade.exit) : '');
      setEmotion(editingTrade.emotion || 'Disiplin Sesuai Plan');
      setNotes(editingTrade.notes || '');

      const pnl = Number(editingTrade.pnl) || 0;
      if (pnl > 0) {
        setOutcome('PROFIT');
        setNominal(String(pnl));
      } else if (pnl < 0) {
        setOutcome('LOSS');
        setNominal(String(Math.abs(pnl)));
      } else {
        setOutcome('BEP');
        setNominal('0');
      }
    } else {
      const now = new Date();
      setDate(defaultDate || toLocalDateStr(now));
      setTime(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
      setDirection('BUY');
      setLot('0.05');
      setSession('New York');
      setSetup('');
      setEntry('');
      setExit('');
      setOutcome('PROFIT');
      setNominal('');
      setEmotion('Disiplin Sesuai Plan');
      setNotes('');
    }
  }, [open, editingTrade, defaultDate]);

  if (!open) return null;

  const rawNominal = Math.abs(Number(nominal) || 0);
  const signedPreview =
    outcome === 'LOSS' ? -rawNominal : outcome === 'BEP' ? 0 : rawNominal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setFormError('Tanggal trade wajib diisi.');
      return;
    }
    const parsedLot = Number(lot);
    if (!Number.isFinite(parsedLot) || parsedLot <= 0) {
      setFormError('Lot size harus lebih besar dari 0.');
      return;
    }
    if (outcome !== 'BEP') {
      const parsedNom = Number(nominal);
      if (!nominal.trim() || !Number.isFinite(parsedNom) || parsedNom <= 0) {
        setFormError('Masukkan nominal Rupiah lebih dari 0 untuk hasil Profit atau Loss.');
        return;
      }
    }

    const parsedEntry = entry.trim() !== '' ? Number(entry) : null;
    const parsedExit = exit.trim() !== '' ? Number(exit) : null;

    const payload: TradeEntry = {
      id: editingTrade ? editingTrade.id : generateTradeId(),
      pair: 'XAUUSD',
      date,
      time: time || '12:00',
      direction,
      lot: parsedLot,
      session,
      entry: parsedEntry !== null && Number.isFinite(parsedEntry) ? parsedEntry : null,
      exit: parsedExit !== null && Number.isFinite(parsedExit) ? parsedExit : null,
      pnl: signedPreview,
      setup: setup.trim() || 'Umum',
      emotion,
      notes: notes.trim(),
    };

    onSave(payload, Boolean(editingTrade));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#111827] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#1a2234] px-5 py-4">
          <h2 id="trade-modal-title" className="text-base font-bold text-slate-100">
            {editingTrade ? 'Edit Jurnal Trade XAUUSD' : 'Catat Trade XAUUSD Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form trade"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto p-5">
            {isStopWarningActive && !editingTrade && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <strong>Peringatan Stop Trading Aktif:</strong> Loss bulan ini sudah mencapai atau melewati batas maksimal Anda. Disarankan berhenti entry XAUUSD di bulan ini.
                </div>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200"
              >
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="trade-date" className="block text-xs font-semibold text-slate-300">
                  Tanggal Trade
                </label>
                <input
                  id="trade-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-time" className="block text-xs font-semibold text-slate-300">
                  Jam Eksekusi (WIB)
                </label>
                <input
                  id="trade-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-semibold text-slate-300">
                  Arah Posisi (XAUUSD)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('BUY')}
                    className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                      direction === 'BUY'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 bg-[#0d1320] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SELL')}
                    className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                      direction === 'SELL'
                        ? 'border-red-500 bg-red-500/15 text-red-300'
                        : 'border-slate-700 bg-[#0d1320] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    SELL (Short)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-lot" className="block text-xs font-semibold text-slate-300">
                  Lot Size
                </label>
                <input
                  id="trade-lot"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="0.05"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-session" className="block text-xs font-semibold text-slate-300">
                  Sesi Market
                </label>
                <select
                  id="trade-session"
                  value={session}
                  onChange={(e) => setSession(e.target.value as MarketSession)}
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="New York">New York</option>
                  <option value="London">London</option>
                  <option value="Overlap">Overlap (LDN-NY)</option>
                  <option value="Asia">Asia (Tokyo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-setup" className="block text-xs font-semibold text-slate-300">
                  Setup / Strategi
                </label>
                <input
                  id="trade-setup"
                  type="text"
                  list="xau-setup-list"
                  value={setup}
                  onChange={(e) => setSetup(e.target.value)}
                  placeholder="cth: SMC / Order Block"
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <datalist id="xau-setup-list">
                  <option value="SMC / Order Block" />
                  <option value="Supply & Demand" />
                  <option value="Breakout & Retest" />
                  <option value="SNR / Trendline" />
                  <option value="Scalping News (NFP/CPI)" />
                  <option value="Liquidity Sweep" />
                </datalist>
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-entry" className="block text-xs font-semibold text-slate-300">
                  Harga Entry (Opsional)
                </label>
                <input
                  id="trade-entry"
                  type="number"
                  step="0.01"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="cth: 2650.50"
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="trade-exit" className="block text-xs font-semibold text-slate-300">
                  Harga Exit / Close (Opsional)
                </label>
                <input
                  id="trade-exit"
                  type="number"
                  step="0.01"
                  value={exit}
                  onChange={(e) => setExit(e.target.value)}
                  placeholder="cth: 2662.00"
                  className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-slate-300">
                Hasil Trade
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOutcome('PROFIT')}
                  className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    outcome === 'PROFIT'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-[#0d1320] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  + PROFIT
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome('LOSS')}
                  className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    outcome === 'LOSS'
                      ? 'border-red-500 bg-red-500/15 text-red-300'
                      : 'border-slate-700 bg-[#0d1320] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  - LOSS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOutcome('BEP');
                    setNominal('0');
                  }}
                  className={`rounded-lg border py-2 text-xs font-bold transition-colors cursor-pointer ${
                    outcome === 'BEP'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                      : 'border-slate-700 bg-[#0d1320] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  BEP (Rp 0)
                </button>
              </div>
            </div>

            <div className={`space-y-1 ${outcome === 'BEP' ? 'opacity-50' : ''}`}>
              <label htmlFor="trade-nominal" className="block text-xs font-semibold text-slate-300">
                Nominal Profit / Loss (Rupiah)
              </label>
              <input
                id="trade-nominal"
                type="number"
                min="0"
                step="1"
                disabled={outcome === 'BEP'}
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="cth: 750000"
                required={outcome !== 'BEP'}
                className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 font-mono-num text-sm text-slate-100 focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed"
              />
              <p
                className={`font-mono-num text-xs font-semibold ${
                  signedPreview > 0
                    ? 'text-emerald-400'
                    : signedPreview < 0
                      ? 'text-red-400'
                      : 'text-amber-400'
                }`}
              >
                Preview: {formatIDR(signedPreview, signedPreview > 0)}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="trade-emotion" className="block text-xs font-semibold text-slate-300">
                Psikologi / Kondisi Emosi
              </label>
              <select
                id="trade-emotion"
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="Disiplin Sesuai Plan">Disiplin Sesuai Plan</option>
                <option value="Tenang & Sabar">Tenang & Sabar</option>
                <option value="FOMO">FOMO (Takut Ketinggalan)</option>
                <option value="Revenge Trade">Revenge Trade (Balas Dendam)</option>
                <option value="Overlot / Terlalu Agresif">Overlot / Terlalu Agresif</option>
                <option value="Ragu-ragu / Close Terlalu Cepat">Ragu-ragu / Close Terlalu Cepat</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="trade-notes" className="block text-xs font-semibold text-slate-300">
                Catatan Evaluasi Jurnal
              </label>
              <textarea
                id="trade-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alasan entry, konfirmasi timeframe, pelajaran dari trade ini..."
                className="w-full rounded-lg border border-slate-700 bg-[#0d1320] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
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
              Simpan Jurnal Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
