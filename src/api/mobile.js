import { supabase } from '../lib/supabase'

// Consultas de solo lectura para las vistas móviles (PWA).

const escapeLike = s => String(s).replace(/[\\%_]/g, m => `\\${m}`)

/**
 * Historial de un candidato: sus envíos en el tracker (todas las semanas y reclutadores)
 * y sus movimientos por etapa en los pipelines de requerimientos.
 */
export async function fetchCandidateHistory({ candidateId, name }) {
  let trackerQ = supabase
    .from('tracker_entry')
    .select('id, week_number, week_year, status, recruiter, candidate_name, notes, requirement:requirement_id(id, job_title, client:client_id(name))')
    .order('week_year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(60)
  trackerQ = candidateId ? trackerQ.eq('candidate_id', candidateId) : trackerQ.ilike('candidate_name', escapeLike(name ?? ''))

  const stageQ = candidateId
    ? supabase
        .from('requirement_candidate_stage_history')
        .select('id, requirement_id, stage_name, entered_at')
        .eq('candidate_id', candidateId)
        .order('entered_at', { ascending: true })
        .limit(300)
    : Promise.resolve({ data: [], error: null })

  const [{ data: entries, error: e1 }, { data: stages, error: e2 }] = await Promise.all([trackerQ, stageQ])
  if (e1) throw e1
  if (e2) throw e2

  const reqIds = [...new Set((stages ?? []).map(s => s.requirement_id).filter(Boolean))]
  let reqMap = {}
  if (reqIds.length > 0) {
    const { data: reqs, error: e3 } = await supabase
      .from('requirement')
      .select('id, job_title, client:client_id(name)')
      .in('id', reqIds)
    if (e3) throw e3
    reqMap = Object.fromEntries((reqs ?? []).map(r => [r.id, r]))
  }

  // Movimientos agrupados por requerimiento
  const byReq = {}
  for (const s of stages ?? []) {
    ;(byReq[s.requirement_id] ??= []).push(s)
  }
  const movements = Object.entries(byReq).map(([reqId, rows]) => ({
    requirementId: Number(reqId),
    title:  reqMap[reqId]?.job_title ?? 'Requerimiento',
    client: reqMap[reqId]?.client?.name ?? null,
    steps:  rows,
    lastAt: rows[rows.length - 1]?.entered_at,
  })).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))

  return { entries: entries ?? [], movements }
}
