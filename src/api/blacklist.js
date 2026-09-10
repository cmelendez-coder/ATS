import { supabase } from '../lib/supabase'

// status_id of the "Lista Negra" row in catalog_status
export const BLACKLIST_STATUS_ID = 6

// All candidates currently on the blacklist (status = "Lista Negra"),
// with the optional reason text from candidate_blacklist.
export async function fetchBlacklist() {
  const { data, error } = await supabase
    .from('candidate')
    .select(`
      candidate_id, candidate_code, full_name, years_experience, updated_at,
      role:catalog_role!role_id(name),
      seniority:catalog_seniority!seniority_id(name)
    `)
    .eq('status_id', BLACKLIST_STATUS_ID)
    .order('full_name', { ascending: true })
  if (error) throw error

  const ids = (data ?? []).map(c => c.candidate_id)
  let reasons = {}
  if (ids.length) {
    const { data: rows, error: rErr } = await supabase
      .from('candidate_blacklist')
      .select('candidate_id, reason, created_at')
      .in('candidate_id', ids)
    if (rErr) throw rErr
    for (const r of rows ?? []) reasons[r.candidate_id] = r
  }

  return (data ?? []).map(c => ({
    ...c,
    reason:       reasons[c.candidate_id]?.reason ?? '',
    blacklisted_at: reasons[c.candidate_id]?.created_at ?? null,
  }))
}

// Create/replace just the reason text for a candidate already on the blacklist.
export async function saveBlacklistReason(candidateId, reason) {
  const { error } = await supabase
    .from('candidate_blacklist')
    .upsert(
      { candidate_id: candidateId, reason: reason || null, updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id' }
    )
  if (error) throw error
}

// Put a candidate on the blacklist: set status to "Lista Negra" and store the reason.
export async function addToBlacklist(candidateId, reason) {
  const { error: sErr } = await supabase
    .from('candidate')
    .update({ status_id: BLACKLIST_STATUS_ID, updated_at: new Date().toISOString() })
    .eq('candidate_id', candidateId)
  if (sErr) throw sErr
  await saveBlacklistReason(candidateId, reason)
}
