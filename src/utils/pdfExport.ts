import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  MonthlyRiskEvaluation,
  PeriodMetrics,
  PeriodRange,
  TradeEntry,
} from '../types/trading';
import {
  formatDateID,
  formatIDR,
  formatMonthID,
  toLocalDateStr,
} from './tradingLogic';

export interface PdfExportParams {
  range: PeriodRange;
  trades: TradeEntry[];
  metrics: PeriodMetrics;
  risk: MonthlyRiskEvaluation;
  equityCanvas: HTMLCanvasElement | null;
  barCanvas: HTMLCanvasElement | null;
}

export function exportTradingRecapPDF({
  range,
  trades,
  metrics,
  risk,
  equityCanvas,
  barCanvas,
}: PdfExportParams): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // Header Bar
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 27, pageW, 1.5, 'F');

  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN REKAP TRADING XAUUSD (IDR)', margin, 12);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Periode: ${range.label}`, margin, 19);
  doc.text(
    `Dicetak: ${formatDateID(toLocalDateStr(new Date()))}`,
    pageW - margin,
    19,
    { align: 'right' },
  );

  let y = 35;

  // Monthly Risk Guard Status Box
  const riskBg: [number, number, number] =
    risk.status === 'EXCEEDED'
      ? [254, 226, 226]
      : risk.status === 'APPROACHING'
        ? [255, 237, 213]
        : [220, 252, 231];
  const riskBorder: [number, number, number] =
    risk.status === 'EXCEEDED'
      ? [220, 38, 38]
      : risk.status === 'APPROACHING'
        ? [234, 88, 12]
        : [22, 163, 74];
  const riskLabel =
    risk.status === 'EXCEEDED'
      ? 'STOP TRADING (BATAS TERLAMPAUI)'
      : risk.status === 'APPROACHING'
        ? 'PERINGATAN (MENDEKATI BATAS)'
        : 'AMAN';

  doc.setFillColor(...riskBg);
  doc.setDrawColor(...riskBorder);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, 'FD');

  doc.setTextColor(...riskBorder);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `PROTEKSI LOSS BULAN BERJALAN (${formatMonthID(risk.monthStr)}): ${riskLabel}`,
    margin + 4,
    y + 6,
  );

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Loss Terpakai: ${formatIDR(risk.usedLoss)} dari Batas ${formatIDR(risk.limit)} (${risk.pctUsed.toFixed(1)}%) | Sisa Toleransi: ${formatIDR(risk.remaining)}`,
    margin + 4,
    y + 12,
  );

  y += 22;

  // Summary KPI Grid (2 rows x 3 cols)
  const kpis = [
    { label: 'Total P&L Bersih', val: formatIDR(metrics.totalPnL, metrics.totalPnL > 0) },
    {
      label: 'Win Rate',
      val: `${metrics.winRate.toFixed(1)}% (${metrics.wins}W/${metrics.losses}L/${metrics.beps}B)`,
    },
    {
      label: 'Total Trade & Lot',
      val: `${metrics.total} Trade (${metrics.totalLot.toFixed(2)} Lot)`,
    },
    {
      label: 'Profit Factor',
      val: metrics.profitFactor === Infinity ? 'MAX' : metrics.profitFactor.toFixed(2),
    },
    {
      label: 'Trade Terbaik',
      val: formatIDR(metrics.best, metrics.best > 0),
    },
    {
      label: 'Trade Terburuk',
      val: formatIDR(metrics.worst, metrics.worst > 0),
    },
  ];

  const boxW = (contentW - 8) / 3;
  const boxH = 15;
  kpis.forEach((k, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const bx = margin + col * (boxW + 4);
    const by = y + row * (boxH + 3);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, by, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, bx + 3, by + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(k.val, bx + 3, by + 11.5);
  });

  y += boxH * 2 + 10;

  // Embedded Charts (Equity & Bar side by side on dark card)
  if (equityCanvas && barCanvas) {
    const chartCardW = (contentW - 4) / 2;
    const chartCardH = 52;

    doc.setFillColor(17, 24, 39);
    doc.roundedRect(margin, y, chartCardW, chartCardH, 2, 2, 'F');
    doc.roundedRect(margin + chartCardW + 4, y, chartCardW, chartCardH, 2, 2, 'F');

    doc.setTextColor(251, 191, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Kurva Ekuitas / Kumulatif P&L', margin + 3, y + 5.5);
    doc.text('Grafik P&L per Periode', margin + chartCardW + 7, y + 5.5);

    try {
      const eqImg = equityCanvas.toDataURL('image/png', 1.0);
      const barImg = barCanvas.toDataURL('image/png', 1.0);
      doc.addImage(eqImg, 'PNG', margin + 2, y + 7, chartCardW - 4, chartCardH - 9);
      doc.addImage(
        barImg,
        'PNG',
        margin + chartCardW + 6,
        y + 7,
        chartCardW - 4,
        chartCardH - 9,
      );
    } catch {
      // Ignore canvas export failures if canvas is detached
    }
    y += chartCardH + 8;
  }

  // Journal Table via AutoTable
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Rincian Jurnal Log XAUUSD (${trades.length} Entri)`, margin, y);
  y += 3;

  const tableRows = [...trades]
    .sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`))
    .map((t, idx) => {
      const pnl = Number(t.pnl) || 0;
      return [
        idx + 1,
        `${t.date}\n${t.time || '-'}`,
        t.direction,
        Number(t.lot || 0).toFixed(2),
        t.session || '-',
        `${t.setup || '-'}\n(${t.emotion || '-'})`,
        formatIDR(pnl, pnl > 0),
        t.notes || '-',
      ];
    });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No', 'Tanggal/Jam', 'Arah', 'Lot', 'Sesi', 'Setup & Emosi', 'P&L (Rp)', 'Catatan']],
    body: tableRows.length
      ? tableRows
      : [['-', '-', '-', '-', '-', 'Belum ada entri trade', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [251, 191, 36],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 21 },
      2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 11, halign: 'right' },
      4: { cellWidth: 18 },
      5: { cellWidth: 34 },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const txt = String(data.cell.raw || '');
        if (txt.startsWith('+')) data.cell.styles.textColor = [5, 150, 105];
        else if (txt.startsWith('-')) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `XAUUSD Pro Recap · Halaman ${i} dari ${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' },
    );
  }

  const fileName = `Rekap-XAUUSD-${range.type}-${toLocalDateStr(new Date())}.pdf`;
  doc.save(fileName);
  return fileName;
}
