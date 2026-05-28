import { supabase } from '../lib/supabase'

const CLIENT_REPORT_SELECT = `
  id,
  name,
  catalog_pipeline_stage(stage_id, name, color, position, client_id),
  requirement(
    id,
    stage,
    application_date,
    status:status_id(name),
    requirement_candidate(id, submittal_status)
  )
`

const REQUIREMENT_REPORT_SELECT = `
  id,
  req_number,
  job_title,
  application_date,
  target_fill_date,
  stage,
  created_at,
  client:client_id(id, name),
  status:status_id(name),
  requirement_candidate(id, submittal_status, submitted_at)
`

function isRequirementOpen(requirement) {
  const statusName = String(requirement.status?.name ?? '').toLowerCase()
  const stageName = String(requirement.stage ?? '').toLowerCase()
  return !statusName.startsWith('closed') && stageName !== 'closed'
}

export async function listClientsForReports() {
  const { data, error } = await supabase.from('client').select('id, name').order('name')
  if (error) throw error
  return data ?? []
}

export async function listAllPipelineStages() {
  const { data, error } = await supabase
    .from('catalog_pipeline_stage')
    .select('stage_id, name, color, position')
    .order('position')
  if (error) throw error
  const seen = new Set()
  return (data ?? []).filter(s => {
    if (seen.has(s.name)) return false
    seen.add(s.name)
    return true
  })
}

export async function getReportsSummary({ clientId = null, dateFrom = null, dateTo = null, stage = null } = {}) {
  let clientQuery = supabase.from('client').select(CLIENT_REPORT_SELECT).order('name')
  if (clientId) clientQuery = clientQuery.eq('id', Number(clientId))

  const [
    { count: totalCandidates, error: candidatesError },
    { count: totalRequirements, error: requirementsError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase.from('requirement').select('*', { count: 'exact', head: true }),
    clientQuery,
  ])

  if (candidatesError) throw candidatesError
  if (requirementsError) throw requirementsError
  if (clientsError) throw clientsError

  const dateEnd = dateTo ? dateTo + 'T23:59:59' : null

  const clientReports = (clients ?? []).map(client => {
    const stages = [...(client.catalog_pipeline_stage ?? [])].sort((a, b) => {
      const posDiff = (a.position ?? 0) - (b.position ?? 0)
      return posDiff !== 0 ? posDiff : (a.stage_id ?? 0) - (b.stage_id ?? 0)
    })
    const openRequirements = (client.requirement ?? []).filter(req => {
      if (!isRequirementOpen(req)) return false
      if (dateFrom && req.application_date && req.application_date < dateFrom) return false
      if (dateEnd && req.application_date && req.application_date > dateEnd) return false
      return true
    })
    const stageCounts = Object.fromEntries(stages.map(s => [s.name, 0]))

    let candidateCount = 0
    for (const requirement of openRequirements) {
      for (const candidate of requirement.requirement_candidate ?? []) {
        if (stage && candidate.submittal_status !== stage) continue
        candidateCount += 1
        const stageName = candidate.submittal_status ?? 'Sin fase'
        stageCounts[stageName] = (stageCounts[stageName] ?? 0) + 1
      }
    }

    const stageReport = Object.entries(stageCounts).map(([name, count]) => {
      const stage = stages.find(item => item.name === name)
      return {
        name,
        count,
        color: stage?.color ?? '#64748B',
        position: stage?.position ?? Number.MAX_SAFE_INTEGER,
      }
    }).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

    return {
      clientId: client.id,
      clientName: client.name,
      requirementCount: openRequirements.length,
      candidateCount,
      stages: stageReport,
    }
  }).filter(client => client.requirementCount > 0)

  const totalsByStage = {}
  for (const client of clientReports) {
    for (const stage of client.stages) {
      if (!totalsByStage[stage.name]) {
        totalsByStage[stage.name] = { name: stage.name, count: 0, color: stage.color }
      }
      totalsByStage[stage.name].count += stage.count
    }
  }

  const stageTotals = Object.values(totalsByStage)
    .filter(stage => stage.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const primaryStageNames = stageTotals.slice(0, 5).map(stage => stage.name)
  const filteredClients = clientReports.map(client => ({
    ...client,
    stages: client.stages.filter(stage => primaryStageNames.includes(stage.name) && stage.count > 0),
  }))

  return {
    totalCandidates: totalCandidates ?? 0,
    totalRequirements: filteredClients.reduce((sum, client) => sum + client.requirementCount, 0),
    totalClients: filteredClients.length,
    totalClientCandidates: filteredClients.reduce((sum, client) => sum + client.candidateCount, 0),
    stageTotals,
    clients: filteredClients,
  }
}

export async function listOpenRequirementsForReports({ clientId = null, dateFrom = null, dateTo = null } = {}) {
  let q = supabase
    .from('requirement')
    .select(REQUIREMENT_REPORT_SELECT)
    .order('created_at', { ascending: false })
  if (clientId)  q = q.eq('client_id', Number(clientId))
  if (dateFrom)  q = q.gte('application_date', dateFrom)
  if (dateTo)    q = q.lte('application_date', dateTo + 'T23:59:59')

  const { data, error } = await q
  if (error) throw error

  return (data ?? [])
    .filter(isRequirementOpen)
    .map(req => ({
      id:         req.id,
      reqNumber:  req.req_number,
      jobTitle:   req.job_title,
      clientId:   req.client?.id ?? null,
      clientName: req.client?.name ?? 'Sin cliente',
      statusName: req.status?.name ?? '',
    }))
}

export async function getClientReportPdfData(clientId, { dateFrom = null, dateTo = null, stage = null } = {}) {
  const { data, error } = await supabase
    .from('client')
    .select(CLIENT_REPORT_SELECT)
    .eq('id', clientId)
    .single()

  if (error) throw error

  const stages = [...(data.catalog_pipeline_stage ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const dateEnd = dateTo ? dateTo + 'T23:59:59' : null
  const openRequirements = (data.requirement ?? []).filter(req => {
    if (!isRequirementOpen(req)) return false
    if (dateFrom && req.application_date && req.application_date < dateFrom) return false
    if (dateEnd && req.application_date && req.application_date > dateEnd) return false
    return true
  })
  const stageCounts = Object.fromEntries(stages.map(s => [s.name, 0]))

  const requirements = openRequirements.map(requirement => {
    const candidates = (requirement.requirement_candidate ?? [])
      .filter(rc => !stage || rc.submittal_status === stage)
    const candidateCount = candidates.length
    for (const rc of candidates) {
      const stageName = rc.submittal_status ?? 'Sin fase'
      stageCounts[stageName] = (stageCounts[stageName] ?? 0) + 1
    }
    return {
      id: requirement.id,
      reqNumber: requirement.req_number,
      jobTitle: requirement.job_title,
      statusName: requirement.status?.name ?? 'Sin status',
      applicationDate: requirement.application_date,
      targetFillDate: requirement.target_fill_date,
      candidateCount,
    }
  })

  return {
    clientId: data.id,
    clientName: data.name,
    requirementCount: requirements.length,
    candidateCount: requirements.reduce((sum, requirement) => sum + requirement.candidateCount, 0),
    stages: Object.entries(stageCounts)
      .map(([name, count]) => {
        const stage = stages.find(item => item.name === name)
        return {
          name,
          count,
          color: stage?.color ?? '#64748B',
          position: stage?.position ?? Number.MAX_SAFE_INTEGER,
        }
      })
      .filter(stage => stage.count > 0)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    requirements,
  }
}

export async function getCandidateSummary() {
  const { data, error } = await supabase
    .from('requirement_candidate')
    .select('submittal_status, requirement:requirement_id(status:status_id(name))')
  if (error) throw error

  const active = (data ?? []).filter(rc => {
    const reqStatus = String(rc.requirement?.status?.name ?? '').toLowerCase()
    return !reqStatus.startsWith('closed')
  })

  const phaseCounts = {}
  for (const rc of active) {
    const name = rc.submittal_status ?? 'Sin fase'
    phaseCounts[name] = (phaseCounts[name] ?? 0) + 1
  }

  const total = active.length
  return {
    total,
    byStatus: Object.entries(phaseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export async function getRequirementReportPdfData(requirementId, { stage = null } = {}) {
  const { data, error } = await supabase
    .from('requirement')
    .select(REQUIREMENT_REPORT_SELECT)
    .eq('id', requirementId)
    .single()

  if (error) throw error

  const { data: stages, error: stagesError } = await supabase
    .from('catalog_pipeline_stage')
    .select('stage_id, name, color, position, client_id')
    .eq('client_id', data.client?.id ?? -1)
    .order('position')

  if (stagesError) throw stagesError

  const stageCounts = Object.fromEntries((stages ?? []).map(s => [s.name, 0]))
  for (const rc of data.requirement_candidate ?? []) {
    if (stage && rc.submittal_status !== stage) continue
    const stageName = rc.submittal_status ?? 'Sin fase'
    stageCounts[stageName] = (stageCounts[stageName] ?? 0) + 1
  }

  return {
    id: data.id,
    reqNumber: data.req_number,
    jobTitle: data.job_title,
    clientName: data.client?.name ?? 'Sin cliente',
    statusName: data.status?.name ?? 'Sin status',
    applicationDate: data.application_date,
    targetFillDate: data.target_fill_date,
    candidateCount: (data.requirement_candidate ?? []).filter(rc => !stage || rc.submittal_status === stage).length,
    stages: Object.entries(stageCounts)
      .map(([name, count]) => {
        const stage = (stages ?? []).find(item => item.name === name)
        return {
          name,
          count,
          color: stage?.color ?? '#64748B',
          position: stage?.position ?? Number.MAX_SAFE_INTEGER,
        }
      })
      .filter(stage => stage.count > 0)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
  }
}
