import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function EventsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Input placeholder="Suche in Titel, Ort, Veranstalter" className="max-w-md" />
          <select className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm">
            <option>Alle Stati</option>
          </select>
        </div>
        <Button>+ Neues Event</Button>
      </div>

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
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="w-24 text-xs text-slate-500">21.01.2026</div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">28. Managementforum</div>
                <div className="text-xs text-slate-500">Rostock · VNW</div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Gebucht
              </span>
            </div>
            <div className="px-4 py-3 text-xs text-slate-400">Weitere Events folgen durch Anbindung an Supabase…</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event-Details (Preview)
            </div>
            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Veranstalter</label>
                  <Input value="VNW" readOnly />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Startdatum</label>
                    <Input value="21.01.2026" readOnly />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Enddatum</label>
                    <Input value="22.01.2026" readOnly />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Stadt</label>
                  <Input value="Rostock" readOnly />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Kosten / Ticket pro Person</label>
                  <Input value="690,00 €" readOnly />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Status / Flags</label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">Geplant</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Gebucht</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
