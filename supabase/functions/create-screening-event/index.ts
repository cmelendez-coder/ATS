import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { candidateName, requirementTitle, screeningDatetime, screeningNote } = await req.json()

    if (!screeningDatetime) throw new Error('screeningDatetime requerido')

    const clientId     = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')

    if (!clientId || !clientSecret || !refreshToken)
      throw new Error('Faltan secrets de Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)')

    // 1. Obtener access_token usando el refresh_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    })

    if (!tokenRes.ok) throw new Error(`Token error: ${await tokenRes.text()}`)
    const { access_token } = await tokenRes.json()

    // 2. Construir el evento (1 hora de duración, reminder 30 min antes)
    const start = new Date(screeningDatetime)
    const end   = new Date(start.getTime() + 60 * 60 * 1000)

    const summary     = `Screening: ${candidateName}${requirementTitle ? ` · ${requirementTitle}` : ''}`
    const description = screeningNote || ''

    const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: start.toISOString(), timeZone: 'America/Mexico_City' },
        end:   { dateTime: end.toISOString(),   timeZone: 'America/Mexico_City' },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }],
        },
      }),
    })

    if (!eventRes.ok) throw new Error(`Calendar API error: ${await eventRes.text()}`)

    const event = await eventRes.json()

    return new Response(JSON.stringify({ eventId: event.id, htmlLink: event.htmlLink }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
