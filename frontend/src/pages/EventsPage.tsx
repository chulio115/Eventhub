import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useEvents, type EventRow } from '../features/events/useEvents';
import { useCreateEvent } from '../features/events/useCreateEvent';
import { useUpdateEvent } from '../features/events/useUpdateEvent';

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
  const { data, isLoading, error } = useEvents();
  const events: EventRow[] = data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const effectiveSelectedId = selectedId ?? (events[0]?.id ?? null);
  const selectedEvent: EventRow | undefined = events.find((e) => e.id === effectiveSelectedId);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<EventRow['status']>('planned');
  const [draftOrganizer, setDraftOrganizer] = useState('');
  const [draftCity, setDraftCity] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftColleagues, setDraftColleagues] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftCostType, setDraftCostType] = useState<EventRow['cost_type']>('participant');
  const [draftCostValue, setDraftCostValue] = useState('');
  const [draftEventUrl, setDraftEventUrl] = useState('');
  const [draftAttachments, setDraftAttachments] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftLinkedinPlan, setDraftLinkedinPlan] = useState(false);
  const [draftLinkedinNote, setDraftLinkedinNote] = useState('');
  const [draftPublicationStatus, setDraftPublicationStatus] = useState(false);
  const [draftBooked, setDraftBooked] = useState(false);

  useEffect(() => {
    if (!selectedEvent) {
      setDraftTitle('');
      setDraftStatus('planned');
      setDraftOrganizer('');
      setDraftCity('');
      setDraftLocation('');
      setDraftStartDate('');
      setDraftEndDate('');
      setDraftColleagues('');
      setDraftTags('');
      setDraftCostType('participant');
      setDraftCostValue('');
      setDraftEventUrl('');
      setDraftAttachments('');
      setDraftNotes('');
      setDraftLinkedinPlan(false);
      setDraftLinkedinNote('');
      setDraftPublicationStatus(false);
      setDraftBooked(false);
      return;
    }

    setDraftTitle(selectedEvent.title ?? '');
    setDraftStatus(selectedEvent.status);
    setDraftOrganizer(selectedEvent.organizer ?? '');
    setDraftCity(selectedEvent.city ?? '');
    setDraftLocation(selectedEvent.location ?? '');
    setDraftStartDate(selectedEvent.start_date ?? '');
    setDraftEndDate(selectedEvent.end_date ?? '');
    setDraftColleagues((selectedEvent.colleagues || []).join(', '));
    setDraftTags((selectedEvent.tags || []).join(', '));
    setDraftCostType(selectedEvent.cost_type);
    setDraftCostValue(String(selectedEvent.cost_value ?? ''));
    setDraftEventUrl(selectedEvent.event_url ?? '');
    setDraftAttachments((selectedEvent.attachments || []).join('\n'));
    setDraftNotes(selectedEvent.notes ?? '');
    setDraftLinkedinPlan(selectedEvent.linkedin_plan);
    setDraftLinkedinNote(selectedEvent.linkedin_note ?? '');
    setDraftPublicationStatus(selectedEvent.publication_status);
    setDraftBooked(selectedEvent.booked);
  }, [selectedEvent?.id]);

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

  async function handleSaveSelected() {
    if (!selectedEvent) return;

    const costNumeric = Number(draftCostValue.replace(',', '.')) || 0;

    const colleaguesArray = draftColleagues
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const tagsArray = draftTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const attachmentsArray = draftAttachments
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        title: draftTitle.trim(),
        organizer: draftOrganizer.trim() || null,
        city: draftCity.trim() || null,
        location: draftLocation.trim() || null,
        start_date: draftStartDate || null,
        end_date: draftEndDate || null,
        status: draftStatus,
        booked: draftBooked,
        colleagues: colleaguesArray,
        tags: tagsArray,
        cost_type: draftCostType,
        cost_value: costNumeric,
        event_url: draftEventUrl.trim() || null,
        notes: draftNotes.trim() || null,
        attachments: attachmentsArray,
        linkedin_plan: draftLinkedinPlan,
        linkedin_note: draftLinkedinNote.trim() || null,
        publication_status: draftPublicationStatus,
      });
    } catch {
      // spätere Fehleranzeige möglich
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
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Event-Management</span>
              {selectedEvent && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={handleSaveSelected}
                  disabled={updateEvent.isPending}
                >
                  {updateEvent.isPending ? 'Speichere…' : 'Änderungen speichern'}
                </Button>
              )}
            </div>
            {selectedEvent ? (
              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Titel</label>
                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Veranstalter</label>
                      <Input
                        value={draftOrganizer}
                        onChange={(e) => setDraftOrganizer(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm"
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value as EventRow['status'])}
                      >
                        <option value="planned">Geplant</option>
                        <option value="consider">In Bewertung</option>
                        <option value="attended">Besucht</option>
                        <option value="cancelled">Abgesagt</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Startdatum</label>
                      <Input
                        type="date"
                        value={draftStartDate}
                        onChange={(e) => setDraftStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Enddatum</label>
                      <Input
                        type="date"
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Stadt</label>
                      <Input
                        value={draftCity}
                        onChange={(e) => setDraftCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Location</label>
                      <Input
                        value={draftLocation}
                        onChange={(e) => setDraftLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Kolleg:innen (Komma-getrennt)
                    </label>
                    <Input
                      value={draftColleagues}
                      onChange={(e) => setDraftColleagues(e.target.value)}
                      placeholder="z. B. Yannik, Daniel"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Tags (z. B. Verband, Kongress)
                    </label>
                    <Input
                      value={draftTags}
                      onChange={(e) => setDraftTags(e.target.value)}
                      placeholder="Verband, Kongress"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Kosten / Ticket pro Person
                      </label>
                      <Input
                        value={draftCostValue}
                        onChange={(e) => setDraftCostValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Kostenart</label>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm"
                        value={draftCostType}
                        onChange={(e) =>
                          setDraftCostType(e.target.value as EventRow['cost_type'])
                        }
                      >
                        <option value="participant">Teilnehmerkosten</option>
                        <option value="booth">Standkosten</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Event-Website (URL)
                    </label>
                    <Input
                      value={draftEventUrl}
                      onChange={(e) => setDraftEventUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Anlagen / Links (eine pro Zeile)
                    </label>
                    <textarea
                      className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      value={draftAttachments}
                      onChange={(e) => setDraftAttachments(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Notizen</label>
                    <textarea
                      className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        checked={draftBooked}
                        onChange={(e) => setDraftBooked(e.target.checked)}
                      />
                      <span>Gebucht</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        checked={draftPublicationStatus}
                        onChange={(e) => setDraftPublicationStatus(e.target.checked)}
                      />
                      <span>Teilnahme auf Website veröffentlichen</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        checked={draftLinkedinPlan}
                        onChange={(e) => setDraftLinkedinPlan(e.target.checked)}
                      />
                      <span>LinkedIn-Post geplant</span>
                    </label>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        LinkedIn-Notiz / Details
                      </label>
                      <textarea
                        className="h-16 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        value={draftLinkedinNote}
                        onChange={(e) => setDraftLinkedinNote(e.target.value)}
                      />
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
