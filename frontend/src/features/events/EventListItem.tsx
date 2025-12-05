import type { EventRow } from './useEvents';

type UiStatus = 'bewertung' | 'geplant' | 'gebucht' | 'abgesagt';

function mapToUiStatus(status: EventRow['status'], booked: boolean): UiStatus {
  if (status === 'cancelled') return 'abgesagt';
  if (status === 'attended') return 'gebucht';
  if (booked) return 'gebucht';
  if (status === 'consider') return 'bewertung';
  return 'geplant';
}

function formatDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE');
}

interface EventListItemProps {
  event: EventRow;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function EventListItem({ event, isSelected, onSelect }: EventListItemProps) {
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
      type="button"
      onClick={() => onSelect(event.id)}
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
}

export { mapToUiStatus };
export type { UiStatus };
