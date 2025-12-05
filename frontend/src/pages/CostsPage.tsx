import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventCosts, type EventCostRow } from '../features/events/useEventCosts';
import { downloadCSV, formatDateForExport, formatCurrencyForExport, downloadCostReportPDF, type CostReportData } from '../lib/exportUtils';
import { MultiSelect } from '../components/ui/MultiSelect';

function formatEuro(value: number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(numeric);
}

function formatCompactEuro(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace('.', ',')}k €`;
  }
  return formatEuro(value);
}

// Einfaches Balkendiagramm als SVG
function BarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  const barHeight = 24;
  const gap = 8;
  const height = data.length * (barHeight + gap) - gap;
  
  return (
    <div className="space-y-1">
      {data.map((item, index) => {
        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex items-center gap-2">
            <div className="w-16 truncate text-xs text-slate-500">{item.label}</div>
            <div className="flex-1">
              <div className="h-5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand/70 transition-all duration-500"
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-xs font-medium text-slate-700">
              {formatCompactEuro(item.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Kreisdiagramm als SVG
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  
  let currentAngle = 0;
  const size = 120;
  const center = size / 2;
  const radius = 45;
  
  const segments = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (currentAngle - 90) * (Math.PI / 180);
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    return { ...item, path, percentage: ((item.value / total) * 100).toFixed(0) };
  });
  
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="transition-opacity hover:opacity-80" />
        ))}
        <circle cx={center} cy={center} r={25} fill="white" />
      </svg>
      <div className="space-y-1">
        {segments.slice(0, 5).map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-slate-600">{seg.label}</span>
            <span className="font-medium text-slate-900">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHART_COLORS = [
  '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
];

export function CostsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useEventCosts();
  const rows = data ?? [];

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<EventCostRow | null>(null);
  const [selectedMonthData, setSelectedMonthData] = useState<{ month: string; events: EventCostRow[] } | null>(null);
  const [selectedOrganizerData, setSelectedOrganizerData] = useState<{ organizer: string; events: EventCostRow[] } | null>(null);

  // Filter-Optionen berechnen
  const yearSet = new Set<number>();
  const organizerSet = new Set<string>();
  const citySet = new Set<string>();
  const colleagueSet = new Set<string>();
  
  rows.forEach((row) => {
    if (row.start_date) {
      const d = new Date(row.start_date);
      if (!Number.isNaN(d.getTime())) yearSet.add(d.getFullYear());
    }
    if (row.organizer) organizerSet.add(row.organizer);
    if (row.city) citySet.add(row.city);
    (row.colleagues ?? []).forEach((c) => { if (c) colleagueSet.add(c); });
  });

  const yearOptions = Array.from(yearSet).sort((a, b) => b - a); // Neueste zuerst
  const organizerOptions = Array.from(organizerSet).sort((a, b) => a.localeCompare(b, 'de-DE'));
  const cityOptions = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'de-DE'));
  const colleagueOptions = Array.from(colleagueSet).sort((a, b) => a.localeCompare(b, 'de-DE'));

  // Filter States - jetzt als Arrays für Multi-Select
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [quarterFilter, setQuarterFilter] = useState<string[]>([]);
  const [costTypeFilter, setCostTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [organizerFilter, setOrganizerFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [colleagueFilter, setColleagueFilter] = useState<string[]>([]);
  const [costRangeFilter, setCostRangeFilter] = useState<string[]>([]);

  // Aktive Filter zählen
  const activeFilterCount = [
    yearFilter.length > 0,
    quarterFilter.length > 0,
    costTypeFilter.length > 0,
    statusFilter.length > 0,
    organizerFilter.length > 0,
    cityFilter.length > 0,
    colleagueFilter.length > 0,
    costRangeFilter.length > 0,
  ].filter(Boolean).length;

  // Filter anwenden
  const filteredRows = rows.filter((row) => {
    // Jahr (Multi-Select)
    if (yearFilter.length > 0) {
      if (!row.start_date) return false;
      const d = new Date(row.start_date);
      if (Number.isNaN(d.getTime()) || !yearFilter.includes(String(d.getFullYear()))) return false;
    }

    // Quartal (Multi-Select)
    if (quarterFilter.length > 0 && row.start_date) {
      const d = new Date(row.start_date);
      const month = d.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      if (!quarterFilter.includes(String(quarter))) return false;
    }

    // Kostenart (Multi-Select)
    if (costTypeFilter.length > 0 && !costTypeFilter.includes(row.cost_type)) return false;

    // Veranstalter (Multi-Select)
    if (organizerFilter.length > 0 && (!row.organizer || !organizerFilter.includes(row.organizer))) return false;

    // Stadt (Multi-Select)
    if (cityFilter.length > 0 && (!row.city || !cityFilter.includes(row.city))) return false;

    // Kolleg:in (Multi-Select) - mindestens einer muss passen
    if (colleagueFilter.length > 0) {
      const hasMatch = (row.colleagues ?? []).some((c) => colleagueFilter.includes(c));
      if (!hasMatch) return false;
    }

    // Status (Multi-Select)
    if (statusFilter.length > 0) {
      const rowStatus = row.status === 'attended' || row.booked ? 'booked' : row.status;
      if (!statusFilter.includes(rowStatus)) return false;
    }

    // Kostenbereich (Multi-Select)
    if (costRangeFilter.length > 0) {
      const cost = row.total_cost ?? 0;
      let range = 'low';
      if (cost >= 2000) range = 'high';
      else if (cost >= 500) range = 'medium';
      if (!costRangeFilter.includes(range)) return false;
    }

    return true;
  });

  // Filter zurücksetzen
  function resetFilters() {
    setYearFilter([]);
    setQuarterFilter([]);
    setCostTypeFilter([]);
    setStatusFilter([]);
    setOrganizerFilter([]);
    setCityFilter([]);
    setColleagueFilter([]);
    setCostRangeFilter([]);
  }

  // Erweiterte Statistiken
  const stats = useMemo(() => {
    const totalEvents = filteredRows.length;
    const totalParticipants = filteredRows.reduce((sum, row) => sum + (row.colleagues_count ?? 0), 0);
    const totalCost = filteredRows.reduce((sum, row) => sum + (row.total_cost ?? 0), 0);
    
    // Teilnehmerkosten vs Messestandkosten
    const participantCosts = filteredRows
      .filter((r) => r.cost_type === 'participant')
      .reduce((sum, row) => sum + (row.total_cost ?? 0), 0);
    const boothCosts = filteredRows
      .filter((r) => r.cost_type === 'booth')
      .reduce((sum, row) => sum + (row.total_cost ?? 0), 0);
    
    // Durchschnittswerte
    const avgCostPerEvent = totalEvents > 0 ? totalCost / totalEvents : 0;
    const avgCostPerParticipant = totalParticipants > 0 ? totalCost / totalParticipants : 0;
    const avgParticipantsPerEvent = totalEvents > 0 ? totalParticipants / totalEvents : 0;
    
    // Teuerste Events
    const topExpensiveEvents = filteredRows
      .slice()
      .sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0))
      .slice(0, 5);
    
    // Events mit meisten Teilnehmern
    const topParticipantEvents = filteredRows
      .slice()
      .sort((a, b) => (b.colleagues_count ?? 0) - (a.colleagues_count ?? 0))
      .slice(0, 5);

    return {
      totalEvents,
      totalParticipants,
      totalCost,
      participantCosts,
      boothCosts,
      avgCostPerEvent,
      avgCostPerParticipant,
      avgParticipantsPerEvent,
      topExpensiveEvents,
      topParticipantEvents,
    };
  }, [filteredRows]);

  const { totalEvents, totalParticipants, totalCost } = stats;

  const sortedEvents = filteredRows.slice().sort((a, b) => {
    const da = a.start_date ?? '';
    const db = b.start_date ?? '';
    if (da && db && da !== db) return da.localeCompare(db);
    return a.title.localeCompare(b.title, 'de-DE');
  });

  const byOrganizer = Array.from(
    filteredRows.reduce((map, row) => {
      if (!row.organizer) return map;
      const prev = map.get(row.organizer) ?? 0;
      return map.set(row.organizer, prev + (row.total_cost ?? 0));
    }, new Map<string, number>()),
  )
    .map(([organizer, sum]) => ({ organizer, sum }))
    .sort((a, b) => b.sum - a.sum);

  const byMonthMap = filteredRows.reduce((map, row) => {
    const iso = row.start_date;
    if (!iso) return map;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return map;
    const key = iso.slice(0, 7); // YYYY-MM
    const prev = map.get(key);
    const sum = (row.total_cost ?? 0) + (prev?.sum ?? 0);
    const refDate = prev?.date ?? date;
    map.set(key, { sum, date: refDate });
    return map;
  }, new Map<string, { sum: number; date: Date }>());

  const byMonth = Array.from(byMonthMap.entries())
    .map(([key, value]) => ({ key, sum: value.sum, date: value.date }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  function handleExportCSV() {
    const exportData = filteredRows.map((row) => ({
      event: row.title,
      datum: formatDateForExport(row.start_date),
      veranstalter: row.organizer ?? '',
      teilnehmer: row.colleagues_count ?? 0,
      kostenart: row.cost_type === 'participant' ? 'Teilnehmerkosten' : 'Messestandkosten',
      einzelpreis: formatCurrencyForExport(row.cost_value),
      gesamtkosten: formatCurrencyForExport(row.total_cost),
      kostenProTN: formatCurrencyForExport(row.cost_per_participant),
    }));

    const columns = [
      { key: 'event' as const, label: 'Event' },
      { key: 'datum' as const, label: 'Datum' },
      { key: 'veranstalter' as const, label: 'Veranstalter' },
      { key: 'teilnehmer' as const, label: 'Teilnehmer' },
      { key: 'kostenart' as const, label: 'Kostenart' },
      { key: 'einzelpreis' as const, label: 'Einzelpreis' },
      { key: 'gesamtkosten' as const, label: 'Gesamtkosten' },
      { key: 'kostenProTN' as const, label: '€/TN' },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(exportData, columns, `eventhub-kosten-${dateStr}.csv`);
  }

  function handleExportPDF() {
    const filterInfo = [
      yearFilter.length > 0 ? `Jahr: ${yearFilter.join(', ')}` : 'Alle Jahre',
      costTypeFilter.length > 0
        ? costTypeFilter.map((t) => t === 'participant' ? 'Teilnehmerkosten' : 'Messestandkosten').join(', ')
        : 'Alle Kostenarten',
    ].join(' · ');

    const reportData: CostReportData = {
      title: 'EventHub Kostenreport',
      generatedAt: new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filterInfo,
      summary: {
        totalEvents,
        totalParticipants,
        totalCost,
      },
      events: sortedEvents.map((row) => ({
        title: row.title,
        date: formatDateForExport(row.start_date),
        organizer: row.organizer ?? '',
        participants: row.colleagues_count ?? 0,
        costType: row.cost_type === 'participant' ? 'Teilnehmerkosten' : 'Messestandkosten',
        totalCost: row.total_cost ?? 0,
        costPerParticipant: row.cost_per_participant ?? 0,
      })),
      byOrganizer,
      byMonth: byMonth.map((m) => ({
        month: m.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        sum: m.sum,
      })),
    };

    downloadCostReportPDF(reportData);
  }

  // Chart-Daten vorbereiten
  const monthChartData = byMonth.slice(-6).map((m) => ({
    label: m.date.toLocaleDateString('de-DE', { month: 'short' }),
    value: m.sum,
  }));
  const maxMonthValue = Math.max(...monthChartData.map((d) => d.value), 1);

  const organizerPieData = byOrganizer.slice(0, 5).map((item, i) => ({
    label: item.organizer,
    value: item.sum,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const costTypePieData = [
    { label: 'Teilnehmerkosten', value: stats.participantCosts, color: '#0ea5e9' },
    { label: 'Messestandkosten', value: stats.boothCosts, color: '#22c55e' },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex min-h-0 flex-col space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kosten &amp; Teilnahmen</h1>
          <p className="text-sm text-slate-500">
            Finanzübersicht • {filteredRows.length} von {rows.length} Events
            {activeFilterCount > 0 && (
              <span className="ml-2 text-brand">({activeFilterCount} Filter aktiv)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredRows.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={filteredRows.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-xs font-medium text-rose-600 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Filter-Leiste mit Multi-Select */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="mr-1 text-xs font-medium text-slate-500">Filter:</span>
        
        {/* Jahr */}
        <MultiSelect
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          selected={yearFilter}
          onChange={setYearFilter}
          placeholder="Jahr"
        />

        {/* Quartal */}
        <MultiSelect
          options={[
            { value: '1', label: 'Q1 (Jan-Mär)' },
            { value: '2', label: 'Q2 (Apr-Jun)' },
            { value: '3', label: 'Q3 (Jul-Sep)' },
            { value: '4', label: 'Q4 (Okt-Dez)' },
          ]}
          selected={quarterFilter}
          onChange={setQuarterFilter}
          placeholder="Quartal"
        />

        {/* Kostenart */}
        <MultiSelect
          options={[
            { value: 'participant', label: 'Teilnehmerkosten' },
            { value: 'booth', label: 'Messestandkosten' },
          ]}
          selected={costTypeFilter}
          onChange={setCostTypeFilter}
          placeholder="Kostenart"
        />

        {/* Status */}
        <MultiSelect
          options={[
            { value: 'booked', label: 'Gebucht' },
            { value: 'planned', label: 'Geplant' },
            { value: 'consider', label: 'Bewertung' },
            { value: 'cancelled', label: 'Abgesagt' },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
        />

        {/* Veranstalter */}
        <MultiSelect
          options={organizerOptions.map((o) => ({ value: o, label: o }))}
          selected={organizerFilter}
          onChange={setOrganizerFilter}
          placeholder="Veranstalter"
        />

        {/* Stadt */}
        <MultiSelect
          options={cityOptions.map((c) => ({ value: c, label: c }))}
          selected={cityFilter}
          onChange={setCityFilter}
          placeholder="Stadt"
        />

        {/* Kolleg:in */}
        <MultiSelect
          options={colleagueOptions.map((c) => ({ value: c, label: c }))}
          selected={colleagueFilter}
          onChange={setColleagueFilter}
          placeholder="Kolleg:in"
        />

        {/* Kostenbereich */}
        <MultiSelect
          options={[
            { value: 'low', label: 'Unter 500 €' },
            { value: 'medium', label: '500 – 2.000 €' },
            { value: 'high', label: 'Über 2.000 €' },
          ]}
          selected={costRangeFilter}
          onChange={setCostRangeFilter}
          placeholder="Kostenbereich"
        />

        {/* Reset Button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto flex h-7 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Zurücksetzen
          </button>
        )}
      </div>

      {/* KPI-Karten */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand/5 to-brand/10 p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Gesamtkosten</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatEuro(totalCost)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {yearFilter.length > 0 ? `Jahr ${yearFilter.join(', ')}` : 'Alle Jahre'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Events</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalEvents}</div>
          <div className="mt-1 text-xs text-slate-500">
            Ø {formatEuro(stats.avgCostPerEvent)} / Event
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Teilnahmen</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalParticipants}</div>
          <div className="mt-1 text-xs text-slate-500">
            Ø {stats.avgParticipantsPerEvent.toFixed(1)} / Event
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Kosten / Teilnehmer</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatEuro(stats.avgCostPerParticipant)}</div>
          <div className="mt-1 text-xs text-slate-500">Durchschnitt pro Person</div>
        </div>
      </div>

      {/* Diagramm-Zeile */}
      {!isLoading && !error && filteredRows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Kosten nach Monat (Balkendiagramm) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kosten nach Monat (letzte 6)
            </div>
            {monthChartData.length > 0 ? (
              <BarChart data={monthChartData} maxValue={maxMonthValue} />
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Keine Daten</div>
            )}
          </div>

          {/* Kostenverteilung nach Veranstalter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Top 5 Veranstalter
            </div>
            {organizerPieData.length > 0 ? (
              <PieChart data={organizerPieData} />
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Keine Daten</div>
            )}
          </div>

          {/* Kostenart-Verteilung */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kostenarten
            </div>
            {costTypePieData.length > 0 ? (
              <div className="space-y-3">
                {costTypePieData.map((item, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.label}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatEuro(item.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.value / totalCost) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Keine Daten</div>
            )}
          </div>
        </div>
      )}

      {/* Listen-Bereich */}
      <div className="grid min-h-0 gap-4 lg:grid-cols-3">
        {/* Events-Tabelle */}
        <div className="flex max-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Events</span>
            <span className="text-xs text-slate-400">{sortedEvents.length} Einträge</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="sticky top-0 bg-white text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Event</th>
                  <th className="px-4 py-2 text-right font-medium">TN</th>
                  <th className="px-4 py-2 text-right font-medium">Gesamt</th>
                  <th className="px-4 py-2 text-right font-medium">€/TN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr><td colSpan={4} className="px-4 py-3 text-xs text-slate-400">Lade Daten…</td></tr>
                )}
                {!isLoading && !error && sortedEvents.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-3 text-xs text-slate-400">Keine Events</td></tr>
                )}
                {!isLoading && !error && sortedEvents.map((row) => (
                  <tr 
                    key={row.id} 
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedEvent(row)}
                  >
                    <td className="max-w-[180px] truncate px-4 py-2 text-sm text-slate-900">{row.title}</td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600">{row.colleagues_count ?? 0}</td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-slate-900">{formatEuro(row.total_cost)}</td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600">
                      {(row.colleagues_count ?? 0) > 0 ? formatEuro(row.cost_per_participant) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nach Veranstalter */}
        <div className="flex max-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nach Veranstalter</span>
            <span className="text-xs text-slate-400">{byOrganizer.length} Einträge</span>
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {!isLoading && !error && byOrganizer.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400">Keine Einträge</div>
            )}
            {!isLoading && !error && byOrganizer.map((item) => {
              const orgEvents = filteredRows.filter((r) => r.organizer === item.organizer);
              return (
                <button
                  type="button"
                  key={item.organizer}
                  onClick={() => setSelectedOrganizerData({ organizer: item.organizer, events: orgEvents })}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left hover:bg-slate-50"
                >
                  <span className="truncate text-sm text-slate-900">{item.organizer}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{orgEvents.length}</span>
                    <span className="text-sm font-medium text-slate-900">{formatEuro(item.sum)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nach Monat */}
        <div className="flex max-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nach Monat</span>
            <span className="text-xs text-slate-400">{byMonth.length} Monate</span>
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {!isLoading && !error && byMonth.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400">Keine Einträge</div>
            )}
            {!isLoading && !error && byMonth.map((item) => {
              const monthLabel = item.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
              const monthEvents = filteredRows.filter((r) => {
                if (!r.start_date) return false;
                return r.start_date.startsWith(item.key);
              });
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setSelectedMonthData({ month: monthLabel, events: monthEvents })}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left hover:bg-slate-50"
                >
                  <span className="text-sm text-slate-900">{monthLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{monthEvents.length}</span>
                    <span className="text-sm font-medium text-slate-900">{formatEuro(item.sum)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hinweis */}
      <p className="text-xs text-slate-500">
        Hinweis: Bei „Teilnehmerkosten" wird der Preis pro Person mit der Anzahl der Kolleg:innen multipliziert. 
        Bei „Messestandkosten" wird nur der eingetragene Betrag als Gesamtsumme gewertet. 
        Alle Werte basieren auf der aktuellen Filterung.
      </p>

      {/* Event-Detail-Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-4">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-semibold text-slate-900">{selectedEvent.title}</h2>
                {selectedEvent.organizer && (
                  <p className="text-sm text-slate-500">{selectedEvent.organizer}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 p-4">
              {selectedEvent.start_date && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-700">
                    {new Date(selectedEvent.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
              {selectedEvent.city && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-slate-700">{selectedEvent.city}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-slate-700">{selectedEvent.colleagues_count} Teilnehmer</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Gesamtkosten</div>
                  <div className="text-lg font-bold text-slate-900">{formatEuro(selectedEvent.total_cost)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Pro Teilnehmer</div>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedEvent.colleagues_count > 0 ? formatEuro(selectedEvent.cost_per_participant) : '–'}
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Kostenart</div>
                <div className="text-sm font-medium text-slate-900">
                  {selectedEvent.cost_type === 'participant' ? 'Teilnehmerkosten' : 'Messestandkosten'}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Schließen
              </button>
              <button
                type="button"
                onClick={() => navigate(`/events?id=${selectedEvent.id}`)}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
              >
                Zum Event →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monat-Detail-Modal */}
      {selectedMonthData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedMonthData(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedMonthData.month}</h2>
                <p className="text-sm text-slate-500">
                  {selectedMonthData.events.length} Events · {formatEuro(selectedMonthData.events.reduce((s, e) => s + e.total_cost, 0))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthData(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
              {selectedMonthData.events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    setSelectedMonthData(null);
                    setSelectedEvent(event);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{event.title}</div>
                    <div className="text-xs text-slate-500">
                      {event.organizer} · {event.colleagues_count} TN
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-slate-900">{formatEuro(event.total_cost)}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedMonthData(null)}
                className="w-full rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veranstalter-Detail-Modal */}
      {selectedOrganizerData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedOrganizerData(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedOrganizerData.organizer}</h2>
                <p className="text-sm text-slate-500">
                  {selectedOrganizerData.events.length} Events · {formatEuro(selectedOrganizerData.events.reduce((s, e) => s + e.total_cost, 0))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrganizerData(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
              {selectedOrganizerData.events.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    setSelectedOrganizerData(null);
                    setSelectedEvent(event);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{event.title}</div>
                    <div className="text-xs text-slate-500">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString('de-DE') : '–'} · {event.colleagues_count} TN
                    </div>
                  </div>
                  <span className="ml-3 font-medium text-slate-900">{formatEuro(event.total_cost)}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedOrganizerData(null)}
                className="w-full rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
