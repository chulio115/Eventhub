import { Input } from '../../components/ui/Input';
import type { UiStatus } from './EventListItem';

type StatusFilter = 'all' | UiStatus;
type DateFilter = 'all' | 'upcoming' | 'past';

interface FilterOptions {
  organizers: string[];
  cities: string[];
  colleagues: string[];
  tags: string[];
}

interface EventFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  dateFilter: DateFilter;
  onDateChange: (value: DateFilter) => void;
  organizerFilter: string;
  onOrganizerChange: (value: string) => void;
  cityFilter: string;
  onCityChange: (value: string) => void;
  colleagueFilter: string;
  onColleagueChange: (value: string) => void;
  tagFilter: string;
  onTagChange: (value: string) => void;
  options: FilterOptions;
}

export function EventFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  organizerFilter,
  onOrganizerChange,
  cityFilter,
  onCityChange,
  colleagueFilter,
  onColleagueChange,
  tagFilter,
  onTagChange,
  options,
}: EventFiltersProps) {
  return (
    <>
      <div className="flex flex-1 items-center gap-3">
        <Input
          placeholder="Suche in Titel, Ort, Veranstalter"
          className="max-w-md"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
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
          onChange={(e) => onDateChange(e.target.value as DateFilter)}
        >
          <option value="all">Alle Termine</option>
          <option value="upcoming">Nur kommende</option>
          <option value="past">Nur vergangene</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <select
          className="h-8 min-w-[11rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={organizerFilter}
          onChange={(e) => onOrganizerChange(e.target.value)}
        >
          <option value="">Alle Veranstalter</option>
          {options.organizers.map((organizer) => (
            <option key={organizer} value={organizer}>
              {organizer}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[9rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={cityFilter}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="">Alle Orte</option>
          {options.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[11rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={colleagueFilter}
          onChange={(e) => onColleagueChange(e.target.value)}
        >
          <option value="">Alle Kolleg:innen</option>
          {options.colleagues.map((colleague) => (
            <option key={colleague} value={colleague}>
              {colleague}
            </option>
          ))}
        </select>
        <select
          className="h-8 min-w-[9rem] rounded-full border border-slate-200 bg-white px-3 pr-8 text-xs font-medium text-slate-700 shadow-sm"
          value={tagFilter}
          onChange={(e) => onTagChange(e.target.value)}
        >
          <option value="">Alle Tags</option>
          {options.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export type { StatusFilter, DateFilter, FilterOptions };
