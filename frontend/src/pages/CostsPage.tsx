export function CostsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kosten &amp; Teilnahmen</h1>
          <p className="text-sm text-slate-500">Aktuelle Filter (Demo-Daten, Aggregationen folgen serverseitig).</p>
        </div>
        <div className="text-right text-sm font-semibold text-slate-900">30.374,70 €</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Events
          </div>
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-white text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Event</th>
                <th className="px-4 py-2 text-right font-medium">TN</th>
                <th className="px-4 py-2 text-right font-medium">Gesamt/Event</th>
                <th className="px-4 py-2 text-right font-medium">€/TN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2">Verbandstag Nds-HB</td>
                <td className="px-4 py-2 text-right">1</td>
                <td className="px-4 py-2 text-right">400,00 €</td>
                <td className="px-4 py-2 text-right">400,00 €</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-xs text-slate-400" colSpan={4}>
                  Weitere Zeilen folgen über den Summary-Endpunkt.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nach Veranstalter
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between px-4 py-2">
              <span>Aareon</span>
              <span className="font-medium">6.400,00 €</span>
            </div>
            <div className="px-4 py-2 text-xs text-slate-400">Weitere Gruppen folgen…</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nach Monat (Startdatum)
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between px-4 py-2">
              <span>April 2026</span>
              <span className="font-medium">5.260,00 €</span>
            </div>
            <div className="px-4 py-2 text-xs text-slate-400">Weitere Monate folgen…</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Hinweis: Bei „Teilnehmerkosten" wird der Preis pro Person als Preis pro Person interpretiert und mit der Anzahl der
        Kolleg:innen multipliziert. Bei „Messestandkosten" wird nur der eingetragene Betrag als Gesamtsumme verwendet.
      </p>
    </div>
  );
}
