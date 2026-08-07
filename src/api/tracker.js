import { supabase } from '../lib/supabase'

// Map email → recruiter key
export const EMAIL_TO_RECRUITER = {
  'cmelendez@everscalegroup.com':  'cesar',
  'egalvan@everscalegroup.com':    'enrique',
  'enrique@everscalegroup.com':    'enrique',
}

export function recruiterFromEmail(email) {
  return EMAIL_TO_RECRUITER[email?.toLowerCase()] ?? null
}

export async function fetchTrackerEntries(weekNumber, weekYear, recruiter) {
  const { data, error } = await supabase
    .from('tracker_entry')
    .select(`
      *,
      requirement:requirement_id(id, req_number, job_title, client:client_id(name))
    `)
    .eq('week_number', weekNumber)
    .eq('week_year', weekYear)
    .eq('recruiter', recruiter)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function searchCandidatesSimple(q) {
  if (!q.trim()) return []
  const { data, error } = await supabase.rpc('search_candidates', { query: q.trim() })
  if (error) throw error
  return data ?? []
}

function sortByClientThenTitle(list) {
  return [...list].sort((a, b) => {
    const ca = String(a.client?.name ?? '').toLowerCase()
    const cb = String(b.client?.name ?? '').toLowerCase()
    if (ca !== cb) return ca.localeCompare(cb)
    return String(a.job_title ?? '').toLowerCase().localeCompare(String(b.job_title ?? '').toLowerCase())
  })
}

export async function fetchActiveRequirements() {
  const { data, error } = await supabase
    .from('requirement')
    .select('id, req_number, job_title, client:client_id(name), status:status_id(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return sortByClientThenTitle(
    (data ?? []).filter(r => !String(r.status?.name ?? '').toLowerCase().startsWith('closed'))
  )
}

export async function fetchClosedRequirements() {
  const { data, error } = await supabase
    .from('requirement')
    .select('id, req_number, job_title, client:client_id(name), status:status_id(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return sortByClientThenTitle(
    (data ?? []).filter(r => String(r.status?.name ?? '').toLowerCase().startsWith('closed'))
  )
}

async function _syncCandidateFromEntry(candidateId, entry) {
  const candPatch = {}
  if (entry.email)        candPatch.email            = entry.email
  if (entry.phone)        candPatch.phone            = entry.phone
  if (entry.linkedin_url) candPatch.linkedin_url     = entry.linkedin_url
  if (entry.cv_url)       candPatch.cv_url           = entry.cv_url
  if (entry.english_score != null) candPatch.english_score = entry.english_score
  if (entry.yoe != null && entry.yoe !== '') candPatch.years_experience = Number(entry.yoe)

  if (entry.target_role?.trim()) {
    const { data: roleRow } = await supabase
      .from('catalog_role')
      .upsert({ name: entry.target_role.trim() }, { onConflict: 'name' })
      .select('role_id').single()
    if (roleRow) candPatch.role_id = roleRow.role_id
  }

  if (entry.state?.trim()) {
    const { data: locRow } = await supabase
      .from('catalog_location')
      .upsert({ name: entry.state.trim() }, { onConflict: 'name' })
      .select('location_id').single()
    if (locRow) candPatch.location_id = locRow.location_id
  }

  if (Object.keys(candPatch).length > 0) {
    candPatch.updated_at = new Date().toISOString()
    await supabase.from('candidate').update(candPatch).eq('candidate_id', candidateId)
  }

  const skillText = [entry.skills, entry.modules].filter(Boolean).join('\n').trim()
  if (skillText) {
    const { data: existNote } = await supabase
      .from('candidate_note').select('note_id')
      .eq('candidate_id', candidateId).eq('note_type', 'skillset').limit(1)
    if (existNote?.length) {
      await supabase.from('candidate_note')
        .update({ note_text: skillText }).eq('note_id', existNote[0].note_id)
    } else {
      await supabase.from('candidate_note')
        .insert({ candidate_id: candidateId, note_type: 'skillset', note_text: skillText })
    }
  }

  const recruiterNote = [entry.notes, entry.screening_note].filter(Boolean).join('\n\n').trim()
  if (recruiterNote) {
    const { data: existRN } = await supabase
      .from('candidate_note').select('note_id')
      .eq('candidate_id', candidateId).eq('note_type', 'recruiter_notes').limit(1)
    if (existRN?.length) {
      await supabase.from('candidate_note')
        .update({ note_text: recruiterNote }).eq('note_id', existRN[0].note_id)
    } else {
      await supabase.from('candidate_note')
        .insert({ candidate_id: candidateId, note_type: 'recruiter_notes', note_text: recruiterNote })
    }
  }

  const costText = [entry.salary, entry.amount_type].filter(Boolean).join(' ').trim()
  if (costText) {
    const { data: existComp } = await supabase
      .from('candidate_compensation').select('comp_id')
      .eq('candidate_id', candidateId).order('recorded_at', { ascending: false }).limit(1)
    if (existComp?.length) {
      await supabase.from('candidate_compensation')
        .update({ cost_text: costText }).eq('comp_id', existComp[0].comp_id)
    } else {
      await supabase.from('candidate_compensation')
        .insert({ candidate_id: candidateId, cost_text: costText })
    }
  }

  if (entry.technologies?.trim()) {
    const techs = entry.technologies.split(',').map(t => t.trim()).filter(Boolean)
    for (const techName of techs) {
      const { data: techRow } = await supabase
        .from('catalog_technology')
        .upsert({ ct_name_tech: techName }, { onConflict: 'ct_name_tech' })
        .select('technology_id').single()
      if (techRow) {
        await supabase.from('candidate_stack')
          .upsert(
            { candidate_id: candidateId, technology_id: techRow.technology_id },
            { onConflict: 'candidate_id,technology_id', ignoreDuplicates: true }
          )
      }
    }
  }
}

export async function backfillSentCandidates() {
  const { data: entries, error } = await supabase
    .from('tracker_entry')
    .select('*')
    .eq('status', 'Sent')
    .eq('week_year', 2026)
    .gte('week_number', 24)
    .not('candidate_id', 'is', null)
  if (error) throw error

  for (const entry of entries ?? []) {
    try {
      await _syncCandidateFromEntry(entry.candidate_id, entry)
    } catch {
      // skip individual failures, continue with rest
    }
  }
}

export async function saveTrackerEntry(entry) {
  // 1. Create candidate in Talent Directory if new
  let candidateId = entry.candidate_id ?? null

  // Only create a candidate record when status is Sent — they earn their place in the Talent Directory
  if (!candidateId && entry.candidate_name?.trim() && entry.status === 'Sent') {
    const { data: statusRow } = await supabase
      .from('catalog_status').select('status_id').eq('name', 'Available').single()

    const code = `CAND-${Date.now().toString(36).toUpperCase()}`
    const { data: newCand, error: candError } = await supabase
      .from('candidate')
      .insert({
        candidate_code:   code,
        full_name:        entry.candidate_name.trim(),
        cv_url:           entry.cv_url || null,
        linkedin_url:     entry.linkedin_url || null,
        email:            entry.email || null,
        phone:            entry.phone || null,
        english_score:    entry.english_score ?? null,
        years_experience: entry.yoe != null && entry.yoe !== '' ? Number(entry.yoe) : null,
        status_id:        statusRow?.status_id ?? null,
      })
      .select('candidate_id')
      .single()
    if (candError) throw candError
    candidateId = newCand.candidate_id
  }

  // 2. Save tracker entry
  const alreadySynced = entry.synced_to_req ?? false
  const willSync = entry.status === 'Sent' && candidateId && entry.requirement_id && !alreadySynced

  const payload = {
    week_number:    entry.week_number,
    week_year:      entry.week_year,
    candidate_id:   candidateId,
    candidate_name: entry.candidate_name,
    cv_url:         entry.cv_url || null,
    linkedin_url:   entry.linkedin_url || null,
    state:          entry.state || null,
    screening_note:     entry.screening_note     || null,
    screening_datetime: entry.screening_datetime || null,
    email:          entry.email || null,
    phone:          entry.phone || null,
    yoe:            entry.yoe != null && entry.yoe !== '' ? Number(entry.yoe) : null,
    target_role:    entry.target_role || null,
    technologies:   entry.technologies || null,
    skills:         entry.skills || null,
    modules:        entry.modules || null,
    requirement_id: entry.requirement_id || null,
    status:         entry.status,
    english_score:  entry.english_score ?? null,
    salary:         entry.salary || null,
    amount_type:    entry.amount_type || null,
    ote:            entry.ote != null && entry.ote !== '' ? Number(entry.ote) : null,
    notes:          entry.notes || null,
    synced_to_req:  alreadySynced || willSync,
    recruiter:      entry.recruiter,
    updated_at:     new Date().toISOString(),
  }

  let entryId = entry.id ?? null
  if (entryId) {
    const { error } = await supabase.from('tracker_entry').update(payload).eq('id', entryId)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('tracker_entry').insert(payload).select('id').single()
    if (error) throw error
    entryId = data.id
  }

  // 3. Keep candidate table in sync with tracker fields
  if (candidateId) {
    await _syncCandidateFromEntry(candidateId, entry)
  }

  // 4. Sync to Requirements if status = Sent (only once)
  if (willSync) {
    const now = new Date().toISOString()

    const { data: existing } = await supabase
      .from('requirement_candidate')
      .select('id')
      .eq('requirement_id', entry.requirement_id)
      .eq('candidate_id', candidateId)
      .maybeSingle()

    if (!existing) {
      const { data: rc, error: rcError } = await supabase
        .from('requirement_candidate')
        .insert({
          requirement_id:   entry.requirement_id,
          candidate_id:     candidateId,
          submitted_at:     now,
          submittal_status: 'Submitted to Client',
          stage_updated_at: now,
        })
        .select('id')
        .single()
      if (rcError) throw rcError

      await supabase.from('requirement_candidate_stage_history').insert({
        rc_id:          rc.id,
        candidate_id:   candidateId,
        requirement_id: entry.requirement_id,
        stage_name:     'Submitted to Client',
        entered_at:     now,
      })
    }
  }

  return { entryId, candidateId }
}

export async function deleteTrackerEntry(id) {
  const { error } = await supabase.from('tracker_entry').delete().eq('id', id)
  if (error) throw error
}

export async function createScreeningEvent({ candidateName, requirementTitle, screeningDatetime, screeningNote }) {
  const { data, error } = await supabase.functions.invoke('create-screening-event', {
    body: { candidateName, requirementTitle, screeningDatetime, screeningNote },
  })
  if (error) throw new Error(error.message ?? 'Error al crear evento en Google Calendar')
  return data
}

export async function extractCVInfo(cvUrl) {
  const { data, error } = await supabase.functions.invoke('auto-fill-cv', {
    body: { cvUrl },
  })
  if (error) return { linkedin_url: null, state: null, email: null, phone: null }
  return data ?? { linkedin_url: null, state: null, email: null, phone: null }
}

export async function uploadCVFile(file, candidateName) {
  const ext  = file.name.split('.').pop()
  const safe = (candidateName || 'candidato').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const path = `${safe}_${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('candidate-cvs')
    .upload(path, file, { upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('candidate-cvs')
    .getPublicUrl(data.path)
  return publicUrl
}
