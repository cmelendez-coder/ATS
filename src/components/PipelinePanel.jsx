import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getRequirementCandidates, addCandidateToRequirement,
  updateCandidateStage, updateRequirementCandidateNotes, updateCandidateSource, removeCandidateFromRequirement,
  getClientStages, searchCandidatesForReq,
} from '../api/requirements'
import { createClientCandidate } from '../api/talent'

/* ── Add Candidate Modal ── */
function AddCandidateModal({ reqId, existingIds, firstStageName, onAdd, onClose }) {
  const [tab, setTab]           = useState('everscale') // 'everscale' | 'client'
  const [term, setTerm]         = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]     = useState(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAdding, setClientAdding] = useState(false)
  const [clientErr, setClientErr] = useState(null)

  useEffect(() => {
    if (tab !== 'everscale' || term.length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchCandidatesForReq(term)
        setResults(data)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [term, tab])

  async function pick(candidate) {
    if (adding) return
    setAdding(candidate.candidate_id)
    try {
      await addCandidateToRequirement(reqId, candidate.candidate_id, firstStageName)
      onAdd()
    } finally {
      setAdding(null)
    }
  }

  async function addClientCand() {
    if (!clientName.trim()) { setClientErr('El nombre es obligatorio.'); return }
    setClientAdding(true)
    setClientErr(null)
    try {
      const cand = await createClientCandidate(clientName, clientEmail)
      await addCandidateToRequirement(reqId, cand.candidate_id, firstStageName)
      onAdd()
    } catch (err) {
      setClientErr(err.message ?? 'Error al agregar candidato')
      setClientAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-outline-variant/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div>
            <h2 className="font-bold text-primary text-base">Agregar candidato al pipeline</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">El candidato iniciará en la primera etapa</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 pb-2">
          <button
            onClick={() => setTab('everscale')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
              ${tab === 'everscale' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span className="material-symbols-outlined text-[15px]">search</span>
            Candidato Everscale
          </button>
          <button
            onClick={() => setTab('client')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
              ${tab === 'client' ? 'bg-amber-500 text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span className="material-symbols-outlined text-[15px]">business</span>
            Candidato del cliente
          </button>
        </div>

        {/* Tab: Everscale search */}
        {tab === 'everscale' && (
          <>
            <div className="px-5 pt-2 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  {searching ? 'progress_activity' : 'search'}
                </span>
                <input
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-high rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant"
                  placeholder="Buscar candidato por nombre…"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="px-5 pb-4 max-h-72 overflow-y-auto space-y-1">
              {term.length < 2 && (
                <div className="flex flex-col items-center py-8 gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] opacity-30">person_search</span>
                  <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
                </div>
              )}
              {term.length >= 2 && !searching && results.length === 0 && (
                <div className="flex flex-col items-center py-8 gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] opacity-30">search_off</span>
                  <p className="text-sm">No se encontraron candidatos</p>
                </div>
              )}
              {results.map(c => {
                const alreadyIn = existingIds.has(c.candidate_id)
                const isAdding  = adding === c.candidate_id
                return (
                  <button
                    key={c.candidate_id}
                    disabled={alreadyIn || !!adding}
                    onClick={() => !alreadyIn && pick(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left
                      ${alreadyIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container cursor-pointer'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {c.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{c.full_name}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {c.role?.name ?? '—'}{c.seniority?.name ? ` · ${c.seniority.name}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {alreadyIn ? (
                        <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">Ya agregado</span>
                      ) : isAdding ? (
                        <span className="material-symbols-outlined animate-spin text-primary text-[18px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Tab: Client candidate */}
        {tab === 'client' && (
          <div className="px-5 pt-2 pb-5 space-y-3">
            <div className="space-y-2">
              <input
                autoFocus
                className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-on-surface-variant"
                placeholder="Nombre completo *"
                value={clientName}
                onChange={e => { setClientName(e.target.value); setClientErr(null) }}
              />
              <input
                className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-on-surface-variant"
                placeholder="Email (opcional)"
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
              />
            </div>
            {clientErr && (
              <p className="text-xs text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">error</span>{clientErr}
              </p>
            )}
            <button
              onClick={addClientCand}
              disabled={clientAdding || !clientName.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {clientAdding
                ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                : <span className="material-symbols-outlined text-[18px]">person_add</span>
              }
              {clientAdding ? 'Agregando…' : 'Agregar candidato del cliente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Card Detail Modal (Trello-style) ── */
function CardDetailModal({ rc, stages, canManage, clientName, onClose, onStageChange, onNotesUpdate, onSourceUpdate }) {
  const [notes, setNotes]           = useState(rc.notes ?? '')
  const [saving, setSaving]         = useState(false)
  const [savedOk, setSavedOk]       = useState(false)
  const [rejectStep, setRejectStep] = useState(0) // 0=idle 1=first confirm 2=second confirm
  const [isClient, setIsClient]     = useState(rc.candidate?.source === 'client')
  const [togglingSource, setTogglingSource] = useState(false)

  const isDirty = notes !== (rc.notes ?? '')
  const stage   = stages.find(s => s.name === rc.submittal_status)

  const techs = [...new Set(
    (rc.candidate?.candidate_stack ?? [])
      .map(s => s.technology?.ct_name_tech)
      .filter(Boolean)
  )]

  async function save() {
    if (!isDirty) return
    setSaving(true)
    try {
      await updateRequirementCandidateNotes(rc.id, notes)
      onNotesUpdate(rc.id, notes)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function toggleSource() {
    if (togglingSource || !rc.candidate?.candidate_id) return
    const next = !isClient
    setIsClient(next)
    setTogglingSource(true)
    try {
      await updateCandidateSource(rc.candidate.candidate_id, next)
      onSourceUpdate?.(rc.id, rc.candidate.candidate_id, next ? 'client' : null)
    } catch {
      setIsClient(!next)
    } finally {
      setTogglingSource(false)
    }
  }

  function handleReject() {
    onStageChange(rc.id, 'Rejected')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 pb-10 px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Stage color bar */}
        {stage && <div className="h-1.5 w-full" style={{ backgroundColor: stage.color }} />}

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-5 pb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {rc.candidate?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{rc.candidate?.full_name ?? '—'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {[rc.candidate?.role?.name, rc.candidate?.seniority?.name].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              onClick={toggleSource}
              disabled={togglingSource}
              className="flex items-center gap-2 mt-2 group"
              title={isClient ? 'Quitar etiqueta de cliente' : 'Marcar como candidato de cliente'}
            >
              {/* Toggle track */}
              <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${isClient ? 'bg-amber-500' : 'bg-slate-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${isClient ? 'translate-x-4' : 'translate-x-1'}`} />
              </span>
              <span className={`text-[11px] font-semibold transition-colors ${isClient ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                {isClient ? `Candidato de ${clientName ?? 'cliente'}` : 'Candidato de Everscale Group'}
              </span>
            </button>
          </div>
          <button onClick={onClose} className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Tech stack */}
          {techs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {techs.map(t => (
                <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
              ))}
            </div>
          )}

          {/* Submitted date */}
          {rc.submitted_at && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              Enviado el {new Date(rc.submitted_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}

          {/* Stage selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {stages.filter(s => s.name !== 'Rejected').map(s => {
                const active = s.name === rc.submittal_status
                return (
                  <button
                    key={s.stage_id}
                    disabled={!canManage}
                    onClick={() => canManage && onStageChange(rc.id, s.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                      ${active ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`}
                    style={active
                      ? { backgroundColor: s.color + '22', borderColor: s.color, color: s.color }
                      : { backgroundColor: 'transparent', borderColor: s.color + '55', color: s.color }
                    }
                  >
                    {active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">description</span>
                Notas
              </p>
              {isDirty ? (
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>}
                  Guardar
                </button>
              ) : savedOk ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>Guardado
                </span>
              ) : null}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Añade notas sobre este candidato…"
              rows={5}
              className="w-full text-sm text-slate-700 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 resize-none outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all"
            />
          </div>

          {/* Reject flow */}
          {canManage && (
            <div className="pt-2 border-t border-slate-100">
              {rejectStep === 0 && (
                <button
                  onClick={() => setRejectStep(1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">person_remove</span>
                  Candidato ha sido rechazado
                </button>
              )}
              {rejectStep === 1 && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 space-y-2.5">
                  <p className="text-sm font-semibold text-red-700">¿El candidato fue rechazado?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejectStep(0)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >No</button>
                    <button
                      onClick={() => setRejectStep(2)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                    >Sí</button>
                  </div>
                </div>
              )}
              {rejectStep === 2 && (
                <div className="rounded-xl bg-red-100 border border-red-200 p-3 space-y-2.5">
                  <p className="text-sm font-bold text-red-800">¿Seguro?!</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRejectStep(0)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >No</button>
                    <button
                      onClick={handleReject}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                    >Sí, rechazar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Pipeline Panel ──
   Shared between the Requirements board (viewMode 'tabla') and the Tracker's
   "Ver en pipeline" 🔍 shortcut on Sent candidates — same kanban, same modals,
   so both places stay in sync automatically. */
export default function PipelinePanel({ reqId, clientId, clientName, canDrag, canManage }) {
  const [rcList, setRcList]     = useState([])
  const [stages, setStages]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadErr, setLoadErr]   = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [openCard, setOpenCard]     = useState(null)
  const [activeView, setActiveView] = useState('activos')
  const dragStartedRef              = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    try {
      const [candidates, clientStages] = await Promise.all([
        getRequirementCandidates(reqId),
        getClientStages(clientId),
      ])
      setRcList(candidates)
      setStages(clientStages)
    } catch (err) {
      setLoadErr(err.message ?? 'Error cargando pipeline')
    } finally {
      setLoading(false)
    }
  }, [reqId, clientId])

  useEffect(() => { load() }, [load])

  const activeStages  = stages.filter(s => s.name !== 'Rejected')
  const activeRcs     = rcList.filter(r => r.submittal_status !== 'Rejected')
  const rejectedRcs   = rcList.filter(r => r.submittal_status === 'Rejected')

  const byStage = activeStages.reduce((acc, s) => {
    acc[s.name] = activeRcs.filter(r => r.submittal_status === s.name)
    return acc
  }, {})

  const existingIds = new Set(rcList.map(r => r.candidate?.candidate_id))

  async function handleDrop(stageName) {
    if (!dragging || dragging.stage === stageName) { setDragging(null); setDragOver(null); return }
    const rc = rcList.find(r => r.id === dragging.rcId)
    if (!rc) return
    setRcList(prev => prev.map(r => r.id === dragging.rcId ? { ...r, submittal_status: stageName } : r))
    setDragging(null); setDragOver(null)
    try { await updateCandidateStage(dragging.rcId, stageName) }
    catch { load() }
  }

  async function removeCard(rcId) {
    setRcList(prev => prev.filter(r => r.id !== rcId))
    try { await removeCandidateFromRequirement(rcId) }
    catch { load() }
  }

  function handleModalStageChange(rcId, stageName) {
    setRcList(prev => prev.map(r => r.id === rcId ? { ...r, submittal_status: stageName } : r))
    setOpenCard(prev => prev?.id === rcId ? { ...prev, submittal_status: stageName } : prev)
    updateCandidateStage(rcId, stageName).catch(load)
  }

  function handleModalNotesUpdate(rcId, notes) {
    setRcList(prev => prev.map(r => r.id === rcId ? { ...r, notes } : r))
    setOpenCard(prev => prev?.id === rcId ? { ...prev, notes } : prev)
  }

  function handleModalSourceUpdate(rcId, candidateId, source) {
    const patch = r => r.id === rcId ? { ...r, candidate: { ...r.candidate, source } } : r
    setRcList(prev => prev.map(patch))
    setOpenCard(prev => prev?.id === rcId ? patch(prev) : prev)
  }

  async function saveNotes(rcId, notes) {
    const previous = rcList
    setRcList(prev => prev.map(r => r.id === rcId ? { ...r, notes } : r))
    try {
      await updateRequirementCandidateNotes(rcId, notes)
    } catch {
      setRcList(previous)
      throw new Error('No se pudieron guardar las notas')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10 gap-2 text-white/50">
      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
      <span className="text-sm">Loading pipeline…</span>
    </div>
  )

  if (loadErr) return (
    <div className="flex items-center gap-2 py-6 text-error text-sm">
      <span className="material-symbols-outlined text-[18px]">error</span>{loadErr}
    </div>
  )

  if (stages.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <span className="material-symbols-outlined text-[36px] text-white/30 mb-2">account_tree</span>
      <p className="text-sm text-white/50">No pipeline stages configured for this client.</p>
    </div>
  )

  const isDraggingAny = dragging !== null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Interview Pipeline
          </p>
          {/* Tabs */}
          <div className="flex items-center gap-0.5 p-0.5 bg-white/10 rounded-lg">
            <button
              onClick={() => setActiveView('activos')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeView === 'activos'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Activos
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeView === 'activos' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
              }`}>{activeRcs.length}</span>
            </button>
            <button
              onClick={() => setActiveView('rechazados')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeView === 'rechazados'
                  ? 'bg-white/20 text-red-400 shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Rechazados
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeView === 'rechazados' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'
              }`}>{rejectedRcs.length}</span>
            </button>
          </div>
          {canDrag && activeRcs.length > 0 && activeView === 'activos' && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">drag_indicator</span>
              Arrastra para mover
            </span>
          )}
        </div>
        {canManage && activeView === 'activos' && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#81b927]/20 text-[#81b927] text-xs font-semibold hover:bg-[#81b927]/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            Agregar Candidato
          </button>
        )}
      </div>

      {/* Rechazados list */}
      {activeView === 'rechazados' && (
        <div className="space-y-1.5 py-1">
          {rejectedRcs.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-white/30">
              <span className="material-symbols-outlined text-[36px]">person_off</span>
              <p className="text-sm">Sin candidatos rechazados</p>
            </div>
          ) : rejectedRcs.map(rc => (
            <div
              key={rc.id}
              onClick={() => setOpenCard(rc)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 cursor-pointer hover:bg-red-500/15 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-sm font-bold text-red-400 shrink-0">
                {rc.candidate?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{rc.candidate?.full_name ?? '—'}</p>
                {rc.candidate?.role?.name && (
                  <p className="text-xs text-white/60">{rc.candidate.role.name}</p>
                )}
              </div>
              <span className="material-symbols-outlined text-[16px] text-white/30">chevron_right</span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      {activeView === 'activos' && <div className="flex gap-2 overflow-x-auto pb-3" style={{ minHeight: 160 }}>
        {activeStages.map((stage, idx) => {
          const cards  = byStage[stage.name] ?? []
          const isOver = dragOver === stage.name
          const isFirst = idx === 0
          return (
            <div
              key={stage.stage_id}
              className={`kanban-column shrink-0 flex flex-col rounded-2xl border-2 transition-all duration-150
                ${isOver
                  ? 'border-dashed scale-[1.02] shadow-lg'
                  : 'border-transparent'}
              `}
              style={{
                width: 180,
                backgroundColor: isOver ? stage.color + '18' : 'rgba(255,255,255,0.06)',
                borderColor: isOver ? stage.color : 'transparent',
                outline: !isOver ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 16,
              }}
              onDragOver={canDrag ? e => { e.preventDefault(); setDragOver(stage.name) } : undefined}
              onDrop={canDrag ? () => handleDrop(stage.name) : undefined}
              onDragLeave={canDrag ? e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) } : undefined}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: stage.color }}>
                    {stage.name}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1"
                  style={{ backgroundColor: stage.color + '22', color: stage.color }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 px-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 320 }}>
                {cards.map(rc => (
                  <div
                    key={rc.id}
                    draggable={canDrag}
                    onDragStart={canDrag ? (e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      dragStartedRef.current = true
                      setDragging({ rcId: rc.id, stage: stage.name })
                    } : undefined}
                    onDragEnd={canDrag ? () => {
                      setDragging(null); setDragOver(null)
                      setTimeout(() => { dragStartedRef.current = false }, 0)
                    } : undefined}
                    onClick={() => { if (!dragStartedRef.current) setOpenCard(rc) }}
                    className={`group relative rounded-xl border transition-all select-none cursor-pointer
                      ${canDrag ? 'active:cursor-grabbing' : ''}
                      ${dragging?.rcId === rc.id ? 'opacity-40 scale-95' : 'hover:shadow-md hover:-translate-y-px'}
                    `}
                    style={{
                      background: 'rgba(255,255,255,0.96)',
                      borderColor: 'rgba(0,0,0,0.07)',
                      borderLeftWidth: 3,
                      borderLeftColor: stage.color,
                    }}
                  >
                    {/* Drag handle strip */}
                    {canDrag && (
                      <span
                        className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400 pointer-events-none select-none"
                        style={{ fontSize: 14, marginLeft: -2 }}
                      >drag_indicator</span>
                    )}

                    <div className="px-3 py-2">
                      <p className="text-sm font-bold text-slate-800 leading-snug truncate">
                        {rc.candidate?.full_name ?? '—'}
                      </p>
                      {rc.candidate?.source === 'client' && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full mt-1">
                          <span className="material-symbols-outlined text-[10px]">business</span>
                          Cliente
                        </span>
                      )}
                      {(rc.submitted_at || rc.stage_updated_at) && (() => {
                        const since = rc.submitted_at ?? rc.stage_updated_at
                        const days = Math.floor((Date.now() - new Date(since).getTime()) / 86400000)
                        const color = days <= 25 ? '#16a34a' : days <= 40 ? '#ea580c' : '#dc2626'
                        return (
                          <p className="text-[13px] font-semibold mt-1 animate-glow" style={{ color }}>
                            {days} {days === 1 ? 'día' : 'días'} en proceso
                          </p>
                        )
                      })()}
                    </div>
                  </div>
                ))}

                {/* Drop zone hint while dragging */}
                {isDraggingAny && dragging?.stage !== stage.name && (
                  <div
                    className="rounded-xl border-2 border-dashed flex items-center justify-center py-3 transition-all"
                    style={{ borderColor: isOver ? stage.color : stage.color + '44', backgroundColor: isOver ? stage.color + '10' : 'transparent' }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: stage.color + 'aa' }}>
                      Soltar aquí
                    </span>
                  </div>
                )}

                {/* Empty state (no dragging) */}
                {!isDraggingAny && cards.length === 0 && (
                  <div className="text-[10px] text-white/30 text-center py-3 select-none">
                    Sin candidatos
                  </div>
                )}
              </div>

              {/* Add button at bottom of first column */}
              {canManage && isFirst && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mx-2 mb-2 mt-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed text-[10px] font-medium transition-colors hover:border-opacity-80"
                  style={{ borderColor: stage.color + '66', color: stage.color + 'cc' }}
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  Agregar
                </button>
              )}
            </div>
          )
        })}
      </div>}

      {showAdd && (
        <AddCandidateModal
          reqId={reqId}
          existingIds={existingIds}
          firstStageName={activeStages[0]?.name ?? 'Submitted'}
          onAdd={() => { load(); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {openCard && (
        <CardDetailModal
          rc={openCard}
          stages={stages}
          canManage={canManage}
          onClose={() => setOpenCard(null)}
          onStageChange={(rcId, stageName) => {
            handleModalStageChange(rcId, stageName)
            if (stageName === 'Rejected') setActiveView('rechazados')
          }}
          clientName={clientName}
          onNotesUpdate={handleModalNotesUpdate}
          onSourceUpdate={handleModalSourceUpdate}
        />
      )}
    </div>
  )
}
