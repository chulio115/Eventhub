import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEvents, type EventRow } from '../features/events/useEvents';

function copyEventLink(eventId: string) {
  const url = `${window.location.origin}/events?id=${eventId}`;
  navigator.clipboard.writeText(url).then(() => {
    toast.success('Link kopiert!');
  }).catch(() => {
    toast.error('Link konnte nicht kopiert werden');
  });
}

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
  return date.getDate().toString();
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (!endDate || endDate === startDate) return startStr;
  const end = new Date(endDate);
  const endStr = end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function getStatusInfo(event: EventRow): { label: string; color: string } {
  if (event.status === 'cancelled') return { label: 'Abgesagt', color: 'rose' };
  if (event.status === 'attended' || event.booked) return { label: 'Gebucht', color: 'emerald' };
  if (event.status === 'consider') return { label: 'Bewertung', color: 'amber' };
  return { label: 'Geplant', color: 'sky' };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useEvents();
  const events = data ?? [];

  const [viewMode, setViewMode] = useState<CalendarViewMode>('year');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MONTH_LABELS.map((label, monthIndex) => {
              const monthEvents = eventsForYear
                .filter((item) => item.month === monthIndex)
                .slice()
                .sort((a, b) => a.date.getTime() - b.date.getTime());

              const count = monthEvents.length;

              return (
                <div
                  key={label}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    {count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="max-h-[180px] overflow-y-auto px-3 py-2">
                    {count === 0 ? (
                      <div className="py-2 text-xs italic text-slate-400">Keine Einträge</div>
                    ) : (
                      <div className="space-y-0.5">
                        {monthEvents.map(({ event, date }) => {
                          const statusInfo = getStatusInfo(event);
                          const isBooked = statusInfo.color === 'emerald';

                          return (
                            <button
                              type="button"
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`w-full cursor-pointer rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 ${
                                isBooked ? 'bg-emerald-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="shrink-0 text-xs font-medium text-slate-400">
                                      {formatDay(date)}.
                                    </span>
                                    <span className="truncate text-sm font-medium text-slate-900">
                                      {event.title}
                                    </span>
                                  </div>
                                  {event.city && (
                                    <div className="mt-0.5 truncate pl-5 text-xs text-slate-500">
                                      {event.city}
                                    </div>
                                  )}
                                </div>
                                {isBooked && (
                                  <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    Gebucht
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && !error && viewMode === 'month' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span className="font-semibold text-slate-700">
              {MONTH_LABELS[selectedMonth]} {selectedYear}
            </span>
            <span>{eventsForMonth.length} Events</span>
          </div>
          {eventsForMonth.length === 0 ? (
            <div className="py-4 text-center text-sm italic text-slate-400">Keine Einträge</div>
          ) : (
            <div className="space-y-2">
              {eventsForMonth
                .slice()
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map(({ event, date }) => {
                  const statusInfo = getStatusInfo(event);
                  const isBooked = statusInfo.color === 'emerald';

                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md ${
                        isBooked
                          ? 'border-emerald-100 bg-emerald-50/50'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-400">
                              {formatDay(date)}.
                            </span>
                            <span className="font-medium text-slate-900">{event.title}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {event.city && <span>{event.city}</span>}
                            {event.city && event.organizer && <span>·</span>}
                            {event.organizer && <span>{event.organizer}</span>}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            statusInfo.color === 'emerald'
                              ? 'bg-emerald-100 text-emerald-700'
                              : statusInfo.color === 'amber'
                              ? 'bg-amber-100 text-amber-700'
                              : statusInfo.color === 'rose'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

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
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-4">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      getStatusInfo(selectedEvent).color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-700'
                        : getStatusInfo(selectedEvent).color === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : getStatusInfo(selectedEvent).color === 'rose'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {getStatusInfo(selectedEvent).label}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">
                  {selectedEvent.title}
                </h2>
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

            {/* Modal Body */}
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3 text-sm">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-slate-700">
                  {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}
                </span>
              </div>

              {selectedEvent.city && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-slate-700">
                    {selectedEvent.city}
                    {selectedEvent.location && ` · ${selectedEvent.location}`}
                  </span>
                </div>
              )}

              {selectedEvent.colleagues && selectedEvent.colleagues.length > 0 && (
                <div className="flex items-start gap-3 text-sm">
                  <svg className="mt-0.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-slate-700">{selectedEvent.colleagues.join(', ')}</span>
                </div>
              )}

              {selectedEvent.cost_value > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-slate-700">
                    {selectedEvent.cost_value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    {selectedEvent.cost_type === 'booth' ? ' (Standkosten)' : ' / Person'}
                  </span>
                </div>
              )}

              {selectedEvent.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {selectedEvent.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  copyEventLink(selectedEvent.id);
                }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Link teilen
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Schließen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/events?id=${selectedEvent.id}`);
                  }}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
                >
                  Zum Event →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
