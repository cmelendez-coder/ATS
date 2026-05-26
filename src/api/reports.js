import { supabase } from '../lib/supabase'

const CLIENT_REPORT_SELECT = `
  id,
  name,
  catalog_pipeline_stage(stage_id, name, color, position, client_id),
  requirement(
    id,
    stage,
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

export async function getReportsSummary() {
  const [
    { count: totalCandidates, error: candidatesError },
    { count: totalRequirements, error: requirementsError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from('candidate').select('*', { count: 'exact', head: true }),
    supabase.from('requirement').select('*', { count: 'exact', head: true }),
    supabase.from('client').select(CLIENT_REPORT_SELECT).order('name'),
  ])

  if (candidatesError) throw candidatesError
  if (requirementsError) throw requirementsError
  if (clientsError) throw clientsError

  const clientReports = (clients ?? []).map(client => {
    const stages = [...(client.catalog_pipeline_stage ?? [])].sort((a, b) => {
      const posDiff = (a.position ?? 0) - (b.position ?? 0)
      return posDiff !== 0 ? posDiff : (a.stage_id ?? 0) - (b.stage_id ?? 0)
    })
    const openRequirements = (client.requirement ?? []).filter(isRequirementOpen)
    const stageCounts = Object.fromEntries(stages.map(stage => [stage.name, 0]))

    let candidateCount = 0
    for (const requirement of openRequirements) {
      for (const candidate of requirement.requirement_candidate ?? []) {
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

export async function listOpenRequirementsForReports() {
  const { data, error } = await supabase
    .from('requirement')
    .select(REQUIREMENT_REPORT_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? [])
    .filter(isRequirementOpen)
    .map(requirement => ({
      id: requirement.id,
      reqNumber: requirement.req_number,
      jobTitle: requirement.job_title,
      clientId: requirement.client?.id ?? null,
      clientName: requirement.client?.name ?? 'Sin cliente',
      statusName: requirement.status?.name ?? '',
    }))
}

export async function getClientReportPdfData(clientId) {
  const { data, error } = await supabase
    .from('client')
    .select(CLIENT_REPORT_SELECT)
    .eq('id', clientId)
    .single()

  if (error) throw error

  const stages = [...(data.catalog_pipeline_stage ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const openRequirements = (data.requirement ?? []).filter(isRequirementOpen)
  const stageCounts = Object.fromEntries(stages.map(stage => [stage.name, 0]))

  const requirements = openRequirements.map(requirement => {
    const candidateCount = requirement.requirement_candidate?.length ?? 0
    for (const candidate of requirement.requirement_candidate ?? []) {
      const stageName = candidate.submittal_status ?? 'Sin fase'
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

export async function getRequirementReportPdfData(requirementId) {
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

  const stageCounts = Object.fromEntries((stages ?? []).map(stage => [stage.name, 0]))
  for (const candidate of data.requirement_candidate ?? []) {
    const stageName = candidate.submittal_status ?? 'Sin fase'
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
    candidateCount: data.requirement_candidate?.length ?? 0,
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
