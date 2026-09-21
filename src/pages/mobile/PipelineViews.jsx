import { useState, useEffect } from 'react'
import { getRequirementCandidates, getClientStages } from '../../api/requirements'
import { fetchCandidateHistory } from '../../api/mobile'
import { Skeleton, shortDate, weekLabel } from './ui'

function LoadingRows() {
  return (
    <div className="p-5 space-y-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton tone="dark" className="h-3 w-32" />
          <Skeleton tone="dark" className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

function ErrorBox({ children }) {
  return <p role="alert" className="m-5 rounded-xl bg-red-500/10 border border-red-400/30 px-4 py-3 text-sm text-red-200">{children}</p>
}

function CandidateRow({ rc, highlight }) {
  const c = rc.candidate
  const techs = (c?.candidate_stack ?? []).map(s => s.technology?.ct_name_tech).filter(Boolean).slice(0, 4)
  const sub = [c?.role?.name, c?.seniority?.name].filter(Boolean).join(' · ')
  return (
    <div className={`mx-4 mb-2 rounded-xl px-3.5 py-3 border ${highlight ? 'bg-[#81b927]/15 border-[#81b927]/60' : 'bg-white/[0.05] border-white/[0.06]'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-white">{c?.full_name ?? '—'}</p>
        {highlight && <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#81b927] text-[#10284d] text-[0.625rem] font-bold uppercase tracking-wider">Este candidato</span>}
      </div>
      {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
      {techs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {techs.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-white/10 text-[0.625rem] font-medium text-white/70">{t}</span>)}
        </div>
      )}
      <p className="text-[0.6875rem] text-white/40 mt-2">
        Enviado {shortDate(rc.submitted_at)}{rc.stage_updated_at ? ` · en esta etapa desde ${shortDate(rc.stage_updated_at)}` : ''}
      </p>
      {rc.notes && <p className="text-xs text-amber-200/80 mt-1.5 whitespace-pre-line">{rc.notes}</p>}
    </div>
  )
}

/** Pipeline de un requerimiento: candidatos agrupados por etapa (solo lectura). */
export function PipelineView({ reqId, clientId, highlightId }) {
  const [data, setData]   = useState(null) // { stages, rcs }
  const [error, setError] = useState(false)
  const [showRejected, setShowRejected] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(false)
    Promise.all([getClientStages(clientId), getRequirementCandidates(reqId)])
      .then(([stages, rcs]) => { if (!cancelled) setData({ stages, rcs }) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [reqId, clientId])

  if (error) return <ErrorBox>No se pudo cargar el pipeline. Revisa tu conexión e inténtalo de nuevo.</ErrorBox>
  if (!data) return <LoadingRows />

  const { stages, rcs } = data
  const known = new Set(stages.map(s => s.name))
  const rejected = rcs.filter(r => r.submittal_status === 'Rejected')
  const active = rcs.filter(r => r.submittal_status !== 'Rejected')
  const sections = stages
    .filter(s => s.name !== 'Rejected')
    .map(s => ({ key: s.name, name: s.name, color: s.color ?? '#81b927', rows: active.filter(r => r.submittal_status === s.name) }))
    .filter(s => s.rows.length > 0)
  const orphans = active.filter(r => !known.has(r.submittal_status))
  if (orphans.length > 0) sections.push({ key: '__none', name: 'Sin etapa', color: '#9ca3af', rows: orphans })

  return (
    <div className="pb-4">
      <div className="px-5 py-3 flex items-center gap-2 text-xs text-white/60">
        <span className="font-semibold text-white">{active.length}</span> activos
        <span className="text-white/30">·</span>
        <span className="font-semibold text-white">{rejected.length}</span> rechazados
      </div>

      {sections.length === 0 && <p className="px-5 py-8 text-center text-sm text-white/40">Aún no hay candidatos activos en este requerimiento.</p>}

      {sections.map(sec => (
        <section key={sec.key} className="mb-2">
          <div className="sticky top-0 z-[1] flex items-center gap-2 px-5 py-2 bg-[#0b2a58]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
            <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white">{sec.name}</span>
            <span className="ml-auto text-[0.6875rem] font-bold text-white/50">{sec.rows.length}</span>
          </div>
          <div className="pt-2">
            {sec.rows.map(rc => <CandidateRow key={rc.id} rc={rc} highlight={highlightId != null && rc.candidate?.candidate_id === highlightId} />)}
          </div>
        </section>
      ))}

      {rejected.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowRejected(v => !v)}
            aria-expanded={showRejected}
            className="w-full flex items-center gap-2 px-5 py-3 text-left active:bg-white/5"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-white/80">Rechazados</span>
            <span className="text-[0.6875rem] font-bold text-white/50">{rejected.length}</span>
            <span className="material-symbols-outlined ml-auto text-[1.25rem] text-white/50">{showRejected ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showRejected && (
            <div className="pt-1">
              {rejected.map(rc => <CandidateRow key={rc.id} rc={rc} highlight={highlightId != null && rc.candidate?.candidate_id === highlightId} />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

const STATUS_DOT = {
  'Review': '#f59e0b', 'Contacted': '#10b981', 'CV': '#8b5cf6', 'Screening': '#3b82f6', 'Sent': '#ec4899',
  'Rejected': '#ef4444', 'HSE': '#eab308', 'On Hold': '#94a3b8', 'Backed Out': '#a1a1aa',
}

/** Historial de un candidato: envíos por semana y movimientos por etapa (solo lectura). */
export function CandidateHistoryView({ candidateId, name }) {
  const [data, setData]   = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(false)
    fetchCandidateHistory({ candidateId, name })
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [candidateId, name])

  if (error) return <ErrorBox>No se pudo cargar el historial. Revisa tu conexión e inténtalo de nuevo.</ErrorBox>
  if (!data) return <LoadingRows />

  const { entries, movements } = data
  if (entries.length === 0 && movements.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-white/40">Sin historial registrado para este candidato.</p>
  }

  return (
    <div className="pb-4">
      {entries.length > 0 && (
        <section>
          <div className="sticky top-0 z-[1] px-5 py-2 bg-[#0b2a58] text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">
            Envíos en el tracker · {entries.length}
          </div>
          {entries.map(e => (
            <div key={e.id} className="px-5 py-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#81b927]">{weekLabel(e.week_number, e.week_year)}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOT[e.status] ?? '#94a3b8' }} />
                  {e.status}
                </span>
              </div>
              <p className="text-sm text-white mt-1">{e.requirement?.job_title ?? 'Sin requerimiento'}{e.requirement?.client?.name ? <span className="text-white/50"> · {e.requirement.client.name}</span> : null}</p>
              <p className="text-[0.6875rem] text-white/40 mt-0.5 capitalize">Reclutador: {e.recruiter}</p>
              {e.notes && <p className="text-xs text-amber-200/80 mt-1.5 whitespace-pre-line">{e.notes}</p>}
            </div>
          ))}
        </section>
      )}

      {movements.length > 0 && (
        <section className="mt-2">
          <div className="sticky top-0 z-[1] px-5 py-2 bg-[#0b2a58] text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">
            Movimientos en pipelines · {movements.length}
          </div>
          {movements.map(m => (
            <div key={m.requirementId} className="px-5 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">{m.title}{m.client ? <span className="font-normal text-white/50"> · {m.client}</span> : null}</p>
              <ol className="mt-2 ml-1 border-l border-white/15 space-y-2">
                {m.steps.map(s => (
                  <li key={s.id} className="relative pl-4">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#81b927]" />
                    <p className="text-xs font-semibold text-white">{s.stage_name}</p>
                    <p className="text-[0.6875rem] text-white/40">{shortDate(s.entered_at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
