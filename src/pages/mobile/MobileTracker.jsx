import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchTrackerEntries, recruiterFromEmail } from '../../api/tracker'

const TABS = [
  { key: 'cesar',   label: 'César'   },
  { key: 'enrique', label: 'Enrique' },
]

const STATUS_ORDER = { 'Review': 0, 'Contacted': 1, 'Screening': 2, 'CV': 3, 'Sent': 4, 'On Hold': 5, 'HSE': 6, 'Backed Out': 7, 'Rejected': 8 }

// Colores para fondo claro
const STATUS_STYLE = {
  'Review':     { bg: '#fef3c7', fg: '#92400e' },
  'Contacted':  { bg: '#d1fae5', fg: '#065f46' },
  'CV':         { bg: '#ede9fe', fg: '#5b21b6' },
  'Screening':  { bg: '#dbeafe', fg: '#1e40af' },
  'Sent':       { bg: '#fce7f3', fg: '#9d174d' },
  'Rejected':   { bg: '#fee2e2', fg: '#991b1b' },
  'HSE':        { bg: '#fef9c3', fg: '#854d0e' },
  'On Hold':    { bg: '#e2e8f0', fg: '#334155' },
  'Backed Out': { bg: '#e4e4e7', fg: '#3f3f46' },
}
const DEFAULT_STYLE = { bg: '#e2e8f0', fg: '#334155' }

function getISOWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return { week: 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7), year: d.getFullYear() }
}

function toAbsoluteUrl(url) {
  if (!url) return null
  const t = url.trim()
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function money(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('en-US')}` : String(v)
}

function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function ActionLink({ href, icon, label, external }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex-1 min-w-0 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-[#10284d]/[0.06] text-[#10284d] text-xs font-semibold active:bg-[#10284d]/15"
    >
      <span className="material-symbols-outlined text-[1.125rem]">{icon}</span>
      {label}
    </a>
  )
}

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[#4e5c70]">{label}</p>
      <p className="text-sm text-[#10284d] break-words whitespace-pre-line">{value}</p>
    </div>
  )
}

function CandidateCard({ row }) {
  const [open, setOpen] = useState(false)
  const st = STATUS_STYLE[row.status] ?? DEFAULT_STYLE
  const req = row.requirement
  const salary = money(row.salary)
  const ote = money(row.ote)
  const screening = row.status === 'Screening' ? formatDateTime(row.screening_datetime) : null
  const hasDetails = row.target_role || row.technologies || row.skills || row.modules || row.notes || row.email || row.phone || row.state || row.yoe || screening || row.screening_note

  const chips = [
    row.english_score ? `English ${row.english_score}` : null,
    salary ? `${salary}${row.amount_type ? ` ${row.amount_type}` : ''}` : null,
    ote ? `OTE ${ote}` : null,
    row.yoe ? `${row.yoe} YoE` : null,
  ].filter(Boolean)

  const cv = toAbsoluteUrl(row.cv_url)
  const linkedin = toAbsoluteUrl(row.linkedin_url)

  return (
    <article className="rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[0.9375rem] font-bold leading-snug text-[#10284d]">{row.candidate_name || 'Sin nombre'}</h3>
        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold" style={{ backgroundColor: st.bg, color: st.fg }}>
          {row.status}
        </span>
      </div>

      {(req?.job_title || req?.client?.name) && (
        <p className="text-xs text-[#4e5c70] -mt-1.5">
          <span className="font-semibold text-[#10284d]">{req?.job_title ?? '—'}</span>
          {req?.client?.name ? ` · ${req.client.name}` : ''}
        </p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">{c}</span>
          ))}
        </div>
      )}

      {(cv || linkedin || row.phone || row.email) && (
        <div className="flex gap-2">
          {cv && <ActionLink href={cv} icon="description" label="CV" external />}
          {linkedin && <ActionLink href={linkedin} icon="link" label="LinkedIn" external />}
          {row.phone && <ActionLink href={`tel:${String(row.phone).replace(/\s+/g, '')}`} icon="call" label="Llamar" />}
          {row.email && <ActionLink href={`mailto:${row.email}`} icon="mail" label="Correo" />}
        </div>
      )}

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="w-full flex items-center justify-center gap-1 h-9 rounded-xl text-xs font-semibold text-[#1f6d44] active:bg-[#dfeadd]"
          >
            {open ? 'Ocultar detalle' : 'Ver detalle'}
            <span className="material-symbols-outlined text-[1.125rem]">{open ? 'expand_less' : 'expand_more'}</span>
          </button>
          {open && (
            <div className="space-y-3 pt-1 border-t border-[#10284d]/8">
              <div className="pt-3 space-y-3">
                <Detail label="Screening" value={screening} />
                <Detail label="Nota de screening" value={row.screening_note} />
                <Detail label="Target role" value={row.target_role} />
                <Detail label="Estado" value={row.state} />
                <Detail label="Technologies" value={row.technologies} />
                <Detail label="Skills" value={row.skills} />
                <Detail label="Modules" value={row.modules && row.modules !== 'N/A' ? row.modules : null} />
                <Detail label="Email" value={row.email} />
                <Detail label="Teléfono" value={row.phone} />
                <Detail label="Notas" value={row.notes} />
              </div>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default function MobileTracker() {
  const { session } = useAuth()
  const myRecruiter = recruiterFromEmail(session?.user?.email ?? '')
  const { week: currentWeek, year: currentYear } = getISOWeek()

  const [recruiter, setRecruiter] = useState(myRecruiter ?? 'cesar')
  const [week, setWeek]           = useState(currentWeek)
  const [year, setYear]           = useState(currentYear)
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [reqFilter, setReqFilter] = useState('')
  const [query, setQuery]         = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setStatusFilter('')
    setReqFilter('')
    fetchTrackerEntries(week, year, recruiter)
      .then(rows => { if (!cancelled) setEntries(rows) })
      .catch(() => { if (!cancelled) { setEntries([]); setError(true) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [week, year, recruiter, refreshKey])

  function prevWeek() {
    if (week === 1) { setWeek(52); setYear(y => y - 1) } else setWeek(w => w - 1)
  }
  function nextWeek() {
    if (week === 52) { setWeek(1); setYear(y => y + 1) } else setWeek(w => w + 1)
  }
  const isCurrent = week === currentWeek && year === currentYear

  const counts = useMemo(() => {
    const c = {}
    for (const e of entries) c[e.status] = (c[e.status] ?? 0) + 1
    return c
  }, [entries])

  const statuses = Object.keys(counts).sort((a, b) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99))

  const reqOptions = useMemo(() => [...new Map(
    entries.filter(e => e.requirement?.id).map(e => [e.requirement.id, e.requirement])
  ).values()].sort((a, b) => (a.job_title ?? '').localeCompare(b.job_title ?? '')), [entries])

  const q = query.trim().toLowerCase()
  const visible = entries
    .filter(e => !statusFilter || e.status === statusFilter)
    .filter(e => !reqFilter || String(e.requirement?.id) === reqFilter)
    .filter(e => !q || (e.candidate_name ?? '').toLowerCase().includes(q))
    .sort((a, b) =>
      ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) ||
      (a.requirement?.job_title ?? '').localeCompare(b.requirement?.job_title ?? '') ||
      (a.candidate_name ?? '').localeCompare(b.candidate_name ?? '')
    )

  const groups = statuses
    .map(s => [s, visible.filter(e => e.status === s)])
    .filter(([, rows]) => rows.length > 0)

  return (
    <div className="px-4 pt-4 pb-6 space-y-3">
      {/* Reclutador */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#10284d]/[0.08]">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setRecruiter(t.key)}
            className={`h-10 rounded-xl text-sm font-bold transition-colors ${
              recruiter === t.key ? 'bg-[#071d47] text-white shadow-sm' : 'text-[#10284d]'
            }`}
          >
            {t.label}{t.key === myRecruiter ? ' (yo)' : ''}
          </button>
        ))}
      </div>

      {/* Semana */}
      <div className="flex items-center justify-between rounded-2xl bg-white border border-[#10284d]/10 px-2 py-1.5">
        <button type="button" onClick={prevWeek} aria-label="Semana anterior" className="w-11 h-11 flex items-center justify-center rounded-full text-[#10284d] active:bg-[#10284d]/10">
          <span className="material-symbols-outlined text-[1.5rem]">chevron_left</span>
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-[#10284d]">Week {String(week).padStart(2, '0')} · {year}</p>
          {!isCurrent ? (
            <button type="button" onClick={() => { setWeek(currentWeek); setYear(currentYear) }} className="text-xs font-semibold text-[#1f6d44]">
              Ir a esta semana
            </button>
          ) : (
            <p className="text-xs text-[#4e5c70]">Semana actual</p>
          )}
        </div>
        <button type="button" onClick={nextWeek} aria-label="Semana siguiente" className="w-11 h-11 flex items-center justify-center rounded-full text-[#10284d] active:bg-[#10284d]/10">
          <span className="material-symbols-outlined text-[1.5rem]">chevron_right</span>
        </button>
      </div>

      {/* Buscar + filtro de rol + actualizar */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[1.25rem] text-[#4e5c70] pointer-events-none">search</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar candidato…"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-[#10284d]/10 text-base placeholder:text-[#4e5c70]/70 focus:outline-none focus:border-[#1f6d44]"
          />
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          aria-label="Actualizar"
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white border border-[#10284d]/10 text-[#1f6d44] active:bg-[#dfeadd] disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[1.375rem] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {reqOptions.length > 1 && (
        <select
          value={reqFilter}
          onChange={e => setReqFilter(e.target.value)}
          className="w-full h-11 px-3 rounded-xl bg-white border border-[#10284d]/10 text-base text-[#10284d] focus:outline-none focus:border-[#1f6d44]"
        >
          <option value="">Todos los roles</option>
          {reqOptions.map(r => (
            <option key={r.id} value={r.id}>{r.job_title}{r.client?.name ? ` · ${r.client.name}` : ''}</option>
          ))}
        </select>
      )}

      {/* Filtros por estado */}
      {entries.length > 0 && (
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border ${
              !statusFilter ? 'bg-[#071d47] text-white border-[#071d47]' : 'bg-white text-[#10284d] border-[#10284d]/15'
            }`}
          >
            Todos {entries.length}
          </button>
          {statuses.map(s => {
            const st = STATUS_STYLE[s] ?? DEFAULT_STYLE
            const active = statusFilter === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(active ? '' : s)}
                className="shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border"
                style={active
                  ? { backgroundColor: st.fg, color: '#fff', borderColor: st.fg }
                  : { backgroundColor: st.bg, color: st.fg, borderColor: 'transparent' }}
              >
                {s} {counts[s]}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          No se pudo cargar el tracker. Revisa tu conexión y toca actualizar.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-[#4e5c70]">
          <span className="material-symbols-outlined animate-spin text-[1.5rem]">progress_activity</span>
          <span className="text-sm">Cargando…</span>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="py-12 text-center text-sm text-[#4e5c70]">Sin candidatos en esta semana.</p>
      )}

      {!loading && entries.length > 0 && visible.length === 0 && (
        <p className="py-12 text-center text-sm text-[#4e5c70]">Ningún candidato coincide con los filtros.</p>
      )}

      {!loading && groups.map(([status, rows]) => {
        const st = STATUS_STYLE[status] ?? DEFAULT_STYLE
        return (
          <section key={status} className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.fg }} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#10284d]">{status}</h2>
              <span className="text-xs font-semibold text-[#4e5c70]">{rows.length}</span>
            </div>
            {rows.map(row => <CandidateCard key={row.id} row={row} />)}
          </section>
        )
      })}
    </div>
  )
}
