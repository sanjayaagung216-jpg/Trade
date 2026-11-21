import { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { PeriodMetrics, PeriodRange, TradeEntry } from '../types/trading';
import {
  buildChartDatasets,
  formatCompactIDR,
  formatIDR,
} from '../utils/tradingLogic';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

interface ChartsSectionProps {
  allTrades: TradeEntry[];
  range: PeriodRange;
  periodTrades: TradeEntry[];
  metrics: PeriodMetrics;
  anchorDate: string;
  anchorMonth: string;
  donutMode: 'result' | 'session';
  onChangeDonutMode: (mode: 'result' | 'session') => void;
  equityCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  barCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  breakdownTitle: string;
  breakdownSubtitle: string;
  breakdownColName: string;
  breakdownRows: Array<{
    key: string;
    label: string;
    metrics: PeriodMetrics;
  }>;
}

export function ChartsSection({
  allTrades,
  range,
  periodTrades,
  metrics,
  anchorDate,
  anchorMonth,
  donutMode,
  onChangeDonutMode,
  equityCanvasRef,
  barCanvasRef,
  breakdownTitle,
  breakdownSubtitle,
  breakdownColName,
  breakdownRows,
}: ChartsSectionProps) {
  const donutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eqChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);
  const donutChartRef = useRef<Chart | null>(null);

  const datasets = buildChartDatasets(
    allTrades,
    range,
    periodTrades,
    anchorDate,
    anchorMonth,
  );

  // Equity Curve & Bar Chart
  useEffect(() => {
    const eqCanvas = equityCanvasRef.current;
    const barCanvas = barCanvasRef.current;
    if (!eqCanvas || !barCanvas) return;

    const gridColor = 'rgba(148, 163, 184, 0.12)';
    const tickColor = '#94a3b8';

    // 1. Equity Curve
    const eqCtx = eqCanvas.getContext('2d');
    if (eqCtx) {
      const finalEq = datasets.eqValues[datasets.eqValues.length - 1] ?? 0;
      const lineColor = finalEq >= 0 ? '#10b981' : '#ef4444';
      const grad = eqCtx.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(
        0,
        finalEq >= 0 ? 'rgba(16, 185, 129, 0.30)' : 'rgba(239, 68, 68, 0.30)',
      );
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      if (eqChartRef.current) eqChartRef.current.destroy();
      eqChartRef.current = new Chart(eqCtx, {
        type: 'line',
        data: {
          labels: datasets.eqLabels,
          datasets: [
            {
              label: 'Kumulatif P&L (Rp)',
              data: datasets.eqValues,
              borderColor: lineColor,
              backgroundColor: grad,
              fill: true,
              tension: 0.28,
              borderWidth: 2.5,
              pointRadius: datasets.eqValues.length > 25 ? 2 : 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#fbbf24',
              pointBorderColor: '#090d16',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              titleColor: '#fbbf24',
              bodyColor: '#f8fafc',
              callbacks: {
                label: (ctx) => `Kumulatif: ${formatIDR(ctx.parsed.y ?? 0, true)}`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: tickColor, maxTicksLimit: 8, font: { size: 11 } },
              grid: { display: false },
            },
            y: {
              ticks: {
                color: tickColor,
                font: { size: 11 },
                callback: (v) => formatCompactIDR(Number(v)),
              },
              grid: { color: gridColor },
            },
          },
        },
      });
    }

    // 2. Bar Chart
    const barCtx = barCanvas.getContext('2d');
    if (barCtx) {
      const barColors = datasets.barValues.map((v) =>
        v > 0
          ? 'rgba(16, 185, 129, 0.85)'
          : v < 0
            ? 'rgba(239, 68, 68, 0.85)'
            : 'rgba(148, 163, 184, 0.30)',
      );
      const barBorders = datasets.barValues.map((v) =>
        v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#64748b',
      );

      if (barChartRef.current) barChartRef.current.destroy();
      barChartRef.current = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: datasets.barLabels,
          datasets: [
            {
              label: 'P&L (Rp)',
              data: datasets.barValues,
              backgroundColor: barColors,
              borderColor: barBorders,
              borderWidth: 1,
              borderRadius: 4,
              maxBarThickness: 36,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderWidth: 1,
              titleColor: '#fbbf24',
              callbacks: {
                label: (ctx) => `P&L: ${formatIDR(ctx.parsed.y ?? 0, true)}`,
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: tickColor,
                font: { size: 11 },
                maxRotation: 0,
                autoSkip: true,
              },
              grid: { display: false },
            },
            y: {
              ticks: {
                color: tickColor,
                font: { size: 11 },
                callback: (v) => formatCompactIDR(Number(v)),
              },
              grid: { color: gridColor },
            },
          },
        },
      });
    }

    return () => {
      if (eqChartRef.current) {
        eqChartRef.current.destroy();
        eqChartRef.current = null;
      }
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
    };
  }, [datasets.eqLabels.join('|'), datasets.eqValues.join('|'), datasets.barLabels.join('|'), datasets.barValues.join('|'), equityCanvasRef, barCanvasRef]);

  // 3. Donut Chart
  useEffect(() => {
    const donutCanvas = donutCanvasRef.current;
    if (!donutCanvas) return;
    const donutCtx = donutCanvas.getContext('2d');
    if (!donutCtx) return;

    let dLabels: string[];
    let dData: number[];
    let dColors: string[];
    let labelFn: (idx: number, val: number) => string;

    if (donutMode === 'result') {
      if (metrics.total === 0) {
        dLabels = ['Belum Ada Trade'];
        dData = [1];
        dColors = ['#1e293b'];
        labelFn = () => 'Belum ada data';
      } else {
        dLabels = ['Win (Profit)', 'Loss', 'BEP'];
        dData = [metrics.wins, metrics.losses, metrics.beps];
        dColors = ['#10b981', '#ef4444', '#f59e0b'];
        labelFn = (idx, val) => `${dLabels[idx]}: ${val} trade`;
      }
    } else {
      const sessions = ['Asia', 'London', 'New York', 'Overlap'] as const;
      const counts = sessions.map(
        (s) => periodTrades.filter((t) => t.session === s).length,
      );
      const sessionPnls = sessions.map((s) =>
        periodTrades
          .filter((t) => t.session === s)
          .reduce((acc, t) => acc + (Number(t.pnl) || 0), 0),
      );
      if (counts.every((c) => c === 0)) {
        dLabels = ['Belum Ada Trade'];
        dData = [1];
        dColors = ['#1e293b'];
        labelFn = () => 'Belum ada data';
      } else {
        dLabels = [...sessions];
        dData = counts;
        dColors = ['#3b82f6', '#f59e0b', '#10b981', '#a855f7'];
        labelFn = (idx, val) =>
          `${dLabels[idx]}: ${val} trade (Net: ${formatIDR(sessionPnls[idx], sessionPnls[idx] > 0)})`;
      }
    }

    if (donutChartRef.current) donutChartRef.current.destroy();
    donutChartRef.current = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: dLabels,
        datasets: [
          {
            data: dData,
            backgroundColor: dColors,
            borderColor: '#111827',
            borderWidth: 3,
            hoverOffset: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              padding: 14,
              font: { size: 11.5 },
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => labelFn(ctx.dataIndex, Number(ctx.parsed)),
            },
          },
        },
      },
    });

    return () => {
      if (donutChartRef.current) {
        donutChartRef.current.destroy();
        donutChartRef.current = null;
      }
    };
  }, [donutMode, metrics.total, metrics.wins, metrics.losses, metrics.beps, periodTrades]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-100">
              Kurva Ekuitas & Kumulatif P&L (Rp)
            </h3>
            <p className="text-xs text-slate-400">{datasets.equitySub}</p>
          </div>
          <div className="relative h-64 w-full">
            <canvas
              ref={equityCanvasRef}
              data-testid="equity-chart-canvas"
              aria-label="Grafik Kurva Ekuitas Kumulatif P&L XAUUSD"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-100">
              Grafik P&L per Periode (Rp)
            </h3>
            <p className="text-xs text-slate-400">{datasets.barSub}</p>
          </div>
          <div className="relative h-64 w-full">
            <canvas
              ref={barCanvasRef}
              data-testid="bar-chart-canvas"
              aria-label="Grafik Batang Profit dan Loss XAUUSD"
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 lg:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Statistik Hasil & Sesi XAUUSD
              </h3>
              <p className="text-xs text-slate-400">
                {donutMode === 'result'
                  ? 'Distribusi Win / Loss / BEP periode aktif'
                  : 'Distribusi trade per sesi market XAUUSD'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-800 bg-[#0d1320] p-1 gap-1">
              <button
                type="button"
                onClick={() => onChangeDonutMode('result')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  donutMode === 'result'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Win/Loss
              </button>
              <button
                type="button"
                onClick={() => onChangeDonutMode('session')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  donutMode === 'session'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Per Sesi
              </button>
            </div>
          </div>
          <div className="relative h-60 w-full">
            <canvas
              ref={donutCanvasRef}
              data-testid="donut-chart-canvas"
              aria-label="Grafik Donut Distribusi Hasil dan Sesi XAUUSD"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 lg:col-span-7 flex flex-col">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-100">{breakdownTitle}</h3>
            <p className="text-xs text-slate-400">{breakdownSubtitle}</p>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-64 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="sticky top-0 bg-[#1a2234] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">{breakdownColName}</th>
                  <th className="px-3 py-2.5 font-semibold">Trades</th>
                  <th className="px-3 py-2.5 font-semibold">Win Rate</th>
                  <th className="px-3 py-2.5 font-semibold">Lot</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Net P&L (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {breakdownRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Belum ada data pada periode ini.
                    </td>
                  </tr>
                ) : (
                  breakdownRows.map((row) => {
                    const pnl = row.metrics.totalPnL;
                    const pnlColor =
                      pnl > 0
                        ? 'text-emerald-400'
                        : pnl < 0
                          ? 'text-red-400'
                          : 'text-slate-500';
                    return (
                      <tr key={row.key} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">
                          {row.label}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num text-slate-300">
                          {row.metrics.total}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num text-slate-300">
                          {row.metrics.total > 0
                            ? `${row.metrics.winRate.toFixed(0)}%`
                            : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono-num text-slate-300">
                          {row.metrics.totalLot.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2.5 font-mono-num font-bold text-right whitespace-nowrap ${pnlColor}`}
                        >
                          {formatIDR(pnl, pnl > 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
