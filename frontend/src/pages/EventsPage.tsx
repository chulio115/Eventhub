import { FormEvent, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useEvents, type EventRow } from '../features/events/useEvents';
import { useCreateEvent } from '../features/events/useCreateEvent';

function formatDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE');
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function EventsPage() {
  const { data: events = [], isLoading, error } = useEvents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const createEvent = useCreateEvent();

  const effectiveSelectedId = selectedId ?? (events[0]?.id ?? null);
  const selectedEvent: EventRow | undefined = events.find((e) => e.id === effectiveSelectedId);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const cost = Number(newCostValue.replace(',', '.')) || 0;

    try {
      await createEvent.mutateAsync({
        title: newTitle.trim(),
        city: newCity.trim() || null,
        organizer: newOrganizer.trim() || null,
        start_date: newStartDate || null,
        cost_type: 'participant',
        cost_value: cost,
      });

      setNewTitle('');
      setNewCity('');
      setNewOrganizer('');
      setNewStartDate('');
      setNewCostValue('');
      setShowCreate(false);
    } catch {
      // Fehler werden im Hook geworfen, hier können wir später noch UI-Fehlerhandling ergänzen.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Input placeholder="Suche in Titel, Ort, Veranstalter" className="max-w-md" />
          <select className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm">
            <option>Alle Stati</option>
          </select>
        </div>
        <Button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Abbrechen' : '+ Neues Event'}
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-xs shadow-sm md:grid-cols-5"
        >
          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-slate-700">Titel</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z. B. Verbandstag Nds-HB"
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Ort</label>
            <Input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Stadt"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Veranstalter</label>
            <Input
              value={newOrganizer}
              onChange={(e) => setNewOrganizer(e.target.value)}
              placeholder="z. B. VNW"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Startdatum</label>
            <Input
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Ticketpreis (optional)</label>
            <Input
              value={newCostValue}
              onChange={(e) => setNewCostValue(e.target.value)}
              placeholder="z. B. 690,00"
            />
          </div>
          <div className="flex items-end justify-end md:col-span-5">
            <Button type="submit" disabled={createEvent.isPending || !newTitle.trim()}>
              {createEvent.isPending ? 'Speichere…' : 'Event anlegen'}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Alle Veranstalter</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Alle Orte</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Alle Kolleg:innen</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Alle Tags</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Events (Liste)
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {isLoading && (
              <div className="px-4 py-3 text-xs text-slate-400">Lade Events…</div>
            )}
            {error && (
              <div className="px-4 py-3 text-xs text-red-600">Fehler beim Laden: {error.message}</div>
            )}
            {!isLoading && !error && events.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400">Keine Events vorhanden.</div>
            )}
            {!isLoading && !error &&
              events.map((event) => {
                const isSelected = selectedEvent?.id === event.id;

                let statusLabel = '';
                let statusClasses = '';

                if (event.booked) {
                  statusLabel = 'Gebucht';
                  statusClasses = 'bg-emerald-50 text-emerald-700';
                } else {
                  switch (event.status) {
                    case 'planned':
                      statusLabel = 'Geplant';
                      statusClasses = 'bg-sky-50 text-sky-700';
                      break;
                    case 'consider':
                      statusLabel = 'In Bewertung';
                      statusClasses = 'bg-amber-50 text-amber-700';
                      break;
                    case 'attended':
                      statusLabel = 'Besucht';
                      statusClasses = 'bg-emerald-50 text-emerald-700';
                      break;
                    case 'cancelled':
                      statusLabel = 'Abgesagt';
                      statusClasses = 'bg-rose-50 text-rose-700';
                      break;
                    default:
                      statusLabel = event.status;
                      statusClasses = 'bg-slate-100 text-slate-700';
                  }
                }

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-slate-900 text-white hover:bg-slate-900' : ''
                    }`}
                  >
                    <div className="w-24 text-xs text-slate-500">
                      {formatDate(event.start_date) || 'kein Datum'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {event.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[event.city, event.organizer].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {statusLabel && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses} ${
                          isSelected ? 'bg-white/10 text-white' : ''
                        }`}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event-Details
            </div>
            {selectedEvent ? (
              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Veranstalter</label>
                    <Input value={selectedEvent.organizer ?? ''} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Startdatum</label>
                      <Input value={formatDate(selectedEvent.start_date)} readOnly />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Enddatum</label>
                      <Input value={formatDate(selectedEvent.end_date)} readOnly />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Stadt</label>
                    <Input value={selectedEvent.city ?? ''} readOnly />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Kosten / Ticket pro Person
                    </label>
                    <Input value={formatCurrency(selectedEvent.cost_value)} readOnly />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Status / Flags</label>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {selectedEvent.status === 'planned'
                          ? 'Geplant'
                          : selectedEvent.status === 'consider'
                            ? 'In Bewertung'
                            : selectedEvent.status === 'attended'
                              ? 'Besucht'
                              : 'Abgesagt'}
                      </span>
                      {selectedEvent.booked && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          Gebucht
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-slate-500">
                Bitte ein Event in der Liste auswählen, um Details zu sehen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
