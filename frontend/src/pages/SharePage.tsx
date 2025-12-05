import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

interface SharedEvent {
  id: string;
  title: string;
  organizer: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  location: string | null;
  status: string;
  colleagues: string[];
  cost_type: string;
  cost_value: number;
  event_url: string | null;
  notes: string | null;
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-event', token],
    enabled: !!token,
    queryFn: async () => {
      // Erst Token validieren
      const { data: tokenData, error: tokenError } = await supabase
        .from('share_tokens')
        .select('event_id, expires_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Ungültiger oder abgelaufener Link');
      }

      // Prüfen ob Token abgelaufen
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Dieser Link ist abgelaufen');
      }

      // Event laden
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, organizer, start_date, end_date, city, location, status, colleagues, cost_type, cost_value, event_url, notes')
        .eq('id', tokenData.event_id)
        .single();

      if (eventError || !eventData) {
        throw new Error('Event nicht gefunden');
      }

      return eventData as SharedEvent;
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      planned: { label: 'Geplant', color: 'bg-sky-100 text-sky-700' },
      consider: { label: 'In Bewertung', color: 'bg-amber-100 text-amber-700' },
      attended: { label: 'Teilgenommen', color: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: 'Abgesagt', color: 'bg-rose-100 text-rose-700' },
    };
    return labels[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <p className="mt-4 text-sm text-slate-500">Lade Event...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Link ungültig</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error instanceof Error ? error.message : 'Dieser Link ist ungültig oder abgelaufen.'}
          </p>
        </div>
      </div>
    );
  }

  const status = getStatusLabel(data.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-900">EventHub</span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Geteilte Ansicht
          </span>
        </div>

        {/* Event Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Title Section */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-500 to-indigo-600 p-6 text-white">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{data.title}</h1>
            {data.organizer && (
              <p className="mt-1 text-violet-100">von {data.organizer}</p>
            )}
          </div>

          {/* Details */}
          <div className="divide-y divide-slate-100 p-6">
            {/* Datum & Ort */}
            <div className="grid gap-4 pb-6 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Datum
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(data.start_date)}
                  {data.end_date && data.end_date !== data.start_date && (
                    <> – {formatDate(data.end_date)}</>
                  )}
                </p>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ort
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {data.city || '–'}
                  {data.location && <span className="text-slate-500"> · {data.location}</span>}
                </p>
              </div>
            </div>

            {/* Teilnehmer */}
            {data.colleagues && data.colleagues.length > 0 && (
              <div className="py-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Teilnehmer ({data.colleagues.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.colleagues.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notizen */}
            {data.notes && (
              <div className="py-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Notizen
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{data.notes}</p>
              </div>
            )}

            {/* Event-Link */}
            {data.event_url && (
              <div className="pt-6">
                <a
                  href={data.event_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-violet-500/25 transition-all hover:shadow-lg hover:shadow-violet-500/30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Event-Website öffnen
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Geteilt über EventHub · Immomio
        </p>
      </div>
    </div>
  );
}
