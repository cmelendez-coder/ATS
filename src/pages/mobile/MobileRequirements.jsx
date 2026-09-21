import { useState, useMemo } from 'react'
import { listRequirements, getOpenRequirementsForBoard, getWeeklyBoardStats } from '../../api/requirements'
import { useRefreshOnFocus, useRouteSheet, useCachedResource } from './hooks'
import { Skeleton, Sheet, UpdatedAt, getISOWeek, dateOnly, weekLabel } from './ui'
import { PipelineView } from './PipelineViews'
import { priorityStyle, PRIORITY_MEANING } from './priority'

function PriorityChip({ p, long }) {
  const st = priorityStyle(p)
  return (
    <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold" style={{ backgroundColor: st.bg, color: st.fg }}>
      {long ? 'Prioridad ' : 'P'}{p ?? '—'}
    </span>
  )
}

function money(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('en-US')}` : null
}

/* ─────────────── Lista de requerimientos ─────────────── */

function RequirementCard({ req, closed, onOpen }) {
  const salary = money(req.salary_cap)
  const chips = [
    `${req.fte_count ?? 1} FTE`,
    salary ? `${salary}${req.variable && parseFloat(req.variable) !== 0 ? ` · ${req.variable}` : ''}` : null,
    `${req.rc_count?.length ?? 0} candidato${(req.rc_count?.length ?? 0) === 1 ? '' : 's'}`,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-2.5 active:bg-[#eef3f7] shadow-[0_1px_2px_rgba(16,40,77,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[0.9375rem] font-bold leading-snug text-[#10284d]">{req.job_title}</h3>
        <PriorityChip p={req.priority} />
      </div>
      <p className="text-xs text-[#4e5c70]">
        {[req.work_arrangement?.name, req.desired_location].filter(Boolean).join(' · ') || 'Sin modalidad'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => <span key={c} className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">{c}</span>)}
        {closed && req.covered_by_everscale === true && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[0.6875rem] font-bold">Cubierta por Everscale</span>}
        {closed && req.covered_by_everscale === false && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[0.6875rem] font-bold">No cubierta</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] text-[#4e5c70]">
          {req.application_date ? `Abierto el ${dateOnly(req.application_date)}` : ''}
        </span>
        <span className="material-symbols-outlined text-[1.125rem] text-[#4e5c70]/60">chevron_right</span>
      </div>
    </button>
  )
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  )
}

function TextBlock({ label, value }) {
  if (!value) return null
  return (
    <div className="px-5 py-3 border-b border-white/[0.06]">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-sm text-white/90 whitespace-pre-line break-words">{value}</p>
    </div>
  )
}

function RequirementDetail({ req }) {
  const closed = String(req.status?.name ?? '').startsWith('Closed')
  const salary = money(req.salary_cap)
  return (
    <div className="pb-4">
      <div className="px-5 py-4 border-b border-white/[0.06] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityChip p={req.priority} long />
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[0.6875rem] font-bold">{closed ? 'Cerrado' : (req.status?.name ?? '—')}</span>
          {closed && req.covered_by_everscale === true && <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[0.6875rem] font-bold">Cubierta por Everscale</span>}
          {closed && req.covered_by_everscale === false && <span className="px-2.5 py-0.5 rounded-full bg-red-400/20 text-red-200 text-[0.6875rem] font-bold">No cubierta</span>}
        </div>
        {PRIORITY_MEANING[req.priority] && <p className="text-xs text-white/60">{PRIORITY_MEANING[req.priority]}</p>}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="FTE's" value={req.fte_count ?? 1} />
          <Field label="Salary cap" value={salary ? `${salary}${req.variable && parseFloat(req.variable) !== 0 ? ` + ${req.variable}` : ''}` : null} />
          <Field label="Modalidad" value={req.work_arrangement?.name} />
          <Field label="Ubicación" value={req.desired_location} />
          <Field label="Duración" value={req.duration} />
          <Field label="Visa US" value={req.visa_us_required ? 'Requerida' : null} />
          <Field label="Recruiter" value={req.recruiter} />
          <Field label="Everscale / Interno" value={req.everscale_count != null || req.interno_count != null ? `${req.everscale_count ?? 0} / ${req.interno_count ?? 0}` : null} />
          <Field label="Abierto el" value={dateOnly(req.application_date)} />
          <Field label="Fecha objetivo" value={dateOnly(req.target_fill_date)} />
          <Field label="Primer envío" value={dateOnly(req.first_resource_sent)} />
          <Field label="Etapa" value={req.stage} />
        </div>
      </div>
      {closed && <TextBlock label="Razón de cierre" value={req.close_reason} />}
      <TextBlock label="Requisitos técnicos" value={req.tech_reqs} />
      <TextBlock label="Solicitud especial" value={req.special_request} />
      <TextBlock label="Notas" value={req.notes} />

      <div className="sticky top-0 z-[1] px-5 py-2 mt-1 bg-[#0b2a58] text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">Pipeline</div>
      <PipelineView reqId={req.id} clientId={req.client?.id ?? null} />
    </div>
  )
}

function RequirementsList() {
  const [tab, setTab]               = useState('open')
  const [query, setQuery]           = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const { sheet, openSheet, closeSheet } = useRouteSheet()

  // Datos guardados: se ven al instante y se actualizan en segundo plano
  const { data: reqs, error, refreshing, updatedAt, reload: load } = useCachedResource(
    'reqs',
    () => listRequirements({ excludePending: true })
  )
  useRefreshOnFocus(load)

  const first = !reqs && !error
  const all = reqs ?? []
  const openCount   = all.filter(r => r.status?.name === 'Open').length
  const closedCount = all.filter(r => String(r.status?.name ?? '').startsWith('Closed')).length

  const clientOptions = useMemo(() => [...new Set(
    all.filter(r => tab === 'open' ? r.status?.name === 'Open' : String(r.status?.name ?? '').startsWith('Closed')).map(r => r.client?.name).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b)), [all, tab])

  const q = query.trim().toLowerCase()
  const visible = all
    .filter(r => tab === 'open' ? r.status?.name === 'Open' : String(r.status?.name ?? '').startsWith('Closed'))
    .filter(r => !clientFilter || r.client?.name === clientFilter)
    .filter(r => !q || (r.job_title ?? '').toLowerCase().includes(q) || (r.client?.name ?? '').toLowerCase().includes(q))
    .sort((a, b) => ((a.priority ?? 99) - (b.priority ?? 99)) || String(b.created_at).localeCompare(String(a.created_at)))

  const groups = Object.entries(visible.reduce((acc, r) => { (acc[r.client?.name ?? 'Sin cliente'] ??= []).push(r); return acc }, {}))
    .sort(([a], [b]) => a.localeCompare(b))

  const detailReq = sheet?.kind === 'req' ? all.find(r => r.id === sheet.id) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#10284d]/[0.08]">
        {[{ key: 'open', label: 'Abiertos', n: openCount }, { key: 'closed', label: 'Cerrados', n: closedCount }].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setClientFilter('') }}
            className={`h-10 rounded-xl text-sm font-bold transition-colors ${tab === t.key ? 'bg-[#071d47] text-white shadow-sm' : 'text-[#10284d]'}`}
          >
            {t.label} {reqs ? <span className="opacity-70 font-semibold">{t.n}</span> : ''}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[1.25rem] text-[#4e5c70] pointer-events-none">search</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar puesto o cliente…"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-[#10284d]/10 text-base placeholder:text-[#4e5c70]/70 focus:outline-none focus:border-[#1f6d44]"
          />
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          aria-label="Actualizar"
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white border border-[#10284d]/10 text-[#1f6d44] active:bg-[#dfeadd] disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[1.375rem] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {clientOptions.length > 1 && (
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="w-full h-11 px-3 rounded-xl bg-white border border-[#10284d]/10 text-base text-[#10284d] focus:outline-none focus:border-[#1f6d44]"
        >
          <option value="">Todos los clientes</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      <UpdatedAt t={updatedAt} refreshing={refreshing} className="px-1 -mt-1" />

      {error && (
        <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {reqs
            ? 'No se pudo actualizar. Estás viendo la última información guardada; toca el botón de actualizar para reintentar.'
            : 'No se pudo cargar la lista. Revisa tu conexión y toca el botón de actualizar.'}
        </div>
      )}

      {first && (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-3">
              <div className="flex justify-between gap-3"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-5 w-10 rounded-full" /></div>
              <Skeleton className="h-3 w-2/5" />
              <div className="flex gap-1.5"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
            </div>
          ))}
        </div>
      )}

      {reqs && visible.length === 0 && (
        <p className="py-12 text-center text-sm text-[#4e5c70]">No hay requerimientos {tab === 'open' ? 'abiertos' : 'cerrados'} con esos filtros.</p>
      )}

      {groups.map(([client, rows]) => (
        <section key={client} className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#10284d]">{client}</h2>
            <span className="text-xs font-semibold text-[#4e5c70]">{rows.length}</span>
            <div className="flex-1 h-px bg-[#10284d]/10" />
          </div>
          {rows.map(r => <RequirementCard key={r.id} req={r} closed={tab === 'closed'} onOpen={() => openSheet({ kind: 'req', id: r.id })} />)}
        </section>
      ))}

      {detailReq && (
        <Sheet title={detailReq.job_title} subtitle={detailReq.client?.name} onClose={closeSheet}>
          <RequirementDetail req={detailReq} />
        </Sheet>
      )}
    </div>
  )
}

/* ─────────────── Prioridades semanales (solo lectura) ─────────────── */

const CLIENT_LAST = ['LogicMonitor', 'PacVue']
function clientRank(name) {
  const i = CLIENT_LAST.findIndex(n => n.toLowerCase() === String(name ?? '').toLowerCase())
  return i === -1 ? 0 : i + 1
}

function KpiCell({ label, value, loading }) {
  return (
    <div className="rounded-xl bg-white/[0.08] border border-white/10 px-3 py-2.5">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/60">{label}</p>
      <div className="h-8 flex items-center">
        {loading ? <Skeleton tone="dark" className="h-6 w-10" /> : <p className="text-[1.75rem] leading-none font-light text-[#81b927]">{value}</p>}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="text-center rounded-xl bg-[#10284d]/[0.05] py-2">
      <p className="text-[0.5625rem] font-bold uppercase tracking-wider text-[#4e5c70]">{label}</p>
      <p className="text-lg font-semibold text-[#10284d] leading-tight">{value ?? '—'}</p>
    </div>
  )
}

function PriorityBoard() {
  const { week: curWeek, year: curYear } = getISOWeek()
  const [week, setWeek] = useState(curWeek)
  const [year, setYear] = useState(curYear)

  const tooOld = year < 2026 || (year === 2026 && week < 33) // el tablero existe desde la semana 33 de 2026

  // Datos guardados por semana: se ven al instante y se actualizan en segundo plano
  const { data: board, error, refreshing, loading, updatedAt, reload } = useCachedResource(
    `board:${year}:${week}`,
    async () => {
      const [boardRows, stats] = await Promise.all([getOpenRequirementsForBoard(week, year), getWeeklyBoardStats(week, year)])
      return { rows: boardRows, kpi: stats }
    },
    { enabled: !tooOld }
  )
  const rows = board?.rows ?? []
  const kpi = board?.kpi ?? null
  useRefreshOnFocus(reload)

  function prevWeek() { if (week === 1) { setWeek(52); setYear(y => y - 1) } else setWeek(w => w - 1) }
  function nextWeek() { if (week === 52) { setWeek(1); setYear(y => y + 1) } else setWeek(w => w + 1) }
  const isCurrent = week === curWeek && year === curYear

  const enBusqueda = rows.filter(r => r.activo).length
  const promedio = enBusqueda > 0 && kpi ? (kpi.sent / enBusqueda).toFixed(1) : '0.0'

  const grouped = Object.entries(rows.reduce((acc, r) => { (acc[r.cliente ?? '—'] ??= []).push(r); return acc }, {}))
    .sort(([a], [b]) => clientRank(a) - clientRank(b) || a.localeCompare(b))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-white border border-[#10284d]/10 px-2 py-1">
        <button type="button" onClick={prevWeek} aria-label="Semana anterior" className="w-11 h-11 flex items-center justify-center rounded-full text-[#10284d] active:bg-[#10284d]/10">
          <span className="material-symbols-outlined text-[1.5rem]">chevron_left</span>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-[#10284d]">{weekLabel(week, year)}</p>
          {!isCurrent
            ? <button type="button" onClick={() => { setWeek(curWeek); setYear(curYear) }} className="text-xs font-semibold text-[#1f6d44]">Ir a esta semana</button>
            : <p className="text-xs text-[#4e5c70]">Semana actual</p>}
        </div>
        <div className="flex items-center">
          <button type="button" onClick={reload} disabled={refreshing} aria-label="Actualizar" className="w-10 h-11 flex items-center justify-center rounded-full text-[#1f6d44] active:bg-[#dfeadd] disabled:opacity-60">
            <span className={`material-symbols-outlined text-[1.25rem] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button type="button" onClick={nextWeek} aria-label="Semana siguiente" className="w-11 h-11 flex items-center justify-center rounded-full text-[#10284d] active:bg-[#10284d]/10">
            <span className="material-symbols-outlined text-[1.5rem]">chevron_right</span>
          </button>
        </div>
      </div>

      {tooOld ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-6 text-center">
          <p className="text-sm font-bold text-amber-900">No hay información para esta semana</p>
          <p className="text-xs text-amber-800/80 mt-1">Esta sección se implementó a partir de la semana 33.</p>
        </div>
      ) : (
        <>
          <section className="rounded-3xl p-4" style={{ background: 'linear-gradient(145deg, #0e3670 0%, #071d47 65%)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">Prioridades semanales</p>
            <div className="grid grid-cols-3 gap-2">
              <KpiCell label="Abiertos" value={kpi?.activePositions ?? 0} loading={loading} />
              <KpiCell label="En búsqueda" value={enBusqueda} loading={loading} />
              <KpiCell label="Enviados" value={kpi?.sent ?? 0} loading={loading} />
              <KpiCell label="Rechazados" value={kpi?.rejected ?? 0} loading={loading} />
              <KpiCell label="Promedio" value={promedio} loading={loading} />
              <KpiCell label="Semana" value={week} loading={false} />
            </div>
          </section>

          <UpdatedAt t={updatedAt} refreshing={refreshing} className="px-1" />

          {error && (
            <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {board
                ? 'No se pudo actualizar. Estás viendo la última información guardada; toca el botón de actualizar para reintentar.'
                : 'No se pudo cargar el tablero. Revisa tu conexión y toca el botón de actualizar.'}
            </div>
          )}

          {loading && <div className="space-y-2.5"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-32 w-full rounded-2xl" /></div>}

          {!loading && !error && rows.length === 0 && <p className="py-10 text-center text-sm text-[#4e5c70]">Sin posiciones abiertas.</p>}

          {!loading && grouped.map(([client, list]) => {
            const sorted = [...list].sort((a, b) => (b.activo ? 1 : 0) - (a.activo ? 1 : 0) || (a.prioridad ?? 99) - (b.prioridad ?? 99))
            return (
              <section key={client} className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#10284d] px-4 py-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white">{client}</h2>
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/70">
                    Búsqueda {list.filter(r => r.activo).length} · Hold {list.filter(r => !r.activo).length}
                  </p>
                </div>
                {sorted.map(r => (
                  <article
                    key={r.requirement_id}
                    className={`relative overflow-hidden rounded-2xl border p-4 space-y-3 ${
                      r.prioridad === 5 ? 'offer-card' : r.activo ? 'bg-[#f3faf3] border-[#50b152]/25' : 'bg-[#fff6ee] border-[#ea580c]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[0.9375rem] font-bold leading-snug text-[#10284d]">{r.position}</h3>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold ${r.activo ? 'bg-[#50b152]/20 text-[#1f6d44]' : 'bg-[#ea580c]/15 text-[#9a3412]'}`}>
                        {r.activo ? 'En búsqueda' : 'On hold'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityChip p={r.prioridad} long />
                      <span className="text-xs font-semibold text-[#4e5c70]">{r.recruiter || 'Sin recruiter'}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <Metric label="FTE's" value={r.ftes} />
                      <Metric label="Everscale" value={r.everscale} />
                      <Metric label="Interno" value={r.interno} />
                      <Metric label="Enviados" value={r.enviados} />
                    </div>
                  </article>
                ))}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ─────────────── Pantalla ─────────────── */

export default function MobileRequirements() {
  const [view, setView] = useState('list') // 'list' | 'board'
  return (
    <div className="px-4 pb-6">
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-2 bg-[#f2f5f9]/95 backdrop-blur">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#10284d]/[0.08]">
          {[{ key: 'list', label: 'Requerimientos' }, { key: 'board', label: 'Prioridades' }].map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`h-10 rounded-xl text-sm font-bold transition-colors ${view === v.key ? 'bg-white text-[#10284d] shadow-sm' : 'text-[#4e5c70]'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-1">
        {view === 'list' ? <RequirementsList /> : <PriorityBoard />}
      </div>
    </div>
  )
}
