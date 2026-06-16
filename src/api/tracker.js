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

export async function fetchActiveRequirements() {
  const { data, error } = await supabase
    .from('requirement')
    .select('id, req_number, job_title, client:client_id(name), status:status_id(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? [])
    .filter(r => !String(r.status?.name ?? '').toLowerCase().startsWith('closed'))
    .sort((a, b) => {
      const ca = String(a.client?.name ?? '').toLowerCase()
      const cb = String(b.client?.name ?? '').toLowerCase()
      if (ca !== cb) return ca.localeCompare(cb)
      return String(a.job_title ?? '').toLowerCase().localeCompare(String(b.job_title ?? '').toLowerCase())
    })
}

export async function saveTrackerEntry(entry) {
  // 1. Create candidate in Talent Directory if new
  let candidateId = entry.candidate_id ?? null

  if (!candidateId && entry.candidate_name?.trim()) {
    const { data: statusRow } = await supabase
      .from('catalog_status').select('status_id').eq('name', 'Available').single()

    const code = `CAND-${Date.now().toString(36).toUpperCase()}`
    const { data: newCand, error: candError } = await supabase
      .from('candidate')
      .insert({
        candidate_code: code,
        full_name: entry.candidate_name.trim(),
        cv_url: entry.cv_url || null,
        status_id: statusRow?.status_id ?? null,
        english_score: entry.english_score ?? null,
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
    screening_note: entry.screening_note || null,
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

  // 3. Sync to Requirements if status = Sent (only once)
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

export async function extractCVInfo(cvUrl) {
  const { data, error } = await supabase.functions.invoke('auto-fill-cv', {
    body: { cvUrl },
  })
  if (error) return { linkedin_url: null, state: null }
  return data ?? { linkedin_url: null, state: null }
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
