import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Menu,
  Plus,
  RotateCcw,
  Shield,
  Upload,
  X,
} from 'lucide-react';
import { ChartsSection } from './components/ChartsSection';
import { ConfirmModal, NoteModal } from './components/ConfirmModal';
import { ImportModal } from './components/ImportModal';
import { JournalSection } from './components/JournalSection';
import { MonthlyCalendarRecap } from './components/MonthlyCalendarRecap';
import { RiskBanner } from './components/RiskBanner';
import { SettingsModal } from './components/SettingsModal';
import { StopAlertModal } from './components/StopAlertModal';
import { TradeModal } from './components/TradeModal';
import type {
  AppState,
  JournalFilters,
  PeriodType,
  RiskSettings,
  TradeEntry,
} from './types/trading';
import { playStopAlertBeep } from './utils/soundAlert';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  addDays,
  addMonths,
  buildCsvContent,
  buildSubPeriodBreakdown,
  computeMetrics,
  createDemoState,
  evaluateMonthlyRisk,
  filterTradesByPeriod,
  formatCompactIDR,
  formatIDR,
  getPeriodRange,
  mergeOrReplaceState,
  type ParsedBackupPayload,
  toLocalDateStr,
  toLocalMonthStr,
} from './utils/tradingLogic';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warn' | 'error';
}

type ConfirmAction =
  | { kind: 'delete-trade'; trade: TradeEntry }
  | { kind: 'clear-demo' }
  | { kind: 'load-demo' }
  | { kind: 'reset-all' };

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = createDemoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    const parsed = JSON.parse(raw);
    return {
      isDemoData: Boolean(parsed.isDemoData),
      settings: {
        monthlyLossLimit:
          Number(parsed.settings?.monthlyLossLimit) ||
          DEFAULT_SETTINGS.monthlyLossLimit,
        warningThresholdPct:
          Number(parsed.settings?.warningThresholdPct) ||
          DEFAULT_SETTINGS.warningThresholdPct,
        lossCalcMode:
          parsed.settings?.lossCalcMode === 'gross' ? 'gross' : 'net',
        initialCapital: Number(parsed.settings?.initialCapital) || 0,
      },
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
    };
  } catch {
    return createDemoState();
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [anchorDate, setAnchorDate] = useState<string>(() =>
    toLocalDateStr(new Date()),
  );
  const [anchorMonth, setAnchorMonth] = useState<string>(() =>
    toLocalMonthStr(new Date()),
  );
  const [donutMode, setDonutMode] = useState<'result' | 'session'>('result');
  const [filters, setFilters] = useState<JournalFilters>({
    scope: 'period',
    direction: 'ALL',
    result: 'ALL',
    session: 'ALL',
    query: '',
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  const [customTradeDate, setCustomTradeDate] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [stopAlertOpen, setStopAlertOpen] = useState(false);
  const [noteTrade, setNoteTrade] = useState<TradeEntry | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const equityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialBootCheckedRef = useRef(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const currentMonth = toLocalMonthStr(new Date());
  const risk = evaluateMonthlyRisk(state.trades, state.settings, currentMonth);
  const range = getPeriodRange(period, anchorDate, anchorMonth);
  const periodTrades = filterTradesByPeriod(state.trades, range);
  const metrics = computeMetrics(periodTrades);
  const breakdown = buildSubPeriodBreakdown(
    range,
    periodTrades,
    anchorDate,
    anchorMonth,
  );

  const addToast = (
    message: string,
    type: ToastItem['type'] = 'success',
  ) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3400);
  };

  // On initial boot, if current month is already over limit, surface stop-trading alert
  useEffect(() => {
    if (initialBootCheckedRef.current) return;
    initialBootCheckedRef.current = true;
    if (risk.status === 'EXCEEDED') {
      setStopAlertOpen(true);
    }
  }, [risk.status]);

  const checkRiskAfterMutation = (nextTrades: TradeEntry[], nextSettings: RiskSettings) => {
    const nextRisk = evaluateMonthlyRisk(nextTrades, nextSettings, currentMonth);
    if (nextRisk.status === 'EXCEEDED') {
      setStopAlertOpen(true);
      playStopAlertBeep();
    } else if (nextRisk.status === 'APPROACHING') {
      addToast(
        `Peringatan: Kerugian bulan ini sudah ${nextRisk.pctUsed.toFixed(1)}% dari batas maksimal!`,
        'warn',
      );
    }
  };

  const handleSaveTrade = (trade: TradeEntry, isEdit: boolean) => {
    const nextTrades = isEdit
      ? state.trades.map((t) => (t.id === trade.id ? trade : t))
      : [...state.trades, trade];

    const nextState: AppState = {
      ...state,
      isDemoData: false,
      trades: nextTrades,
    };
    setState(nextState);
    setTradeModalOpen(false);
    setEditingTrade(null);
    addToast(
      isEdit
        ? 'Jurnal trade berhasil diperbarui.'
        : 'Trade XAUUSD baru berhasil dicatat.',
      'success',
    );

    if (trade.date.startsWith(currentMonth)) {
      checkRiskAfterMutation(nextTrades, nextState.settings);
    }
  };

  const handleSaveSettings = (nextSettings: RiskSettings) => {
    const nextState: AppState = {
      ...state,
      settings: nextSettings,
    };
    setState(nextState);
    setSettingsModalOpen(false);
    addToast('Pengaturan batas loss bulanan disimpan.', 'success');
    checkRiskAfterMutation(nextState.trades, nextSettings);
  };

  const handleExportPDF = async () => {
    try {
      const { exportTradingRecapPDF } = await import('./utils/pdfExport');
      const fileName = exportTradingRecapPDF({
        range,
        trades: periodTrades,
        metrics,
        risk,
        equityCanvas: equityCanvasRef.current,
        barCanvas: barCanvasRef.current,
      });
      addToast(`Laporan PDF (${fileName}) berhasil diekspor.`, 'success');
    } catch {
      addToast('Gagal mengekspor PDF otomatis. Silakan coba lagi.', 'error');
    }
  };

  const handleExportJSON = () => {
    const exportObj = {
      app: 'XAUUSD_PRO_RECAP',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      trades: state.trades,
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xauusd-journal-backup-${toLocalDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('File backup JSON berhasil diunduh.', 'success');
  };

  const handleExportCSV = () => {
    const csvContent = buildCsvContent(state.trades);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xauusd-journal-${toLocalDateStr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('File CSV (Excel) berhasil diekspor.', 'success');
  };

  const handleImportConfirm = (
    payload: ParsedBackupPayload,
    mode: 'replace' | 'merge',
  ) => {
    const nextState = mergeOrReplaceState(state, payload, mode);
    setState(nextState);
    setImportModalOpen(false);
    addToast(`Berhasil mengimport ${payload.trades.length} transaksi.`, 'success');
    checkRiskAfterMutation(nextState.trades, nextState.settings);
  };

  const handleExecuteConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.kind === 'delete-trade') {
      const id = confirmAction.trade.id;
      setState((prev) => ({
        ...prev,
        isDemoData: false,
        trades: prev.trades.filter((t) => t.id !== id),
      }));
      addToast('Entri jurnal trade dihapus.', 'warn');
    } else if (confirmAction.kind === 'clear-demo') {
      setState((prev) => ({ ...prev, isDemoData: false, trades: [] }));
      addToast('Jurnal dikosongkan. Siap mencatat trade asli Anda.', 'success');
    } else if (confirmAction.kind === 'load-demo') {
      const demo = createDemoState();
      setState(demo);
      addToast('Data simulasi XAUUSD berhasil dimuat.', 'success');
    } else if (confirmAction.kind === 'reset-all') {
      setState((prev) => ({ ...prev, isDemoData: false, trades: [] }));
      addToast('Semua data log trading berhasil direset.', 'warn');
    }
    setConfirmAction(null);
  };

  const handlePrevPeriod = () => {
    if (period === 'daily') setAnchorDate((d) => addDays(d, -1));
    else if (period === 'weekly') setAnchorDate((d) => addDays(d, -7));
    else if (period === 'monthly') setAnchorMonth((m) => addMonths(m, -1));
  };

  const handleNextPeriod = () => {
    if (period === 'daily') setAnchorDate((d) => addDays(d, 1));
    else if (period === 'weekly') setAnchorDate((d) => addDays(d, 7));
    else if (period === 'monthly') setAnchorMonth((m) => addMonths(m, 1));
  };

  const handleTodayPeriod = () => {
    const now = new Date();
    setAnchorDate(toLocalDateStr(now));
    setAnchorMonth(toLocalMonthStr(now));
  };

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const roiPercent =
    state.settings.initialCapital > 0
      ? (metrics.totalPnL / state.settings.initialCapital) * 100
      : null;

  const buyWR =
    metrics.buyCount > 0
      ? ((metrics.buyWin / metrics.buyCount) * 100).toFixed(0)
      : '0';
  const sellWR =
    metrics.sellCount > 0
      ? ((metrics.sellWin / metrics.sellCount) * 100).toFixed(0)
      : '0';

  const biasLabel =
    metrics.buyCount === metrics.sellCount
      ? metrics.total === 0
        ? '-'
        : 'Seimbang'
      : metrics.buyCount > metrics.sellCount
        ? 'Dominan BUY'
        : 'Dominan SELL';

  const confirmDialogProps = (() => {
    if (!confirmAction) return null;
    if (confirmAction.kind === 'delete-trade') {
      return {
        title: 'Hapus Entri Trade',
        message: `Apakah Anda yakin ingin menghapus log XAUUSD ${confirmAction.trade.direction} pada ${confirmAction.trade.date}?`,
        confirmLabel: 'Hapus Trade',
        danger: true,
      };
    }
    if (confirmAction.kind === 'clear-demo') {
      return {
        title: 'Mulai Jurnal Kosong',
        message: 'Hapus data contoh simulasi dan mulai dengan jurnal trading kosong milik Anda?',
        confirmLabel: 'Kosongkan Data',
        danger: true,
      };
    }
    if (confirmAction.kind === 'load-demo') {
      return {
        title: 'Muat Data Contoh',
        message: 'Data saat ini akan digantikan dengan data simulasi XAUUSD agar seluruh fitur grafik dan peringatan dapat diuji.',
        confirmLabel: 'Muat Data Contoh',
        danger: false,
      };
    }
    return {
      title: 'Reset Semua Data',
      message: 'Semua log trading XAUUSD akan dihapus permanen dari browser ini. Pastikan Anda sudah Backup JSON jika diperlukan.',
      confirmLabel: 'Reset Permanen',
      danger: true,
    };
  })();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/90 bg-[#0c1220]">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-xs font-extrabold text-slate-950">
            XAU
          </div>
          <span className="text-sm font-extrabold tracking-tight text-slate-50 whitespace-nowrap">
            XAUUSD Pro Recap
          </span>
        </div>

        <nav aria-label="Navigasi Utama" className="flex-1 space-y-1 px-3 py-4">
          <button
            type="button"
            onClick={() => scrollToSection('overview-section')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-100 hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <BarChart3 className="h-4 w-4 text-amber-400" />
            Ringkasan &amp; Grafik
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('calendar-section')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            Kalender Bulanan
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('journal-section')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <BookOpen className="h-4 w-4 text-slate-400" />
            Jurnal Log XAUUSD
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('data-section')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Database className="h-4 w-4 text-slate-400" />
            Import &amp; Export Data
          </button>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Shield className="h-4 w-4 text-slate-400" />
            Atur Batas Loss
          </button>
        </nav>

        <div className="border-t border-slate-800 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-400">
            Aksi Cepat Laporan
          </div>
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-100 hover:border-amber-500/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            Ekspor Laporan PDF
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Backup JSON
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="h-full w-72 border-r border-slate-800 bg-[#0c1220] p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-sm font-extrabold text-slate-100">
                  XAUUSD Pro Recap
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Tutup menu navigasi"
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => scrollToSection('overview-section')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  Ringkasan &amp; Grafik
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('calendar-section')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Kalender Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('journal-section')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  Jurnal Log XAUUSD
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('data-section')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <Database className="h-4 w-4 text-slate-400" />
                  Import &amp; Export Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setSettingsModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <Shield className="h-4 w-4 text-slate-400" />
                  Atur Batas Loss
                </button>
              </nav>
            </div>
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  handleExportPDF();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-100"
              >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Ekspor PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (strict single-row, clean breadcrumb + primary action) */}
        <header className="no-print sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-4 border-b border-slate-800/90 bg-[#090d16]/90 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden rounded-lg border border-slate-800 bg-[#111827] p-2 text-slate-300 hover:text-white"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 min-w-0">
              <span className="font-bold text-slate-100 whitespace-nowrap">
                XAUUSD · IDR
              </span>
              <span aria-hidden="true" className="hidden sm:inline">/</span>
              <span className="hidden sm:inline truncate">
                Rekap Harian, Mingguan &amp; Bulanan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportPDF}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              Ekspor PDF
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTrade(null);
                setTradeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Catat Trade
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] space-y-5 p-4 sm:p-6">
          {/* 1. Main Page Monthly Loss Guard Banner */}
          <div id="overview-section" className="scroll-mt-20 space-y-4">
            <RiskBanner
              risk={risk}
              onOpenSettings={() => setSettingsModalOpen(true)}
            />

            {state.isDemoData && (
              <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200">
                <span>
                  <strong>Mode Data Contoh Aktif:</strong> Data awal ini adalah simulasi XAUUSD agar grafik dan peringatan batas loss langsung terlihat.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ kind: 'clear-demo' })}
                  className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Kosongkan Data &amp; Mulai Jurnal Baru
                </button>
              </div>
            )}
          </div>

          {/* 2. Period Switcher Controls */}
          <section
            aria-label="Kontrol Periode Rekap"
            className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div
              role="tablist"
              aria-label="Pilih Periode Rekap"
              className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-[#0d1320] p-1 sm:inline-flex sm:flex-wrap"
            >
              {(
                [
                  { id: 'daily', label: 'Harian' },
                  { id: 'weekly', label: 'Mingguan' },
                  { id: 'monthly', label: 'Bulanan' },
                  { id: 'all', label: 'Semua Waktu' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={period === tab.id}
                  onClick={() => setPeriod(tab.id)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    period === tab.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPeriod}
                disabled={period === 'all'}
                aria-label="Periode sebelumnya"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#1a2234] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              {(period === 'daily' || period === 'weekly') && (
                <input
                  type="date"
                  aria-label="Pilih tanggal referensi periode"
                  value={anchorDate}
                  onChange={(e) => {
                    if (e.target.value) setAnchorDate(e.target.value);
                  }}
                  className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 font-mono-num text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              )}

              {period === 'monthly' && (
                <input
                  type="month"
                  aria-label="Pilih bulan rekap"
                  value={anchorMonth}
                  onChange={(e) => {
                    if (e.target.value) setAnchorMonth(e.target.value);
                  }}
                  className="rounded-lg border border-slate-700 bg-[#0d1320] px-2.5 py-1.5 font-mono-num text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              )}

              <button
                type="button"
                onClick={handleNextPeriod}
                disabled={period === 'all'}
                aria-label="Periode berikutnya"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#1a2234] px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleTodayPeriod}
                disabled={period === 'all'}
                className="rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                Saat Ini
              </button>

              <span
                data-testid="active-period-label"
                className="font-mono-num text-xs font-bold text-amber-300 px-2 py-1"
              >
                {range.label}
              </span>
            </div>
          </section>

          {/* 3. KPI Summary Grid */}
          <section
            aria-label="Ringkasan Metrik Trading"
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
          >
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Total P&amp;L Bersih</span>
                {roiPercent !== null && (
                  <span
                    className={`font-mono-num font-bold ${
                      roiPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {roiPercent >= 0 ? '+' : ''}
                    {roiPercent.toFixed(1)}% ROI
                  </span>
                )}
              </div>
              <div
                data-testid="kpi-total-pnl"
                className={`mt-1.5 font-mono-num text-2xl font-extrabold ${
                  metrics.totalPnL > 0
                    ? 'text-emerald-400'
                    : metrics.totalPnL < 0
                      ? 'text-red-400'
                      : 'text-slate-100'
                }`}
              >
                {formatIDR(metrics.totalPnL, metrics.totalPnL > 0)}
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                Profit: {formatIDR(metrics.grossProfit)} · Loss: -{formatIDR(metrics.grossLoss)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="text-xs font-semibold text-slate-400">Win Rate</div>
              <div
                data-testid="kpi-win-rate"
                className={`mt-1.5 font-mono-num text-2xl font-extrabold ${
                  metrics.winRate >= 50
                    ? 'text-emerald-400'
                    : metrics.total > 0
                      ? 'text-amber-400'
                      : 'text-slate-100'
                }`}
              >
                {metrics.winRate.toFixed(1)}%
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                {metrics.wins} Win / {metrics.losses} Loss / {metrics.beps} BEP
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="text-xs font-semibold text-slate-400">
                Total Trade &amp; Lot XAUUSD
              </div>
              <div
                data-testid="kpi-total-trades"
                className="mt-1.5 font-mono-num text-2xl font-extrabold text-slate-100"
              >
                {metrics.total} Trade
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                Total Volume: {metrics.totalLot.toFixed(2)} Lot
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="text-xs font-semibold text-slate-400">Profit Factor</div>
              <div
                className={`mt-1.5 font-mono-num text-2xl font-extrabold ${
                  metrics.profitFactor >= 1.5
                    ? 'text-emerald-400'
                    : metrics.profitFactor >= 1
                      ? 'text-amber-400'
                      : metrics.total > 0
                        ? 'text-red-400'
                        : 'text-slate-100'
                }`}
              >
                {metrics.profitFactor === Infinity
                  ? 'MAX'
                  : metrics.profitFactor.toFixed(2)}
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                Avg Win: {formatCompactIDR(metrics.avgWin)} · Avg Loss: -{formatCompactIDR(metrics.avgLoss)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="text-xs font-semibold text-slate-400">
                Trade Terbaik &amp; Terburuk
              </div>
              <div
                className={`mt-1.5 font-mono-num text-2xl font-extrabold ${
                  metrics.best > 0
                    ? 'text-emerald-400'
                    : metrics.best < 0
                      ? 'text-red-400'
                      : 'text-slate-100'
                }`}
              >
                {formatIDR(metrics.best, metrics.best > 0)}
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                Terburuk: {formatIDR(metrics.worst, metrics.worst > 0)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
              <div className="text-xs font-semibold text-slate-400">
                Bias Arah (BUY vs SELL)
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-slate-100">
                {biasLabel}
              </div>
              <div className="mt-1 font-mono-num text-xs text-slate-400">
                BUY: {metrics.buyCount} ({buyWR}% WR) · SELL: {metrics.sellCount} ({sellWR}% WR)
              </div>
            </div>
          </section>

          {/* 3B. Monthly Calendar Recap Grid */}
          <MonthlyCalendarRecap
            trades={state.trades}
            monthStr={period === 'monthly' ? anchorMonth : anchorDate.slice(0, 7)}
            onChangeMonth={(nextMonth) => {
              setAnchorMonth(nextMonth);
              setAnchorDate(
                nextMonth === currentMonth
                  ? toLocalDateStr(new Date())
                  : `${nextMonth}-01`,
              );
            }}
            onOpenDayRecap={(date) => {
              setPeriod('daily');
              setAnchorDate(date);
              setAnchorMonth(date.slice(0, 7));
              scrollToSection('overview-section');
            }}
            onAddTradeForDate={(date) => {
              setEditingTrade(null);
              setCustomTradeDate(date);
              setTradeModalOpen(true);
            }}
            onEditTrade={(trade) => {
              setEditingTrade(trade);
              setCustomTradeDate(null);
              setTradeModalOpen(true);
            }}
          />

          {/* 4. Interactive Charts & Breakdown */}
          <ChartsSection
            allTrades={state.trades}
            range={range}
            periodTrades={periodTrades}
            metrics={metrics}
            anchorDate={anchorDate}
            anchorMonth={anchorMonth}
            donutMode={donutMode}
            onChangeDonutMode={setDonutMode}
            equityCanvasRef={equityCanvasRef}
            barCanvasRef={barCanvasRef}
            breakdownTitle={breakdown.title}
            breakdownSubtitle={breakdown.subtitle}
            breakdownColName={breakdown.colName}
            breakdownRows={breakdown.rows}
          />

          {/* 5. Trading Journal Log */}
          <JournalSection
            allTrades={state.trades}
            periodTrades={periodTrades}
            filters={filters}
            onChangeFilters={setFilters}
            onAddTrade={() => {
              setEditingTrade(null);
              setTradeModalOpen(true);
            }}
            onEditTrade={(trade) => {
              setEditingTrade(trade);
              setTradeModalOpen(true);
            }}
            onDeleteTrade={(trade) =>
              setConfirmAction({ kind: 'delete-trade', trade })
            }
            onViewNote={(trade) => setNoteTrade(trade)}
          />

          {/* 6. Static Data Import/Export & PDF Management */}
          <section
            id="data-section"
            aria-label="Manajemen Data Statis dan Ekspor Laporan"
            className="no-print flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#111827] p-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Manajemen Data Statis &amp; Ekspor Laporan (LocalStorage Browser)
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Data tersimpan otomatis di browser Anda. Gunakan Backup JSON untuk pindah perangkat, Excel CSV untuk olah data, atau Ekspor PDF untuk arsip rekap bulanan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Ekspor PDF
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export Backup (.json)
              </button>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Restore (.json)
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel (.csv)
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ kind: 'load-demo' })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#1a2234] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Muat Data Contoh
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ kind: 'reset-all' })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Reset Semua Data
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Modals */}
      <TradeModal
        open={tradeModalOpen}
        editingTrade={editingTrade}
        defaultDate={
          customTradeDate ||
          (period === 'daily' ? anchorDate : toLocalDateStr(new Date()))
        }
        isStopWarningActive={risk.status === 'EXCEEDED'}
        onClose={() => {
          setTradeModalOpen(false);
          setEditingTrade(null);
          setCustomTradeDate(null);
        }}
        onSave={(trade, isEdit) => {
          setCustomTradeDate(null);
          handleSaveTrade(trade, isEdit);
        }}
      />

      <SettingsModal
        open={settingsModalOpen}
        settings={state.settings}
        onClose={() => setSettingsModalOpen(false)}
        onSave={handleSaveSettings}
      />

      <StopAlertModal
        open={stopAlertOpen}
        risk={risk}
        onClose={() => setStopAlertOpen(false)}
      />

      <ImportModal
        open={importModalOpen}
        currentSettings={state.settings}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleImportConfirm}
      />

      <NoteModal trade={noteTrade} onClose={() => setNoteTrade(null)} />

      {confirmDialogProps && (
        <ConfirmModal
          open={Boolean(confirmAction)}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          confirmLabel={confirmDialogProps.confirmLabel}
          danger={confirmDialogProps.danger}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleExecuteConfirm}
        />
      )}

      {/* Toast Stack */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-5 sm:bottom-5 sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 text-xs font-semibold shadow-xl ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-[#111827] text-emerald-300'
                : toast.type === 'warn'
                  ? 'border-orange-500/50 bg-[#111827] text-orange-300'
                  : 'border-red-500/50 bg-[#111827] text-red-300'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
