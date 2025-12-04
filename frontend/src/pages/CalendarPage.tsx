import { useState } from 'react';
import { useEvents, type EventRow } from '../features/events/useEvents';

type CalendarViewMode = 'year' | 'month';

const MONTH_LABELS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

interface CalendarEventItem {
  event: EventRow;
  date: Date;
  year: number;
  month: number;
}

function getEventDate(event: EventRow): Date | null {
  const iso = event.start_date ?? event.end_date;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDay(date: Date): string {
  const day = date.getDate();
  return `${day.toString().padStart(2, '0')}.`;
}

export function CalendarPage() {
  const { data, isLoading, error } = useEvents();
  const events = data ?? [];

  const [viewMode, setViewMode] = useState<CalendarViewMode>('year');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const eventsWithDate: CalendarEventItem[] = events
    .map((event) => {
      const date = getEventDate(event);
      if (!date) return null;
      return {
        event,
        date,
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    })
    .filter((value): value is CalendarEventItem => value !== null);

  const yearOptionSet = new Set<number>(eventsWithDate.map((e) => e.year));
  yearOptionSet.add(currentYear);
  const yearOptions = Array.from(yearOptionSet).sort((a, b) => a - b);

  const eventsForYear = eventsWithDate.filter((item) => item.year === selectedYear);
  const eventsForMonth = eventsForYear.filter((item) => item.month === selectedMonth);

  const monthOptionsSet = new Set<number>(eventsForYear.map((item) => item.month));
  const monthOptions = Array.from(monthOptionsSet).sort((a, b) => a - b);

  const totalEventsForView = viewMode === 'year' ? eventsForYear.length : eventsForMonth.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kalenderansicht</h1>
          <p className="text-sm text-slate-500">Zeigt alle Events aus der aktuellen Filterung.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="hidden text-slate-400 sm:inline">{totalEventsForView} Events</span>
          <select
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as CalendarViewMode)}
          >
            <option value="year">Jahresansicht</option>
            <option value="month">Monatsansicht</option>
          </select>
          <select
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {viewMode === 'month' && (
            <select
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index} disabled={monthOptions.length > 0 && !monthOptions.includes(index)}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading && <div className="text-xs text-slate-400">Lade Events…</div>}
      {error && (
        <div className="text-xs text-red-600">
          Fehler beim Laden der Events: {error.message}
        </div>
      )}

      {!isLoading && !error && viewMode === 'year' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Jahr {selectedYear}</span>
            <span>{eventsForYear.length} Events</span>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {MONTH_LABELS.map((label, monthIndex) => {
              const monthEvents = eventsForYear
                .filter((item) => item.month === monthIndex)
                .slice()
                .sort((a, b) => a.date.getTime() - b.date.getTime());

              const count = monthEvents.length;

              return (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{label}</span>
                    <span>{count > 0 ? count : ''}</span>
                  </div>
                  {count === 0 ? (
                    <div className="text-[11px] text-slate-400">Keine Einträge</div>
                  ) : (
                    <div className="space-y-0.5 text-[13px]">
                      {monthEvents.map(({ event, date }) => {
                        const isBooked = event.status === 'attended' || event.booked;
                        const meta = [event.city, event.organizer].filter(Boolean).join(' · ');

                        return (
                          <div
                            key={event.id}
                            className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 ${
                              isBooked ? 'bg-emerald-50' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <div className="text-[13px] font-medium text-slate-900">
                                <span className="mr-1 text-[11px] font-normal text-slate-500">
                                  {formatDay(date)}
                                </span>
                                {event.title}
                              </div>
                              {meta && (
                                <div className="text-[11px] text-slate-500">{meta}</div>
                              )}
                            </div>
                            {isBooked && (
                              <span className="mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                Gebucht
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && !error && viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {MONTH_LABELS[selectedMonth]} {selectedYear}
            </span>
            <span>{eventsForMonth.length} Events</span>
          </div>
          {eventsForMonth.length === 0 ? (
            <div className="text-xs text-slate-400">Keine Einträge</div>
          ) : (
            <div className="space-y-1 text-sm">
              {eventsForMonth
                .slice()
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(({ event, date }) => {
                  const isBooked = event.status === 'attended' || event.booked;
                  const containerClasses = isBooked
                    ? 'rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2'
                    : 'rounded-lg px-3 py-2 hover:bg-slate-50';

                  const meta = [event.city, event.organizer].filter(Boolean).join(' · ');

                  return (
                    <div key={event.id} className={containerClasses}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDay(date)}</span>
                        {isBooked && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            Gebucht
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-slate-900">{event.title}</div>
                      {meta && <div className="text-xs text-slate-500">{meta}</div>}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
