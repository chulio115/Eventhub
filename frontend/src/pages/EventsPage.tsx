import { FormEvent, useEffect, useState, useRef, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useEvents, type EventRow } from '../features/events/useEvents';
import { useCreateEvent } from '../features/events/useCreateEvent';
import { useUpdateEvent } from '../features/events/useUpdateEvent';
import { useDeleteEvent } from '../features/events/useDeleteEvent';
import { useEventHistory, useAddHistoryEntry } from '../features/events/useEventHistory';
import { useUploadEventFile } from '../features/events/useUploadEventFile';
import { useDeleteHistoryEntry } from '../features/events/useDeleteHistoryEntry';
import { useAuth } from '../features/auth/AuthContext';
import { useUsers } from '../features/users/useUsers';

function copyEventLink(eventId: string) {
  const url = `${window.location.origin}/events?id=${eventId}`;
  navigator.clipboard.writeText(url).then(() => {
    toast.success('Link kopiert!');
  }).catch(() => {
    toast.error('Link konnte nicht kopiert werden');
  });
}

// EventHub App URL
function getAppUrl() {
  return import.meta.env.VITE_APP_URL || window.location.origin;
}

// ICS-Datei für Kalender-Einladung generieren
function generateICS(event: EventRow): string {
  const formatICSDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // Ganztägige Events: nur Datum ohne Zeit
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  };

  const startDate = formatICSDate(event.start_date);
  const endDate = formatICSDate(event.end_date) || startDate;
  const location = [event.location, event.city].filter(Boolean).join(', ');
  const eventHubLink = `${getAppUrl()}/events?id=${event.id}`;
  
  // ICS erfordert spezielle Escaping: Backslash-n für Zeilenumbrüche
  const descriptionParts = [
    `Veranstalter: ${event.organizer || 'N/A'}`,
    event.event_url ? `Website: ${event.event_url}` : '',
    '',
    `Im EventHub öffnen: ${eventHubLink}`,
    event.notes ? `Notizen: ${event.notes.replace(/\n/g, ' ')}` : '',
  ].filter((p) => p !== undefined);
  
  const description = descriptionParts.join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventHub//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@eventhub`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${event.title.replace(/[,;]/g, ' ')}`,
    location ? `LOCATION:${location.replace(/[,;]/g, ' ')}` : '',
    `DESCRIPTION:${description}`,
    `URL:${eventHubLink}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

// E-Mail-Einladung generieren
function generateCalendarEmail(event: EventRow, recipientEmail: string): string {
  const eventHubLink = `${getAppUrl()}/events?id=${event.id}`;
  const dateStr = event.start_date 
    ? new Date(event.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Datum folgt';
  const locationStr = [event.location, event.city].filter(Boolean).join(', ') || 'Ort folgt';
  
  const subject = encodeURIComponent(`Kalendereinladung: ${event.title}`);
  const body = encodeURIComponent(
`Hallo,

du wurdest zu folgendem Event eingeladen:

📅 ${event.title}
📆 ${dateStr}
📍 ${locationStr}
🏢 Veranstalter: ${event.organizer || 'N/A'}
${event.event_url ? `🔗 Website: ${event.event_url}` : ''}

👉 Im EventHub öffnen: ${eventHubLink}

Viele Grüße`
  );
  
  return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
}

function downloadICS(event: EventRow) {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Kalender-Datei heruntergeladen');
}

function openOutlookWeb(event: EventRow) {
  const startDate = event.start_date ? new Date(event.start_date).toISOString() : '';
  const endDate = event.end_date ? new Date(event.end_date).toISOString() : startDate;
  const location = [event.location, event.city].filter(Boolean).join(', ');
  const eventHubLink = `${getAppUrl()}/events?id=${event.id}`;
  const body = [
    `Veranstalter: ${event.organizer || 'N/A'}`,
    event.event_url ? `Website: ${event.event_url}` : '',
    `\nIm EventHub öffnen: ${eventHubLink}`,
    event.notes ? `\nNotizen: ${event.notes}` : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
    location: location,
    body: body,
    path: '/calendar/action/compose',
  });

  window.open(`https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
}

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

// Extrahiert den lesbaren Dateinamen aus einer URL oder einem Pfad
function extractFileName(urlOrPath: string): string {
  try {
    // Versuche URL zu parsen
    const url = new URL(urlOrPath);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // Entferne Timestamp-Prefix (z.B. "1701234567890-")
    const withoutTimestamp = fileName.replace(/^\d{13,}-/, '');
    
    // Dekodiere URL-encodierte Zeichen und ersetze Unterstriche durch Leerzeichen
    const decoded = decodeURIComponent(withoutTimestamp);
    
    return decoded || fileName || urlOrPath;
  } catch {
    // Falls keine gültige URL, versuche einfach den letzten Teil zu nehmen
    const parts = urlOrPath.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/^\d{13,}-/, '') || urlOrPath;
  }
}

type UiStatus = 'bewertung' | 'geplant' | 'gebucht' | 'abgesagt';
type StatusFilter = 'all' | UiStatus;
type YearFilter = 'all' | number;

// Berechne Durchschnittsbewertung
function calculateAverageRating(ratings: (number | null)[]): number | null {
  const validRatings = ratings.filter((r): r is number => r !== null && r > 0);
  if (validRatings.length === 0) return null;
  return Math.round((validRatings.reduce((a, b) => a + b, 0) / validRatings.length) * 10) / 10;
}

// Stern-Komponente für Bewertung
function StarRating({ value, onChange, readonly = false }: { value: number | null; onChange?: (v: number | null) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(value === star ? null : star)}
          disabled={readonly}
          className={`h-5 w-5 transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={value !== null && star <= value ? '#fbbf24' : 'none'}
            stroke={value !== null && star <= value ? '#fbbf24' : '#cbd5e1'}
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useEvents();
  const events: EventRow[] = data ?? [];
  
  // selectedId aus URL lesen (persistiert bei Refresh)
  const selectedIdFromUrl = searchParams.get('id');
  const [selectedId, setSelectedIdState] = useState<string | null>(selectedIdFromUrl);

  // Wrapper-Funktion: Setzt selectedId und aktualisiert URL
  function setSelectedId(id: string | null) {
    setSelectedIdState(id);
    if (id) {
      setSearchParams({ id }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  // URL-Parameter verarbeiten: Event aus URL auswählen (bei Pageload)
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && events.length > 0) {
      const eventExists = events.some((e) => e.id === idFromUrl);
      if (eventExists) {
        setSelectedIdState(idFromUrl);
        // URL-Parameter beibehalten, damit der Link funktioniert
      } else {
        // Event existiert nicht mehr - URL bereinigen
        setSearchParams({}, { replace: true });
        setSelectedIdState(null);
      }
    }
  }, [events]);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
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
  const deleteEvent = useDeleteEvent();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  const [draftVisitorNotes, setDraftVisitorNotes] = useState('');
  const [draftLinkedinPlan, setDraftLinkedinPlan] = useState(false);
  const [draftLinkedinNote, setDraftLinkedinNote] = useState('');
  const [draftPublicationStatus, setDraftPublicationStatus] = useState(false);
  const [draftBooked, setDraftBooked] = useState(false);
  
  // Bewertungen
  const [draftRatingSales, setDraftRatingSales] = useState<number | null>(null);
  const [draftRatingKam, setDraftRatingKam] = useState<number | null>(null);
  const [draftRatingMarketing, setDraftRatingMarketing] = useState<number | null>(null);
  const [draftRatingClevel, setDraftRatingClevel] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // Ansprechpartner
  const [draftContactName, setDraftContactName] = useState('');
  const [draftContactEmail, setDraftContactEmail] = useState('');
  const [draftContactPhone, setDraftContactPhone] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const calendarMenuRef = useRef<HTMLDivElement | null>(null);
  const [rightColHeight, setRightColHeight] = useState<number | null>(null);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Nutzer für Einladungen laden
  const { data: allUsers = [] } = useUsers();

  // Schließe Kalender-Menü bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(e.target as Node)) {
        setShowCalendarMenu(false);
      }
    };
    if (showCalendarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendarMenu]);

  // Messe die Höhe der rechten Box
  useEffect(() => {
    if (rightColRef.current) {
      const updateHeight = () => {
        if (rightColRef.current) {
          setRightColHeight(rightColRef.current.offsetHeight);
        }
      };
      updateHeight();
      // ResizeObserver für dynamische Änderungen
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(rightColRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [selectedId]);

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

  // Jahr-Optionen aus Events extrahieren
  const yearSet = new Set<number>();
  events.forEach((e) => {
    const dateStr = e.start_date ?? e.end_date;
    if (dateStr) {
      const year = new Date(dateStr).getFullYear();
      if (!Number.isNaN(year)) yearSet.add(year);
    }
  });
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a); // Neueste zuerst

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEvents = events.filter((event) => {
    const uiStatus = mapToUiStatus(event.status, event.booked);

    if (statusFilter !== 'all' && uiStatus !== statusFilter) return false;

    // Jahresfilter (basierend auf Startdatum, Fallback auf Enddatum)
    const eventDate = event.start_date ?? event.end_date ?? null;
    if (yearFilter !== 'all' && eventDate) {
      const eventYear = new Date(eventDate).getFullYear();
      if (eventYear !== yearFilter) return false;
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

      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (organizerFilter && event.organizer !== organizerFilter) return false;
    if (cityFilter && event.city !== cityFilter) return false;
    if (colleagueFilter && !(event.colleagues || []).includes(colleagueFilter)) return false;
    if (tagFilter && !(event.tags || []).includes(tagFilter)) return false;

    return true;
  }).sort((a, b) => {
    // Events ohne Datum zuerst anzeigen
    const dateA = a.start_date ?? a.end_date;
    const dateB = b.start_date ?? b.end_date;
    
    if (!dateA && !dateB) return 0; // Beide ohne Datum - Reihenfolge beibehalten
    if (!dateA) return -1; // A ohne Datum kommt zuerst
    if (!dateB) return 1;  // B ohne Datum kommt zuerst
    
    // Beide haben Datum - nach Datum sortieren (neueste zuerst)
    return new Date(dateA).getTime() - new Date(dateB).getTime();
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
  const deleteHistory = useDeleteHistoryEntry();
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
        draftVisitorNotes.trim() !== (selectedEvent.visitor_notes ?? '') ||
        Boolean(draftLinkedinNote.trim()) !== selectedEvent.linkedin_plan ||
        draftLinkedinNote.trim() !== (selectedEvent.linkedin_note ?? '') ||
        draftPublicationStatus !== selectedEvent.publication_status ||
        draftRatingSales !== selectedEvent.rating_sales ||
        draftRatingKam !== selectedEvent.rating_kam ||
        draftRatingMarketing !== selectedEvent.rating_marketing ||
        draftRatingClevel !== selectedEvent.rating_clevel ||
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
      setDraftVisitorNotes('');
      setDraftLinkedinPlan(false);
      setDraftLinkedinNote('');
      setDraftPublicationStatus(false);
      setDraftBooked(false);
      setDraftRatingSales(null);
      setDraftRatingKam(null);
      setDraftRatingMarketing(null);
      setDraftRatingClevel(null);
      setDraftContactName('');
      setDraftContactEmail('');
      setDraftContactPhone('');
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
    setDraftVisitorNotes(selectedEvent.visitor_notes ?? '');
    setDraftLinkedinPlan(selectedEvent.linkedin_plan);
    setDraftLinkedinNote(selectedEvent.linkedin_note ?? '');
    setDraftPublicationStatus(selectedEvent.publication_status);
    setDraftBooked(selectedEvent.booked);
    setDraftRatingSales(selectedEvent.rating_sales);
    setDraftRatingKam(selectedEvent.rating_kam);
    setDraftRatingMarketing(selectedEvent.rating_marketing);
    setDraftRatingClevel(selectedEvent.rating_clevel);
    setDraftContactName(selectedEvent.contact_name ?? '');
    setDraftContactEmail(selectedEvent.contact_email ?? '');
    setDraftContactPhone(selectedEvent.contact_phone ?? '');
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

    if (draftVisitorNotes.trim() !== (selectedEvent.visitor_notes ?? '')) {
      changedFields.push('Besucher-Notizen');
    }

    if (
      draftRatingSales !== selectedEvent.rating_sales ||
      draftRatingKam !== selectedEvent.rating_kam ||
      draftRatingMarketing !== selectedEvent.rating_marketing ||
      draftRatingClevel !== selectedEvent.rating_clevel
    ) {
      changedFields.push('Bewertungen');
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
        visitor_notes: draftVisitorNotes.trim() || null,
        attachments: attachmentsArray,
        linkedin_plan: linkedinPlanned,
        linkedin_note: linkedinNoteTrimmed || null,
        publication_status: draftPublicationStatus,
        rating_sales: draftRatingSales,
        rating_kam: draftRatingKam,
        rating_marketing: draftRatingMarketing,
        rating_clevel: draftRatingClevel,
        contact_name: draftContactName.trim() || null,
        contact_email: draftContactEmail.trim() || null,
        contact_phone: draftContactPhone.trim() || null,
      });

      historyActions.forEach((action) => {
        if (!action) return;
        addHistory.mutate({ eventId: selectedEvent.id, action, userEmail: profile?.email });
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

  async function handleDeleteEvent() {
    if (!deleteConfirmId) return;
    try {
      await deleteEvent.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      if (selectedId === deleteConfirmId) {
        setSelectedId(null);
      }
    } catch {
      // Fehlerbehandlung später
    }
  }

  return (
    <div className="w-full space-y-4">
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
            <option value="all">Status</option>
            <option value="bewertung">Bewertung</option>
            <option value="geplant">Geplant</option>
            <option value="gebucht">Gebucht</option>
            <option value="abgesagt">Abgesagt</option>
          </select>
          <select
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Jahr</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Linke Spalte: Event-Liste - Höhe passt sich der rechten Box an */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm self-start" style={{ height: rightColHeight ? `${rightColHeight}px` : 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Events ({filteredEvents.length})
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto text-sm">
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
                          isSelected ? 'text-white' : 'text-slate-900'
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
        <div ref={rightColRef} className="rounded-2xl border border-slate-200 bg-white shadow-sm self-start">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div className="flex items-center gap-3">
                <span>Event-Management</span>
                {selectedEvent && (
                  <select
                    className={`cursor-pointer appearance-none rounded-full border px-3 py-1 pr-7 text-xs font-semibold normal-case tracking-normal ${
                      draftUiStatus === 'bewertung'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : draftUiStatus === 'geplant'
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : draftUiStatus === 'gebucht'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                    value={draftUiStatus}
                    onChange={(e) => {
                      const mapped = mapFromUiStatus(e.target.value as UiStatus);
                      setDraftStatus(mapped.status);
                      setDraftBooked(mapped.booked);
                    }}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 6px center',
                      backgroundSize: '14px',
                    }}
                  >
                    <option value="bewertung">Bewertung</option>
                    <option value="geplant">Geplant</option>
                    <option value="gebucht">Gebucht</option>
                    <option value="abgesagt">Abgesagt</option>
                  </select>
                )}
                              </div>
              {selectedEvent && (
                <div className="flex items-center gap-2">
                  {/* Bewertungs-Button mit Durchschnitt */}
                  <button
                    type="button"
                    onClick={() => setShowRatingModal(true)}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 text-amber-600 shadow-sm transition-colors hover:bg-amber-50"
                    title="Event bewerten"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="text-xs font-semibold">
                      {calculateAverageRating([draftRatingSales, draftRatingKam, draftRatingMarketing, draftRatingClevel])?.toFixed(1) || '–'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyEventLink(selectedEvent.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                    title="Link kopieren"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                  {/* Kalender-Einladung Button mit Dropdown */}
                  <div ref={calendarMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-500 shadow-sm transition-colors hover:bg-sky-50 hover:text-sky-600"
                      title="Kalender-Einladung erstellen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <line x1="12" y1="14" x2="12" y2="18" />
                        <line x1="10" y1="16" x2="14" y2="16" />
                      </svg>
                    </button>
                    {showCalendarMenu && (
                      <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        <div className="border-b border-slate-100 px-3 py-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Kalender</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            downloadICS(selectedEvent);
                            setShowCalendarMenu(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          ICS-Datei herunterladen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openOutlookWeb(selectedEvent);
                            setShowCalendarMenu(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.13V2.55q0-.44.3-.75.3-.3.7-.3h15.12q.44 0 .75.3.3.3.3.75V12zm-8.95 0q-.41-.68-1-1.03-.6-.35-1.4-.35-.89 0-1.55.33-.66.34-1.1.92-.44.58-.67 1.36-.22.77-.22 1.64 0 .88.2 1.66.2.79.65 1.38.44.58 1.11.92.68.33 1.56.33.67 0 1.25-.24.58-.24 1.02-.66.43-.42.7-.98.28-.57.35-1.23H12.6q0 .38-.12.64-.12.26-.35.43-.23.17-.56.25-.32.08-.72.08-.59 0-1-.17-.41-.17-.68-.49-.27-.32-.4-.76-.12-.44-.12-.98 0-.52.13-.97.13-.46.4-.79.28-.33.68-.51.4-.17.98-.17.58 0 .94.18.36.18.57.52zM2 8.39v6.83H6V8.39zm15.3 6.23q.42 0 .81-.1.39-.1.72-.29.33-.2.57-.5.25-.31.36-.74H16.1q0 .39.15.67.17.29.42.48.26.19.6.29.32.1.66.1h0zM19.08 6v.61h-2.66V6zm-1.33 1.91v.61h-1.33v-.61zm1.33 1.91v.61h-2.66v-.61z"/>
                          </svg>
                          Outlook Web öffnen
                        </button>
                        <div className="border-t border-slate-100 px-3 py-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Teilen</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCalendarMenu(false);
                            setShowInviteModal(true);
                            setInviteEmail('');
                            setSelectedUserIds([]);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          Per E-Mail einladen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            copyEventLink(selectedEvent.id);
                            setShowCalendarMenu(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          Link kopieren
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(selectedEvent.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Event löschen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                  </button>
                  <Button
                    type="button"
                    variant={hasChanges ? 'primary' : 'secondary'}
                    className="h-8 px-3 text-xs"
                    onClick={handleSaveSelectedClick}
                    disabled={updateEvent.isPending || !hasChanges}
                  >
                    {updateEvent.isPending ? 'Speichere…' : 'Änderungen speichern'}
                  </Button>
                </div>
              )}
            </div>
            <div>
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
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Veranstalter</label>
                      <Input
                        value={draftOrganizer}
                        onChange={(e) => setDraftOrganizer(e.target.value)}
                      />
                    </div>
                    {/* Ansprechpartner */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Ansprechpartner</label>
                      <div className="space-y-2">
                        <Input
                          value={draftContactName}
                          onChange={(e) => setDraftContactName(e.target.value)}
                          placeholder="Name"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="email"
                            value={draftContactEmail}
                            onChange={(e) => setDraftContactEmail(e.target.value)}
                            placeholder="E-Mail"
                            className="flex-1"
                          />
                          {draftContactEmail && (
                            <a
                              href={`mailto:${draftContactEmail}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              title="E-Mail senden"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="tel"
                            value={draftContactPhone}
                            onChange={(e) => setDraftContactPhone(e.target.value)}
                            placeholder="Telefon"
                            className="flex-1"
                          />
                          {draftContactPhone && (
                            <a
                              href={`tel:${draftContactPhone}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                              title="Anrufen"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
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
                        LinkedIn-Post (geplant: Datum / Hinweis)
                      </label>
                      <Input
                        value={draftLinkedinNote}
                        onChange={(e) => setDraftLinkedinNote(e.target.value)}
                        placeholder="z. B. 10.03. | Recap-Post"
                      />
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        checked={draftPublicationStatus}
                        onChange={(e) => setDraftPublicationStatus(e.target.checked)}
                      />
                      <div className="leading-snug">
                        <div className="text-xs font-medium text-slate-700">Website: Teilnahme veröffentlicht</div>
                        <div className="text-[11px] text-slate-500">
                          Häkchen, wenn die Teilnahme auf der Website steht.
                        </div>
                      </div>
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
                          <option value="sponsoring">Sponsoring</option>
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

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={handleFileButtonClick}
                          disabled={!selectedEvent || uploadFile.isPending}
                        >
                          {uploadFile.isPending ? 'Lade hoch…' : 'PDF hochladen'}
                        </Button>
                        <span className="text-[11px] text-slate-500">
                          Hochgeladene PDFs werden beim Event gespeichert.
                        </span>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />

                      {attachmentLinkLines.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <div className="text-[11px] font-medium text-slate-500">
                            Hochgeladene Dokumente ({attachmentLinkLines.length}):
                          </div>
                          {attachmentLinkLines.map((link) => {
                            const fileName = extractFileName(link);
                            const isPdf = fileName.toLowerCase().endsWith('.pdf');
                            return (
                              <a
                                key={link}
                                href={ensureHttpUrl(link)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                              >
                                {isPdf ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <path d="M9 15h6" />
                                    <path d="M9 11h6" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                  </svg>
                                )}
                                <span className="flex-1 truncate font-medium">{fileName}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notizen & Historie über volle Breite */}
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 md:col-span-2">
                    {/* Notizen zweigeteilt */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Notizen</label>
                        <textarea
                          className="h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          placeholder="Allgemeine Notizen zum Event..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">Besucher-Notizen</label>
                        <textarea
                          className="h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          value={draftVisitorNotes}
                          onChange={(e) => setDraftVisitorNotes(e.target.value)}
                          placeholder="Notizen zu Besuchern, Kontakten..."
                        />
                      </div>
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
                      <div className="max-h-[180px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        {isHistoryLoading && (
                          <div className="text-slate-400">Lade Historie…</div>
                        )}
                        {!isHistoryLoading && history.length === 0 && (
                          <div className="text-slate-400">Noch keine Einträge vorhanden.</div>
                        )}
                        {!isHistoryLoading && history.length > 0 && (
                          <ul className="space-y-2">
                            {history.map((entry, index) => (
                              <li key={entry.id} className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-400">
                                      {new Date(entry.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {entry.user_email && (
                                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                                        {entry.user_email.split('@')[0]}
                                      </span>
                                    )}
                                  </div>
                                  {/* Löschen-Button nur für Admins und die letzten 2 Einträge */}
                                  {isAdmin && index < 2 && (
                                    <button
                                      type="button"
                                      onClick={() => deleteHistory.mutate(entry.id)}
                                      disabled={deleteHistory.isPending}
                                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                                      title="Eintrag löschen"
                                    >
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <span className="text-xs text-slate-700">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Event löschen?</h3>
            <p className="mb-6 text-sm text-slate-500">
              Das Event wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteEvent.isPending}
              >
                Abbrechen
              </Button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deleteEvent.isPending}
                className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteEvent.isPending ? 'Lösche…' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowRatingModal(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Event bewerten</h3>
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Bewerte das Event aus verschiedenen Perspektiven (1-5 Sterne).
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Sales Bewertung</label>
                <StarRating value={draftRatingSales} onChange={setDraftRatingSales} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">KAM Bewertung</label>
                <StarRating value={draftRatingKam} onChange={setDraftRatingKam} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Marketing Bewertung</label>
                <StarRating value={draftRatingMarketing} onChange={setDraftRatingMarketing} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">C-Level Bewertung</label>
                <StarRating value={draftRatingClevel} onChange={setDraftRatingClevel} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm font-semibold text-slate-700">
                  Durchschnitt: {calculateAverageRating([draftRatingSales, draftRatingKam, draftRatingMarketing, draftRatingClevel])?.toFixed(1) || '–'}
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setShowRatingModal(false)}
              >
                Fertig
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Einladungs-Modal */}
      {showInviteModal && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Event-Einladung senden</h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">{selectedEvent.title}</p>
            </div>

            <div className="space-y-4 p-5">
              {/* Nutzer-Auswahl */}
              {allUsers.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">Team-Mitglieder auswählen</label>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                    {allUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-700">{user.name || user.email}</div>
                          {user.name && <div className="truncate text-xs text-slate-400">{user.email}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Trennlinie */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">oder</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* E-Mail Eingabe */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Externe E-Mail-Adresse</label>
                <Input
                  type="email"
                  placeholder="beispiel@firma.de"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              {/* Event-Vorschau */}
              <div className="rounded-lg bg-gradient-to-br from-brand/5 to-brand/10 p-3">
                <div className="mb-2 text-xs text-slate-500">Vorschau der Einladung:</div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="font-medium text-slate-700">{selectedEvent.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>📆</span>
                    <span>
                      {selectedEvent.start_date 
                        ? new Date(selectedEvent.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                        : 'Datum folgt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>📍</span>
                    <span>{[selectedEvent.location, selectedEvent.city].filter(Boolean).join(', ') || 'Ort folgt'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  const emails: string[] = [];
                  selectedUserIds.forEach((userId) => {
                    const user = allUsers.find((u) => u.id === userId);
                    if (user?.email) emails.push(user.email);
                  });
                  if (inviteEmail.trim()) {
                    emails.push(inviteEmail.trim());
                  }
                  if (emails.length === 0) {
                    toast.error('Bitte wähle mindestens einen Empfänger aus');
                    return;
                  }
                  
                  // ICS herunterladen
                  downloadICS(selectedEvent);
                  
                  // E-Mail-Client öffnen mit mailto
                  const mailtoUrl = generateCalendarEmail(selectedEvent, emails.join(','));
                  window.open(mailtoUrl, '_blank');
                  
                  toast.success('Kalender-Datei heruntergeladen! Bitte an die E-Mail anhängen.');
                  setShowInviteModal(false);
                  setSelectedUserIds([]);
                  setInviteEmail('');
                }}
              >
                Einladung vorbereiten
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
