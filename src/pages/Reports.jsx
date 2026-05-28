import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getReportsSummary,
  listOpenRequirementsForReports,
  getClientReportPdfData,
  getRequirementReportPdfData,
  listClientsForReports,
  listAllPipelineStages,
  getCandidateSummary,
} from '../api/reports'
import {
  openPrintableReport,
  renderMetricCards,
  renderStageList,
  renderTable,
  renderSectionHeader,
  escapeHtml,
} from '../lib/reportPdf'

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

const EMPTY_FILTERS = { clientId: '', dateFrom: '', dateTo: '', stage: '' }

export default function Reports() {
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState(null)
  const [report, setReport]                     = useState(null)
  const [requirementOptions, setRequirementOptions] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedRequirementId, setSelectedRequirementId] = useState('')
  const [exporting, setExporting]               = useState('')

  // Filter state
  const [filters, setFilters]                   = useState(EMPTY_FILTERS)
  const [applied, setApplied]                   = useState(EMPTY_FILTERS)
  const [filterOptions, setFilterOptions]       = useState({ clients: [], stages: [] })

  const hasActive = Object.values(applied).some(Boolean)

  const fetchReport = useCallback(async (f = EMPTY_FILTERS) => {
    setLoading(true)
    setError(null)
    try {
      const summary = await getReportsSummary(f)
      setReport(summary)
    } catch (err) {
      setError(err.message ?? 'No se pudieron cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetchReport(),
      listClientsForReports(),
      listAllPipelineStages(),
      listOpenRequirementsForReports({}),
    ]).then(([, clients, stages, allRequirements]) => {
      setFilterOptions({ clients, stages })
      setRequirementOptions(allRequirements)
      setSelectedClientId(String(clients?.[0]?.id ?? ''))
      setSelectedRequirementId(String(allRequirements?.[0]?.id ?? ''))
    })
  }, [fetchReport])

  function applyFilters() {
    setApplied(filters)
    fetchReport(filters)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    fetchReport(EMPTY_FILTERS)
  }

  const setF = (k, v) => setFilters(prev => ({ ...prev, [k]: v }))

  const topStage = report?.stageTotals?.[0]

  function fmtDate(dateStr) {
    if (!dateStr) return 'Sin fecha'
    return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  async function exportGeneralPdf() {
    if (!report) return
    setExporting('general')
    try {
      const candidateSummary = await getCandidateSummary()

      const bodyHtml = [
        // ── Sección 1: Requerimientos ──
        renderSectionHeader('Análisis de Requerimientos'),
        renderMetricCards([
          { label: 'Requerimientos abiertos', value: report.totalRequirements.toLocaleString() },
          { label: 'Clientes con reqs. abiertos', value: report.totalClients.toLocaleString() },
          { label: 'Candidatos en proceso', value: report.totalClientCandidates.toLocaleString() },
          { label: 'Fases activas', value: report.stageTotals.length.toLocaleString() },
        ]),
        renderStageList('Fases del pipeline', report.stageTotals),
        renderTable(
          'Resumen por cliente',
          ['Cliente', 'Requerimientos abiertos', 'Candidatos', 'Fase dominante'],
          report.clients.map(client => [
            escapeHtml(client.clientName),
            escapeHtml(client.requirementCount),
            escapeHtml(client.candidateCount),
            escapeHtml(client.stages[0]?.name ?? 'Sin candidatos'),
          ]),
        ),

        // ── Sección 2: Candidatos ──
        renderSectionHeader('Seguimiento de Candidatos'),
        renderMetricCards([
          { label: 'Candidatos totales', value: candidateSummary.total.toLocaleString() },
          ...candidateSummary.byStatus.slice(0, 3).map(s => ({
            label: s.name,
            value: s.count.toLocaleString(),
          })),
        ]),
        renderTable(
          'Distribución por estado',
          ['Estado', 'Candidatos', '% del total'],
          candidateSummary.byStatus.map(s => [
            escapeHtml(s.name),
            escapeHtml(s.count.toLocaleString()),
            escapeHtml(`${Math.round(s.count / candidateSummary.total * 100)}%`),
          ]),
        ),
      ].join('')

      openPrintableReport({
        title: 'Reporte General',
        subtitle: 'Vista consolidada de requerimientos activos y seguimiento del pool de candidatos.',
        bodyHtml,
      })
    } finally {
      setExporting('')
    }
  }

  async function exportClientPdf() {
    if (!selectedClientId) return
    setExporting('client')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId), { dateFrom: applied.dateFrom, dateTo: applied.dateTo, stage: applied.stage })
      const bodyHtml = [
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

      openPrintableReport({
        title: `Reporte de Cliente - ${client.clientName}`,
        subtitle: 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.',
        bodyHtml,
      })
    } finally {
      setExporting('')
    }
  }

  async function exportCustomPdf() {
    if (exporting) return
    setExporting('custom')
    setApplied(filters)
    fetchReport(filters)
    try {
      const summary = await getReportsSummary(filters)
      const filterLabel = [
        filters.clientId && filterOptions.clients.find(c => String(c.id) === String(filters.clientId))?.name,
        filters.dateFrom && `Desde ${fmtDate(filters.dateFrom)}`,
        filters.dateTo && `Hasta ${fmtDate(filters.dateTo)}`,
        filters.stage && `Etapa: ${filters.stage}`,
      ].filter(Boolean).join(' · ')

      const bodyHtml = [
        renderMetricCards([
          { label: 'Candidatos totales', value: summary.totalCandidates.toLocaleString() },
          { label: 'Requerimientos abiertos', value: summary.totalRequirements.toLocaleString() },
          { label: 'Clientes con reqs. abiertos', value: summary.totalClients.toLocaleString() },
          { label: 'Candidatos en proceso', value: summary.totalClientCandidates.toLocaleString() },
        ]),
        renderStageList('Fases principales', summary.stageTotals),
        renderTable(
          'Resumen por cliente',
          ['Cliente', 'Requerimientos abiertos', 'Candidatos', 'Fase dominante'],
          summary.clients.map(client => [
            escapeHtml(client.clientName),
            escapeHtml(client.requirementCount),
            escapeHtml(client.candidateCount),
            escapeHtml(client.stages[0]?.name ?? 'Sin candidatos'),
          ]),
        ),
      ].join('')

      openPrintableReport({
        title: 'Reporte Personalizado',
        subtitle: filterLabel || 'Sin filtros aplicados — vista completa de todos los datos.',
        bodyHtml,
      })
    } finally {
      setExporting('')
    }
  }

  async function exportRequirementPdf() {
    if (!selectedRequirementId) return
    setExporting('requirement')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId), { stage: applied.stage })
      const bodyHtml = [
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

      openPrintableReport({
        title: `Reporte por Requerimiento - ${requirement.jobTitle}`,
        subtitle: `Cliente: ${requirement.clientName}`,
        bodyHtml,
      })
    } finally {
      setExporting('')
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

          {/* Filter Panel */}
          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
                <h2 className="text-sm font-bold text-primary">Filtros de reporte</h2>
                {hasActive && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">Activos</span>
                )}
              </div>
              {hasActive && (
                <button onClick={clearFilters} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Cliente</label>
                <select
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  value={filters.clientId}
                  onChange={e => setF('clientId', e.target.value)}
                >
                  <option value="">Todos los clientes</option>
                  {filterOptions.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Fecha desde</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                  value={filters.dateFrom}
                  onChange={e => setF('dateFrom', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Fecha hasta</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                  value={filters.dateTo}
                  onChange={e => setF('dateTo', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Etapa del proceso</label>
                <select
                  className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  value={filters.stage}
                  onChange={e => setF('stage', e.target.value)}
                >
                  <option value="">Todas las etapas</option>
                  {filterOptions.stages.map(s => <option key={s.stage_id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={applyFilters}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                Aplicar filtros
              </button>
              <button
                type="button"
                disabled={exporting === 'custom'}
                onClick={exportCustomPdf}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]">{exporting === 'custom' ? 'progress_activity' : 'picture_as_pdf'}</span>
                Exportar reporte personalizado
              </button>
              {hasActive && (
                <p className="text-xs text-on-surface-variant">
                  Mostrando datos filtrados — los PDFs generados respetarán los filtros activos.
                </p>
              )}
            </div>
          </section>

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
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-primary">Exportar PDF</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Genera un reporte general, por cliente o por requerimiento y guardalo como PDF desde la ventana de impresion.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">General</p>
                    <p className="text-sm text-on-surface-variant">Incluye resumen operativo, fases principales y clientes con requerimientos abiertos.</p>
                    <button
                      type="button"
                      onClick={exportGeneralPdf}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Exportar general
                    </button>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Por cliente</p>
                    <select
                      className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                    >
                      {filterOptions.clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedClientId || exporting === 'client'}
                      onClick={exportClientPdf}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary-container text-on-secondary-container text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[16px]">{exporting === 'client' ? 'progress_activity' : 'picture_as_pdf'}</span>
                      Exportar cliente
                    </button>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Por requerimiento</p>
                    <select
                      className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      value={selectedRequirementId}
                      onChange={e => setSelectedRequirementId(e.target.value)}
                    >
                      {requirementOptions.map(requirement => (
                        <option key={requirement.id} value={requirement.id}>
                          {requirement.clientName} - REQ-{String(requirement.reqNumber).padStart(3, '0')} - {requirement.jobTitle}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedRequirementId || exporting === 'requirement'}
                      onClick={exportRequirementPdf}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary-container text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[16px]">{exporting === 'requirement' ? 'progress_activity' : 'picture_as_pdf'}</span>
                      Exportar requerimiento
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Candidatos totales" value={report.totalCandidates.toLocaleString()} icon="group" tone="primary" />
                <MetricCard label="Requerimientos abiertos" value={report.totalRequirements.toLocaleString()} icon="assignment" tone="secondary" />
                <MetricCard label="Clientes con reqs. abiertos" value={report.totalClients.toLocaleString()} icon="apartment" tone="tertiary" />
                <MetricCard
                  label="Fase con mas candidatos"
                  value={topStage?.count?.toLocaleString?.() ?? '0'}
                  icon="insights"
                  tone="neutral"
                  sublabel={topStage ? topStage.name : 'Sin datos'}
                />
              </div>

              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Distribucion global por fase</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Total de candidatos en las fases principales del pipeline para requerimientos abiertos.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">
                    {report.totalClientCandidates} candidatos ligados a requerimientos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {report.stageTotals.map(stage => (
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

              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-primary">Detalle por cliente</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Solo se muestran clientes con requerimientos abiertos y las fases principales.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {report.clients.map(client => (
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
