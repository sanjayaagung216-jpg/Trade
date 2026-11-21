import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { TradeEntry } from '../types/trading';
import {
  addMonths,
  buildMonthlyCalendarGrid,
  formatCompactIDR,
  formatDateID,
  formatIDR,
  formatMonthID,
  toLocalDateStr,
  toLocalMonthStr,
} from '../utils/tradingLogic';

interface MonthlyCalendarRecapProps {
  trades: TradeEntry[];
  monthStr: string;
  onChangeMonth: (nextMonth: string) => void;
  onOpenDayRecap: (date: string) => void;
  onAddTradeForDate: (date: string) => void;
  onEditTrade: (trade: TradeEntry) => void;
}

const WEEKDAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function MonthlyCalendarRecap({
  trades,
  monthStr,
  onChangeMonth,
  onOpenDayRecap,
  onAddTradeForDate,
  onEditTrade,
}: MonthlyCalendarRecapProps) {
  const todayStr = toLocalDateStr(new Date());
  const currentMonthStr = toLocalMonthStr(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendar = buildMonthlyCalendarGrid(trades, monthStr);
  const selectedCell =
    selectedDate && selectedDate.startsWith(monthStr)
      ? calendar.days.find((d) => d.date === selectedDate) || null
      : null;

  return (
    <section
      id="calendar-section"
      aria-label="Kalender Rekap Bulanan XAUUSD"
      data-testid="monthly-calendar-section"
      className="scroll-mt-20 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4"
    >
      {/* Header & Month Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Kalender Rekap Bulanan (P&amp;L Harian)
          </h3>
          <p className="text-xs text-slate-400">
            Ringkasan profit, loss, dan frekuensi eksekusi per tanggal · Klik tanggal untuk detail
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              Profit:{' '}
              <strong className="font-mono-num text-emerald-400">
                {calendar.profitDays}h
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Loss:{' '}
              <strong className="font-mono-num text-red-400">
                {calendar.lossDays}h
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Net:{' '}
              <strong
                className={`font-mono-num ${
                  calendar.totalPnL > 0
                    ? 'text-emerald-400'
                    : calendar.totalPnL < 0
                      ? 'text-red-400'
                      : 'text-slate-200'
                }`}
              >
                {formatIDR(calendar.totalPnL, calendar.totalPnL > 0)}
              </strong>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeMonth(addMonths(monthStr, -1))}
              aria-label="Bulan kalender sebelumnya"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#1a2234] text-slate-200 hover:border-amber-500/60 hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              data-testid="calendar-month-label"
              className="min-w-[126px] text-center font-mono-num text-xs font-bold text-amber-300"
            >
              {formatMonthID(monthStr)}
            </span>
            <button
              type="button"
              onClick={() => onChangeMonth(addMonths(monthStr, 1))}
              aria-label="Bulan kalender berikutnya"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#1a2234] text-slate-200 hover:border-amber-500/60 hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {monthStr !== currentMonthStr && (
              <button
                type="button"
                onClick={() => onChangeMonth(currentMonthStr)}
                className="rounded-lg border border-slate-700 bg-[#1a2234] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                Bulan Ini
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7-Column Calendar Grid (Monday -> Sunday, horizontally scrollable only on narrow phones) */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[660px]">
          <div className="grid grid-cols-7 gap-2 pb-2 text-center text-xs font-semibold text-slate-400">
            {WEEKDAY_HEADERS.map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          <div
            data-testid="calendar-grid"
            className="grid grid-cols-7 gap-2"
          >
            {Array.from({ length: calendar.leadingEmptyCount }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                aria-hidden="true"
                className="min-h-[82px] rounded-lg border border-slate-800/40 bg-[#0b101b]/50"
              />
            ))}

            {calendar.days.map((cell) => {
              const hasTrades = cell.tradeCount > 0;
              const isProfit = hasTrades && cell.netPnL > 0;
              const isLoss = hasTrades && cell.netPnL < 0;
              const isBep = hasTrades && cell.netPnL === 0;
              const isSelected = selectedDate === cell.date;
              const isToday = cell.date === todayStr;

              const cellStyle = isProfit
                ? 'border-emerald-500/45 bg-emerald-500/10 hover:bg-emerald-500/15'
                : isLoss
                  ? 'border-red-500/45 bg-red-500/10 hover:bg-red-500/15'
                  : isBep
                    ? 'border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/15'
                    : 'border-slate-800/90 bg-[#0d1320] hover:border-slate-700';

              const pnlTextClass = isProfit
                ? 'text-emerald-400'
                : isLoss
                  ? 'text-red-400'
                  : 'text-amber-300';

              return (
                <button
                  key={cell.date}
                  type="button"
                  data-testid={`calendar-day-${cell.date}`}
                  onClick={() =>
                    setSelectedDate((prev) =>
                      prev === cell.date ? null : cell.date,
                    )
                  }
                  aria-label={`${formatDateID(cell.date)}, ${
                    hasTrades
                      ? `${cell.tradeCount} trade, P&L ${formatIDR(cell.netPnL, cell.netPnL > 0)}`
                      : 'tidak ada trade'
                  }`}
                  className={`min-h-[82px] rounded-lg border p-2.5 text-left flex flex-col justify-between transition-colors cursor-pointer ${cellStyle} ${
                    isSelected ? 'ring-2 ring-amber-400/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-mono-num text-xs font-semibold ${
                        isToday ? 'text-amber-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold text-amber-400/90">
                        Hari ini
                      </span>
                    )}
                  </div>

                  {hasTrades ? (
                    <div className="mt-2 space-y-0.5">
                      <div
                        className={`font-mono-num text-[11px] sm:text-xs font-bold leading-tight truncate ${pnlTextClass}`}
                        title={formatIDR(cell.netPnL, cell.netPnL > 0)}
                      >
                        <span className="hidden xl:inline">
                          {formatIDR(cell.netPnL, cell.netPnL > 0)}
                        </span>
                        <span className="xl:hidden">
                          {cell.netPnL > 0 ? '+' : ''}
                          {formatCompactIDR(cell.netPnL)}
                        </span>
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-300/85">
                        {cell.tradeCount}x
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 font-mono-num text-xs text-slate-600">
                      -
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Interactive Detail Drawer */}
      {selectedCell && (
        <div
          data-testid="calendar-day-detail"
          className="rounded-lg border border-slate-800 bg-[#0d1320] p-4 space-y-3"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-100">
                Detail Tanggal: {formatDateID(selectedCell.date)}
              </div>
              <div className="text-xs text-slate-400 font-mono-num">
                {selectedCell.tradeCount}x trade · Net P&amp;L:{' '}
                <span
                  className={
                    selectedCell.netPnL > 0
                      ? 'text-emerald-400 font-bold'
                      : selectedCell.netPnL < 0
                        ? 'text-red-400 font-bold'
                        : 'text-slate-200 font-bold'
                  }
                >
                  {formatIDR(selectedCell.netPnL, selectedCell.netPnL > 0)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenDayRecap(selectedCell.date)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                Fokuskan Rekap Harian
              </button>
              <button
                type="button"
                onClick={() => onAddTradeForDate(selectedCell.date)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Catat Trade Tanggal Ini
              </button>
            </div>
          </div>

          {selectedCell.trades.length > 0 ? (
            <div className="divide-y divide-slate-800/80 border-t border-slate-800 pt-2">
              {selectedCell.trades.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num text-slate-400">
                      {t.time || '-'} WIB
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono-num text-[11px] font-bold border ${
                        t.direction === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                          : 'bg-red-500/15 text-red-300 border-red-500/35'
                      }`}
                    >
                      {t.direction}
                    </span>
                    <span className="font-mono-num text-slate-300">
                      {Number(t.lot).toFixed(2)} Lot
                    </span>
                    <span className="text-slate-400">· {t.session}</span>
                    <span className="font-medium text-slate-200">
                      · {t.setup || 'Umum'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono-num font-bold ${
                        t.pnl > 0
                          ? 'text-emerald-400'
                          : t.pnl < 0
                            ? 'text-red-400'
                            : 'text-amber-300'
                      }`}
                    >
                      {formatIDR(t.pnl, t.pnl > 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTrade(t)}
                      className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t border-slate-800 pt-2 text-xs text-slate-400">
              Belum ada eksekusi XAUUSD pada tanggal ini.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
