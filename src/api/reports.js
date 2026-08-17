import { supabase } from '../lib/supabase'

const CLIENT_REPORT_SELECT = `
  id,
  name,
  catalog_pipeline_stage(stage_id, name, color, position, client_id),
  requirement(
    id,
    req_number,
    job_title,
    application_date,
    target_fill_date,
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

const REPORT_STAGE_PIVOTS = new Set([
  'submitted to client',
  'enviado al cliente',
  'sent to client',
])

function normalizeStageName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function sortStagesByPipeline(stages = []) {
  return [...stages].sort((a, b) => {
    const posDiff = (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
    return posDiff !== 0 ? posDiff : (a.stage_id ?? 0) - (b.stage_id ?? 0)
  })
}

function filterStagesFromSubmittedOnward(stages = []) {
  const sortedStages = sortStagesByPipeline(stages)
  const pivotStage = sortedStages.find(stage => REPORT_STAGE_PIVOTS.has(normalizeStageName(stage.name)))
  if (!pivotStage) return sortedStages

  const pivotPosition = pivotStage.position ?? Number.MAX_SAFE_INTEGER
  return sortedStages.filter(stage => (stage.position ?? Number.MAX_SAFE_INTEGER) >= pivotPosition)
}

function createStageLookup(stages = []) {
  return new Map(stages.map(stage => [normalizeStageName(stage.name), stage.name]))
}

function countCandidatesByVisibleStage(candidates = [], visibleStages = []) {
  const canonicalStages = filterStagesFromSubmittedOnward(visibleStages)
  const stageLookup = createStageLookup(canonicalStages)
  const stageCounts = Object.fromEntries(canonicalStages.map(stage => [stage.name, 0]))

  let candidateCount = 0
  for (const candidate of candidates ?? []) {
    const canonicalStageName = stageLookup.get(normalizeStageName(candidate.submittal_status))
    if (!canonicalStageName) continue

    stageCounts[canonicalStageName] = (stageCounts[canonicalStageName] ?? 0) + 1
    candidateCount += 1
  }

  return { candidateCount, stageCounts, canonicalStages }
}

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
    const stages = filterStagesFromSubmittedOnward(client.catalog_pipeline_stage ?? [])

    const openRequirements = (client.requirement ?? []).filter(isRequirementOpen)
    const { candidateCount, stageCounts } = countCandidatesByVisibleStage(
      openRequirements.flatMap(requirement => requirement.requirement_candidate ?? []),
      stages,
    )

    const stageReport = stages.map(stage => ({
      name: stage.name,
      count: stageCounts[stage.name] ?? 0,
      color: stage.color ?? '#64748B',
      position: stage.position ?? Number.MAX_SAFE_INTEGER,
    }))
      .filter(stage => stage.count > 0)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

    return {
      clientId: client.id,
      clientName: client.name,
      requirementCount: openRequirements.length,
      candidateCount,
      requirements: openRequirements.map(requirement => ({
        id: requirement.id,
        reqNumber: requirement.req_number,
        jobTitle: requirement.job_title,
        applicationDate: requirement.application_date,
        targetFillDate: requirement.target_fill_date,
        statusName: requirement.status?.name ?? '',
        candidateCount: countCandidatesByVisibleStage(requirement.requirement_candidate ?? [], stages).candidateCount,
        stageCounts: countCandidatesByVisibleStage(requirement.requirement_candidate ?? [], stages).stageCounts,
      })),
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
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

  return {
    totalCandidates: totalCandidates ?? 0,
    totalRequirements: clientReports.reduce((sum, client) => sum + client.requirementCount, 0),
    totalClients: clientReports.length,
    totalClientCandidates: clientReports.reduce((sum, client) => sum + client.candidateCount, 0),
    stageTotals,
    clients: clientReports,
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
      applicationDate: requirement.application_date,
      targetFillDate: requirement.target_fill_date,
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

  const stages = filterStagesFromSubmittedOnward(data.catalog_pipeline_stage ?? [])
  const openRequirements = (data.requirement ?? []).filter(isRequirementOpen)
  const { candidateCount, stageCounts } = countCandidatesByVisibleStage(
    openRequirements.flatMap(requirement => requirement.requirement_candidate ?? []),
    stages,
  )

  const requirements = openRequirements.map(requirement => {
    return {
      id: requirement.id,
      reqNumber: requirement.req_number,
      jobTitle: requirement.job_title,
      statusName: requirement.status?.name ?? 'Sin status',
      applicationDate: requirement.application_date,
      targetFillDate: requirement.target_fill_date,
      candidateCount: countCandidatesByVisibleStage(requirement.requirement_candidate ?? [], stages).candidateCount,
    }
  })

  return {
    clientId: data.id,
    clientName: data.name,
    requirementCount: requirements.length,
    candidateCount: requirements.reduce((sum, requirement) => sum + requirement.candidateCount, 0),
    stages: stages
      .map(stage => ({
        name: stage.name,
        count: stageCounts[stage.name] ?? 0,
        color: stage.color ?? '#64748B',
        position: stage.position ?? Number.MAX_SAFE_INTEGER,
      }))
      .filter(stage => stage.count > 0)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    requirements,
  }
}

export async function getWeeklySubmittalsData(weekStart, weekEnd) {
  // Query history table: candidates who entered "Submitted to Client" during the week
  // Show their current stage from requirement_candidate
  const { data, error } = await supabase
    .from('requirement_candidate_stage_history')
    .select(`
      id, stage_name, entered_at,
      rc:requirement_candidate!rc_id(
        id, submittal_status, notes,
        candidate:candidate_id(full_name, email, role:role_id(name), seniority:seniority_id(name)),
        requirement:requirement_id(id, req_number, job_title, client:client_id(name))
      )
    `)
    .ilike('stage_name', 'submitted to client')
    .gte('entered_at', weekStart)
    .lte('entered_at', weekEnd)
    .order('entered_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map(h => ({
    id: h.id,
    candidateName: h.rc?.candidate?.full_name ?? 'Sin nombre',
    candidateEmail: h.rc?.candidate?.email ?? '',
    role: h.rc?.candidate?.role?.name ?? '',
    seniority: h.rc?.candidate?.seniority?.name ?? '',
    clientName: h.rc?.requirement?.client?.name ?? 'Sin cliente',
    reqNumber: h.rc?.requirement?.req_number ?? '',
    jobTitle: h.rc?.requirement?.job_title ?? '',
    sentAt: h.entered_at,
    currentStage: h.rc?.submittal_status ?? '',
    notes: h.rc?.notes ?? '',
  }))
}

export async function getClientMonthlyReportData(clientId, year, month) {
  const monthStr  = String(month).padStart(2, '0')
  const monthStart = `${year}-${monthStr}-01`
  const lastDay    = new Date(year, month, 0).getDate()
  const monthEnd   = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [{ data: clientData, error: clientError }, { data: requirements, error: reqError }] = await Promise.all([
    supabase.from('client').select('name').eq('id', clientId).single(),
    supabase
      .from('requirement')
      .select(`
        id, req_number, job_title, fte_count, application_date, created_at,
        status:status_id(name),
        requirement_candidate(id, submitted_at, candidate:candidate_id(full_name))
      `)
      .eq('client_id', clientId)
      .gte('created_at', `${monthStart}T00:00:00.000Z`)
      .lte('created_at', `${monthEnd}T23:59:59.999Z`)
      .order('created_at', { ascending: true }),
  ])

  if (clientError) throw clientError
  if (reqError) throw reqError

  return {
    clientName: clientData.name,
    year,
    month,
    requirements: (requirements ?? []).map(req => {
      const rcs = (req.requirement_candidate ?? [])
        .slice()
        .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
      return {
        id: req.id,
        reqNumber: req.req_number,
        jobTitle: req.job_title,
        fteCount: req.fte_count ?? 1,
        applicationDate: req.application_date,
        createdAt: req.created_at,
        statusName: req.status?.name ?? '',
        candidatesSent: rcs.length,
        candidates: rcs.map(rc => ({
          name: rc.candidate?.full_name ?? 'Sin nombre',
          sentAt: rc.submitted_at,
        })),
      }
    }),
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

  const visibleStages = filterStagesFromSubmittedOnward(stages ?? [])
  const { candidateCount, stageCounts } = countCandidatesByVisibleStage(
    data.requirement_candidate ?? [],
    visibleStages,
  )

  return {
    id: data.id,
    reqNumber: data.req_number,
    jobTitle: data.job_title,
    clientName: data.client?.name ?? 'Sin cliente',
    statusName: data.status?.name ?? 'Sin status',
    applicationDate: data.application_date,
    targetFillDate: data.target_fill_date,
    candidateCount,
    stages: visibleStages
      .map(stage => ({
        name: stage.name,
        count: stageCounts[stage.name] ?? 0,
        color: stage.color ?? '#64748B',
        position: stage.position ?? Number.MAX_SAFE_INTEGER,
      }))
      .filter(stage => stage.count > 0)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
  }
}
