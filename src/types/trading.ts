export type TradeDirection = 'BUY' | 'SELL';
export type MarketSession = 'Asia' | 'London' | 'New York' | 'Overlap';
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all';
export type LossCalcMode = 'net' | 'gross';
export type RiskStatus = 'SAFE' | 'APPROACHING' | 'EXCEEDED';
export type TradeOutcome = 'PROFIT' | 'LOSS' | 'BEP';

export interface TradeEntry {
  id: string;
  pair: 'XAUUSD';
  date: string; // YYYY-MM-DD (local date)
  time: string; // HH:mm
  direction: TradeDirection;
  lot: number;
  session: MarketSession;
  entry: number | null;
  exit: number | null;
  pnl: number; // IDR (positive = profit, negative = loss, 0 = BEP)
  setup: string;
  emotion: string;
  notes: string;
}

export interface RiskSettings {
  monthlyLossLimit: number; // IDR
  warningThresholdPct: number; // 30..95 (%)
  lossCalcMode: LossCalcMode;
  initialCapital: number; // optional IDR for ROI calculation
}

export interface AppState {
  isDemoData: boolean;
  settings: RiskSettings;
  trades: TradeEntry[];
}

export interface MonthlyRiskEvaluation {
  monthStr: string;
  netPnL: number;
  grossLoss: number;
  grossProfit: number;
  usedLoss: number;
  limit: number;
  pctUsed: number;
  remaining: number;
  warningThresholdPct: number;
  lossCalcMode: LossCalcMode;
  status: RiskStatus;
}

export interface PeriodRange {
  type: PeriodType;
  start: string | null;
  end: string | null;
  label: string;
}

export interface PeriodMetrics {
  total: number;
  wins: number;
  losses: number;
  beps: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  totalLot: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  best: number;
  worst: number;
  buyCount: number;
  buyWin: number;
  sellCount: number;
  sellWin: number;
}

export interface SubPeriodRow {
  key: string;
  label: string;
  metrics: PeriodMetrics;
}

export interface JournalFilters {
  scope: 'period' | 'all';
  direction: 'ALL' | TradeDirection;
  result: 'ALL' | TradeOutcome;
  session: 'ALL' | MarketSession;
  query: string;
}

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNum: number;
  tradeCount: number;
  netPnL: number;
  wins: number;
  losses: number;
  beps: number;
  trades: TradeEntry[];
}

export interface CalendarMonthData {
  monthStr: string;
  leadingEmptyCount: number; // 0 (Mon) .. 6 (Sun)
  days: CalendarDayCell[];
  tradingDays: number;
  profitDays: number;
  lossDays: number;
  bepDays: number;
  totalTrades: number;
  totalPnL: number;
}

