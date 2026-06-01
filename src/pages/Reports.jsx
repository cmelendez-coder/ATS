import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getReportsSummary,
  listOpenRequirementsForReports,
  getClientReportPdfData,
  getRequirementReportPdfData,
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
