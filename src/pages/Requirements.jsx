import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useRequirementAlerts } from '../hooks/useRequirementAlerts'
import RequirementAlertBell from '../components/RequirementAlertBell'
import {
  listRequirements, deleteRequirement,
  getRequirementCandidates, addCandidateToRequirement,
  updateCandidateStage, updateRequirementCandidateNotes, removeCandidateFromRequirement,
  getCatalogs, getClientStages, searchCandidatesForReq,
  listPendingApprovals, approveRequirement, rejectRequirement,
  updateRequirementStatus, updateRequirementPriority,
  getReqBoard, updateReqBoardRow,
} from '../api/requirements'

/* ── helpers ── */
const PRIORITY = {
  0: { label: '0',       bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25' },
  1: { label: '1',       bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/25' },
  2: { label: '2',       bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/25' },
  3: { label: 'On hold', bg: 'bg-surface-variant/50', text: 'text-on-surface-variant', border: 'border-outline-variant/30' },
}

const CLIENT_LOGOS = {
  'PacVue':       '/logos/pacvue.png',
  'LogicMonitor': '/logos/logicmonitor.webp',
  'BlueConic':    '/logos/blueconic.png',
}

function ClientLogo({ name = '', size = 'sm' }) {
  const [err, setErr] = useState(false)
  const src = CLIENT_LOGOS[name]
  if (src && !err) {
    const cls = size === 'header' ? 'h-8 w-auto max-w-[120px]' : 'h-5 w-auto max-w-[56px]'
    return <img src={src} alt={name} className={`${cls} object-contain`} onError={() => setErr(true)} />
  }
  const av = size === 'header' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-[11px]'
  return (
    <div className={`${av} rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
const STATUS_STYLE = {
  'Open':                 { bg: 'bg-secondary-container',    text: 'text-on-secondary-container', dot: 'bg-secondary' },
  'Pending Approval':     { bg: 'bg-tertiary-container',     text: 'text-on-tertiary-container',  dot: 'bg-tertiary' },
  'Pending Validation':   { bg: 'bg-tertiary-container',     text: 'text-on-tertiary-container',  dot: 'bg-tertiary' },
  'Paused':               { bg: 'bg-surface-container-high', text: 'text-on-surface-variant',     dot: 'bg-outline' },
  'Closed - Covered':     { bg: 'bg-primary/10',             text: 'text-primary',                dot: 'bg-primary' },
  'Closed - Not Covered': { bg: 'bg-error-container',        text: 'text-on-error-container',     dot: 'bg-error' },
}
const DEFAULT_STATUS = { bg: 'bg-surface-container', text: 'text-on-surface-variant', dot: 'bg-outline' }

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function reqLabel(num, date) {
  const yr = date ? new Date(date).getFullYear() : new Date().getFullYear()
  return `REQ-${yr}-${String(num ?? 0).padStart(3, '0')}`
}

/* ── Add Candidate Modal ── */
function AddCandidateModal({ reqId, existingIds, firstStageName, onAdd, onClose }) {
  const [term, setTerm]         = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]     = useState(null) // candidate_id being added

  useEffect(() => {
    if (term.length < 2) { setResults([]); return }
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
  }, [term])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-outline-variant/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div>
            <h2 className="font-bold text-primary text-base">Add Candidate to Pipeline</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">The candidate will start in the first stage</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
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

        {/* Results */}
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
      </div>
    </div>
  )
}

/* ── Card Detail Modal (Trello-style) ── */
function CardDetailModal({ rc, stages, canManage, onClose, onStageChange, onNotesUpdate, onRemove }) {
  const [notes, setNotes]   = useState(rc.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [removing, setRemoving] = useState(false)

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

  async function handleRemove() {
    if (!confirm('¿Quitar candidato del pipeline?')) return
    setRemoving(true)
    try { await onRemove(rc.id); onClose() }
    finally { setRemoving(false) }
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
              {stages.map(s => {
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

          {/* Remove */}
          {canManage && (
            <div className="pt-1 border-t border-slate-100">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">person_remove</span>
                Quitar del pipeline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Pipeline Panel ── */
function CandidateNotes({ rc, canManage, onSave }) {
  const [showModal, setShowModal] = useState(false)
  const [draft, setDraft] = useState(rc.notes ?? '')
  const [saving, setSaving] = useState(false)
  const hasNotes = Boolean(rc.notes?.trim())

  useEffect(() => {
    setDraft(rc.notes ?? '')
  }, [rc.id, rc.notes])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave(draft)
      setShowModal(false)
    } catch (err) {
      alert(err.message ?? 'No se pudieron guardar las notas')
    } finally {
      setSaving(false)
    }
  }

  if (!canManage && !hasNotes) return null

  return (
    <>
      <div className="mt-2 rounded-xl border border-primary/10 bg-gradient-to-br from-surface-container-lowest to-surface-container p-2.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/80">
            <span className="material-symbols-outlined text-[13px]">note_stack</span>
            Follow-Up Notes
          </div>
          {hasNotes && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Active
            </span>
          )}
        </div>

        <p className={`min-h-[34px] text-[11px] leading-relaxed ${hasNotes ? 'text-on-surface-variant' : 'text-on-surface-variant/60 italic'}`}>
          {hasNotes ? rc.notes : 'No follow-up notes yet.'}
        </p>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/90 to-primary-container px-3 py-2 text-[11px] font-semibold text-on-primary shadow-[0_8px_18px_rgba(7,29,71,0.18)] transition-all hover:opacity-95"
          >
            <span className="material-symbols-outlined text-[14px]">{hasNotes ? 'edit_note' : 'note_add'}</span>
            {hasNotes ? 'Open Notes' : 'Add Notes'}
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071D47]/55 p-4 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)}>
          <div
            className="w-full max-w-2xl rounded-3xl border border-outline-variant/20 bg-surface-container-lowest shadow-[0_20px_60px_rgba(7,29,71,0.32)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">Interview Pipeline</p>
                <h3 className="mt-1 text-xl font-bold text-primary">Candidate Notes</h3>
                <p className="mt-1 text-sm text-on-surface-variant">{rc.candidate?.full_name ?? 'Candidate'}</p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setShowModal(false)}
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-primary/10 bg-surface-container/70 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary/75">Tracking Notes</p>
                <textarea
                  rows={10}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Add detailed follow-up notes, interview feedback, reminders, blockers, next steps, or any relevant context for this candidate..."
                  className="w-full resize-none rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-on-surface-variant">
                  {draft.trim() ? `${draft.trim().length} characters` : 'No notes added yet'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setDraft(rc.notes ?? ''); setShowModal(false) }}
                    className="rounded-full border border-outline-variant/25 px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2 text-sm font-semibold text-on-primary shadow-[0_10px_20px_rgba(7,29,71,0.18)] disabled:opacity-60"
                  >
                    {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PipelinePanel({ reqId, clientId, canDrag, canManage }) {
  const [rcList, setRcList]     = useState([])
  const [stages, setStages]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadErr, setLoadErr]   = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [openCard, setOpenCard] = useState(null)
  const dragStartedRef          = useRef(false)

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

  const byStage = stages.reduce((acc, s) => {
    acc[s.name] = rcList.filter(r => r.submittal_status === s.name)
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
    <div className="flex items-center justify-center py-10 gap-2 text-on-surface-variant">
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
      <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30 mb-2">account_tree</span>
      <p className="text-sm text-on-surface-variant">No pipeline stages configured for this client.</p>
    </div>
  )

  const isDraggingAny = dragging !== null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Interview Pipeline
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
            {rcList.length} candidato{rcList.length !== 1 ? 's' : ''}
          </span>
          {canDrag && rcList.length > 0 && (
            <span className="text-[10px] text-on-surface-variant/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">drag_indicator</span>
              Arrastra para mover
            </span>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            Agregar Candidato
          </button>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex gap-2 overflow-x-auto pb-3" style={{ minHeight: 160 }}>
        {stages.map((stage, idx) => {
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
                backgroundColor: isOver ? stage.color + '12' : 'rgba(var(--md-sys-color-surface-container-lowest), 0.7)',
                borderColor: isOver ? stage.color : 'transparent',
                outline: !isOver ? `1px solid rgba(var(--md-sys-color-outline-variant), 0.2)` : 'none',
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

                    <div className="px-3 pt-2.5 pb-2.5">
                      <p className="text-sm font-bold text-slate-800 leading-snug pr-5">
                        {rc.candidate?.full_name ?? '—'}
                      </p>
                      {rc.candidate?.role?.name && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                          {rc.candidate.role.name}
                        </p>
                      )}
                      {(() => {
                        const techs = [...new Set(
                          (rc.candidate?.candidate_stack ?? [])
                            .map(s => s.technology?.ct_name_tech)
                            .filter(Boolean)
                        )].slice(0, 3)
                        return techs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {techs.map(t => (
                              <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                      <div className="flex items-center justify-between mt-1.5">
                        {rc.submitted_at && (
                          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                            {new Date(rc.submitted_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        <CandidateNotes
                          rc={rc}
                          canManage={canManage}
                          onSave={(notes) => saveNotes(rc.id, notes)}
                        />
                      </div>
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
                  <div className="text-[10px] text-on-surface-variant/30 text-center py-3 select-none">
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
      </div>

      {showAdd && (
        <AddCandidateModal
          reqId={reqId}
          existingIds={existingIds}
          firstStageName={stages[0]?.name ?? 'Submitted'}
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
          onStageChange={handleModalStageChange}
          onNotesUpdate={handleModalNotesUpdate}
          onRemove={removeCard}
        />
      )}
    </div>
  )
}

/* ── Pending Approvals Section ── */
function PendingApprovalsSection({ onApproved }) {
  const [pending, setPending]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing]     = useState(null)

  useEffect(() => {
    listPendingApprovals()
      .then(setPending)
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(id) {
    setActing(id)
    try {
      await approveRequirement(id)
      setPending(prev => prev.filter(r => r.id !== id))
      onApproved()
    } finally { setActing(null) }
  }

  async function handleReject(id) {
    if (!confirm('¿Rechazar y eliminar este requerimiento?')) return
    setActing(id)
    try {
      await rejectRequirement(id)
      setPending(prev => prev.filter(r => r.id !== id))
    } finally { setActing(null) }
  }

  if (loading || pending.length === 0) return null

  const PRI_BADGE = {
    1: 'bg-blue-600 text-white',
    2: 'bg-amber-500 text-white',
    3: 'bg-red-600 text-white',
  }

  return (
    <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/8 overflow-hidden">
      {/* Header banner */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-yellow-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-yellow-400">pending_actions</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-yellow-300">
              {pending.length} requerimiento{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} de aprobación
            </p>
            <p className="text-xs text-slate-400">Revisar y autorizar para que aparezcan en el sistema</p>
          </div>
        </div>
        <span
          className="material-symbols-outlined text-[20px] text-yellow-400 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </button>

      {expanded && (
        <div className="border-t border-yellow-500/20 divide-y divide-white/5">
          {pending.map(req => {
            const pri = PRIORITY[req.priority] ?? PRIORITY[2]
            const isActing = acting === req.id
            return (
              <div key={req.id} className="flex items-center gap-4 px-5 py-4 bg-black/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {`REQ-${new Date(req.created_at).getFullYear()}-${String(req.req_number ?? 0).padStart(3, '0')}`}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${PRI_BADGE[req.priority] ?? PRI_BADGE[2]}`}>
                      Prioridad: {pri.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{req.job_title}</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {req.client?.name ?? '—'}
                    {req.target_fill_date ? ` · Target: ${new Date(req.target_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={!!acting}
                    onClick={() => handleApprove(req.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    {isActing
                      ? <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                      : <span className="material-symbols-outlined text-[15px]">check_circle</span>}
                    Aprobar
                  </button>
                  <button
                    disabled={!!acting}
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[15px]">cancel</span>
                    Rechazar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Priority colors for standalone board ── */
const PRI_TABLE = {
  0: { bg: '#f9a8b8', text: '#7f1534' },
  1: { bg: '#86efac', text: '#14532d' },
  2: { bg: '#93c5fd', text: '#1e3a5f' },
  3: { bg: '#d1d5db', text: '#374151' },
}

/* ── Inline editable cell ── */
function EditableCell({ value, onChange, type = 'text', placeholder = '' }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => { setDraft(value ?? '') }, [value])
  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (draft !== (value ?? '')) onChange(draft) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-full bg-transparent text-center text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:bg-surface-container rounded px-1 py-0.5 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  )
}

/* ── Standalone Board Table (reads/writes only req_board) ── */
function ReqBoardTable() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReqBoard().then(setRows).finally(() => setLoading(false))
  }, [])

  async function handleUpdate(id, patch) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    try { await updateReqBoardRow(id, patch) }
    catch { /* optimistic rollback would go here if needed */ }
  }

  const COLS = [
    { label: 'Recruiter',       width: '140px' },
    { label: 'Prioridad',       width: '90px'  },
    { label: 'Cliente',         width: '140px' },
    { label: 'Position',        width: '220px' },
    { label: "#",               width: '60px'  },
    { label: 'Everscale Group', width: '120px' },
    { label: 'Interno',         width: '90px'  },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
      <span className="text-sm">Cargando…</span>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.05)]">
      <table className="w-full border-collapse" style={{ minWidth: 860 }}>
        <thead>
          <tr>
            {COLS.map(col => (
              <th
                key={col.label}
                style={{ width: col.width }}
                className="bg-surface-container-low text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant text-center px-3 py-3 border-b border-outline-variant/15 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pri = PRI_TABLE[row.prioridad] ?? PRI_TABLE[2]
            const isEven = idx % 2 === 0
            return (
              <tr
                key={row.id}
                className="group transition-colors hover:bg-surface-container/40"
                style={{ backgroundColor: isEven ? 'transparent' : 'rgba(18,48,111,0.15)' }}
              >
                {/* Recruiter */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    value={row.recruiter}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { recruiter: val || null })}
                  />
                </td>

                {/* Prioridad */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    type="number"
                    value={row.prioridad != null ? String(row.prioridad) : ''}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { prioridad: val === '' ? null : Number(val) })}
                  />
                  {/* color badge overlay */}
                  <div
                    className="mx-auto mt-1 w-8 h-1.5 rounded-full"
                    style={{ backgroundColor: pri.bg }}
                  />
                </td>

                {/* Cliente */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    value={row.cliente}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { cliente: val || null })}
                  />
                </td>

                {/* Position */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    value={row.position}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { position: val || null })}
                  />
                </td>

                {/* FTEs */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    type="number"
                    value={row.ftes != null ? String(row.ftes) : ''}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { ftes: val === '' ? null : Number(val) })}
                  />
                </td>

                {/* Everscale */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    type="number"
                    value={row.everscale != null ? String(row.everscale) : ''}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { everscale: val === '' ? null : Number(val) })}
                  />
                </td>

                {/* Interno */}
                <td className="px-2 py-2 border-b border-outline-variant/10">
                  <EditableCell
                    type="number"
                    value={row.interno != null ? String(row.interno) : ''}
                    placeholder="—"
                    onChange={val => handleUpdate(row.id, { interno: val === '' ? null : Number(val) })}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Main Page ── */
export default function Requirements() {
  const { can } = usePermissions()
  const { pendingCount, loading: alertsLoading, showAlerts } = useRequirementAlerts()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [catalogs, setCatalogs]         = useState({ statuses: [], clients: [], stages: [] })
  const [expanded, setExpanded]         = useState({})
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [activeTab, setActiveTab] = useState('open')
  const [viewMode, setViewMode]   = useState('pipeline') // 'pipeline' | 'tabla'
  const [statusPickerId, setStatusPickerId] = useState(null)
  const [statusPickerPos, setStatusPickerPos] = useState(null)
  const [priorityPickerId, setPriorityPickerId] = useState(null)
  const [priorityPickerPos, setPriorityPickerPos] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, cats] = await Promise.all([
        listRequirements({ search, statusId: filterStatus, clientId: filterClient, excludePending: true }),
        getCatalogs(),
      ])
      setRequirements(reqs)
      setCatalogs(cats)
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus, filterClient])

  useEffect(() => { load() }, [load])

  const toggleRow = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este requerimiento?')) return
    try {
      await deleteRequirement(id)
      setRequirements(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleStatusChange(reqId, statusId, statusName) {
    try {
      await updateRequirementStatus(reqId, statusId)
      setRequirements(prev => prev.map(r =>
        r.id === reqId ? { ...r, status_id: statusId, status: { id: statusId, name: statusName } } : r
      ))
    } catch (err) {
      alert(err.message)
    } finally {
      setStatusPickerId(null)
      setStatusPickerPos(null)
    }
  }

  async function handlePriorityChange(reqId, priority) {
    try {
      await updateRequirementPriority(reqId, priority)
      setRequirements(prev => prev.map(r => r.id === reqId ? { ...r, priority } : r))
    } catch (err) {
      alert(err.message)
    } finally {
      setPriorityPickerId(null)
      setPriorityPickerPos(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterClient('')
  }

return (
    <>
      {priorityPickerId !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setPriorityPickerId(null); setPriorityPickerPos(null) }} />
          {priorityPickerPos && (
            <div
              className="fixed bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]"
              style={{ top: priorityPickerPos.top, left: priorityPickerPos.left }}
            >
              {Object.entries(PRIORITY).map(([v, p]) => (
                <button
                  key={v}
                  className="w-full text-left px-3 py-2 text-[11px] hover:bg-surface-container transition-colors flex items-center gap-2"
                  onClick={() => handlePriorityChange(priorityPickerId, Number(v))}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.bg} ${p.text} ${p.border}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {statusPickerId !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setStatusPickerId(null); setStatusPickerPos(null) }} />
          {statusPickerPos && (() => {
            const openSt  = catalogs.statuses.find(s => s.name === 'Open')
            const closedSt = catalogs.statuses.find(s => s.name.startsWith('Closed'))
            const opts = [openSt, closedSt].filter(Boolean)
            return (
              <div
                className="fixed bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]"
                style={{ top: statusPickerPos.top, right: statusPickerPos.right }}
              >
                {opts.map(s => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-surface-container transition-colors text-on-surface flex items-center gap-2"
                    onClick={() => handleStatusChange(statusPickerId, s.id, s.name)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(STATUS_STYLE[s.name] ?? DEFAULT_STATUS).dot}`}></span>
                    {s.name.startsWith('Closed') ? 'Closed' : s.name}
                  </button>
                ))}
              </div>
            )
          })()}
        </>
      )}
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input
              className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant"
              placeholder="Search requirements..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
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
      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Requirements</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Requirements</h1>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">{requirements.length}</span>
              </div>
              <p className="text-on-surface-variant text-base">Manage and track active client requisitions across all portfolios.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {/* View mode toggle */}
              <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl">
                <button
                  onClick={() => setViewMode('pipeline')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'pipeline' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                  Pipeline
                </button>
                <button
                  onClick={() => setViewMode('tabla')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'tabla' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">table_view</span>
                  Tabla
                </button>
              </div>
              {can('requirements.create') && (
                <Link to="/requirements/new">
                  <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[16px]">add</span>New Requirement
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:w-1/3">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-on-surface-variant"
                    placeholder="ID, title, or client..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full lg:w-2/3 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    {catalogs.statuses.filter(s => s.id !== 1).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Client</label>
                  <select
                    className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    value={filterClient}
                    onChange={e => setFilterClient(e.target.value)}
                  >
                    <option value="">All Clients</option>
                    {catalogs.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={clearFilters} className="px-4 py-2.5 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">Clear</button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          {!loading && (() => {
            const openReqs    = requirements.filter(r => r.status?.name === 'Open')
            const openCount   = openReqs.length
            const clientCount = new Set(openReqs.map(r => r.client?.id).filter(Boolean)).size
            return (
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {[
                  { label: 'Open Requirements', value: openCount,   icon: 'folder_open', color: 'text-primary',   bg: 'bg-primary/5' },
                  { label: 'Clients',           value: clientCount, icon: 'business',    color: 'text-secondary', bg: 'bg-secondary/5' },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} rounded-xl px-4 py-3.5 border border-outline-variant/10 shadow-[0_1px_8px_rgba(24,28,30,0.04)] flex items-center gap-3`}>
                    <span className={`material-symbols-outlined text-[22px] ${m.color} opacity-80`}>{m.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight">{m.label}</p>
                      <p className={`text-2xl font-bold leading-tight ${m.color}`}>{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* ── TABLA VIEW ── */}
          {viewMode === 'tabla' && <ReqBoardTable />}

          {/* ── PIPELINE VIEW ── */}
          {viewMode === 'pipeline' && <>

          {/* Pending Approvals (admin only) */}
          {can('requirements.approve') && (
            <PendingApprovalsSection onApproved={load} />
          )}

          {/* Open / Closed tabs */}
          {!loading && (() => {
            const openCount   = requirements.filter(r => r.status?.name === 'Open').length
            const closedCount = requirements.filter(r => r.status?.name?.startsWith('Closed')).length
            return (
              <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl w-fit">
                {[
                  { key: 'open',   label: 'Open',   count: openCount,   dot: 'bg-secondary' },
                  { key: 'closed', label: 'Closed', count: closedCount, dot: 'bg-error' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`}></span>
                    {tab.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>
            )
          })()}

          {/* Requirements grouped by client */}
          {(() => {
            const tabFiltered = requirements.filter(r => {
              if (activeTab === 'open')   return r.status?.name === 'Open'
              if (activeTab === 'closed') return r.status?.name?.startsWith('Closed')
              return true
            })
            const grouped = tabFiltered.reduce((acc, req) => {
              const key = req.client?.name ?? 'Unknown'
              if (!acc[key]) acc[key] = { client: req.client, reqs: [] }
              acc[key].reqs.push(req)
              return acc
            }, {})
            const groupEntries = Object.entries(grouped)

            return (
              <div className="space-y-10">
                {loading && (
                  <div className="flex items-center justify-center py-16 gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                    <span className="text-sm">Loading requirements…</span>
                  </div>
                )}

                {!loading && tabFiltered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">assignment</span>
                    <p className="text-on-surface-variant font-medium">No {activeTab} requirements found</p>
                    <p className="text-sm text-on-surface-variant/60 mt-1">
                      {activeTab === 'open' && can('requirements.create') ? 'Create your first requirement to get started.' : `No hay requerimientos ${activeTab === 'open' ? 'abiertos' : 'cerrados'}.`}
                    </p>
                  </div>
                )}

                {!loading && groupEntries.map(([clientName, { client, reqs }]) => (
                  <div key={clientName} className="space-y-3">

                    {/* Client group header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center h-12 px-4 rounded-xl bg-white shadow-sm border border-outline-variant/10 shrink-0">
                        <ClientLogo name={clientName} size="header" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0">
                        {reqs.length} req{reqs.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 h-px bg-outline-variant/15" />
                    </div>

                    {/* Requirement cards */}
                    <div className="space-y-2 pl-1">
                      {reqs.map(req => {
                        const isExpanded     = expanded[req.id]
                        const pri            = PRIORITY[req.priority] ?? PRIORITY[2]
                        const st             = STATUS_STYLE[req.status?.name] ?? DEFAULT_STATUS
                        const candidateCount = req.rc_count?.length ?? 0

                        return (
                          <div key={req.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_12px_rgba(24,28,30,0.04)] overflow-hidden">
                            {/* Main row */}
                            <div
                              className="grid grid-cols-1 lg:grid-cols-12 gap-x-3 gap-y-2 items-center px-5 py-4 cursor-pointer group hover:bg-surface-container/25 transition-colors"
                              onClick={() => toggleRow(req.id)}
                            >
                              {/* Priority pill */}
                              <div className="lg:col-span-1 flex items-center">
                                <button
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide whitespace-nowrap hover:opacity-75 transition-opacity ${pri.bg} ${pri.text} ${pri.border}`}
                                  title="Cambiar prioridad"
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (priorityPickerId === req.id) {
                                      setPriorityPickerId(null)
                                      setPriorityPickerPos(null)
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setPriorityPickerPos({ top: rect.bottom + 4, left: rect.left })
                                      setPriorityPickerId(req.id)
                                    }
                                  }}
                                >
                                  Prioridad: {pri.label}
                                  <span className="material-symbols-outlined text-[11px] leading-none">arrow_drop_down</span>
                                </button>
                              </div>

                              {/* REQ ID + Title */}
                              <div className="lg:col-span-4">
                                <span className="font-mono text-[11px] text-on-surface-variant/70">{reqLabel(req.req_number, req.application_date)}</span>
                                <p className="font-semibold text-primary text-sm leading-snug group-hover:text-surface-tint transition-colors mt-0.5">{req.job_title}</p>
                              </div>

                              {/* Candidates */}
                              <div className="lg:col-span-1 flex flex-col items-center gap-0.5">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">group</span>
                                <p className="text-[10px] text-on-surface-variant/60 whitespace-nowrap font-medium">
                                  {candidateCount} cand{candidateCount !== 1 ? 's' : '.'}
                                </p>
                              </div>

                              {/* Salary + mode */}
                              <div className="lg:col-span-2 space-y-0.5">
                                {req.salary_cap ? (
                                  <p className="text-xs">
                                    <span className="font-semibold text-primary">${Number(req.salary_cap).toLocaleString()}</span>
                                    {req.variable && <span className="text-on-surface-variant"> · {req.variable}</span>}
                                  </p>
                                ) : (
                                  <p className="text-xs text-on-surface-variant/40">No salary</p>
                                )}
                                <p className="text-xs text-on-surface-variant/70">
                                  {req.work_arrangement?.name ?? '—'}{req.desired_location ? ` · ${req.desired_location}` : ''}
                                </p>
                              </div>

                              {/* FTE */}
                              <div className="lg:col-span-1">
                                <p className="text-xs text-on-surface-variant/70">{req.fte_count ?? 1} FTE</p>
                                {req.duration && <p className="text-[10px] text-on-surface-variant/50">{req.duration}</p>}
                              </div>

                              {/* Target fill date */}
                              <div className="lg:col-span-1">
                                <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wider mb-0.5">Target</p>
                                <p className="text-xs font-semibold text-primary">{fmt(req.target_fill_date)}</p>
                              </div>

                              {/* Status + actions */}
                              <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                                <button
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${st.bg} ${st.text} tracking-wide hover:opacity-80 transition-opacity`}
                                  title="Cambiar estatus"
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (statusPickerId === req.id) {
                                      setStatusPickerId(null)
                                      setStatusPickerPos(null)
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      setStatusPickerPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                                      setStatusPickerId(req.id)
                                    }
                                  }}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`}></span>
                                  {req.status?.name?.startsWith('Closed') ? 'Closed' : (req.status?.name ?? '—')}
                                  <span className="material-symbols-outlined text-[11px] leading-none">arrow_drop_down</span>
                                </button>
                                <div className="flex gap-0.5 shrink-0">
                                  {can('requirements.edit') && (
                                    <Link
                                      to={`/requirements/edit/${req.id}`}
                                      title="Edit"
                                      className="p-1.5 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <span className="material-symbols-outlined text-[15px]">edit</span>
                                    </Link>
                                  )}
                                  {can('requirements.delete') && (
                                    <button
                                      title="Delete"
                                      className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                                      onClick={e => handleDelete(e, req.id)}
                                    >
                                      <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                                    </button>
                                  )}
                                </div>
                                <span
                                  className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 shrink-0"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >expand_more</span>
                              </div>
                            </div>

                            {/* Pipeline panel */}
                            {isExpanded && (
                              <div className="border-t border-outline-variant/10 bg-surface-container/30 px-5 py-4">
                                <PipelinePanel
                                  reqId={req.id}
                                  clientId={client?.id}
                                  canDrag={can('requirements.pipeline')}
                                  canManage={can('requirements.edit')}
                                />
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10">
                                  <p className="text-xs text-on-surface-variant">
                                    App. Date: <span className="font-medium">{fmt(req.application_date)}</span>
                                    &nbsp;·&nbsp; VISA: <span className="font-medium">{req.visa_us_required ? 'Required' : 'Not required'}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          </> /* end pipeline view */}

        </div>
      </div>
    </>
  )
}
