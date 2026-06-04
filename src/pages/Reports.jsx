import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getReportsSummary,
  listOpenRequirementsForReports,
  getClientReportPdfData,
  getRequirementReportPdfData,
  getWeeklySubmittalsData,
} from '../api/reports'
import {
  buildReportHtml,
  downloadReportHtml,
  openPrintableReport,
  renderMetricCards,
  renderStageList,
  renderTable,
  escapeHtml,
} from '../lib/reportPdf'
import ReportPreviewModal from '../components/ReportPreviewModal'

function MetricCard({ label, value, icon, tone = 'primary', sublabel = '' }) {
  const toneMap = {
    primary: 'from-primary/10 to-primary-container/5 text-primary',
    secondary: 'from-secondary/10 to-secondary-container/5 text-secondary',
    tertiary: 'from-tertiary/10 to-tertiary-container/5 text-tertiary',
    neutral: 'from-surface-container-high to-surface-container text-on-surface',
  }

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[tone] ?? toneMap.primary} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight text-primary">{value}</p>
          {sublabel && <p className="mt-2 text-xs text-on-surface-variant">{sublabel}</p>}
        </div>
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant/45">{icon}</span>
      </div>
    </div>
  )
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateWeeks2026() {
  const weeks = []
  const start = new Date(2025, 11, 29) // ISO Week 1 of 2026 — local date
  for (let w = 0; w < 52; w++) {
    const monday = new Date(start)
    monday.setDate(start.getDate() + w * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mondayStr = localDateStr(monday)
    const mDay = monday.getDate()
    const sDay = sunday.getDate()
    const mMonth = MESES[monday.getMonth()]
    const sMonth = MESES[sunday.getMonth()]
    const label = monday.getMonth() === sunday.getMonth()
      ? `Semana ${w + 1} — ${mDay} a ${sDay} de ${mMonth}`
      : `Semana ${w + 1} — ${mDay} de ${mMonth} a ${sDay} de ${sMonth}`
    weeks.push({ value: mondayStr, label })
  }
  return weeks
}

const WEEKS_2026 = generateWeeks2026()

function toTitleCase(str) {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [requirementOptions, setRequirementOptions] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('all')
  const [selectedRequirementId, setSelectedRequirementId] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState('')

  // Weekly Submittals state
  const [weeklySubmittals, setWeeklySubmittals] = useState([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyError, setWeeklyError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return localDateStr(monday)
  })

  useEffect(() => {
    Promise.all([getReportsSummary(), listOpenRequirementsForReports()])
      .then(([summary, requirements]) => {
        setReport(summary)
        setRequirementOptions(requirements)
        setSelectedClientId('all')
        setSelectedRequirementId(String(requirements?.[0]?.id ?? ''))
        setError(null)
      })
      .catch(err => setError(err.message ?? 'No se pudieron cargar los reportes.'))
      .finally(() => setLoading(false))
  }, [])

  function fmtDate(dateStr) {
    if (!dateStr) return 'Sin fecha'
    return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function isWithinRange(dateStr) {
    if (!dateStr) return false
    const value = new Date(dateStr).getTime()
    if (Number.isNaN(value)) return false
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      if (value < from) return false
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime()
      if (value > to) return false
    }
    return true
  }

  const visibleClientsDetailed = useMemo(() => {
    if (!report?.clients) return []
    return report.clients
      .filter(client => selectedClientId === 'all' || String(client.clientId) === String(selectedClientId))
      .map(client => {
        const requirements = client.requirements.filter(req => isWithinRange(req.applicationDate))
        const stageCounts = {}

        for (const requirement of requirements) {
          for (const [stageName, count] of Object.entries(requirement.stageCounts ?? {})) {
            stageCounts[stageName] = (stageCounts[stageName] ?? 0) + count
          }
        }

        const stages = Object.entries(stageCounts)
          .map(([name, count]) => {
            const stage = client.stages.find(item => item.name === name)
            return {
              name,
              count,
              color: stage?.color ?? '#64748B',
              position: stage?.position ?? Number.MAX_SAFE_INTEGER,
            }
          })
          .filter(stage => stage.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

        return {
          ...client,
          requirements,
          requirementCount: requirements.length,
          candidateCount: requirements.reduce((sum, req) => sum + (req.candidateCount ?? 0), 0),
          stages,
        }
      })
      .filter(client => client.requirementCount > 0)
  }, [report, selectedClientId, dateFrom, dateTo])

  const visibleRequirementOptions = useMemo(() => {
    const filtered = requirementOptions.filter(req => isWithinRange(req.applicationDate))
    if (selectedClientId === 'all') return filtered
    return filtered.filter(req => String(req.clientId) === String(selectedClientId))
  }, [requirementOptions, selectedClientId, dateFrom, dateTo])

  useEffect(() => {
    if (!visibleRequirementOptions.length) {
      setSelectedRequirementId('')
      return
    }
    if (!visibleRequirementOptions.some(req => String(req.id) === String(selectedRequirementId))) {
      setSelectedRequirementId(String(visibleRequirementOptions[0].id))
    }
  }, [visibleRequirementOptions, selectedRequirementId])

  const visibleStageTotals = useMemo(() => {
    const stageMap = new Map()
    for (const client of visibleClientsDetailed) {
      for (const stage of client.stages) {
        if (!stageMap.has(stage.name)) {
          stageMap.set(stage.name, { name: stage.name, count: 0, color: stage.color, position: stage.position })
        }
        stageMap.get(stage.name).count += stage.count
      }
    }

    return [...stageMap.values()]
      .filter(stage => stage.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5)
  }, [visibleClientsDetailed])

  const totalRequirementsVisible = visibleClientsDetailed.reduce((sum, client) => sum + client.requirementCount, 0)
  const totalClientCandidatesVisible = visibleClientsDetailed.reduce((sum, client) => sum + client.candidateCount, 0)
  const totalCandidatesGeneral = report?.totalCandidates ?? 0
  const topStage = visibleStageTotals?.[0]

  function openPreview(title, subtitle, bodyHtml, onDownload) {
    setPreview({
      title,
      html: buildReportHtml({ title, subtitle, bodyHtml }),
      onDownload,
    })
  }

  function buildGeneralBody(stageTotals, clients, totals) {
    return [
      renderMetricCards([
        { label: 'Candidatos totales', value: totals.candidates.toLocaleString() },
        { label: 'Requerimientos abiertos', value: totals.requirements.toLocaleString() },
        { label: 'Clientes visibles', value: totals.clients.toLocaleString() },
        { label: 'Candidatos visibles', value: totals.visibleCandidates.toLocaleString() },
      ]),
      renderStageList('Fases principales', stageTotals),
      renderTable(
        'Resumen por cliente',
        ['Cliente', 'Requerimientos abiertos', 'Candidatos', 'Fase dominante'],
        clients.map(client => [
          escapeHtml(client.clientName),
          escapeHtml(client.requirementCount),
          escapeHtml(client.candidateCount),
          escapeHtml(client.stages[0]?.name ?? 'Sin candidatos'),
        ]),
      ),
    ].join('')
  }

  function buildClientBody(client) {
    return [
      renderMetricCards([
        { label: 'Cliente', value: client.clientName },
        { label: 'Req. abiertos', value: client.requirementCount.toLocaleString() },
        { label: 'Candidatos', value: client.candidateCount.toLocaleString() },
        { label: 'Fases activas', value: client.stages.length.toLocaleString() },
      ]),
      renderStageList('Candidatos por fase', client.stages),
      renderTable(
        'Requerimientos abiertos del cliente',
        ['Folio', 'Posicion', 'Status', 'Aplicacion', 'Target', 'Candidatos'],
        client.requirements.map(requirement => [
          escapeHtml(`REQ-${new Date(requirement.applicationDate ?? Date.now()).getFullYear()}-${String(requirement.reqNumber).padStart(3, '0')}`),
          escapeHtml(requirement.jobTitle),
          `<span class="pill">${escapeHtml(requirement.statusName)}</span>`,
          escapeHtml(fmtDate(requirement.applicationDate)),
          escapeHtml(fmtDate(requirement.targetFillDate)),
          escapeHtml(requirement.candidateCount),
        ]),
      ),
    ].join('')
  }

  function buildRequirementBody(requirement) {
    return [
      renderMetricCards([
        { label: 'Cliente', value: requirement.clientName },
        { label: 'Status', value: requirement.statusName },
        { label: 'Candidatos', value: requirement.candidateCount.toLocaleString() },
        { label: 'Target Fill', value: fmtDate(requirement.targetFillDate) },
      ]),
      renderTable(
        'Resumen del requerimiento',
        ['Folio', 'Posicion', 'Aplicacion', 'Target', 'Status actual'],
        [[
          escapeHtml(`REQ-${new Date(requirement.applicationDate ?? Date.now()).getFullYear()}-${String(requirement.reqNumber).padStart(3, '0')}`),
          escapeHtml(requirement.jobTitle),
          escapeHtml(fmtDate(requirement.applicationDate)),
          escapeHtml(fmtDate(requirement.targetFillDate)),
          `<span class="pill">${escapeHtml(requirement.statusName)}</span>`,
        ]],
      ),
      renderStageList('Distribucion de candidatos por fase', requirement.stages),
    ].join('')
  }

  function getWeekRange(mondayStr) {
    const start = new Date(`${mondayStr}T00:00:00`)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString(), sundayStr: end.toISOString().slice(0, 10) }
  }

  async function loadWeeklySubmittals(mondayStr) {
    setWeeklyLoading(true)
    setWeeklyError(null)
    try {
      const { start, end } = getWeekRange(mondayStr)
      const rows = await getWeeklySubmittalsData(start, end)
      setWeeklySubmittals(rows)
    } catch {
      setWeeklyError('No se pudieron cargar los submittals de la semana.')
    } finally {
      setWeeklyLoading(false)
    }
  }

  useEffect(() => { loadWeeklySubmittals(selectedWeek) }, [selectedWeek])

  function buildWeeklyBody(rows, weekLabel) {
    if (!rows.length) {
      return `<p style="color:#64748b;font-size:14px;">Sin candidatos enviados a cliente esta semana.</p>`
    }

    const total = rows.length

    const byClient = {}
    const byPosition = {}
    for (const row of rows) {
      byClient[row.clientName] = (byClient[row.clientName] ?? 0) + 1
      byPosition[row.jobTitle] = (byPosition[row.jobTitle] ?? 0) + 1
    }

    const clientEntries = Object.entries(byClient).sort((a, b) => b[1] - a[1])
    const positionEntries = Object.entries(byPosition).sort((a, b) => b[1] - a[1])

    const CLIENT_COLORS = ['#143b7a','#1e56a0','#2563eb','#3b82f6','#60a5fa','#93c5fd']
    const POSITION_COLORS = ['#166534','#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0']

    const rowList = (entries, colors) => entries.map(([name, count], i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e9eef8;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${escapeHtml(colors[i % colors.length])};flex-shrink:0;"></span>
          <span style="font-size:13px;">${escapeHtml(name)}</span>
        </div>
        <strong style="font-size:14px;min-width:24px;text-align:right;">${count}</strong>
      </div>`).join('')

    const dashboardHtml = `
      <section class="section">
        <div style="display:grid;grid-template-columns:160px 1fr 1fr;gap:16px;align-items:start;">
          <div class="card" style="background:#10213d;border-color:#10213d;text-align:center;padding:24px 16px;">
            <div class="label" style="color:rgba(255,255,255,0.55);">Total enviados</div>
            <div style="font-size:64px;font-weight:800;color:#4ade80;line-height:1.1;margin:12px 0 8px;">${total}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);">candidatos</div>
          </div>
          <div class="card">
            <div class="label" style="margin-bottom:8px;">Por cliente</div>
            ${rowList(clientEntries, CLIENT_COLORS)}
          </div>
          <div class="card">
            <div class="label" style="margin-bottom:8px;">Por posición</div>
            ${rowList(positionEntries, POSITION_COLORS)}
          </div>
        </div>
      </section>`

    const tableHtml = renderTable(
      `Detalle — ${weekLabel}`,
      ['Candidato', 'Cliente', 'Requerimiento', 'Posición', 'Fase actual', 'Fecha enviado'],
      rows.map(row => [
        escapeHtml(toTitleCase(row.candidateName)),
        escapeHtml(row.clientName),
        escapeHtml(`REQ-${String(row.reqNumber).padStart(3, '0')}`),
        escapeHtml(row.jobTitle),
        escapeHtml(row.currentStage),
        escapeHtml(fmtDate(row.sentAt)),
      ]),
    )

    return dashboardHtml + tableHtml
  }

  function getWeekLabel(mondayStr) {
    const weekNum = WEEKS_2026.findIndex(w => w.value === mondayStr) + 1
    const [y, mo, d] = mondayStr.split('-').map(Number)
    const start = new Date(y, mo - 1, d)
    const end = new Date(y, mo - 1, d + 6)
    const startFmt = start.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
    const endFmt = end.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    return `Semana ${weekNum > 0 ? weekNum : ''}: del ${startFmt} al ${endFmt}`
  }

  function handleWeeklyPreview() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    openPreview(title, subtitle, bodyHtml, () =>
      downloadReportHtml({ filename: `weekly-submittals-${selectedWeek}.html`, title, subtitle, bodyHtml })
    )
  }

  function handleWeeklyDownload() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    downloadReportHtml({ filename: `weekly-submittals-${selectedWeek}.html`, title, subtitle, bodyHtml })
  }

  function handleWeeklyPrint() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setSelectedClientId('all')
  }

  function handleGeneralPreview() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({ filename: 'reporte-general.html', title, subtitle, bodyHtml }))
  }

  function handleGeneralDownload() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    downloadReportHtml({ filename: 'reporte-general.html', title, subtitle, bodyHtml })
  }

  function handleGeneralPrint() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  function handleFilteredPreview() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({ filename: 'reporte-con-filtro.html', title, subtitle, bodyHtml }))
  }

  function handleFilteredDownload() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    downloadReportHtml({ filename: 'reporte-con-filtro.html', title, subtitle, bodyHtml })
  }

  function handleFilteredPrint() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  async function handleClientPreview() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-preview')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-cliente-${client.clientName}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      }))
    } finally {
      setBusy('')
    }
  }

  async function handleClientDownload() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-download')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      downloadReportHtml({
        filename: `${slugify(`reporte-cliente-${client.clientName}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      })
    } finally {
      setBusy('')
    }
  }

  async function handleClientPrint() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-print')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementPreview() {
    if (!selectedRequirementId) return
    setBusy('requirement-preview')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-requerimiento-${requirement.jobTitle}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      }))
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementDownload() {
    if (!selectedRequirementId) return
    setBusy('requirement-download')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      downloadReportHtml({
        filename: `${slugify(`reporte-requerimiento-${requirement.jobTitle}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      })
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementPrint() {
    if (!selectedRequirementId) return
    setBusy('requirement-print')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Suite</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/requirements" className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
            Ver requerimientos
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-medium">Reports</span>
            </div>
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Reports</h1>
            <p className="text-on-surface-variant text-base max-w-3xl">
              Resumen operativo de candidatos, requerimientos por cliente y distribucion de candidatos en cada fase del pipeline.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              <span className="text-sm">Cargando reportes...</span>
            </div>
          ) : report && (
            <>
              {/* 1. Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Candidatos totales" value={totalCandidatesGeneral.toLocaleString()} icon="group" tone="primary" />
                <MetricCard label="Requerimientos abiertos" value={totalRequirementsVisible.toLocaleString()} icon="assignment" tone="secondary" />
                <MetricCard label="Clientes visibles" value={visibleClientsDetailed.length.toLocaleString()} icon="apartment" tone="tertiary" />
                <MetricCard
                  label="Fase con mas candidatos"
                  value={topStage?.count?.toLocaleString?.() ?? '0'}
                  icon="insights"
                  tone="neutral"
                  sublabel={topStage ? topStage.name : 'Sin datos'}
                />
              </div>

              {/* 2. Filtros de reporte */}
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-primary">Filtros</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Filtra por cliente y por rango de fechas antes de ver o descargar cualquier reporte.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr_auto] gap-3">
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                    <option value="all">Todos los clientes</option>
                    {report.clients.map(client => (
                      <option key={client.clientId} value={client.clientId}>{client.clientName}</option>
                    ))}
                  </select>
                  <input className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <input className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  <button type="button" onClick={clearFilters} className="px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    Limpiar
                  </button>
                </div>

                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-primary">Con filtro</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Este reporte respeta el cliente y el rango de fechas que tengas arriba.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleFilteredPreview} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleFilteredDownload} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleFilteredPrint} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </div>
              </section>

              {/* 3. Tipos de reporte: General, Por cliente, Por requerimiento */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-primary">General</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Reporte general sin depender de los filtros activos.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleGeneralPreview} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleGeneralDownload} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleGeneralPrint} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Por cliente</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Selecciona un cliente para ver su reporte individual.</p>
                  </div>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                    <option value="all">Selecciona un cliente</option>
                    {report.clients.map(client => (
                      <option key={client.clientId} value={client.clientId}>{client.clientName}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleClientPreview} disabled={!selectedClientId || selectedClientId === 'all' || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleClientDownload} disabled={!selectedClientId || selectedClientId === 'all' || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleClientPrint} disabled={!selectedClientId || selectedClientId === 'all' || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary-container text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Por requerimiento</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Selecciona un requerimiento abierto para su reporte individual.</p>
                  </div>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={selectedRequirementId} onChange={e => setSelectedRequirementId(e.target.value)}>
                    {visibleRequirementOptions.map(requirement => (
                      <option key={requirement.id} value={requirement.id}>
                        {requirement.clientName} - REQ-{String(requirement.reqNumber).padStart(3, '0')} - {requirement.jobTitle}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleRequirementPreview} disabled={!selectedRequirementId || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleRequirementDownload} disabled={!selectedRequirementId || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleRequirementPrint} disabled={!selectedRequirementId || busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </section>
              </div>

              {/* 4. Weekly Submittals */}
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Weekly Submittals</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Candidatos enviados a cliente (fase "Submitted to Client") en la semana seleccionada.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedWeek}
                      onChange={e => setSelectedWeek(e.target.value)}
                      className="px-3 py-2 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    >
                      {WEEKS_2026.map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {weeklyLoading ? (
                  <div className="flex items-center gap-2 py-4 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Cargando…
                  </div>
                ) : weeklyError ? (
                  <p className="text-sm text-red-400">{weeklyError}</p>
                ) : weeklySubmittals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container/40 px-4 py-6 text-sm text-on-surface-variant text-center">
                    Sin candidatos enviados a cliente en esta semana.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-container border-b border-outline-variant/10">
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Candidato</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Cliente</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Requerimiento</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Posición</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Fase actual</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Fecha enviado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklySubmittals.map((row, i) => (
                          <tr key={row.id} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container/30'}>
                            <td className="px-4 py-3 font-semibold text-primary">{toTitleCase(row.candidateName)}</td>
                            <td className="px-4 py-3 text-on-surface-variant">{row.clientName}</td>
                            <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">REQ-{String(row.reqNumber).padStart(3, '0')}</td>
                            <td className="px-4 py-3 text-on-surface-variant">{row.jobTitle}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {row.currentStage}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-on-surface-variant">{fmtDate(row.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold self-center">
                    {weeklySubmittals.length} candidato{weeklySubmittals.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={handleWeeklyPreview} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Vista previa
                  </button>
                  <button onClick={handleWeeklyDownload} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Descargar
                  </button>
                  <button onClick={handleWeeklyPrint} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Imprimir PDF
                  </button>
                </div>
              </section>

              {/* 5. Detalle por cliente */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-primary">Detalle por cliente</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Solo se muestran clientes con requerimientos abiertos y las fases principales.</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {visibleClientsDetailed.map(client => (
                    <article key={client.clientId} className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-[0_2px_18px_rgba(24,28,30,0.06)] overflow-hidden">
                      <div className="px-6 py-5 border-b border-outline-variant/10 bg-gradient-to-r from-surface-container/60 to-transparent">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">Cliente</p>
                            <h3 className="mt-1 text-xl font-bold text-primary">{client.clientName}</h3>
                          </div>
                          <div className="flex gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {client.requirementCount} req
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                              {client.candidateCount} cand
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        {client.stages.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container/40 px-4 py-4 text-sm text-on-surface-variant">
                            Este cliente no tiene fases configuradas.
                          </div>
                        ) : (
                          client.stages.map(stage => (
                            <div key={stage.name} className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-3 h-3 rounded-full border border-white/60 shrink-0" style={{ backgroundColor: stage.color }}></span>
                                <span className="text-sm font-semibold text-primary truncate">{stage.name}</span>
                              </div>
                              <span className="text-sm font-bold text-on-surface-variant">{stage.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* 6. Distribución global por fase */}
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Distribucion global por fase</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Total de candidatos en las fases principales del pipeline para los clientes visibles.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">
                    {totalClientCandidatesVisible} candidatos ligados a requerimientos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {visibleStageTotals.map(stage => (
                    <div key={stage.name} className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-white/60" style={{ backgroundColor: stage.color }}></span>
                        <p className="text-sm font-semibold text-primary">{stage.name}</p>
                      </div>
                      <p className="mt-3 text-3xl font-extrabold tracking-tight text-primary">{stage.count}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <ReportPreviewModal
        open={Boolean(preview)}
        title={preview?.title ?? ''}
        html={preview?.html ?? ''}
        onClose={() => setPreview(null)}
        onDownload={preview?.onDownload}
      />
    </>
  )
}
