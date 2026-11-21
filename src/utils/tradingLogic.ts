import type {
  AppState,
  CalendarDayCell,
  CalendarMonthData,
  JournalFilters,
  MarketSession,
  MonthlyRiskEvaluation,
  PeriodMetrics,
  PeriodRange,
  PeriodType,
  RiskSettings,
  SubPeriodRow,
  TradeEntry,
} from '../types/trading';

export const STORAGE_KEY = 'xauusd_pro_recap_v1';

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const DEFAULT_SETTINGS: RiskSettings = {
  monthlyLossLimit: 5000000,
  warningThresholdPct: 75,
  lossCalcMode: 'net',
  initialCapital: 25000000,
};

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toLocalMonthStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateStr: string, delta: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + delta);
  return toLocalDateStr(d);
}

export function addMonths(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return toLocalMonthStr(d);
}

export function getWeekBounds(dateStr: string): { start: string; end: string } {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return {
    start: toLocalDateStr(mon),
    end: toLocalDateStr(sun),
  };
}

export function formatDateID(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = parseLocalDate(dateStr);
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthID(monthStr: string): string {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const [y, m] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES_FULL[(m || 1) - 1]} ${y}`;
}

export function formatIDR(amount: number, withSign = false): string {
  const num = Math.round(Number(amount) || 0);
  const abs = Math.abs(num).toLocaleString('id-ID');
  if (num < 0) return `-Rp ${abs}`;
  if (num > 0 && withSign) return `+Rp ${abs}`;
  return `Rp ${abs}`;
}

export function formatCompactIDR(amount: number): string {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`;
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`;
  return `${sign}Rp ${Math.round(abs)}`;
}

export function generateTradeId(): string {
  return `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function evaluateMonthlyRisk(
  trades: TradeEntry[],
  settings: RiskSettings,
  monthStr: string,
): MonthlyRiskEvaluation {
  const monthTrades = trades.filter((t) => t.date.startsWith(monthStr));

  let netPnL = 0;
  let grossLoss = 0;
  let grossProfit = 0;

  for (const t of monthTrades) {
    const val = Number(t.pnl) || 0;
    netPnL += val;
    if (val < 0) grossLoss += Math.abs(val);
    if (val > 0) grossProfit += val;
  }

  const usedLoss =
    settings.lossCalcMode === 'gross'
      ? grossLoss
      : netPnL < 0
        ? Math.abs(netPnL)
        : 0;

  const limit = Math.max(1, Number(settings.monthlyLossLimit) || 5000000);
  const pctUsed = (usedLoss / limit) * 100;
  const remaining = Math.max(0, limit - usedLoss);
  const warningThresholdPct = Math.min(95, Math.max(30, Number(settings.warningThresholdPct) || 75));

  let status: MonthlyRiskEvaluation['status'] = 'SAFE';
  if (pctUsed >= 100) {
    status = 'EXCEEDED';
  } else if (pctUsed >= warningThresholdPct) {
    status = 'APPROACHING';
  }

  return {
    monthStr,
    netPnL,
    grossLoss,
    grossProfit,
    usedLoss,
    limit,
    pctUsed,
    remaining,
    warningThresholdPct,
    lossCalcMode: settings.lossCalcMode,
    status,
  };
}

export function getPeriodRange(
  period: PeriodType,
  anchorDate: string,
  anchorMonth: string,
): PeriodRange {
  if (period === 'daily') {
    return {
      type: 'daily',
      start: anchorDate,
      end: anchorDate,
      label: `Harian: ${formatDateID(anchorDate)}`,
    };
  }
  if (period === 'weekly') {
    const wb = getWeekBounds(anchorDate);
    return {
      type: 'weekly',
      start: wb.start,
      end: wb.end,
      label: `Mingguan: ${formatDateID(wb.start)} – ${formatDateID(wb.end)}`,
    };
  }
  if (period === 'monthly') {
    const [y, m] = anchorMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      type: 'monthly',
      start: `${anchorMonth}-01`,
      end: `${anchorMonth}-${pad2(lastDay)}`,
      label: `Bulanan: ${formatMonthID(anchorMonth)}`,
    };
  }
  return {
    type: 'all',
    start: null,
    end: null,
    label: 'Semua Waktu (Keseluruhan)',
  };
}

export function sortTradesChronological(trades: TradeEntry[]): TradeEntry[] {
  return [...trades].sort((a, b) => {
    const ka = `${a.date} ${a.time || '00:00'}`;
    const kb = `${b.date} ${b.time || '00:00'}`;
    return ka.localeCompare(kb);
  });
}

export function filterTradesByPeriod(
  trades: TradeEntry[],
  range: PeriodRange,
): TradeEntry[] {
  const sorted = sortTradesChronological(trades);
  if (!range.start || !range.end) return sorted;
  return sorted.filter((t) => t.date >= range.start! && t.date <= range.end!);
}

export function computeMetrics(trades: TradeEntry[]): PeriodMetrics {
  let totalPnL = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let beps = 0;
  let totalLot = 0;
  let best: number | null = null;
  let worst: number | null = null;
  let buyCount = 0;
  let buyWin = 0;
  let sellCount = 0;
  let sellWin = 0;

  for (const t of trades) {
    const pnl = Number(t.pnl) || 0;
    const lot = Number(t.lot) || 0;
    totalPnL += pnl;
    totalLot += lot;

    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losses++;
      grossLoss += Math.abs(pnl);
    } else {
      beps++;
    }

    if (best === null || pnl > best) best = pnl;
    if (worst === null || pnl < worst) worst = pnl;

    if (t.direction === 'BUY') {
      buyCount++;
      if (pnl > 0) buyWin++;
    } else {
      sellCount++;
      if (pnl > 0) sellWin++;
    }
  }

  const total = trades.length;
  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;

  return {
    total,
    wins,
    losses,
    beps,
    totalPnL,
    grossProfit,
    grossLoss,
    winRate,
    totalLot,
    profitFactor,
    avgWin,
    avgLoss,
    best: best ?? 0,
    worst: worst ?? 0,
    buyCount,
    buyWin,
    sellCount,
    sellWin,
  };
}

export interface ChartDatasetBundle {
  eqLabels: string[];
  eqValues: number[];
  equitySub: string;
  barLabels: string[];
  barValues: number[];
  barSub: string;
}

export function buildChartDatasets(
  allTrades: TradeEntry[],
  range: PeriodRange,
  periodTrades: TradeEntry[],
  anchorDate: string,
  anchorMonth: string,
): ChartDatasetBundle {
  const allSorted = sortTradesChronological(allTrades);

  let equityTrades = periodTrades;
  let equitySub = 'Akumulasi P&L pada periode terpilih';
  if (range.type === 'daily') {
    const start14 = addDays(anchorDate, -13);
    equityTrades = allSorted.filter(
      (t) => t.date >= start14 && t.date <= anchorDate,
    );
    equitySub = `Tren kumulatif 14 hari s/d ${formatDateID(anchorDate)}`;
  }

  const eqLabels = ['Awal'];
  const eqValues = [0];
  let running = 0;
  for (const t of equityTrades) {
    running += Number(t.pnl) || 0;
    eqLabels.push(`${t.date.slice(5)} ${t.time || ''}`.trim());
    eqValues.push(running);
  }

  const barLabels: string[] = [];
  const barValues: number[] = [];
  let barSub = 'Hijau = Profit, Merah = Loss';

  if (range.type === 'daily') {
    const start14 = addDays(anchorDate, -13);
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      dailyMap.set(addDays(start14, i), 0);
    }
    for (const t of allSorted) {
      if (dailyMap.has(t.date)) {
        dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + (Number(t.pnl) || 0));
      }
    }
    for (const [dStr, val] of dailyMap.entries()) {
      const d = parseLocalDate(dStr);
      barLabels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      barValues.push(val);
    }
    barSub = `P&L harian 14 hari terakhir (s/d ${formatDateID(anchorDate)})`;
  } else if (range.type === 'weekly') {
    const wb = getWeekBounds(anchorDate);
    for (let i = 0; i < 7; i++) {
      const dStr = addDays(wb.start, i);
      const d = parseLocalDate(dStr);
      const sum = periodTrades
        .filter((t) => t.date === dStr)
        .reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
      barLabels.push(`${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()}`);
      barValues.push(sum);
    }
    barSub = 'Breakdown P&L per hari (Senin – Minggu)';
  } else if (range.type === 'monthly') {
    const [y, m] = anchorMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${anchorMonth}-${pad2(day)}`;
      const sum = periodTrades
        .filter((t) => t.date === dStr)
        .reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
      barLabels.push(String(day));
      barValues.push(sum);
    }
    barSub = `P&L harian sepanjang ${formatMonthID(anchorMonth)}`;
  } else {
    const monthMap = new Map<string, number>();
    for (const t of periodTrades) {
      const mKey = t.date.slice(0, 7);
      monthMap.set(mKey, (monthMap.get(mKey) || 0) + (Number(t.pnl) || 0));
    }
    for (const [mKey, val] of [...monthMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      const [yy, mm] = mKey.split('-').map(Number);
      barLabels.push(`${MONTH_NAMES_SHORT[(mm || 1) - 1]} ${yy}`);
      barValues.push(val);
    }
    barSub = 'Rekap P&L per bulan (Semua Waktu)';
  }

  return { eqLabels, eqValues, equitySub, barLabels, barValues, barSub };
}

export function buildSubPeriodBreakdown(
  range: PeriodRange,
  periodTrades: TradeEntry[],
  anchorDate: string,
  anchorMonth: string,
): { title: string; subtitle: string; colName: string; rows: SubPeriodRow[] } {
  const groups = new Map<string, TradeEntry[]>();
  let title = 'Ringkasan Sub-Periode';
  let subtitle = 'Rekap terperinci dalam rentang aktif';
  let colName = 'Sub-Periode';

  if (range.type === 'daily') {
    title = 'Rekap Per Sesi Market (Hari Dipilih)';
    subtitle = `Distribusi performa XAUUSD pada ${formatDateID(anchorDate)}`;
    colName = 'Sesi Market';
    for (const s of ['Asia', 'London', 'New York', 'Overlap']) {
      groups.set(s, []);
    }
    for (const t of periodTrades) {
      const key = t.session || 'New York';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
  } else if (range.type === 'weekly') {
    title = 'Rekap Harian dalam Minggu Ini';
    subtitle = 'Perbandingan performa Senin s/d Minggu';
    colName = 'Hari / Tanggal';
    const wb = getWeekBounds(anchorDate);
    for (let i = 0; i < 7; i++) {
      const dStr = addDays(wb.start, i);
      const d = parseLocalDate(dStr);
      groups.set(
        `${DAY_NAMES_SHORT[d.getDay()]}, ${formatDateID(dStr)}`,
        periodTrades.filter((t) => t.date === dStr),
      );
    }
  } else if (range.type === 'monthly') {
    title = 'Rekap Mingguan dalam Bulan Ini';
    subtitle = `Rincian minggu per minggu di ${formatMonthID(anchorMonth)}`;
    colName = 'Minggu';
    for (let w = 1; w <= 5; w++) groups.set(`Minggu ke-${w}`, []);
    for (const t of periodTrades) {
      const day = Number(t.date.slice(8, 10));
      const weekIdx = Math.min(5, Math.ceil(day / 7));
      groups.get(`Minggu ke-${weekIdx}`)!.push(t);
    }
  } else {
    title = 'Rekap Bulanan (Semua Waktu)';
    subtitle = 'Performa trading XAUUSD dari bulan ke bulan';
    colName = 'Bulan';
    const sortedDesc = [...periodTrades].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    for (const t of sortedDesc) {
      const mKey = t.date.slice(0, 7);
      if (!groups.has(mKey)) groups.set(mKey, []);
      groups.get(mKey)!.push(t);
    }
  }

  const rows: SubPeriodRow[] = [];
  for (const [key, list] of groups.entries()) {
    rows.push({
      key,
      label: range.type === 'all' ? formatMonthID(key) : key,
      metrics: computeMetrics(list),
    });
  }

  return { title, subtitle, colName, rows };
}

export function filterJournalTrades(
  allTrades: TradeEntry[],
  periodTrades: TradeEntry[],
  filters: JournalFilters,
): TradeEntry[] {
  const base =
    filters.scope === 'all' ? [...allTrades] : [...periodTrades];
  base.sort((a, b) =>
    `${b.date} ${b.time || '00:00'}`.localeCompare(
      `${a.date} ${a.time || '00:00'}`,
    ),
  );

  const q = filters.query.trim().toLowerCase();

  return base.filter((t) => {
    if (filters.direction !== 'ALL' && t.direction !== filters.direction) {
      return false;
    }
    if (filters.session !== 'ALL' && t.session !== filters.session) {
      return false;
    }
    const pnl = Number(t.pnl) || 0;
    if (filters.result === 'PROFIT' && pnl <= 0) return false;
    if (filters.result === 'LOSS' && pnl >= 0) return false;
    if (filters.result === 'BEP' && pnl !== 0) return false;
    if (q) {
      const hay =
        `${t.setup || ''} ${t.emotion || ''} ${t.notes || ''} ${t.date} ${t.session || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function calculateXauusdPips(trade: Pick<TradeEntry, 'direction' | 'entry' | 'exit'>): number | null {
  if (trade.entry === null || trade.exit === null || trade.entry === undefined || trade.exit === undefined) {
    return null;
  }
  const diff = trade.direction === 'BUY' ? trade.exit - trade.entry : trade.entry - trade.exit;
  return diff * 10; // 1.00 USD move on Gold = 10 pips
}

export function buildCsvContent(trades: TradeEntry[]): string {
  const headers = [
    'ID', 'Tanggal', 'Jam', 'Pair', 'Arah', 'Lot', 'Sesi',
    'Entry', 'Exit', 'PnL_IDR', 'Setup', 'Emosi', 'Catatan',
  ];
  const csvEscape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = sortTradesChronological(trades).map((t) =>
    [
      t.id,
      t.date,
      t.time || '',
      t.pair || 'XAUUSD',
      t.direction,
      t.lot,
      t.session || '',
      t.entry ?? '',
      t.exit ?? '',
      t.pnl,
      t.setup || '',
      t.emotion || '',
      t.notes || '',
    ]
      .map(csvEscape)
      .join(','),
  );
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

export interface ParsedBackupPayload {
  trades: TradeEntry[];
  settings?: Partial<RiskSettings>;
}

const VALID_SESSIONS = new Set<MarketSession>(['Asia', 'London', 'New York', 'Overlap']);

export function parseAndValidateImport(rawText: string): ParsedBackupPayload {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.trades)) {
    throw new Error('Format JSON tidak valid (properti "trades" tidak ditemukan).');
  }

  const cleanTrades: TradeEntry[] = parsed.trades
    .filter((t: Record<string, unknown>) => t && typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t.date))
    .map((t: Record<string, unknown>) => {
      const sessionRaw = String(t.session || 'New York') as MarketSession;
      return {
        id: typeof t.id === 'string' && t.id.trim() ? t.id.trim() : generateTradeId(),
        pair: 'XAUUSD',
        date: String(t.date).slice(0, 10),
        time: typeof t.time === 'string' && t.time ? t.time : '12:00',
        direction: t.direction === 'SELL' ? 'SELL' : 'BUY',
        lot: Math.max(0.01, Number(t.lot) || 0.01),
        session: VALID_SESSIONS.has(sessionRaw) ? sessionRaw : 'New York',
        entry:
          t.entry !== null && t.entry !== undefined && t.entry !== '' && !Number.isNaN(Number(t.entry))
            ? Number(t.entry)
            : null,
        exit:
          t.exit !== null && t.exit !== undefined && t.exit !== '' && !Number.isNaN(Number(t.exit))
            ? Number(t.exit)
            : null,
        pnl: Number(t.pnl) || 0,
        setup: typeof t.setup === 'string' && t.setup.trim() ? t.setup.trim() : 'Umum',
        emotion: typeof t.emotion === 'string' && t.emotion.trim() ? t.emotion.trim() : 'Disiplin Sesuai Plan',
        notes: typeof t.notes === 'string' ? t.notes : '',
      };
    });

  return {
    trades: cleanTrades,
    settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : undefined,
  };
}

export function mergeOrReplaceState(
  currentState: AppState,
  incoming: ParsedBackupPayload,
  mode: 'replace' | 'merge',
): AppState {
  if (mode === 'replace') {
    return {
      isDemoData: false,
      settings: incoming.settings
        ? {
            monthlyLossLimit: Math.max(10000, Number(incoming.settings.monthlyLossLimit) || currentState.settings.monthlyLossLimit),
            warningThresholdPct: Math.min(95, Math.max(30, Number(incoming.settings.warningThresholdPct) || 75)),
            lossCalcMode: incoming.settings.lossCalcMode === 'gross' ? 'gross' : 'net',
            initialCapital: Math.max(0, Number(incoming.settings.initialCapital) || 0),
          }
        : { ...currentState.settings },
      trades: incoming.trades,
    };
  }

  const existingIds = new Set(currentState.trades.map((t) => t.id));
  const mergedTrades = [...currentState.trades];
  for (const t of incoming.trades) {
    const nextTrade = existingIds.has(t.id) ? { ...t, id: generateTradeId() } : t;
    existingIds.add(nextTrade.id);
    mergedTrades.push(nextTrade);
  }
  return {
    ...currentState,
    isDemoData: false,
    trades: mergedTrades,
  };
}

export function createDemoState(now = new Date()): AppState {
  const today = toLocalDateStr(now);
  const monthPrefix = toLocalMonthStr(now);
  const dayNum = now.getDate();

  const makeDay = (offsetBack: number) => {
    const target = Math.max(1, dayNum - offsetBack);
    return `${monthPrefix}-${pad2(target)}`;
  };

  // Current month net PnL = -3.850.000 vs 5.000.000 limit (77% -> triggers approaching warning immediately)
  const sampleTrades: TradeEntry[] = [
    {
      id: 'demo_tr_01',
      pair: 'XAUUSD',
      date: makeDay(12),
      time: '14:30',
      direction: 'BUY',
      lot: 0.05,
      session: 'London',
      entry: 2632.4,
      exit: 2641.2,
      pnl: 1150000,
      setup: 'SMC / Order Block',
      emotion: 'Disiplin Sesuai Plan',
      notes: 'Sweep liquidity sesi Asia lalu retest OB M15, TP1 & TP2 tercapai bersih.',
    },
    {
      id: 'demo_tr_02',
      pair: 'XAUUSD',
      date: makeDay(10),
      time: '20:15',
      direction: 'SELL',
      lot: 0.08,
      session: 'New York',
      entry: 2655.0,
      exit: 2663.5,
      pnl: -1450000,
      setup: 'Supply & Demand',
      emotion: 'FOMO',
      notes: 'Masuk terlalu cepat sebelum candle konfirmasi M15 close saat rilis data US.',
    },
    {
      id: 'demo_tr_03',
      pair: 'XAUUSD',
      date: makeDay(8),
      time: '19:45',
      direction: 'BUY',
      lot: 0.05,
      session: 'Overlap',
      entry: 2644.1,
      exit: 2652.8,
      pnl: 950000,
      setup: 'Breakout & Retest',
      emotion: 'Tenang & Sabar',
      notes: 'Break struktur H1 dan retest mulus di sesi overlap London-New York.',
    },
    {
      id: 'demo_tr_04',
      pair: 'XAUUSD',
      date: makeDay(6),
      time: '21:10',
      direction: 'SELL',
      lot: 0.1,
      session: 'New York',
      entry: 2668.2,
      exit: 2679.0,
      pnl: -1950000,
      setup: 'Scalping News (NFP/CPI)',
      emotion: 'Revenge Trade',
      notes: 'Kesalahan overlot karena ingin cepat menutup loss sebelumnya. Evaluasi: patuhi max lot 0.05.',
    },
    {
      id: 'demo_tr_05',
      pair: 'XAUUSD',
      date: makeDay(4),
      time: '10:20',
      direction: 'BUY',
      lot: 0.04,
      session: 'Asia',
      entry: 2648.0,
      exit: 2653.5,
      pnl: 550000,
      setup: 'SNR / Trendline',
      emotion: 'Disiplin Sesuai Plan',
      notes: 'Bounce support harian, lot kecil dan eksekusi tenang.',
    },
    {
      id: 'demo_tr_06',
      pair: 'XAUUSD',
      date: makeDay(2),
      time: '15:40',
      direction: 'SELL',
      lot: 0.06,
      session: 'London',
      entry: 2671.3,
      exit: 2681.5,
      pnl: -1550000,
      setup: 'Liquidity Sweep',
      emotion: 'Overlot / Terlalu Agresif',
      notes: 'SL tersentuh akibat spike sesi London open.',
    },
    {
      id: 'demo_tr_07',
      pair: 'XAUUSD',
      date: makeDay(1),
      time: '19:20',
      direction: 'BUY',
      lot: 0.05,
      session: 'Overlap',
      entry: 2659.0,
      exit: 2659.1,
      pnl: 0,
      setup: 'SMC / Order Block',
      emotion: 'Ragu-ragu / Close Terlalu Cepat',
      notes: 'Geser SL ke BEP karena ragu menjelang pidato The Fed.',
    },
    {
      id: 'demo_tr_08',
      pair: 'XAUUSD',
      date: today,
      time: '15:10',
      direction: 'SELL',
      lot: 0.05,
      session: 'London',
      entry: 2664.4,
      exit: 2675.2,
      pnl: -1550000,
      setup: 'Supply & Demand',
      emotion: 'FOMO',
      notes: 'Entry melawan tren H4. Sisa toleransi loss bulanan tinggal sedikit, wajib disiplin!',
    },
  ];

  const prevMonth = addMonths(monthPrefix, -1);
  sampleTrades.push(
    {
      id: 'demo_tr_09',
      pair: 'XAUUSD',
      date: `${prevMonth}-14`,
      time: '20:00',
      direction: 'BUY',
      lot: 0.05,
      session: 'New York',
      entry: 2590.0,
      exit: 2608.0,
      pnl: 2100000,
      setup: 'Breakout & Retest',
      emotion: 'Disiplin Sesuai Plan',
      notes: 'Trend following solid di sesi New York.',
    },
    {
      id: 'demo_tr_10',
      pair: 'XAUUSD',
      date: `${prevMonth}-21`,
      time: '15:30',
      direction: 'SELL',
      lot: 0.05,
      session: 'London',
      entry: 2615.5,
      exit: 2606.0,
      pnl: 1250000,
      setup: 'SMC / Order Block',
      emotion: 'Tenang & Sabar',
      notes: 'Rejection clean dari supply H4.',
    },
  );

  return {
    isDemoData: true,
    settings: { ...DEFAULT_SETTINGS },
    trades: sampleTrades,
  };
}

export function buildMonthlyCalendarGrid(
  trades: TradeEntry[],
  monthStr: string,
): CalendarMonthData {
  const [year, month] = monthStr.split('-').map(Number);
  const firstDay = new Date(year, (month || 1) - 1, 1);
  const daysInMonth = new Date(year, month || 1, 0).getDate();
  // Monday=0 .. Sunday=6
  const leadingEmptyCount = (firstDay.getDay() + 6) % 7;

  const dayMap = new Map<string, TradeEntry[]>();
  for (const t of trades) {
    if (t.date.startsWith(monthStr)) {
      const list = dayMap.get(t.date) || [];
      list.push(t);
      dayMap.set(t.date, list);
    }
  }

  const days: CalendarDayCell[] = [];
  let tradingDays = 0;
  let profitDays = 0;
  let lossDays = 0;
  let bepDays = 0;
  let totalTrades = 0;
  let totalPnL = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthStr}-${pad2(d)}`;
    const dayTrades = sortTradesChronological(dayMap.get(date) || []);
    let netPnL = 0;
    let wins = 0;
    let losses = 0;
    let beps = 0;

    for (const t of dayTrades) {
      const val = Number(t.pnl) || 0;
      netPnL += val;
      if (val > 0) wins++;
      else if (val < 0) losses++;
      else beps++;
    }

    if (dayTrades.length > 0) {
      tradingDays++;
      if (netPnL > 0) profitDays++;
      else if (netPnL < 0) lossDays++;
      else bepDays++;
    }

    totalTrades += dayTrades.length;
    totalPnL += netPnL;

    days.push({
      date,
      dayNum: d,
      tradeCount: dayTrades.length,
      netPnL,
      wins,
      losses,
      beps,
      trades: dayTrades,
    });
  }

  return {
    monthStr,
    leadingEmptyCount,
    days,
    tradingDays,
    profitDays,
    lossDays,
    bepDays,
    totalTrades,
    totalPnL,
  };
}

