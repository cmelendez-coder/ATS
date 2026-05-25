import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
const fromEmail = Deno.env.get('FROM_EMAIL') ?? ''
const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function sendEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Resend error: ${message}`)
  }

  return response.json()
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
    }
    if (!resendApiKey || !fromEmail) {
      throw new Error('Faltan RESEND_API_KEY o FROM_EMAIL.')
    }

    const { requirementId } = await req.json()
    if (!requirementId) return jsonResponse({ error: 'requirementId es requerido.' }, 400)

    const { data: requirement, error: requirementError } = await supabase
      .from('requirement')
      .select(`
        id,
        req_number,
        job_title,
        application_date,
        target_fill_date,
        desired_location,
        client:client_id(name)
      `)
      .eq('id', requirementId)
      .single()

    if (requirementError) throw requirementError
    if (!requirement) return jsonResponse({ error: 'Requerimiento no encontrado.' }, 404)

    const { data: managers, error: managersError } = await supabase
      .from('Usuario')
      .select('auth_id, ROLE_CLP, NAME_CLP')
      .eq('ROLE_CLP', 2)

    if (managersError) throw managersError

    const authIds = (managers ?? [])
      .map(manager => manager.auth_id)
      .filter((authId): authId is string => Boolean(authId))

    const recipientSet = new Set<string>()

    for (const authId of authIds) {
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(authId)
      if (authUserError) throw authUserError

      const email = authUser.user?.email?.trim().toLowerCase()
      if (email) recipientSet.add(email)
    }

    const uniqueRecipients = [...recipientSet]
    if (!uniqueRecipients.length) {
      return jsonResponse({ ok: true, sent: false, message: 'No hay correos de gerentes configurados.' })
    }

    const reqLabel = `REQ-${new Date().getFullYear()}-${String(requirement.req_number).padStart(3, '0')}`
    const clientName = requirement.client?.name ?? 'Cliente no disponible'
    const requirementUrl = appBaseUrl ? `${appBaseUrl.replace(/\/$/, '')}/requirements` : ''

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin-bottom: 12px;">Nuevo requerimiento registrado</h2>
        <p>Se agrego un nuevo requerimiento en el sistema.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Folio:</strong></td><td>${escapeHtml(reqLabel)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Cliente:</strong></td><td>${escapeHtml(clientName)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Posicion:</strong></td><td>${escapeHtml(requirement.job_title)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Fecha de aplicacion:</strong></td><td>${escapeHtml(requirement.application_date)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Fecha objetivo:</strong></td><td>${escapeHtml(requirement.target_fill_date)}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0;"><strong>Ubicacion:</strong></td><td>${escapeHtml(requirement.desired_location || 'No especificada')}</td></tr>
        </table>
        ${requirementUrl ? `<p><a href="${escapeHtml(requirementUrl)}">Ver requerimientos en la aplicacion</a></p>` : ''}
      </div>
    `

    const emailResult = await sendEmail({
      to: uniqueRecipients,
      subject: `Nuevo requerimiento ${reqLabel} - ${requirement.job_title}`,
      html,
    })

    return jsonResponse({
      ok: true,
      sent: true,
      recipients: uniqueRecipients,
      provider: 'resend',
      emailResult,
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error inesperado',
      },
      500,
    )
  }
})
