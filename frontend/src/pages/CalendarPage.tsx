export function CalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kalenderansicht</h1>
          <p className="text-sm text-slate-500">Zeigt alle Events aus der aktuellen Filterung.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm">
            <option>Jahresansicht</option>
          </select>
          <select className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm">
            <option>2026</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Januar</span>
            <span>2 Events</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Gebucht</div>
              <div className="font-medium text-slate-900">28. Managementforum</div>
              <div className="text-xs text-slate-500">Rostock · VNW</div>
            </div>
            <div className="rounded-lg px-3 py-2 hover:bg-slate-50">
              <div className="font-medium text-slate-900">Jahresauftakt "auftakt: 26"</div>
              <div className="text-xs text-slate-500">Hannover · VdW Nds-HB</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-400">
          Weitere Monate folgen, sobald die Anbindung an Supabase steht.
        </div>
      </div>
    </div>
  );
}
