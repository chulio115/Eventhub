// Supabase Edge Function: Event-Einladung per E-Mail senden
// Benötigt: RESEND_API_KEY als Secret in Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface InviteRequest {
  to: string[];
  event: {
    id: string;
    title: string;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    city: string | null;
    organizer: string | null;
    event_url: string | null;
  };
  appUrl: string;
  senderName: string;
}

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY nicht konfiguriert');
    }

    const { to, event, appUrl, senderName }: InviteRequest = await req.json();

    if (!to || to.length === 0) {
      throw new Error('Keine Empfänger angegeben');
    }

    const eventHubLink = `${appUrl}/events?id=${event.id}`;
    
    const dateStr = event.start_date 
      ? new Date(event.start_date).toLocaleDateString('de-DE', { 
          weekday: 'long', 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        })
      : 'Datum folgt';
    
    const locationStr = [event.location, event.city].filter(Boolean).join(', ') || 'Ort folgt';

    // ICS-Datei generieren
    const formatICSDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    };

    const startDate = formatICSDate(event.start_date);
    const endDate = formatICSDate(event.end_date) || startDate;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventHub//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${event.id}@eventhub`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${event.title}`,
      locationStr !== 'Ort folgt' ? `LOCATION:${locationStr}` : '',
      `DESCRIPTION:Veranstalter: ${event.organizer || 'N/A'}\\nIm EventHub öffnen: ${eventHubLink}`,
      `URL:${eventHubLink}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const icsBase64 = btoa(icsContent);

    // HTML E-Mail Template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">📅 Event-Einladung</h1>
    </div>
    <div style="padding: 24px;">
      <p style="color: #64748b; margin: 0 0 16px;">Hallo,</p>
      <p style="color: #64748b; margin: 0 0 24px;">${senderName} hat dich zu folgendem Event eingeladen:</p>
      
      <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0 0 12px; font-size: 18px;">${event.title}</h2>
        <div style="color: #64748b; font-size: 14px;">
          <p style="margin: 8px 0;">📆 <strong>${dateStr}</strong></p>
          <p style="margin: 8px 0;">📍 ${locationStr}</p>
          <p style="margin: 8px 0;">🏢 Veranstalter: ${event.organizer || 'N/A'}</p>
          ${event.event_url ? `<p style="margin: 8px 0;">🔗 <a href="${event.event_url}" style="color: #8b5cf6;">${event.event_url}</a></p>` : ''}
        </div>
      </div>
      
      <a href="${eventHubLink}" style="display: block; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-bottom: 16px;">
        Im EventHub öffnen
      </a>
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Die Kalender-Einladung (.ics) ist als Anhang beigefügt.
      </p>
    </div>
  </div>
</body>
</html>`;

    // E-Mail über Resend senden
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EventHub <noreply@resend.dev>', // Oder eigene verifizierte Domain
        to: to,
        subject: `📅 Einladung: ${event.title}`,
        html: htmlContent,
        attachments: [
          {
            filename: `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
            content: icsBase64,
            type: 'text/calendar',
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'E-Mail konnte nicht gesendet werden');
    }

    return new Response(
      JSON.stringify({ success: true, message: `E-Mail an ${to.length} Empfänger gesendet` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
