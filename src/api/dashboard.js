import { supabase } from '../lib/supabase'

export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  // ISO week start (Monday 00:00 local → UTC)
  const now = new Date()
  const dow = now.getDay() || 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dow + 1)
  weekStart.setHours(0, 0, 0, 0)

  const [
    { count: totalClients },
    { count: totalCandidates },
    { data: allRequirements },
    { data: submittals },
    { count: newCandidatesThisWeek },
  ] = await Promise.all([
    supabase.from('client').select('*', { count: 'exact', head: true }),
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase.from('requirement').select(`
      id, req_number, job_title, priority, target_fill_date, created_at,
      status:status_id(name),
      client:client_id(name)
    `).order('created_at', { ascending: false }),
    supabase.from('requirement_candidate').select('submittal_status'),
    supabase
      .from('candidate')
      .select('candidate_id', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString()),
  ])

  const reqs = allRequirements ?? []

  const openReqs    = reqs.filter(r => r.status?.name === 'Open')
  const closedReqs  = reqs.filter(r => r.status?.name?.startsWith('Closed'))
  const overdueCount = openReqs.filter(r => r.target_fill_date && r.target_fill_date < today).length

  // Priority breakdown across all reqs
  const byPriority = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (const r of reqs) {
    const p = r.priority ?? 2
    byPriority[p] = (byPriority[p] || 0) + 1
  }

  // Status breakdown
  const statusMap = {}
  for (const r of reqs) {
    const s = r.status?.name ?? 'Other'
    statusMap[s] = (statusMap[s] || 0) + 1
  }

  // Open reqs per client (top 6)
  const clientMap = {}
  for (const r of openReqs) {
    const name = r.client?.name ?? 'Sin cliente'
    clientMap[name] = (clientMap[name] || 0) + 1
  }
  const topClients = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  // Pipeline counts from requirement_candidate
  const pipelineMap = {}
  for (const row of submittals ?? []) {
    const s = row.submittal_status
    if (s) pipelineMap[s] = (pipelineMap[s] || 0) + 1
  }

  return {
    totalRequirements:    reqs.length,
    totalClients:         totalClients ?? 0,
    totalCandidates:      totalCandidates ?? 0,
    openCount:            openReqs.length,
    closedCount:          closedReqs.length,
    overdueCount,
    reqStatusMap:         statusMap,
    reqByPriority:        byPriority,
    topClients,
    pipelineMap,
    newCandidatesThisWeek: newCandidatesThisWeek ?? 0,
    recentRequirements:   reqs.slice(0, 5),
  }
}
