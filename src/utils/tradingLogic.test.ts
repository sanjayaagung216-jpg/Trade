import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  addMonths,
  buildChartDatasets,
  buildCsvContent,
  buildMonthlyCalendarGrid,
  calculateXauusdPips,
  computeMetrics,
  createDemoState,
  evaluateMonthlyRisk,
  filterTradesByPeriod,
  formatCompactIDR,
  formatIDR,
  getPeriodRange,
  getWeekBounds,
  mergeOrReplaceState,
  parseAndValidateImport,
} from './tradingLogic';
import type { RiskSettings, TradeEntry } from '../types/trading';

const sampleSettings: RiskSettings = {
  monthlyLossLimit: 5000000,
  warningThresholdPct: 75,
  lossCalcMode: 'net',
  initialCapital: 25000000,
};

function makeTrade(overrides: Partial<TradeEntry>): TradeEntry {
  return {
    id: 't1',
    pair: 'XAUUSD',
    date: '2026-11-10',
    time: '15:00',
    direction: 'BUY',
    lot: 0.05,
    session: 'London',
    entry: 2650,
    exit: 2660,
    pnl: 1000000,
    setup: 'SMC',
    emotion: 'Disiplin',
    notes: '',
    ...overrides,
  };
}

test('formatIDR and formatCompactIDR format Indonesian Rupiah cleanly', () => {
  assert.equal(formatIDR(1500000), 'Rp 1.500.000');
  assert.equal(formatIDR(1500000, true), '+Rp 1.500.000');
  assert.equal(formatIDR(-750000), '-Rp 750.000');
  assert.equal(formatIDR(0, true), 'Rp 0');
  assert.equal(formatCompactIDR(2500000), 'Rp 2.5jt');
  assert.equal(formatCompactIDR(-500000), '-Rp 500rb');
});

test('getWeekBounds computes Monday to Sunday accurately across month boundaries', () => {
  // 2026-11-01 is Sunday -> Monday should be 2026-10-26
  const bounds = getWeekBounds('2026-11-01');
  assert.equal(bounds.start, '2026-10-26');
  assert.equal(bounds.end, '2026-11-01');

  assert.equal(addDays('2026-11-29', 3), '2026-12-02');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('evaluateMonthlyRisk transitions SAFE -> APPROACHING -> EXCEEDED in net and gross modes', () => {
  const trades: TradeEntry[] = [
    makeTrade({ id: '1', date: '2026-11-02', pnl: 1000000 }),
    makeTrade({ id: '2', date: '2026-11-05', pnl: -3000000 }),
    makeTrade({ id: '3', date: '2026-10-20', pnl: -9000000 }), // previous month must be ignored
  ];

  // Net loss = 2.000.000 / 5.000.000 = 40% -> SAFE
  const netSafe = evaluateMonthlyRisk(trades, sampleSettings, '2026-11');
  assert.equal(netSafe.status, 'SAFE');
  assert.equal(netSafe.usedLoss, 2000000);
  assert.equal(netSafe.remaining, 3000000);

  // Add -1.800.000 -> Net loss = 3.800.000 (76% >= 75%) -> APPROACHING
  const approachingTrades = [...trades, makeTrade({ id: '4', date: '2026-11-10', pnl: -1800000 })];
  const netWarn = evaluateMonthlyRisk(approachingTrades, sampleSettings, '2026-11');
  assert.equal(netWarn.status, 'APPROACHING');
  assert.equal(Math.round(netWarn.pctUsed), 76);

  // Add -1.500.000 -> Net loss = 5.300.000 (106% >= 100%) -> EXCEEDED
  const exceededTrades = [...approachingTrades, makeTrade({ id: '5', date: '2026-11-12', pnl: -1500000 })];
  const netStop = evaluateMonthlyRisk(exceededTrades, sampleSettings, '2026-11');
  assert.equal(netStop.status, 'EXCEEDED');
  assert.equal(netStop.remaining, 0);

  // Gross mode counts grossLoss (3.000.000 + 1.800.000 = 4.800.000 = 96%) ignoring the 1M win
  const grossEval = evaluateMonthlyRisk(
    approachingTrades,
    { ...sampleSettings, lossCalcMode: 'gross' },
    '2026-11',
  );
  assert.equal(grossEval.usedLoss, 4800000);
  assert.equal(grossEval.status, 'APPROACHING');
});

test('demo state starts in APPROACHING warning state for immediate visibility', () => {
  const demo = createDemoState(new Date(2026, 10, 21, 9, 0));
  const risk = evaluateMonthlyRisk(demo.trades, demo.settings, '2026-11');
  assert.equal(risk.status, 'APPROACHING');
  assert.ok(risk.pctUsed >= 75 && risk.pctUsed < 100);
});

test('computeMetrics and filterTradesByPeriod compute accurate KPIs', () => {
  const trades: TradeEntry[] = [
    makeTrade({ id: '1', date: '2026-11-21', direction: 'BUY', lot: 0.05, pnl: 1500000 }),
    makeTrade({ id: '2', date: '2026-11-21', direction: 'SELL', lot: 0.10, pnl: -500000 }),
    makeTrade({ id: '3', date: '2026-11-21', direction: 'BUY', lot: 0.05, pnl: 0 }),
    makeTrade({ id: '4', date: '2026-11-15', direction: 'SELL', lot: 0.05, pnl: 800000 }),
  ];

  const dailyRange = getPeriodRange('daily', '2026-11-21', '2026-11');
  const dailyTrades = filterTradesByPeriod(trades, dailyRange);
  assert.equal(dailyTrades.length, 3);

  const metrics = computeMetrics(dailyTrades);
  assert.equal(metrics.totalPnL, 1000000);
  assert.equal(metrics.wins, 1);
  assert.equal(metrics.losses, 1);
  assert.equal(metrics.beps, 1);
  assert.equal(metrics.winRate, 50); // 1 win out of 2 decided (1W + 1L)
  assert.equal(metrics.profitFactor, 3); // 1.5M / 0.5M
  assert.equal(Number(metrics.totalLot.toFixed(2)), 0.2);
  assert.equal(metrics.best, 1500000);
  assert.equal(metrics.worst, -500000);
});

test('calculateXauusdPips handles BUY and SELL moves accurately', () => {
  assert.equal(calculateXauusdPips({ direction: 'BUY', entry: 2650, exit: 2662 }), 120);
  assert.equal(calculateXauusdPips({ direction: 'SELL', entry: 2660, exit: 2652.5 }), 75);
  assert.equal(calculateXauusdPips({ direction: 'BUY', entry: null, exit: 2650 }), null);
});

test('parseAndValidateImport and mergeOrReplaceState handle valid, invalid, and duplicate IDs', () => {
  assert.throws(() => parseAndValidateImport('{"foo": 123}'));

  const payload = parseAndValidateImport(
    JSON.stringify({
      settings: { monthlyLossLimit: 8000000, warningThresholdPct: 80, lossCalcMode: 'gross' },
      trades: [
        { id: 'demo_tr_01', date: '2026-11-21', direction: 'SELL', lot: 0.05, pnl: -400000 },
      ],
    }),
  );

  assert.equal(payload.trades.length, 1);
  assert.equal(payload.trades[0].pair, 'XAUUSD');

  const demo = createDemoState(new Date(2026, 10, 21, 9, 0));
  const merged = mergeOrReplaceState(demo, payload, 'merge');
  assert.equal(merged.trades.length, demo.trades.length + 1);
  assert.equal(new Set(merged.trades.map((t) => t.id)).size, merged.trades.length);

  const replaced = mergeOrReplaceState(demo, payload, 'replace');
  assert.equal(replaced.trades.length, 1);
  assert.equal(replaced.settings.monthlyLossLimit, 8000000);
  assert.equal(replaced.settings.lossCalcMode, 'gross');
});

test('buildChartDatasets and buildCsvContent generate non-empty structured output', () => {
  const demo = createDemoState(new Date(2026, 10, 21, 9, 0));
  const range = getPeriodRange('monthly', '2026-11-21', '2026-11');
  const periodTrades = filterTradesByPeriod(demo.trades, range);
  const charts = buildChartDatasets(demo.trades, range, periodTrades, '2026-11-21', '2026-11');

  assert.equal(charts.barLabels.length, 30); // November has 30 days
  assert.ok(charts.eqValues.length > 1);

  const csv = buildCsvContent(demo.trades);
  assert.ok(csv.startsWith('\uFEFFID,Tanggal,Jam,Pair'));
  assert.ok(csv.includes('XAUUSD'));
});

test('buildMonthlyCalendarGrid aligns Monday-first weekdays and aggregates daily PnL & counts', () => {
  const trades: TradeEntry[] = [
    makeTrade({ id: 'a1', date: '2026-11-03', pnl: 1500000 }),
    makeTrade({ id: 'a2', date: '2026-11-03', pnl: 400000 }),
    makeTrade({ id: 'a3', date: '2026-11-06', pnl: -2300000 }),
    makeTrade({ id: 'a4', date: '2026-11-11', pnl: 0 }),
    makeTrade({ id: 'a5', date: '2026-10-15', pnl: 999999 }), // different month ignored
  ];

  // November 2026 starts on Sunday -> Monday-first grid has 6 leading empty cells
  const cal = buildMonthlyCalendarGrid(trades, '2026-11');
  assert.equal(cal.leadingEmptyCount, 6);
  assert.equal(cal.days.length, 30);
  assert.equal(cal.tradingDays, 3);
  assert.equal(cal.profitDays, 1);
  assert.equal(cal.lossDays, 1);
  assert.equal(cal.bepDays, 1);
  assert.equal(cal.totalTrades, 4);
  assert.equal(cal.totalPnL, -400000);

  const day3 = cal.days[2]; // 3 Nov
  assert.equal(day3.date, '2026-11-03');
  assert.equal(day3.tradeCount, 2);
  assert.equal(day3.netPnL, 1900000);

  const day6 = cal.days[5]; // 6 Nov
  assert.equal(day6.tradeCount, 1);
  assert.equal(day6.netPnL, -2300000);

  const day1 = cal.days[0]; // 1 Nov (no trades)
  assert.equal(day1.tradeCount, 0);
  assert.equal(day1.netPnL, 0);
});

