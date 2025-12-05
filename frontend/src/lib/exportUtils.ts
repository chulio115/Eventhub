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
  };
  events: {
    title: string;
    date: string;
    organizer: string;
    participants: number;
    costType: string;
    totalCost: number;
    costPerParticipant: number;
  }[];
  byOrganizer: { organizer: string; sum: number }[];
  byMonth: { month: string; sum: number }[];
}

export function downloadCostReportPDF(data: CostReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(25, 63, 112); // Immomio Indigo
  doc.text('EventHub Kostenreport', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Erstellt am: ${data.generatedAt}`, 14, 28);
  doc.text(data.filterInfo, 14, 34);
  
  // Summary Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 40, pageWidth - 28, 20, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(`${data.summary.totalEvents} Events`, 20, 50);
  doc.text(`${data.summary.totalParticipants} Teilnahmen`, 70, 50);
  
  doc.setFontSize(14);
  doc.setTextColor(25, 63, 112);
  const totalFormatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(data.summary.totalCost);
  doc.text(totalFormatted, pageWidth - 14, 52, { align: 'right' });
  
  // Events Table
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Events', 14, 72);
  
  autoTable(doc, {
    startY: 76,
    head: [['Event', 'Datum', 'Veranstalter', 'TN', 'Gesamt', '€/TN']],
    body: data.events.map((e) => [
      e.title.length > 30 ? e.title.substring(0, 30) + '…' : e.title,
      e.date,
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
      0: { cellWidth: 50 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
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
