import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useRequirementAlerts } from '../hooks/useRequirementAlerts'
import { getDashboardStats } from '../api/dashboard'
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


function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function reqLabel(num, date) {
  const yr = date ? new Date(date).getFullYear() : new Date().getFullYear()
  return `REQ-${yr}-${String(num ?? 0).padStart(3, '0')}`
}

// ─── Donut chart via conic-gradient ──────────────────────────────────────────
function DonutChart({ segments, total }) {
  const parts = []
  let cumPct = 0
  for (const seg of segments) {
    const pct = total > 0 ? (seg.count / total) * 100 : 0
    if (pct > 0) {
      parts.push(`${seg.color} ${cumPct.toFixed(1)}% ${(cumPct + pct).toFixed(1)}%`)
    }
    cumPct += pct
  }
  if (cumPct < 100) parts.push(`#1b3a78 ${cumPct.toFixed(1)}% 100%`)

  return (
    <div className="relative mx-auto shrink-0" style={{ width: 104, height: 104 }}>
      <div
        className="w-full h-full rounded-full"
        style={{
          background: `conic-gradient(from -90deg, ${parts.join(', ')})`,
        }}
      />
      <div
        className="absolute rounded-full bg-surface-container-low flex flex-col items-center justify-center"
        style={{ inset: 20 }}
      >
        <span className="text-lg font-bold text-[#81b927] leading-none">{total}</span>
        <span className="text-[8px] text-white/50 mt-0.5">total</span>
      </div>
    </div>
  )
}

// ─── Horizontal bar chart row ─────────────────────────────────────────────────
function HBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 4) : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/70 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-semibold text-white w-5 text-right shrink-0">{count}</span>
    </div>
  )
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
  const [divisor, setDivisor] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  // ─── Derived chart data ───────────────────────────────────────────
  const statusSegments = stats
    ? Object.entries(stats.reqStatusMap)
        .filter(([, c]) => c > 0)
        .map(([name, count]) => ({ name, count, color: STATUS_COLORS[name] ?? '#25457f' }))
    : []

  const CLIENT_COLORS = ['#81b927','#4e90d0','#f59e0b','#a855f7','#14b8a6','#f97316','#ef4444','#06b6d4']
  const clientSegments = stats
    ? (stats.topClients ?? []).map((c, i) => ({
        name:  c.name,
        count: c.count,
        color: CLIENT_COLORS[i % CLIENT_COLORS.length],
      }))
    : []

  const priorityBars = stats
    ? Object.entries(stats.reqByPriority)
        .filter(([, c]) => c > 0)
        .map(([p, count]) => ({ label: PRIORITY[p]?.label ?? 'Otro', count, color: PRIORITY[p]?.color ?? '#c1cbe4' }))
    : []

  const maxClientCount = stats?.topClients?.[0]?.count ?? 1
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Open Requirements */}
            <Link
              to="/requirements"
              className="col-span-1 block bg-surface-container-lowest rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-outline-variant/10 hover:shadow-[0_4px_24px_rgba(24,28,30,0.08)] transition-shadow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">Open Requirements</h3>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40">assignment</span>
              </div>
              <p className="text-[5.5rem] leading-none tracking-tighter font-light text-primary">
                {loading ? '…' : stats?.openCount ?? 0}
              </p>
            </Link>

            {/* Clients — top 3 by open requirements */}
            <div className="col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">Clients</h3>
                <Link to="/clients" className="text-[10px] text-primary/60 hover:text-primary transition-colors font-semibold">
                  {!loading && `${stats?.totalClients ?? 0} total →`}
                </Link>
              </div>
              {loading ? (
                <div className="h-16 flex items-center text-on-surface-variant/40 text-sm">…</div>
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
                      <div key={client.name} className="rounded-xl p-3.5 min-w-[100px]" style={{ backgroundColor: p.bg }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-2 truncate" style={{ color: p.lbl }}>{client.name}</p>
                        <p className="text-[2rem] font-light leading-none" style={{ color: p.num }}>{client.count}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Talent Pool */}
            <Link
              to="/talent"
              className="block bg-surface-container-lowest rounded-2xl p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-outline-variant/10 hover:shadow-[0_4px_24px_rgba(24,28,30,0.08)] transition-shadow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">Talent Pool</h3>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40">people</span>
              </div>
              <p className="text-5xl tracking-tighter font-light text-primary">
                {loading ? '…' : (stats?.totalCandidates ?? 0).toLocaleString()}
              </p>
              {!loading && (
                <p className="text-[11px] text-on-surface-variant mt-2">
                  <span className="text-primary font-semibold">+{stats?.monthlySent ?? 0}</span> Agregados al Talent Pool en {new Date().toLocaleDateString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                </p>
              )}
            </Link>

          </div>

          {/* ── CHARTS SECTION ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Donut: Open requirements by client */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-1">Open Requirements</h2>
              <p className="text-[11px] text-white/60 mb-5">Por cliente</p>

              {loading ? (
                <div className="flex items-center justify-center h-28">
                  <span className="material-symbols-outlined animate-spin text-[22px] text-white/40">progress_activity</span>
                </div>
              ) : (
                <>
                  <DonutChart segments={clientSegments} total={stats?.openCount ?? 0} />
                  <div className="mt-5 space-y-2">
                    {clientSegments.map(seg => (
                      <div key={seg.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[11px] text-white/70 flex-1 truncate">{seg.name}</span>
                        <span className="text-[11px] font-semibold text-white">{seg.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bar chart: Open reqs by client */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-1">Por Cliente</h2>
              <p className="text-[11px] text-white/60 mb-5">Open requirements</p>

              {loading ? (
                <div className="flex items-center justify-center h-28">
                  <span className="material-symbols-outlined animate-spin text-[22px] text-white/40">progress_activity</span>
                </div>
              ) : !stats?.topClients?.length ? (
                <p className="text-[11px] text-white/50 text-center py-8">No open requirements</p>
              ) : (
                <div className="space-y-3 mt-2">
                  {stats.topClients.map(c => (
                    <HBar key={c.name} label={c.name} count={c.count} max={maxClientCount} color="#50B152" />
                  ))}
                </div>
              )}
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
              const div = parseFloat(divisor)
              const ratio = divisor !== '' && div > 0 ? (sent / div).toFixed(1) : null
              const isoWeek = getISOWeek()
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Current week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">calendar_today</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Semana</span>
                    </div>
                    <p className="text-5xl font-light tracking-tighter text-primary">{isoWeek}</p>
                    <p className="text-[10px] text-on-surface-variant">semana ISO actual</p>
                  </div>

                  {/* Sent this week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: '#50B152' }}>send</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Sent</span>
                    </div>
                    <p className="text-5xl font-light tracking-tighter" style={{ color: '#50B152' }}>{sent}</p>
                    <p className="text-[10px] text-on-surface-variant">enviados al cliente</p>
                  </div>

                  {/* Rejected this week */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: '#ba1a1a' }}>cancel</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Rejected</span>
                    </div>
                    <p className="text-5xl font-light tracking-tighter" style={{ color: '#ba1a1a' }}>
                      {stats?.weeklyRejected ?? 0}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">candidatos rechazados</p>
                  </div>

                  {/* Ratio calculator */}
                  <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">calculate</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Ratio</span>
                    </div>
                    <p className="text-5xl font-light tracking-tighter text-primary">
                      {ratio !== null ? ratio : <span className="text-on-surface-variant/30">—</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-on-surface-variant">÷</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="meta"
                        value={divisor}
                        onChange={e => setDivisor(e.target.value)}
                        className="w-full bg-surface-container rounded-lg px-2 py-1 text-[11px] text-primary placeholder:text-on-surface-variant/30 border border-outline-variant/20 focus:outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── ACTIVE REQUIREMENTS LIST ── */}
          <div className="bg-surface-container-low rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Active Requirements</h2>
                <p className="text-xs text-white/60 mt-0.5">Most recent requisitions</p>
              </div>
              <Link to="/requirements" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-white/60">
                <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : !stats?.recentRequirements?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-[44px] text-white/25 mb-3">assignment</span>
                <p className="text-sm font-medium text-white/60">No requirements yet</p>
                {can('requirements.create') && (
                  <Link to="/requirements/new" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[15px]">add</span>Create one
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentRequirements.map(req => {
                  const pri = PRIORITY[req.priority] ?? PRIORITY[2]
                  return (
                    <Link
                      key={req.id}
                      to="/requirements"
                      className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 hover:shadow-[0_4px_20px_rgba(24,28,30,0.07)] transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pri.bg}`}>
                        <span className={`material-symbols-outlined text-[18px] ${pri.text}`}>assignment</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-mono text-on-surface-variant">{reqLabel(req.req_number, req.created_at)}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${pri.bg} ${pri.text}`}>{pri.label}</span>
                        </div>
                        <p className="font-semibold text-primary text-sm group-hover:text-surface-tint transition-colors truncate">{req.job_title}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{req.client?.name ?? '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Target</p>
                        <p className="text-sm font-semibold text-primary mt-0.5">{fmt(req.target_fill_date)}</p>
                        {req.status?.name && (
                          <span className="text-[10px] font-medium text-on-surface-variant">{req.status.name}</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
