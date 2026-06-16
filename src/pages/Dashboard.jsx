import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useRequirementAlerts } from '../hooks/useRequirementAlerts'
import { getDashboardStats } from '../api/dashboard'
import RequirementAlertBell from '../components/RequirementAlertBell'

const PRIORITY = {
  0: { label: 'Alta',  bg: 'bg-error-container',        text: 'text-on-error-container',        dot: 'bg-error' },
  1: { label: 'Media', bg: 'bg-secondary-container',    text: 'text-on-secondary-container',    dot: 'bg-secondary' },
  2: { label: 'Baja',  bg: 'bg-surface-variant',        text: 'text-on-surface-variant',         dot: 'bg-outline' },
  3: { label: 'Pausa', bg: 'bg-surface-container',      text: 'text-on-surface-variant/60',      dot: 'bg-outline-variant' },
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function reqLabel(num, date) {
  const yr = date ? new Date(date).getFullYear() : new Date().getFullYear()
  return `REQ-${yr}-${String(num ?? 0).padStart(3, '0')}`
}

export default function Dashboard() {
  const { can } = usePermissions()
  const { pendingCount, loading: alertsLoading, showAlerts } = useRequirementAlerts()
  const [currentDate, setCurrentDate] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const activeCount   = stats?.candidateStatusMap?.['Activo'] ?? 0
  const highPriority  = stats?.recentRequirements?.filter(r => r.priority === 3).length ?? 0

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <RequirementAlertBell count={pendingCount} loading={alertsLoading} show={showAlerts} />
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
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
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Overview</h1>
            </div>
            <p className="text-sm font-medium text-on-surface-variant shrink-0 pb-1">{currentDate}</p>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                to: '/requirements',
                label: 'Requirements',
                value: loading ? '…' : stats?.totalRequirements ?? 0,
                icon: 'assignment',
                sub: loading ? '' : `${highPriority} high priority`,
                gradient: 'from-primary/[0.04] to-transparent',
              },
              {
                to: '/clients',
                label: 'Clients',
                value: loading ? '…' : stats?.totalClients ?? 0,
                icon: 'business',
                sub: 'Active portfolios',
                gradient: 'from-secondary/[0.06] to-transparent',
              },
              {
                to: '/talent',
                label: 'Talent Pool',
                value: loading ? '…' : (stats?.totalCandidates ?? 0).toLocaleString(),
                icon: 'people',
                sub: loading ? '' : `${activeCount.toLocaleString()} activos`,
                gradient: 'from-tertiary/[0.05] to-transparent',
              },
            ].map(card => (
              <Link
                key={card.label}
                to={card.to}
                className="stat-card block bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-outline-variant/10 hover:shadow-[0_4px_24px_rgba(24,28,30,0.08)] transition-shadow"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">{card.label}</h3>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40">{card.icon}</span>
                </div>
                <p className="text-5xl tracking-tighter font-light text-primary">{card.value}</p>
                {card.sub && <p className="text-xs text-on-surface-variant mt-2">{card.sub}</p>}
              </Link>
            ))}
          </div>

          {/* Requirements Table */}
          <div className="bg-surface-container-low rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-primary">Active Requirements</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Most recent requisitions</p>
              </div>
              <Link to="/requirements" className="text-sm font-medium text-surface-tint hover:text-primary transition-colors flex items-center gap-1">
                View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : !stats?.recentRequirements?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-[44px] text-on-surface-variant/25 mb-3">assignment</span>
                <p className="text-sm font-medium text-on-surface-variant">No requirements yet</p>
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
