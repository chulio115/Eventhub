import { FormEvent, useEffect, useState, useRef, ChangeEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useEvents, type EventRow } from '../features/events/useEvents';
import { useCreateEvent } from '../features/events/useCreateEvent';
import { useUpdateEvent } from '../features/events/useUpdateEvent';
import { useEventHistory, useAddHistoryEntry } from '../features/events/useEventHistory';
import { useUploadEventFile } from '../features/events/useUploadEventFile';

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

function ensureHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

type UiStatus = 'bewertung' | 'geplant' | 'gebucht' | 'abgesagt';
type StatusFilter = 'all' | UiStatus;
type DateFilter = 'all' | 'upcoming' | 'past';

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
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const filteredEvents = events.filter((event) => {
    const uiStatus = mapToUiStatus(event.status, event.booked);

    if (statusFilter !== 'all' && uiStatus !== statusFilter) return false;

    // Datumsfilter (basierend auf Startdatum, Fallback auf Enddatum)
    const eventDate = event.start_date ?? event.end_date ?? null;

    if (dateFilter === 'upcoming' && eventDate && eventDate < todayIso) return false;
    if (dateFilter === 'past' && eventDate && eventDate >= todayIso) return false;

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

      if (!haystack.includes(normalizedSearch)) return false;
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

  const {
    data: history = [],
    isLoading: isHistoryLoading,
  } = useEventHistory(effectiveSelectedId ?? null);

  const addHistory = useAddHistoryEntry();
  const uploadFile = useUploadEventFile();

  const normalizedDraftColleagues = draftColleagues
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedDraftTags = draftTags
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedDraftAttachments = draftAttachments
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const attachmentLinkLines = normalizedDraftAttachments;

  const pdfAttachmentLinks = attachmentLinkLines.filter((link) =>
    link.toLowerCase().includes('.pdf'),
  );

  const draftCostNumeric = Number(draftCostValue.replace(',', '.')) || 0;

  const hasChanges = Boolean(
    selectedEvent &&
      (
        draftTitle.trim() !== (selectedEvent.title ?? '') ||
        draftOrganizer.trim() !== (selectedEvent.organizer ?? '') ||
        draftCity.trim() !== (selectedEvent.city ?? '') ||
        draftLocation.trim() !== (selectedEvent.location ?? '') ||
        draftStartDate !== (selectedEvent.start_date ?? '') ||
        draftEndDate !== (selectedEvent.end_date ?? '') ||
        draftStatus !== selectedEvent.status ||
        draftBooked !== selectedEvent.booked ||
        draftCostType !== selectedEvent.cost_type ||
        draftCostNumeric !== (selectedEvent.cost_value ?? 0) ||
        draftEventUrl.trim() !== (selectedEvent.event_url ?? '') ||
        draftNotes.trim() !== (selectedEvent.notes ?? '') ||
        Boolean(draftLinkedinNote.trim()) !== selectedEvent.linkedin_plan ||
        draftLinkedinNote.trim() !== (selectedEvent.linkedin_note ?? '') ||
        draftPublicationStatus !== selectedEvent.publication_status ||
        JSON.stringify(normalizedDraftColleagues) !==
          JSON.stringify(selectedEvent.colleagues || []) ||
        JSON.stringify(normalizedDraftTags) !== JSON.stringify(selectedEvent.tags || []) ||
        JSON.stringify(normalizedDraftAttachments) !==
          JSON.stringify(selectedEvent.attachments || [])
      ),
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

  function getUiStatusLabel(uiStatus: UiStatus): string {
    switch (uiStatus) {
      case 'bewertung':
        return 'Bewertung';
      case 'geplant':
        return 'Geplant';
      case 'gebucht':
        return 'Gebucht';
      case 'abgesagt':
        return 'Abgesagt';
      default:
        return uiStatus;
    }
  }

  async function handleSaveSelected(markAsAttended?: boolean) {
    if (!selectedEvent) return;

    let nextStatus = draftStatus;
    let nextBooked = draftBooked;

    if (markAsAttended) {
      const mapped = mapFromUiStatus('gebucht');
      nextStatus = mapped.status;
      nextBooked = mapped.booked;
      setDraftStatus(nextStatus);
      setDraftBooked(nextBooked);
    }

    const prevUiStatus = mapToUiStatus(selectedEvent.status, selectedEvent.booked);
    const nextUiStatus = mapToUiStatus(nextStatus, nextBooked);

    const historyActions: string[] = [];

    if (markAsAttended && prevUiStatus !== 'gebucht' && nextUiStatus === 'gebucht') {
      historyActions.push('Als gebucht markiert');
    }

    if (prevUiStatus !== nextUiStatus) {
      historyActions.push(`Status geändert zu: ${getUiStatusLabel(nextUiStatus)}`);
    }

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

    const linkedinNoteTrimmed = draftLinkedinNote.trim();
    const linkedinPlanned = Boolean(linkedinNoteTrimmed);

    // Automatische Historie-Einträge für alle inhaltlichen Änderungen
    const changedFields: string[] = [];

    if (draftTitle.trim() !== (selectedEvent.title ?? '')) {
      changedFields.push('Titel');
    }

    if (draftOrganizer.trim() !== (selectedEvent.organizer ?? '')) {
      changedFields.push('Veranstalter');
    }

    if (
      draftCity.trim() !== (selectedEvent.city ?? '') ||
      draftLocation.trim() !== (selectedEvent.location ?? '')
    ) {
      changedFields.push('Ort/Location');
    }

    if (
      draftStartDate !== (selectedEvent.start_date ?? '') ||
      draftEndDate !== (selectedEvent.end_date ?? '')
    ) {
      changedFields.push('Zeitraum');
    }

    if (
      draftCostType !== selectedEvent.cost_type ||
      costNumeric !== (selectedEvent.cost_value ?? 0)
    ) {
      changedFields.push('Kosten');
    }

    if (draftEventUrl.trim() !== (selectedEvent.event_url ?? '')) {
      changedFields.push('Event-URL');
    }

    if (draftNotes.trim() !== (selectedEvent.notes ?? '')) {
      changedFields.push('Notizen');
    }

    if (
      linkedinPlanned !== selectedEvent.linkedin_plan ||
      linkedinNoteTrimmed !== (selectedEvent.linkedin_note ?? '')
    ) {
      changedFields.push('LinkedIn-Planung');
    }

    if (draftPublicationStatus !== selectedEvent.publication_status) {
      changedFields.push('Website-Status');
    }

    const prevColleagues = selectedEvent.colleagues || [];
    const prevTags = selectedEvent.tags || [];
    const prevAttachments = selectedEvent.attachments || [];

    if (JSON.stringify(colleaguesArray) !== JSON.stringify(prevColleagues)) {
      changedFields.push('Kolleg:innen');
    }

    if (JSON.stringify(tagsArray) !== JSON.stringify(prevTags)) {
      changedFields.push('Tags');
    }

    if (JSON.stringify(attachmentsArray) !== JSON.stringify(prevAttachments)) {
      changedFields.push('Anhänge');
    }

    if (changedFields.length > 0) {
      historyActions.push(`Eventdaten geändert (${changedFields.join(', ')})`);
    }

    try {
      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        title: draftTitle.trim(),
        organizer: draftOrganizer.trim() || null,
        city: draftCity.trim() || null,
        location: draftLocation.trim() || null,
        start_date: draftStartDate || null,
        end_date: draftEndDate || null,
        status: nextStatus,
        booked: nextBooked,
        colleagues: colleaguesArray,
        tags: tagsArray,
        cost_type: draftCostType,
        cost_value: costNumeric,
        event_url: draftEventUrl.trim() || null,
        notes: draftNotes.trim() || null,
        attachments: attachmentsArray,
        linkedin_plan: linkedinPlanned,
        linkedin_note: linkedinNoteTrimmed || null,
        publication_status: draftPublicationStatus,
      });

      historyActions.forEach((action) => {
        if (!action) return;
        addHistory.mutate({ eventId: selectedEvent.id, action });
      });
    } catch {
      // spätere Fehleranzeige möglich
    }
  }

  function handleFileButtonClick() {
    if (!selectedEvent) return;
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (!selectedEvent) return;
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFile.mutate(
      { eventId: selectedEvent.id, file },
      {
        onSuccess: (result) => {
          const url = result.publicUrl;
          if (!url) return;
          const current = draftAttachments.trim();
          const next = current ? `${current}\n${url}` : url;
          setDraftAttachments(next);
        },
        onSettled: () => {
          // Reset, damit derselbe Dateiname erneut gewählt werden kann
          // eslint-disable-next-line no-param-reassign
          e.target.value = '';
        },
      },
    );
  }

  function handleSaveSelectedClick() {
    void handleSaveSelected();
  }

  function handleMarkAsAttendedClick() {
    void handleSaveSelected(true);
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
          <select
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          >
            <option value="all">Alle Termine</option>
            <option value="upcoming">Nur kommende</option>
            <option value="past">Nur vergangene</option>
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

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Linke Spalte: Event-Liste */}
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

                const dateLabel = formatDate(event.start_date) || 'kein Datum';
                const cityLabel = event.city ?? '';

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
                    <div className="w-24 text-xs">
                      <div className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                        {dateLabel}
                      </div>
                      {cityLabel && (
                        <div className="mt-0.5 text-[11px] text-slate-400">{cityLabel}</div>
                      )}
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

        {/* Rechte Spalte: Event-Management */}
        <div className="flex flex-col space-y-4">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Event-Management</span>
              {selectedEvent && (
                <Button
                  type="button"
                  variant={hasChanges ? 'primary' : 'secondary'}
                  className="h-8 px-3 text-xs"
                  onClick={handleSaveSelectedClick}
                  disabled={updateEvent.isPending || !hasChanges}
                >
                  {updateEvent.isPending ? 'Speichere…' : 'Änderungen speichern'}
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedEvent ? (
                <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Titel</label>
                      <Input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                      />
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
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Startdatum
                        </label>
                        <Input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Enddatum
                        </label>
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
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        LinkedIn-Post (geplant: Datum / Hinweis)
                      </label>
                      <Input
                        value={draftLinkedinNote}
                        onChange={(e) => setDraftLinkedinNote(e.target.value)}
                        placeholder="z. B. 10.03. | Recap-Post"
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
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Kostenart
                        </label>
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
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          value={draftEventUrl}
                          onChange={(e) => setDraftEventUrl(e.target.value)}
                        />
                        {draftEventUrl.trim() && (
                          <a
                            href={ensureHttpUrl(draftEventUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Öffnen
                          </a>
                        )}
                      </div>
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
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                            checked={draftPublicationStatus}
                            onChange={(e) => setDraftPublicationStatus(e.target.checked)}
                          />
                          <div className="leading-snug">
                            <div className="font-medium">Website: Teilnahme veröffentlicht</div>
                            <div className="text-[11px] text-slate-500">
                              Häkchen, wenn die Teilnahme auf der Website steht.
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
                          {pdfAttachmentLinks.slice(0, 3).map((link, index) => (
                            <a
                              key={link}
                              href={ensureHttpUrl(link)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              PDF {index + 1}
                            </a>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={handleFileButtonClick}
                            disabled={!selectedEvent || uploadFile.isPending}
                          >
                            {uploadFile.isPending ? 'Lade hoch…' : 'PDF hochladen'}
                          </Button>
                          <span className="hidden md:inline">
                            Wird als Link im Feld oben gespeichert.
                          </span>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      {attachmentLinkLines.length > 0 && (
                        <div className="mt-2 space-y-1 text-[11px]">
                          {attachmentLinkLines.map((link) => (
                            <a
                              key={link}
                              href={ensureHttpUrl(link)}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-brand hover:underline"
                            >
                              {link}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notizen & Historie über volle Breite */}
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 md:col-span-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Notizen</label>
                      <textarea
                        className="h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        value={draftNotes}
                        onChange={(e) => setDraftNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
                      <div className="font-medium">Historie</div>
                      {selectedEvent && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={handleMarkAsAttendedClick}
                          disabled={updateEvent.isPending}
                        >
                          Als besucht markieren
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        {isHistoryLoading && (
                          <div className="text-slate-400">Lade Historie…</div>
                        )}
                        {!isHistoryLoading && history.length === 0 && (
                          <div className="text-slate-400">Noch keine Einträge vorhanden.</div>
                        )}
                        {!isHistoryLoading && history.length > 0 && (
                          <ul className="space-y-1">
                            {history.map((entry) => (
                              <li key={entry.id} className="flex gap-3">
                                <span className="w-20 shrink-0 text-[11px] text-slate-400">
                                  {new Date(entry.timestamp).toLocaleDateString('de-DE')}
                                </span>
                                <span className="flex-1 text-xs text-slate-700">
                                  {entry.action}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="pt-1 text-[11px] text-slate-400">
                        Status- und Historienänderungen werden protokolliert.
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
    </div>
  );
}
