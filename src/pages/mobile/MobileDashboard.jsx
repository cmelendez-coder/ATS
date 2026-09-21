import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardStats, getMonthlySentCount } from '../../api/dashboard'
import { useRefreshOnFocus, useRouteSheet } from './hooks'
import { Skeleton, Sheet } from './ui'

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getISOWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

function HeroStat({ icon, label, note, value, color, loading }) {
  return (
    <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3.5">
      <div className="flex items-center gap-1.5 text-white/70">
        <span className="material-symbols-outlined text-[1.125rem]" style={{ color }}>{icon}</span>
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1.5 h-10 flex items-center">
        {loading
          ? <Skeleton tone="dark" className="h-9 w-14" />
          : <p className="text-[2.5rem] leading-none font-light tracking-tighter" style={{ color }}>{value}</p>}
      </div>
      <p className="text-[0.6875rem] text-white/60 mt-1">{note}</p>
    </div>
  )
}

function NumberTile({ icon, label, value, loading }) {
  return (
    <div className="rounded-2xl bg-[#0b2a58] p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-white/60">
        <span className="material-symbols-outlined text-[1.125rem]">{icon}</span>
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="h-10 flex items-center">
        {loading
          ? <Skeleton tone="dark" className="h-9 w-16" />
          : <p className="text-[2.5rem] leading-none font-light tracking-tighter text-[#81b927]">{value}</p>}
      </div>
    </div>
  )
}

function PipelineTile({ icon, iconColor, label, value, note, onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 flex flex-col gap-1 active:bg-[#eef3f7] transition-colors"
    >
      <div className="flex items-center justify-between text-[#4e5c70]">
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">{label}</span>
        <span className="material-symbols-outlined text-[1.125rem]" style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="h-10 flex items-center">
        {loading
          ? <Skeleton className="h-9 w-14" />
          : <p className="text-[2.5rem] leading-none font-light tracking-tighter" style={{ color: iconColor }}>{value}</p>}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[0.6875rem] font-medium italic text-[#4e5c70]">{note}</p>
        <span className="material-symbols-outlined text-[1rem] text-[#4e5c70]/60">chevron_right</span>
      </div>
    </button>
  )
}

export default function MobileDashboard() {
  const { session } = useAuth()
  const now = new Date()

  const [stats, setStats]           = useState(null)
  const [error, setError]           = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [month, setMonth]           = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [monthCount, setMonthCount] = useState(null)
  const [monthTick, setMonthTick]   = useState(0)

  // La hoja se guarda en el historial de navegación: el botón "atrás" del celular la cierra
  const { sheet: rawSheet, openSheet, closeSheet } = useRouteSheet()
  const sheet = stats ? rawSheet : null

  const loadStats = useCallback(() => {
    setRefreshing(true)
    setError(false)
    getDashboardStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setRefreshing(false))
  }, [])

  const refreshAll = useCallback(() => { loadStats(); setMonthTick(t => t + 1) }, [loadStats])

  useEffect(() => { loadStats() }, [loadStats])
  useRefreshOnFocus(refreshAll)

  useEffect(() => {
    let cancelled = false
    getMonthlySentCount(month.year, month.month)
      .then(n => { if (!cancelled) setMonthCount(n) })
      .catch(() => { if (!cancelled) setMonthCount(0) })
    return () => { cancelled = true }
  }, [month.year, month.month, monthTick])

  function shiftMonth(delta) {
    setMonthCount(null)
    setMonth(p => {
      const d = new Date(p.year, p.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const first = !stats && !error // primera carga: se muestran esqueletos
  const firstName = String(session?.user?.name ?? '').trim().split(/\s+/)[0]
  const today = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const maxClient = Math.max(...(stats?.topClients ?? []).map(c => c.count), 1)

  const sheetRows = sheet === 'general' ? stats?.pipelineList : stats?.finalStageList
  const sheetGroups = Object.entries(
    (sheetRows ?? []).reduce((acc, r) => { (acc[r.client] ??= []).push(r); return acc }, {})
  )

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Cabecera de la semana */}
      <section
        className="relative overflow-hidden rounded-3xl p-5"
        style={{ background: 'linear-gradient(145deg, #0e3670 0%, #071d47 65%)' }}
      >
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(129,185,39,0.32) 0%, rgba(129,185,39,0) 70%)' }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/70">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <p className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-white mt-0.5">Semana {getISOWeek()}</p>
            <p className="text-xs font-medium text-white/60 first-letter:uppercase">{today}</p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            aria-label="Actualizar"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white/10 border border-white/15 text-[#81b927] active:bg-white/20 disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[1.375rem] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
        <div className="relative grid grid-cols-2 gap-3 mt-5">
          <HeroStat icon="send"   label="Sent"     color="#81b927" note="enviados al cliente" value={stats?.weeklySent ?? 0}     loading={first} />
          <HeroStat icon="cancel" label="Rejected" color="#ff8a80" note="rechazados"          value={stats?.weeklyRejected ?? 0} loading={first} />
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          No se pudo cargar la información. Revisa tu conexión y toca el botón de actualizar.
        </div>
      )}

      {/* Requerimientos y talento */}
      <section className="grid grid-cols-2 gap-3">
        <NumberTile icon="assignment" label="Open Req." value={stats?.openCount ?? 0} loading={first} />
        <NumberTile icon="people" label="Talent Pool" value={(stats?.totalCandidates ?? 0).toLocaleString()} loading={first} />
      </section>

      {/* Agregados al Talent Pool — mes navegable */}
      <section className="rounded-2xl bg-[#81b927] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#10284d]/70">Este mes</h2>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/25 active:bg-white/40">
              <span className="material-symbols-outlined text-[1.25rem] text-[#10284d]">chevron_left</span>
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/25 active:bg-white/40">
              <span className="material-symbols-outlined text-[1.25rem] text-[#10284d]">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="h-[3rem] flex items-center mt-1">
          {monthCount === null
            ? <div className="animate-pulse h-10 w-24 rounded-lg bg-white/30" />
            : <p className="text-[3rem] leading-none font-light tracking-tighter text-white">+{monthCount}</p>}
        </div>
        <p className="text-xs font-semibold text-[#10284d]/80 mt-1">
          Agregados al Talent Pool en {MESES_ES[month.month]} {month.year}
        </p>
      </section>

      {/* Pipeline */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e5c70] px-1">Pipeline de candidatos</h2>
        <div className="grid grid-cols-2 gap-3">
          <PipelineTile
            icon="hub" iconColor="#4e90d0" label="General" note="en proceso"
            value={stats?.activePipelineCount ?? 0} loading={first} onClick={() => openSheet('general')}
          />
          <PipelineTile
            icon="bolt" iconColor="#1f6d44" label="Últimas 2 etapas" note="candidatos"
            value={stats?.finalStageCount ?? 0} loading={first} onClick={() => openSheet('final')}
          />
        </div>
      </section>

      {/* Requerimientos abiertos por cliente */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e5c70] px-1">Requerimientos abiertos por cliente</h2>
        <div className="rounded-2xl bg-white border border-[#10284d]/10 divide-y divide-[#10284d]/8">
          {first && [0, 1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-5" /></div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
          {!first && (stats?.topClients ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[#4e5c70]">Sin requerimientos abiertos.</p>
          )}
          {(stats?.topClients ?? []).map(c => (
            <div key={c.name} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold truncate">{c.name}</span>
                <span className="text-lg font-light text-[#1f6d44] tabular-nums">{c.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-[#10284d]/8 overflow-hidden">
                <div className="h-full rounded-full bg-[#81b927]" style={{ width: `${(c.count / maxClient) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {sheet && (
        <Sheet
          title={sheet === 'general' ? 'Pipeline General' : 'Candidatos — últimas etapas'}
          subtitle={`${sheetRows?.length ?? 0} candidato${(sheetRows?.length ?? 0) !== 1 ? 's' : ''} · por cliente`}
          onClose={closeSheet}
        >
          {sheetGroups.length === 0 && <p className="py-10 text-center text-sm text-white/40">Sin candidatos</p>}
          {sheetGroups.map(([client, rows]) => (
            <div key={client}>
              <div className="sticky top-0 flex items-center justify-between px-5 py-2 bg-[#0b2a58]">
                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">{client}</span>
                <span className="text-[0.6875rem] font-bold text-white/50">{rows.length}</span>
              </div>
              {rows.map(r => (
                <div key={r.id} className="px-5 py-3 border-b border-white/[0.06]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{r.candidate}</p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold" style={{ backgroundColor: '#81b9271f', color: '#81b927' }}>{r.stage}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">{r.position}</p>
                </div>
              ))}
            </div>
          ))}
        </Sheet>
      )}
    </div>
  )
}
