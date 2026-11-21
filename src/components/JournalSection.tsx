import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { JournalFilters, MarketSession, TradeDirection, TradeEntry, TradeOutcome } from '../types/trading';
import {
  calculateXauusdPips,
  filterJournalTrades,
  formatDateID,
  formatIDR,
} from '../utils/tradingLogic';

interface JournalSectionProps {
  allTrades: TradeEntry[];
  periodTrades: TradeEntry[];
  filters: JournalFilters;
  onChangeFilters: (next: JournalFilters) => void;
  onAddTrade: () => void;
  onEditTrade: (trade: TradeEntry) => void;
  onDeleteTrade: (trade: TradeEntry) => void;
  onViewNote: (trade: TradeEntry) => void;
}

export function JournalSection({
  allTrades,
  periodTrades,
  filters,
  onChangeFilters,
  onAddTrade,
  onEditTrade,
  onDeleteTrade,
  onViewNote,
}: JournalSectionProps) {
  const rows = filterJournalTrades(allTrades, periodTrades, filters);

  return (
    <section
      id="journal-section"
      aria-label="Jurnal Log Trading XAUUSD"
      className="rounded-xl border border-slate-800 bg-[#111827] p-5"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Jurnal Log Trading XAUUSD
          </h3>
          <p className="text-xs text-slate-400">
            Menampilkan <span className="font-mono-num font-semibold text-slate-200">{rows.length}</span> entri jurnal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter cakupan periode jurnal"
            value={filters.scope}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                scope: e.target.value as JournalFilters['scope'],
              })
            }
            className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="period">Sesuai Periode Terpilih</option>
            <option value="all">Semua Log Jurnal</option>
          </select>

          <select
            aria-label="Filter arah posisi"
            value={filters.direction}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                direction: e.target.value as 'ALL' | TradeDirection,
              })
            }
            className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Arah</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>

          <select
            aria-label="Filter hasil trade"
            value={filters.result}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                result: e.target.value as 'ALL' | TradeOutcome,
              })
            }
            className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Hasil</option>
            <option value="PROFIT">Profit</option>
            <option value="LOSS">Loss</option>
            <option value="BEP">BEP</option>
          </select>

          <select
            aria-label="Filter sesi market"
            value={filters.session}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                session: e.target.value as 'ALL' | MarketSession,
              })
            }
            className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">Semua Sesi</option>
            <option value="Asia">Asia</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Overlap">Overlap LDN-NY</option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              aria-label="Cari setup, emosi, atau catatan jurnal"
              value={filters.query}
              onChange={(e) =>
                onChangeFilters({ ...filters, query: e.target.value })
              }
              placeholder="Cari setup, emosi, catatan..."
              className="w-48 rounded-lg border border-slate-700 bg-[#0d1320] pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[780px] border-collapse text-left text-xs">
          <thead className="bg-[#1a2234] text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Tanggal &amp; Jam</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Pair</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Arah</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Lot</th>
              <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Sesi</th>
              <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Entry &rarr; Exit</th>
              <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Setup &amp; Psikologi</th>
              <th className="px-2.5 py-2.5 font-semibold text-right whitespace-nowrap">P&amp;L (Rp)</th>
              <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Catatan</th>
              <th className="px-2.5 py-2.5 font-semibold text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80" data-testid="journal-table-body">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-3">
                    <p className="text-sm font-medium text-slate-300">
                      Belum ada entri log trading XAUUSD yang cocok pada tampilan ini.
                    </p>
                    <p className="text-xs text-slate-400">
                      Catat eksekusi entry Anda lengkap dengan nominal Rupiah, sesi market, dan kondisi psikologi untuk melihat analitik akurat.
                    </p>
                    <button
                      type="button"
                      onClick={onAddTrade}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Catat Trade Pertama
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const pnl = Number(t.pnl) || 0;
                const pnlColor =
                  pnl > 0
                    ? 'text-emerald-400'
                    : pnl < 0
                      ? 'text-red-400'
                      : 'text-amber-400';
                const pips = calculateXauusdPips(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-800/35 transition-colors">
                    <td className="px-2.5 py-2.5 whitespace-nowrap">
                      <div className="font-mono-num font-semibold text-slate-100">
                        {formatDateID(t.date)}
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-400">
                        {t.time || '-'} WIB
                      </div>
                    </td>

                    <td className="px-2 py-2.5 font-mono-num font-semibold text-amber-400 whitespace-nowrap">
                      {t.pair || 'XAUUSD'}
                    </td>

                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 font-mono-num text-[11px] font-bold border ${
                          t.direction === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                            : 'bg-red-500/15 text-red-300 border-red-500/35'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>

                    <td className="px-2 py-2.5 font-mono-num text-slate-200 whitespace-nowrap">
                      {Number(t.lot || 0).toFixed(2)}
                    </td>

                    <td className="px-2 py-2.5 text-slate-300 whitespace-nowrap">
                      {t.session || '-'}
                    </td>

                    <td className="px-2.5 py-2.5 font-mono-num whitespace-nowrap">
                      {t.entry !== null && t.exit !== null ? (
                        <>
                          <div className="text-slate-200">
                            {Number(t.entry).toFixed(2)} &rarr; {Number(t.exit).toFixed(2)}
                          </div>
                          {pips !== null && (
                            <div
                              className={`text-[11px] ${
                                pips >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {pips >= 0 ? '+' : ''}
                              {pips.toFixed(1)} pips
                            </div>
                          )}
                        </>
                      ) : t.entry !== null ? (
                        <span className="text-slate-300">Entry: {Number(t.entry).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="px-2.5 py-2.5 max-w-[155px]">
                      <div className="font-semibold text-slate-200 truncate">
                        {t.setup || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.emotion || '-'}
                      </div>
                    </td>

                    <td
                      className={`px-2.5 py-2.5 font-mono-num font-bold text-right whitespace-nowrap ${pnlColor}`}
                    >
                      {formatIDR(pnl, pnl > 0)}
                    </td>

                    <td className="px-2.5 py-2.5 max-w-[130px]">
                      {t.notes ? (
                        <button
                          type="button"
                          onClick={() => onViewNote(t)}
                          className="block w-full truncate text-left text-xs text-slate-300 hover:text-amber-300 hover:underline cursor-pointer"
                          title="Klik untuk baca catatan lengkap"
                        >
                          {t.notes}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>

                    <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTrade(t)}
                          aria-label={`Edit trade ${t.direction} ${formatDateID(t.date)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#1a2234] px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTrade(t)}
                          aria-label={`Hapus trade ${t.direction} ${formatDateID(t.date)}`}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
