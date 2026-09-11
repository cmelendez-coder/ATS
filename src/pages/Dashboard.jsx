import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useRequirementAlerts } from '../hooks/useRequirementAlerts'
import { getDashboardStats, getMonthlySentCount } from '../api/dashboard'
import RequirementAlertBell from '../components/RequirementAlertBell'
import PortalButtons from '../components/PortalButtons'

const PRIORITY = {
  0: { label: 'Alta',  color: '#ba1a1a', bg: 'bg-error-container',        text: 'text-on-error-container' },
  1: { label: 'Media', color: '#50B152', bg: 'bg-secondary-container',    text: 'text-on-secondary-container' },
  2: { label: 'Baja',  color: '#c1cbe4', bg: 'bg-surface-variant',        text: 'text-on-surface-variant' },
  3: { label: 'Pausa', color: '#25457f', bg: 'bg-surface-container',      text: 'text-on-surface-variant/60' },
}

const STATUS_COLORS = {
  'Open':                 '#50B152',
  'Closed - Covered':     '#7ad27d',
  'Closed - Not Covered': '#25457f',
  'Paused':               '#1b3a78',
  'Pending Approval':     '#c1cbe4',
}


function getISOWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

export default function Dashboard() {
  const { can } = usePermissions()
  const { pendingCount, loading: alertsLoading, showAlerts } = useRequirementAlerts()
  const [currentDate, setCurrentDate] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [talentMonth, setTalentMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [talentCount, setTalentCount] = useState(null)
  const [talentLoading, setTalentLoading] = useState(false)
  const [pipelineModal, setPipelineModal] = useState(null) // 'general' | 'final' | null

  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setTalentLoading(true)
    getMonthlySentCount(talentMonth.year, talentMonth.month)
      .then(setTalentCount)
      .finally(() => setTalentLoading(false))
  }, [talentMonth.year, talentMonth.month])

  // ─── Derived chart data ───────────────────────────────────────────
  const statusSegments = stats
    ? Object.entries(stats.reqStatusMap)
        .filter(([, c]) => c > 0)
        .map(([name, count]) => ({ name, count, color: STATUS_COLORS[name] ?? '#25457f' }))
    : []

  const priorityBars = stats
    ? Object.entries(stats.reqByPriority)
        .filter(([, c]) => c > 0)
        .map(([p, count]) => ({ label: PRIORITY[p]?.label ?? 'Otro', count, color: PRIORITY[p]?.color ?? '#c1cbe4' }))
    : []

  const maxPriorityCount = Math.max(...(priorityBars.map(b => b.count)), 1)

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <RequirementAlertBell count={pendingCount} loading={alertsLoading} show={showAlerts} />
          <div className="w-px h-5 bg-outline-variant/40 mx-1" />
          {can('requirements.create') && (
            <Link to="/requirements/new">
              <button className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
                Create Request
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Overview</h1>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <PortalButtons />
              <p className="text-sm font-medium text-on-surface-variant">{currentDate}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Link to="/reports" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-primary rounded-full text-sm font-medium hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">analytics</span>
              Reports
            </Link>
            {can('requirements.create') && (
              <Link to="/requirements/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Requirement
              </Link>
            )}
            <Link to="/requirements" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-primary rounded-full text-sm font-medium hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">list_alt</span>
              All Requirements
            </Link>
            <Link to="/talent" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-primary rounded-full text-sm font-medium hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">people</span>
              Talent Directory
            </Link>
          </div>

          {/* ── STAT TILES ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {/* Open Requirements */}
            <Link
              to="/requirements"
              className="col-span-1 block bg-[#0b2a58] rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-white/[0.08] hover:shadow-[0_4px_24px_rgba(24,28,30,0.08)] transition-shadow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-white/60">Open Requirements</h3>
                <span className="material-symbols-outlined text-[18px] text-white/30">assignment</span>
              </div>
              <p className="text-[5.5rem] leading-none tracking-tighter font-light text-[#81b927]">
                {loading ? '…' : stats?.openCount ?? 0}
              </p>
            </Link>

            {/* Clients — top 3 by open requirements */}
            <div className="col-span-2 bg-[#0b2a58] rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-white/[0.08]">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-white/60">Clients</h3>
              </div>
              {loading ? (
                <div className="h-16 flex items-center text-white/30 text-sm">…</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {(stats?.topClients ?? []).map((client, i) => {
                    const P = [
                      { bg: '#dce8f7', num: '#071d47', lbl: '#4a6890' },
                      { bg: '#ede8f8', num: '#3d2a80', lbl: '#6b58a0' },
                      { bg: '#fef2e0', num: '#a85200', lbl: '#8a6030' },
                      { bg: '#e2f0e8', num: '#1f5e35', lbl: '#3a7a52' },
                      { bg: '#fce8e8', num: '#9b1c1c', lbl: '#b04040' },
                      { bg: '#e8f4fd', num: '#0b4f8a', lbl: '#2e6da0' },
                      { bg: '#f0ece8', num: '#5a3e28', lbl: '#7a5c40' },
                      { bg: '#edf2e8', num: '#3a5520', lbl: '#587a38' },
                    ]
                    const p = P[i % P.length]
                    return (
                      <Link
                        key={client.name}
                        to={client.id ? `/requirements?client=${client.id}` : '/requirements'}
                        className="rounded-xl p-3.5 min-w-[100px] hover:scale-[1.03] hover:shadow-md transition-all duration-150 cursor-pointer"
                        style={{ backgroundColor: p.bg }}
                        title={`Ver requerimientos de ${client.name}`}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2 truncate" style={{ color: p.lbl }}>{client.name}</p>
                        <p className="text-[2rem] font-light leading-none" style={{ color: p.num }}>{client.count}</p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Talent Pool */}
            <Link
              to="/talent"
              className="block bg-[#0b2a58] rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-white/[0.08] hover:shadow-[0_4px_24px_rgba(24,28,30,0.08)] transition-shadow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-white/60">Talent Pool</h3>
                <span className="material-symbols-outlined text-[18px] text-white/30">people</span>
              </div>
              <p className="text-5xl tracking-tighter font-light text-[#81b927]">
                {loading ? '…' : (stats?.totalCandidates ?? 0).toLocaleString()}
              </p>
            </Link>

            {/* Agregados al Talent Pool — mes navegable */}
            <div className="bg-[#81b927] rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-white/[0.12]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />
              <div className="relative flex items-start justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-white/70">Este mes</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTalentMonth(p => {
                      const d = new Date(p.year, p.month - 1, 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] text-white">chevron_left</span>
                  </button>
                  <button
                    onClick={() => setTalentMonth(p => {
                      const d = new Date(p.year, p.month + 1, 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/35 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px] text-white">chevron_right</span>
                  </button>
                </div>
              </div>
              <p className="relative text-5xl tracking-tighter font-light text-white">
                {talentLoading ? '…' : `+${talentCount ?? 0}`}
              </p>
              <p className="relative text-[11px] text-white/80 mt-2 font-medium">
                Agregados al Talent Pool en {MESES_ES[talentMonth.month]} {talentMonth.year}
              </p>
            </div>

          </div>

          {/* ── PIPELINE ACTIVITY (esta semana) ── */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-white">Pipeline de Candidatos</h2>
                <p className="text-[11px] text-white/60 mt-0.5">Actividad de esta semana</p>
              </div>
              <span className="material-symbols-outlined text-[20px] text-white/30">hub</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-white/60">
                <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
              </div>
            ) : (() => {
              const sent = stats?.weeklySent ?? 0
              const isoWeek = getISOWeek()
              return (
                <div className="grid grid-cols-3 gap-3">
                  {/* Current week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[24px] text-on-surface-variant/50">calendar_today</span>
                      <span className="text-[15px] font-bold uppercase tracking-wider text-on-surface-variant">Semana</span>
                    </div>
                    <p className="text-5xl font-light tracking-tighter text-primary">{isoWeek}</p>
                  </div>

                  {/* Sent this week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[24px]" style={{ color: '#50B152' }}>send</span>
                      <span className="text-[15px] font-bold uppercase tracking-wider text-on-surface-variant">Sent</span>
                    </div>
                    <p className="animate-glow-number text-5xl font-light tracking-tighter" style={{ color: '#50B152' }}>{sent}</p>
                    <p className="text-sm font-semibold italic text-on-surface-variant">candidatos enviados al cliente</p>
                  </div>

                  {/* Rejected this week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[24px]" style={{ color: '#ba1a1a' }}>cancel</span>
                      <span className="text-[15px] font-bold uppercase tracking-wider text-on-surface-variant">Rejected</span>
                    </div>
                    <p className="animate-glow-number text-5xl font-light tracking-tighter" style={{ color: '#ba1a1a' }}>
                      {stats?.weeklyRejected ?? 0}
                    </p>
                    <p className="text-sm font-semibold italic text-on-surface-variant">candidatos rechazados</p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── PIPELINE GENERAL ── */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-white">Pipeline General</h2>
                <p className="text-[11px] text-white/60 mt-0.5">Candidatos activos en todos los requerimientos abiertos</p>
              </div>
              <span className="material-symbols-outlined text-[20px] text-white/30">groups</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-white/60">
                <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Total en pipeline */}
                <button
                  type="button"
                  onClick={() => setPipelineModal('general')}
                  className="text-left bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2 hover:shadow-[0_4px_20px_rgba(24,28,30,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[24px]" style={{ color: '#4e90d0' }}>hub</span>
                    <span className="text-[15px] font-bold uppercase tracking-wider text-on-surface-variant">Pipeline General</span>
                  </div>
                  <p className="animate-glow-number text-5xl font-light tracking-tighter" style={{ color: '#4e90d0' }}>
                    {stats?.activePipelineCount ?? 0}
                  </p>
                  <p className="text-sm font-semibold italic text-on-surface-variant">candidatos en proceso activo con clientes</p>
                </button>

                {/* Candidatos en última etapa */}
                <button
                  type="button"
                  onClick={() => setPipelineModal('final')}
                  className="text-left bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2 hover:shadow-[0_4px_20px_rgba(24,28,30,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[24px]" style={{ color: '#81b927' }}>bolt</span>
                    <span className="text-[15px] font-bold uppercase tracking-wider text-on-surface-variant">Candidatos</span>
                  </div>
                  <p className="animate-glow-number text-5xl font-light tracking-tighter" style={{ color: '#81b927' }}>
                    {stats?.finalStageCount ?? 0}
                  </p>
                  <p className="text-sm font-semibold italic text-on-surface-variant">en las últimas 2 etapas del pipeline</p>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Pipeline table modal — read-only */}
      {pipelineModal && (() => {
        const isGeneral = pipelineModal === 'general'
        const rows = (isGeneral ? stats?.pipelineList : stats?.finalStageList) ?? []
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPipelineModal(null)}
          >
            <div
              className="rounded-2xl border border-white/10 shadow-2xl w-full max-w-4xl max-h-[82vh] flex flex-col overflow-hidden"
              style={{ backgroundColor: '#0b1e3d' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-white">{isGeneral ? 'Pipeline General' : 'Candidatos — últimas etapas'}</h2>
                  <p className="text-xs text-white/50 mt-0.5">{rows.length} candidato{rows.length !== 1 ? 's' : ''} · ordenado por cliente</p>
                </div>
                <button onClick={() => setPipelineModal(null)} className="text-white/40 hover:text-white/80 transition-colors">
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>
              <div className="overflow-y-auto overflow-x-hidden flex-1">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: '#0b2a58' }}>
                    <tr>
                      {['Nombre', 'Cliente', 'Posición', 'Stage'].map(h => (
                        <th key={h} className="py-3 px-5 text-[11px] font-bold uppercase tracking-widest truncate" style={{ color: '#81b927' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-white/40 text-sm">Sin candidatos</td></tr>
                    ) : (() => {
                      let groupIdx = -1
                      let prevClient = null
                      return rows.map((r, i) => {
                        const isNewGroup = r.client !== prevClient
                        if (isNewGroup) groupIdx++
                        prevClient = r.client
                        const zebra = groupIdx % 2 === 1
                        return (
                          <tr
                            key={r.id}
                            className={`${zebra ? 'bg-white/[0.07]' : ''} ${isNewGroup && i !== 0 ? 'border-t border-white/15' : ''}`}
                          >
                            <td className="py-3 px-5 text-sm font-semibold text-white truncate" title={r.candidate}>{r.candidate}</td>
                            <td className="py-3 px-5 text-sm text-white/70 truncate" title={r.client}>{r.client}</td>
                            <td className="py-3 px-5 text-sm text-white/70 truncate" title={r.position}>{r.position}</td>
                            <td className="py-3 px-5 truncate">
                              <span className="inline-block max-w-full truncate align-bottom px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#81b9271c', color: '#81b927' }} title={r.stage}>{r.stage}</span>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
