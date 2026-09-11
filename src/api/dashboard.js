import { supabase } from '../lib/supabase'

export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  // ISO week number + year
  const now = new Date()
  const dow = now.getDay() || 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dow + 1)
  weekStart.setHours(0, 0, 0, 0)
  const tmp = new Date(weekStart)
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7)
  const jan4 = new Date(tmp.getFullYear(), 0, 4)
  const isoWeek = 1 + Math.round(((tmp - jan4) / 86400000 - 3 + (jan4.getDay() + 6) % 7) / 7)
  const isoYear = tmp.getFullYear()

  // First day of current calendar month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalClients },
    { count: totalCandidates },
    { data: allRequirements },
    { count: weeklySentCount },
    { count: weeklyRejectedCount },
    { count: monthlySentCount },
    { data: pipelineRows },
    { data: stageRows },
  ] = await Promise.all([
    supabase.from('client').select('*', { count: 'exact', head: true }),
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase.from('requirement').select(`
      id, req_number, job_title, priority, target_fill_date, created_at,
      status:status_id(name),
      client:client_id(id, name)
    `).order('created_at', { ascending: false }),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .eq('status', 'Sent').eq('week_number', isoWeek).eq('week_year', isoYear),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .in('status', ['Rejected', 'HSE', 'Backed Out']).eq('week_number', isoWeek).eq('week_year', isoYear),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .eq('status', 'Sent').gte('created_at', monthStart),
    // Active pipeline submittals — every requirement_candidate row not rejected, on an Open,
    // non-paused requirement (excludes On Hold / Closed positions)
    supabase.from('requirement_candidate')
      .select(`
        id, submittal_status,
        candidate:candidate_id(full_name),
        requirement:requirement_id!inner(job_title, client_id, status_id, priority, client:client_id(name))
      `)
      .neq('submittal_status', 'Rejected')
      .eq('requirement.status_id', 2)
      .neq('requirement.priority', 3),
    // Per-client stage definitions (to find each client's last two funnel stages)
    supabase.from('catalog_pipeline_stage')
      .select('client_id, name, position')
      .not('client_id', 'is', null)
      .neq('name', 'Rejected')
      .order('position', { ascending: true }),
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
    const key = r.client?.id ?? 'none'
    if (!clientMap[key]) clientMap[key] = { id: r.client?.id ?? null, name: r.client?.name ?? 'Sin cliente', count: 0 }
    clientMap[key].count += 1
  }
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.count - a.count)

  const weeklySent     = weeklySentCount     ?? 0
  const weeklyRejected = weeklyRejectedCount ?? 0

  // Last two funnel stages per client (by position), excluding "Rejected"
  const stagesByClient = {}
  for (const s of stageRows ?? []) {
    if (!stagesByClient[s.client_id]) stagesByClient[s.client_id] = []
    stagesByClient[s.client_id].push(s.name)
  }
  const lastTwoByClient = {}
  for (const [clientId, names] of Object.entries(stagesByClient)) {
    lastTwoByClient[clientId] = new Set(names.slice(-2))
  }

  const pipelineList = (pipelineRows ?? [])
    .map(r => ({
      id:       r.id,
      candidate: r.candidate?.full_name ?? '—',
      client:    r.requirement?.client?.name ?? '—',
      clientId:  r.requirement?.client_id ?? null,
      position:  r.requirement?.job_title ?? '—',
      stage:     r.submittal_status ?? '—',
    }))
    .sort((a, b) => a.client.localeCompare(b.client) || a.candidate.localeCompare(b.candidate))

  const finalStageList = pipelineList.filter(row => lastTwoByClient[row.clientId]?.has(row.stage))

  const activePipelineCount = pipelineList.length
  const finalStageCount     = finalStageList.length

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
    weeklySent,
    weeklyRejected,
    monthlySent: monthlySentCount ?? 0,
    activePipelineCount,
    finalStageCount,
    pipelineList,
    finalStageList,
  }
}

export async function getMonthlySentCount(year, month) {
  const monthStart = new Date(year, month, 1).toISOString()
  const monthEnd   = new Date(year, month + 1, 1).toISOString()
  const { count } = await supabase
    .from('tracker_entry')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Sent')
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)
  return count ?? 0
}
