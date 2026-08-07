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
  ] = await Promise.all([
    supabase.from('client').select('*', { count: 'exact', head: true }),
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase.from('requirement').select(`
      id, req_number, job_title, priority, target_fill_date, created_at,
      status:status_id(name),
      client:client_id(name)
    `).order('created_at', { ascending: false }),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .eq('status', 'Sent').eq('week_number', isoWeek).eq('week_year', isoYear),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .in('status', ['Rejected', 'HSE', 'Backed Out']).eq('week_number', isoWeek).eq('week_year', isoYear),
    supabase.from('tracker_entry').select('*', { count: 'exact', head: true })
      .eq('status', 'Sent').gte('created_at', monthStart),
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
    .map(([name, count]) => ({ name, count }))

  const weeklySent     = weeklySentCount     ?? 0
  const weeklyRejected = weeklyRejectedCount ?? 0

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
    recentRequirements:   reqs.slice(0, 5),
  }
}
