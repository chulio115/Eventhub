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

type UiStatus = 'bewertung' | 'geplant' | 'gebucht' | 'abgesagt';
type StatusFilter = 'all' | UiStatus;

function mapToUiStatus(status: EventRow['status'], booked: boolean): UiStatus {
  if (status === 'cancelled') return 'abgesagt';
  if (status === 'attended') return 'gebucht';
  if (booked) return 'gebucht';
  if (status === 'consider') return 'bewertung';
  return 'geplant';
}

function mapFromUiStatus(ui: UiStatus): { status: EventRow['status']; booked: boolean } {
  switch (ui) {
    case 'bewertung':
      return { status: 'consider', booked: false };
    case 'geplant':
      return { status: 'planned', booked: false };
    case 'gebucht':
      return { status: 'attended', booked: true };
    case 'abgesagt':
      return { status: 'cancelled', booked: false };
    default:
      return { status: 'planned', booked: false };
  }
}

export function EventsPage() {
  const { data, isLoading, error } = useEvents();
  const events: EventRow[] = data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [organizerFilter, setOrganizerFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [colleagueFilter, setColleagueFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newCostValue, setNewCostValue] = useState('');
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

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

  const draftUiStatus = mapToUiStatus(draftStatus, draftBooked);

  const organizerOptions = Array.from(
    new Set(events.map((e) => e.organizer).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b, 'de-DE'));

  const cityOptions = Array.from(
    new Set(events.map((e) => e.city).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b, 'de-DE'));

  const colleagueSet = new Set<string>();
  events.forEach((e) => {
    (e.colleagues || []).forEach((c) => {
      if (c) colleagueSet.add(c);
    });
  });
  const colleagueOptions = Array.from(colleagueSet).sort((a, b) => a.localeCompare(b, 'de-DE'));

  const tagSet = new Set<string>();
  events.forEach((e) => {
    (e.tags || []).forEach((t) => {
      if (t) tagSet.add(t);
    });
  });
  const tagOptions = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'de-DE'));

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    const uiStatus = mapToUiStatus(event.status, event.booked);

    if (statusFilter !== 'all' && uiStatus !== statusFilter) {
      return false;
    }

    if (normalizedSearch) {
      const haystack = [
        event.title,
        event.city,
        event.organizer,
        (event.colleagues || []).join(' '),
        (event.tags || []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    if (organizerFilter && event.organizer !== organizerFilter) return false;
    if (cityFilter && event.city !== cityFilter) return false;
    if (colleagueFilter && !(event.colleagues || []).includes(colleagueFilter)) return false;
    if (tagFilter && !(event.tags || []).includes(tagFilter)) return false;

    return true;
  });

  const effectiveSelectedId =
    selectedId && filteredEvents.some((e) => e.id === selectedId)
      ? selectedId
      : filteredEvents[0]?.id ?? null;

  const selectedEvent: EventRow | undefined = events.find(
    (e) => e.id === effectiveSelectedId,
  );

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
    <div className="flex min-h-0 w-full flex-col space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Input
            placeholder="Suche in Titel, Ort, Veranstalter"
            className="max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">Alle Stati</option>
            <option value="bewertung">Bewertung</option>
            <option value="geplant">Geplant</option>
            <option value="gebucht">Gebucht</option>
            <option value="abgesagt">Abgesagt</option>
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

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <select
          className="h-8 min-w-[11rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={organizerFilter}
          onChange={(e) => setOrganizerFilter(e.target.value)}
        >
          <option value="">Alle Veranstalter</option>
          {organizerOptions.map((organizer) => (
            <option key={organizer} value={organizer}>
              {organizer}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[9rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        >
          <option value="">Alle Orte</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[11rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={colleagueFilter}
          onChange={(e) => setColleagueFilter(e.target.value)}
        >
          <option value="">Alle Kolleg:innen</option>
          {colleagueOptions.map((colleague) => (
            <option key={colleague} value={colleague}>
              {colleague}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[9rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">Alle Tags</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Events (Liste)
          </div>
          <div className="divide-y divide-slate-100 text-sm flex-1 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-3 text-xs text-slate-400">Lade Events…</div>
            )}
            {error && (
              <div className="px-4 py-3 text-xs text-red-600">Fehler beim Laden: {error.message}</div>
            )}
            {!isLoading && !error && events.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400">Keine Events vorhanden.</div>
            )}
            {!isLoading && !error && events.length > 0 && filteredEvents.length === 0 && (
              <div className="px-4 py-3 text-xs text-slate-400">
                Keine Events für die aktuellen Filter.
              </div>
            )}
            {!isLoading && !error &&
              filteredEvents.map((event) => {
                const isSelected = selectedEvent?.id === event.id;
                const uiStatus = mapToUiStatus(event.status, event.booked);

                let statusLabel = '';
                let statusClasses = '';

                switch (uiStatus) {
                  case 'bewertung':
                    statusLabel = 'Bewertung';
                    statusClasses = 'border-amber-100 bg-amber-50 text-amber-700';
                    break;
                  case 'geplant':
                    statusLabel = 'Geplant';
                    statusClasses = 'border-sky-100 bg-sky-50 text-sky-700';
                    break;
                  case 'gebucht':
                    statusLabel = 'Gebucht';
                    statusClasses = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                    break;
                  case 'abgesagt':
                    statusLabel = 'Abgesagt';
                    statusClasses = 'border-rose-100 bg-rose-50 text-rose-700';
                    break;
                  default:
                    statusLabel = '';
                    statusClasses = 'border-slate-200 bg-slate-100 text-slate-700';
                }

                const basePillClasses =
                  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold';

                const colleaguesLabel = (event.colleagues || []).join(', ');
                const metaLine = [colleaguesLabel, event.city, event.organizer]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white hover:bg-slate-900'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-24 text-xs ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {formatDate(event.start_date) || 'kein Datum'}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-50'
                        }`}
                      >
                        {event.title}
                      </div>
                      <div
                        className={`text-xs ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {metaLine}
                      </div>
                    </div>
                    {statusLabel && (
                      <span
                        className={`${basePillClasses} ${statusClasses} ${
                          isSelected ? 'ring-1 ring-white/40' : ''
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

        <div className="space-y-4 flex flex-col">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex-1">
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
                        value={draftUiStatus}
                        onChange={(e) => {
                          const mapped = mapFromUiStatus(e.target.value as UiStatus);
                          setDraftStatus(mapped.status);
                          setDraftBooked(mapped.booked);
                        }}
                      >
                        <option value="bewertung">Bewertung</option>
                        <option value="geplant">Geplant</option>
                        <option value="gebucht">Gebucht</option>
                        <option value="abgesagt">Abgesagt</option>
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
