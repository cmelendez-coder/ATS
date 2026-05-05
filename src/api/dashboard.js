import { supabase } from '../lib/supabase'

export async function getDashboardStats() {
  const [
    { count: totalReqs },
    { count: totalClients },
    { count: totalCandidates },
    { data: candidatesByStatus },
    { data: recentReqs },
    { data: reqsByStatus },
  ] = await Promise.all([
    supabase.from('requirement').select('*', { count: 'exact', head: true }),
    supabase.from('client').select('*', { count: 'exact', head: true }),
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase
      .from('catalog_status')
      .select('name, candidate(count)')
      .order('name'),
    supabase
      .from('requirement')
      .select(`
        id, req_number, job_title, priority, target_fill_date, created_at,
        status:status_id(name),
        client:client_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('catalog_requirement_status')
      .select('name, requirement(count)')
      .order('name'),
  ])

  // Build status → count map for candidates
  const candidateStatusMap = {}
  for (const row of candidatesByStatus ?? []) {
    candidateStatusMap[row.name] = row.candidate?.[0]?.count ?? 0
  }

  // Build status → count map for requirements
  const reqStatusMap = {}
  for (const row of reqsByStatus ?? []) {
    reqStatusMap[row.name] = row.requirement?.[0]?.count ?? 0
  }

  return {
    totalRequirements: totalReqs ?? 0,
    totalClients: totalClients ?? 0,
    totalCandidates: totalCandidates ?? 0,
    candidateStatusMap,
    reqStatusMap,
    recentRequirements: recentReqs ?? [],
  }
}
