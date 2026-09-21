import { useState, useEffect, useCallback } from 'react'
import { getDashboardStats, getMonthlySentCount } from '../../api/dashboard'

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getISOWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

/* ── Hoja inferior de solo lectura ── */
function Sheet({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="sheet-up w-full max-h-[88dvh] flex flex-col rounded-t-3xl bg-[#0b1e3d] border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-full text-white/50 active:bg-white/10"
          >
            <span className="material-symbols-outlined text-[1.375rem]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, color, note }) {
  return (
    <div className="rounded-2xl bg-white border border-[#10284d]/10 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[#4e5c70]">
        <span className="material-symbols-outlined text-[1.125rem]" style={{ color }}>{icon}</span>
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[2.5rem] leading-none font-light tracking-tighter" style={{ color }}>{value}</p>
      {note && <p className="text-[0.6875rem] font-medium italic text-[#4e5c70]">{note}</p>}
    </div>
  )
}

export default function MobileDashboard() {
  const now = new Date()
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [month, setMonth]       = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [monthCount, setMonthCount] = useState(null)
  const [sheet, setSheet]       = useState(null) // 'general' | 'final' | null

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    getDashboardStats()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let cancelled = false
    setMonthCount(null)
    getMonthlySentCount(month.year, month.month)
      .then(n => { if (!cancelled) setMonthCount(n) })
      .catch(() => { if (!cancelled) setMonthCount(0) })
    return () => { cancelled = true }
  }, [month.year, month.month])

  function shiftMonth(delta) {
    setMonth(p => {
      const d = new Date(p.year, p.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const today = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const maxClient = Math.max(...(stats?.topClients ?? []).map(c => c.count), 1)

  const sheetRows = sheet === 'general' ? stats?.pipelineList : stats?.finalStageList
  const sheetGroups = Object.entries(
    (sheetRows ?? []).reduce((acc, r) => { (acc[r.client] ??= []).push(r); return acc }, {})
  )

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Fecha + actualizar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4e5c70]">Semana {getISOWeek()}</p>
          <p className="text-sm font-medium text-[#10284d] first-letter:uppercase">{today}</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Actualizar"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-[#10284d]/10 text-[#1f6d44] active:bg-[#dfeadd] disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[1.375rem] ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          No se pudo cargar la información. Revisa tu conexión y toca actualizar.
        </div>
      )}

      {/* Esta semana */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e5c70] px-1">Esta semana</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile icon="send"   label="Sent"     color="#1f6d44" value={loading ? '…' : stats?.weeklySent ?? 0}     note="enviados al cliente" />
          <StatTile icon="cancel" label="Rejected" color="#ba1a1a" value={loading ? '…' : stats?.weeklyRejected ?? 0} note="rechazados" />
        </div>
      </section>

      {/* Requerimientos y talento */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0b2a58] p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-white/60">
            <span className="material-symbols-outlined text-[1.125rem]">assignment</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Open Req.</span>
          </div>
          <p className="text-[2.5rem] leading-none font-light tracking-tighter text-[#81b927]">{loading ? '…' : stats?.openCount ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-[#0b2a58] p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-white/60">
            <span className="material-symbols-outlined text-[1.125rem]">people</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Talent Pool</span>
          </div>
          <p className="text-[2.5rem] leading-none font-light tracking-tighter text-[#81b927]">
            {loading ? '…' : (stats?.totalCandidates ?? 0).toLocaleString()}
          </p>
        </div>
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
        <p className="text-[3rem] leading-none font-light tracking-tighter text-white mt-1">
          {monthCount === null ? '…' : `+${monthCount}`}
        </p>
        <p className="text-xs font-semibold text-[#10284d]/80 mt-1">
          Agregados al Talent Pool en {MESES_ES[month.month]} {month.year}
        </p>
      </section>

      {/* Pipeline general */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e5c70] px-1">Pipeline de candidatos</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSheet('general')}
            disabled={loading}
            className="text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 flex flex-col gap-1 active:bg-[#eef3f7]"
          >
            <div className="flex items-center justify-between text-[#4e5c70]">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider">General</span>
              <span className="material-symbols-outlined text-[1.125rem]" style={{ color: '#4e90d0' }}>hub</span>
            </div>
            <p className="text-[2.5rem] leading-none font-light tracking-tighter" style={{ color: '#4e90d0' }}>{loading ? '…' : stats?.activePipelineCount ?? 0}</p>
            <p className="text-[0.6875rem] font-medium italic text-[#4e5c70]">en proceso con clientes</p>
          </button>
          <button
            type="button"
            onClick={() => setSheet('final')}
            disabled={loading}
            className="text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 flex flex-col gap-1 active:bg-[#eef3f7]"
          >
            <div className="flex items-center justify-between text-[#4e5c70]">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Últimas 2 etapas</span>
              <span className="material-symbols-outlined text-[1.125rem]" style={{ color: '#1f6d44' }}>bolt</span>
            </div>
            <p className="text-[2.5rem] leading-none font-light tracking-tighter" style={{ color: '#1f6d44' }}>{loading ? '…' : stats?.finalStageCount ?? 0}</p>
            <p className="text-[0.6875rem] font-medium italic text-[#4e5c70]">candidatos</p>
          </button>
        </div>
        <p className="text-[0.6875rem] text-[#4e5c70] px-1">Toca un cuadro para ver el detalle por cliente.</p>
      </section>

      {/* Requerimientos abiertos por cliente */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4e5c70] px-1">Requerimientos abiertos por cliente</h2>
        <div className="rounded-2xl bg-white border border-[#10284d]/10 divide-y divide-[#10284d]/8">
          {loading && <p className="px-4 py-6 text-center text-sm text-[#4e5c70]">Cargando…</p>}
          {!loading && (stats?.topClients ?? []).length === 0 && (
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
          onClose={() => setSheet(null)}
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
