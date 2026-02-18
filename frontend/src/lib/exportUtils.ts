/**
 * Export-Utilities für CSV und PDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Escapes a value for CSV format
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  // Header row
  const header = columns.map((col) => escapeCsvValue(col.label)).join(';');

  // Data rows
  const rows = data.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key])).join(';')
  );

  return [header, ...rows].join('\n');
}

/**
 * Downloads a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads data as CSV file
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void {
  const csv = toCSV(data, columns);
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Formats a date for export (German format)
 */
export function formatDateForExport(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE');
}

/**
 * Formats currency for export (German format)
 */
export function formatCurrencyForExport(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * PDF-Export für Kostenübersicht
 */
export interface CostReportData {
  title: string;
  generatedAt: string;
  filterInfo: string;
  summary: {
    totalEvents: number;
    totalParticipants: number;
    totalCost: number;
    avgCostPerEvent: number;
    avgParticipantsPerEvent: number;
    costPerParticipant: number;
  };
  costTypes: { label: string; value: number; color: string }[];
  events: {
    title: string;
    date: string;
    organizer: string;
    participants: number;
    costType: string;
    totalCost: number;
    costPerParticipant: number;
    status: string;
  }[];
  byOrganizer: { organizer: string; sum: number; percentage: number }[];
  byMonth: { month: string; sum: number }[];
}

export function downloadCostReportPDF(data: CostReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Helper function to format currency
  const formatCurrency = (value: number) => new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(25, 63, 112); // Immomio Indigo
  doc.text('EventHub Kostenreport', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Erstellt am: ${data.generatedAt}`, 14, 28);
  doc.text(data.filterInfo, 14, 34);
  
  // ========== KPI BOXES (4 Boxes) ==========
  const boxWidth = (pageWidth - 28 - 15) / 4; // 4 boxes with gaps
  const boxHeight = 28;
  const boxY = 42;
  
  const kpiBoxes = [
    { label: 'GESAMTKOSTEN', value: formatCurrency(data.summary.totalCost), sublabel: data.filterInfo.includes('Jahr') ? data.filterInfo.split('·')[0].trim() : 'Alle Jahre' },
    { label: 'EVENTS', value: data.summary.totalEvents.toString(), sublabel: `Ø ${formatCurrency(data.summary.avgCostPerEvent)} / Event` },
    { label: 'TEILNAHMEN', value: data.summary.totalParticipants.toString(), sublabel: `Ø ${data.summary.avgParticipantsPerEvent.toFixed(1)} / Event` },
    { label: 'KOSTEN / TEILNEHMER', value: formatCurrency(data.summary.costPerParticipant), sublabel: 'Durchschnitt pro Person' },
  ];
  
  kpiBoxes.forEach((box, i) => {
    const x = 14 + i * (boxWidth + 5);
    
    // Box background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');
    
    // Label
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(box.label, x + 4, boxY + 8);
    
    // Value
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(box.value, x + 4, boxY + 18);
    
    // Sublabel
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(box.sublabel, x + 4, boxY + 24);
  });
  
  // ========== CHARTS ROW ==========
  const chartY = boxY + boxHeight + 10;
  const chartHeight = 50;
  const chartColWidth = (pageWidth - 28 - 10) / 3;
  
  // --- Bar Chart: Kosten nach Monat (letzte 6) ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, chartY, chartColWidth, chartHeight, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('KOSTEN NACH MONAT', 18, chartY + 8);
  
  const monthData = data.byMonth.slice(-6);
  const maxMonthValue = Math.max(...monthData.map(m => m.sum), 1);
  const barStartY = chartY + 14;
  const barHeight = 5;
  const barGap = 1.5;
  const maxBarWidth = chartColWidth - 42;
  
  monthData.forEach((m, i) => {
    const y = barStartY + i * (barHeight + barGap);
    const barWidth = (m.sum / maxMonthValue) * maxBarWidth;
    
    // Month label
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(m.month.substring(0, 3), 18, y + 3.5);
    
    // Bar background
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(32, y, maxBarWidth, barHeight, 1, 1, 'F');
    
    // Bar value
    doc.setFillColor(52, 134, 239); // brand blue
    doc.roundedRect(32, y, Math.max(barWidth, 2), barHeight, 1, 1, 'F');
    
    // Value text
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    const valueText = m.sum >= 1000 ? `${(m.sum / 1000).toFixed(1)}k €` : `${m.sum.toFixed(0)} €`;
    doc.text(valueText, 32 + maxBarWidth + 2, y + 3.5);
  });
  
  // --- Top 5 Veranstalter (als horizontale Balken) ---
  const orgX = 14 + chartColWidth + 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(orgX, chartY, chartColWidth, chartHeight, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOP 5 VERANSTALTER', orgX + 4, chartY + 8);
  
  const pieColors: [number, number, number][] = [[52, 134, 239], [34, 197, 94], [249, 115, 22], [168, 85, 247], [236, 72, 153]];
  const top5Organizers = data.byOrganizer.slice(0, 5);
  const maxOrgValue = Math.max(...top5Organizers.map(o => o.sum), 1);
  const orgBarMaxWidth = chartColWidth - 12;
  
  top5Organizers.forEach((org, i) => {
    const y = chartY + 14 + i * 7;
    const barWidth = (org.sum / maxOrgValue) * (orgBarMaxWidth - 30);
    
    // Color dot
    doc.setFillColor(pieColors[i][0], pieColors[i][1], pieColors[i][2]);
    doc.circle(orgX + 6, y + 1, 1.5, 'F');
    
    // Label (truncated)
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    const label = org.organizer.length > 10 ? org.organizer.substring(0, 10) + '…' : org.organizer;
    doc.text(label, orgX + 10, y + 2);
    
    // Mini bar
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(orgX + 35, y, orgBarMaxWidth - 50, 3, 0.5, 0.5, 'F');
    doc.setFillColor(pieColors[i][0], pieColors[i][1], pieColors[i][2]);
    doc.roundedRect(orgX + 35, y, Math.max(barWidth * 0.6, 2), 3, 0.5, 0.5, 'F');
    
    // Percentage
    doc.setFontSize(5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${org.percentage}%`, orgX + chartColWidth - 8, y + 2, { align: 'right' });
  });
  
  // --- Cost Types ---
  const costTypeX = orgX + chartColWidth + 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(costTypeX, chartY, chartColWidth, chartHeight, 2, 2, 'FD');
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('KOSTENARTEN', costTypeX + 4, chartY + 8);
  
  const costTypeColors: Record<string, [number, number, number]> = {
    'Teilnehmerkosten': [14, 165, 233], // sky-500
    'Messestandkosten': [34, 197, 94], // green-500
    'Sponsoring': [168, 85, 247], // purple-500
  };
  
  data.costTypes.forEach((ct, i) => {
    const y = chartY + 16 + i * 13;
    
    // Color dot
    const color = costTypeColors[ct.label] || [100, 116, 139];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(costTypeX + 6, y, 2, 'F');
    
    // Label
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(ct.label, costTypeX + 12, y + 1);
    
    // Value
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(ct.value), costTypeX + chartColWidth - 6, y + 1, { align: 'right' });
    
    // Progress bar
    const barY = y + 4;
    const totalCost = data.summary.totalCost || 1;
    const barWidthPct = (ct.value / totalCost) * (chartColWidth - 16);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(costTypeX + 4, barY, chartColWidth - 12, 3, 1, 1, 'F');
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(costTypeX + 4, barY, Math.max(barWidthPct, 2), 3, 1, 1, 'F');
  });
  
  // ========== EVENTS TABLE ==========
  const tableY = chartY + chartHeight + 10;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Events', 14, tableY);
  
  autoTable(doc, {
    startY: tableY + 4,
    head: [['Event', 'Datum', 'Status', 'Veranstalter', 'TN', 'Gesamt', '€/TN']],
    body: data.events.map((e) => [
      e.title.length > 30 ? e.title.substring(0, 30) + '…' : e.title,
      e.date,
      e.status,
      e.organizer.length > 15 ? e.organizer.substring(0, 15) + '…' : e.organizer,
      e.participants.toString(),
      formatCurrencyForExport(e.totalCost) + ' €',
      e.participants > 0 ? formatCurrencyForExport(e.costPerParticipant) + ' €' : '–',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [52, 134, 239], // brand blue
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 35 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 30 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const status = data.cell.raw;
        let fillColor: [number, number, number];
        let textColor: [number, number, number];
        switch (status) {
          case 'Gebucht':
            fillColor = [209, 250, 229]; // emerald-50
            textColor = [6, 78, 59]; // emerald-900
            break;
          case 'Bewertung':
            fillColor = [254, 243, 199]; // amber-50
            textColor = [120, 53, 15]; // amber-900
            break;
          case 'Abgesagt':
            fillColor = [254, 226, 226]; // red-50
            textColor = [127, 29, 29]; // red-900
            break;
          default: // Geplant
            fillColor = [224, 242, 254]; // sky-50
            textColor = [2, 132, 199]; // sky-700
        }
        data.cell.styles.fillColor = fillColor;
        data.cell.styles.textColor = textColor;
      }
    },
  });
  
  // Get current Y position after table
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  
  // By Organizer (if space allows, otherwise new page)
  if (finalY > 220) {
    doc.addPage();
  }
  
  const summaryY = finalY > 220 ? 20 : finalY + 15;
  
  // Two column layout for summaries
  const colWidth = (pageWidth - 28) / 2 - 5;
  
  // By Organizer
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Nach Veranstalter', 14, summaryY);
  
  autoTable(doc, {
    startY: summaryY + 4,
    head: [['Veranstalter', 'Summe']],
    body: data.byOrganizer.slice(0, 8).map((o) => [
      o.organizer,
      formatCurrencyForExport(o.sum) + ' €',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 116, 139], textColor: 255 },
    tableWidth: colWidth,
    margin: { left: 14 },
    columnStyles: { 1: { halign: 'right' } },
  });
  
  // By Month
  doc.text('Nach Monat', pageWidth / 2 + 5, summaryY);
  
  autoTable(doc, {
    startY: summaryY + 4,
    head: [['Monat', 'Summe']],
    body: data.byMonth.slice(0, 8).map((m) => [
      m.month,
      formatCurrencyForExport(m.sum) + ' €',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [100, 116, 139], textColor: 255 },
    tableWidth: colWidth,
    margin: { left: pageWidth / 2 + 5 },
    columnStyles: { 1: { halign: 'right' } },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `EventHub – Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`eventhub-kostenreport-${dateStr}.pdf`);
}
