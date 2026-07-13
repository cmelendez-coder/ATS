import { supabase } from '../lib/supabase'

const REQ_SELECT = `
  id, req_number, job_title, priority, stage,
  application_date, target_fill_date, first_resource_sent, salary_cap, variable,
  desired_location, fte_count, duration, visa_us_required,
  tech_reqs, special_request, notes, created_at,
  recruiter, everscale_count, interno_count,
  work_arrangement_id, office_hours_id, status_id,
  client:client_id(id, name),
  status:status_id(id, name),
  work_arrangement:work_arrangement_id(id, name),
  rc_count:requirement_candidate(id)
`

export async function listRequirements({ search = '', statusId = '', clientId = '', excludePending = false } = {}) {
  let q = supabase
    .from('requirement')
    .select(REQ_SELECT)
    .order('created_at', { ascending: false })

  if (search)         q = q.ilike('job_title', `%${search}%`)
  if (statusId)       q = q.eq('status_id', statusId)
  if (clientId)       q = q.eq('client_id', clientId)
  if (excludePending) q = q.neq('status_id', 1)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function listPendingApprovals() {
  const { data, error } = await supabase
    .from('requirement')
    .select(REQ_SELECT)
    .eq('status_id', 1)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function approveRequirement(id) {
  const { error } = await supabase
    .from('requirement')
    .update({ status_id: 2 })
    .eq('id', id)
  if (error) throw error
}

export async function rejectRequirement(id) {
  const { error } = await supabase.from('requirement').delete().eq('id', id)
  if (error) throw error
}

export async function updateRequirementPriority(id, priority) {
  const { error } = await supabase.from('requirement').update({ priority }).eq('id', id)
  if (error) throw error
}

export async function getPendingRequirementAlertCount() {
  const { count, error } = await supabase
    .from('requirement')
    .select('id', { count: 'exact', head: true })
    .eq('status_id', 1)

  if (error) throw error
  return count ?? 0
}

export async function createRequirement(payload) {
  const { data, error } = await supabase
    .from('requirement')
    .insert(payload)
    .select('id, req_number')
    .single()
  if (error) throw error
  return data
}

export async function getRequirement(id) {
  const { data, error } = await supabase
    .from('requirement')
    .select(REQ_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function notifyManagersNewRequirement(requirementId) {
  const { data, error } = await supabase.functions.invoke('notify-new-requirement', {
    body: { requirementId },
  })
  if (error) throw error
  return data
}

export async function updateRequirement(id, payload) {
  const { data, error } = await supabase
    .from('requirement')
    .update(payload)
    .eq('id', id)
    .select('id, req_number')
    .single()
  if (error) throw error
  return data
}

export async function deleteRequirement(id) {
  const { error } = await supabase.from('requirement').delete().eq('id', id)
  if (error) throw error
}

export async function getRequirementCandidates(requirementId) {
  const { data, error } = await supabase
    .from('requirement_candidate')
    .select(`
      id, submitted_at, submittal_status, notes,
      candidate:candidate_id(
        candidate_id, full_name, email,
        role:role_id(name),
        seniority:seniority_id(name),
        candidate_stack(technology:catalog_technology!technology_id(ct_name_tech))
      )
    `)
    .eq('requirement_id', requirementId)
    .order('submitted_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addCandidateToRequirement(requirementId, candidateId, firstStageName = 'Submitted') {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('requirement_candidate')
    .insert({
      requirement_id:   requirementId,
      candidate_id:     candidateId,
      submitted_at:     now,
      submittal_status: firstStageName,
      stage_updated_at: now,
    })
    .select('id')
    .single()
  if (error) throw error

  await supabase.from('requirement_candidate_stage_history').insert({
    rc_id:          data.id,
    candidate_id:   candidateId,
    requirement_id: requirementId,
    stage_name:     firstStageName,
    entered_at:     now,
  })

  return data
}

export async function updateCandidateStage(rcId, stage) {
  const now = new Date().toISOString()

  const { data: rc, error: fetchErr } = await supabase
    .from('requirement_candidate')
    .select('candidate_id, requirement_id')
    .eq('id', rcId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('requirement_candidate')
    .update({ submittal_status: stage, stage_updated_at: now })
    .eq('id', rcId)
  if (error) throw error

  await supabase.from('requirement_candidate_stage_history').insert({
    rc_id:          rcId,
    candidate_id:   rc.candidate_id,
    requirement_id: rc.requirement_id,
    stage_name:     stage,
    entered_at:     now,
  })
}

export async function updateRequirementCandidateNotes(rcId, notes) {
  const { error } = await supabase
    .from('requirement_candidate')
    .update({ notes: notes?.trim() ? notes.trim() : null })
    .eq('id', rcId)
  if (error) throw error
}

export async function removeCandidateFromRequirement(rcId) {
  const { error } = await supabase
    .from('requirement_candidate')
    .delete()
    .eq('id', rcId)
  if (error) throw error
}

export async function updateRequirementStatus(id, statusId) {
  const { error } = await supabase.from('requirement').update({ status_id: statusId }).eq('id', id)
  if (error) throw error
}

export async function updateRequirementSummary(id, patch) {
  const { error } = await supabase.from('requirement').update(patch).eq('id', id)
  if (error) throw error
}

// ─── Standalone req board (completely independent table) ─────────────────────
export async function getReqBoard() {
  const { data, error } = await supabase
    .from('req_board')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function updateReqBoardRow(id, patch) {
  const { error } = await supabase.from('req_board').update(patch).eq('id', id)
  if (error) throw error
}

export async function getWeeklyBoardStats(weekNumber, weekYear) {
  const [
    { count: sent },
    { count: rejected },
    { count: activePositions },
  ] = await Promise.all([
    supabase.from('tracker_entry').select('id', { count: 'exact', head: true })
      .eq('status', 'Sent').eq('week_number', weekNumber).eq('week_year', weekYear),
    supabase.from('tracker_entry').select('id', { count: 'exact', head: true })
      .eq('status', 'Rejected').eq('week_number', weekNumber).eq('week_year', weekYear),
    supabase.from('req_board').select('id', { count: 'exact', head: true })
      .eq('activo', true),
  ])
  return {
    sent:            sent            ?? 0,
    rejected:        rejected        ?? 0,
    activePositions: activePositions ?? 0,
  }
}

export async function getCatalogs() {
  const [
    { data: statuses },
    { data: arrangements },
    { data: clients },
  ] = await Promise.all([
    supabase.from('catalog_requirement_status').select('id, name').order('id'),
    supabase.from('catalog_work_arrangement').select('id, name').order('id'),
    supabase.from('client').select('id, name').order('name'),
  ])
  return {
    statuses:     statuses     ?? [],
    arrangements: arrangements ?? [],
    clients:      clients      ?? [],
  }
}

export async function getClientStages(clientId) {
  if (!clientId) return []
  const { data, error } = await supabase.rpc('get_client_stages', { p_client_id: clientId })
  if (error) throw error
  // RPC returns stage_name/stage_color/stage_position — normalize to match component
  return (data ?? []).map(s => ({
    stage_id: s.stage_id,
    name:     s.stage_name,
    color:    s.stage_color,
    position: s.stage_position,
  }))
}

export async function getNextReqNumber() {
  const { data } = await supabase
    .from('requirement')
    .select('req_number')
    .order('req_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.req_number ?? 0) + 1
}

export async function searchCandidatesForReq(term) {
  if (!term?.trim()) return []
  const t = term.trim()

  const [nameEmailResult, techRows] = await Promise.all([
    supabase
      .from('candidate')
      .select('candidate_id, full_name, email, role:role_id(name), seniority:seniority_id(name)')
      .or(`full_name.ilike.%${t}%,email.ilike.%${t}%`)
      .limit(30),
    supabase
      .from('catalog_technology')
      .select('technology_id')
      .ilike('ct_name_tech', `%${t}%`),
  ])

  if (nameEmailResult.error) throw nameEmailResult.error

  let techCandidates = []
  if (techRows.data?.length) {
    const { data: stackRows } = await supabase
      .from('candidate_stack')
      .select('candidate_id')
      .in('technology_id', techRows.data.map(r => r.technology_id))
    if (stackRows?.length) {
      const ids = [...new Set(stackRows.map(r => r.candidate_id))]
      const { data: byTech } = await supabase
        .from('candidate')
        .select('candidate_id, full_name, email, role:role_id(name), seniority:seniority_id(name)')
        .in('candidate_id', ids)
        .limit(30)
      techCandidates = byTech ?? []
    }
  }

  const seen = new Set()
  return [...(nameEmailResult.data ?? []), ...techCandidates].filter(c => {
    if (seen.has(c.candidate_id)) return false
    seen.add(c.candidate_id)
    return true
  })
}
