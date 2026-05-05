import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import {
  listRequirements, deleteRequirement,
  getRequirementCandidates, addCandidateToRequirement,
  updateCandidateStage, removeCandidateFromRequirement,
  getCatalogs, getClientStages, searchCandidatesForReq,
} from '../api/requirements'

/* ── helpers ── */
const PRIORITY = {
  1: { label: 'Low',  color: 'text-on-surface-variant', dot: 'bg-outline' },
  2: { label: 'Med',  color: 'text-surface-tint',        dot: 'bg-surface-tint' },
  3: { label: 'High', color: 'text-error',               dot: 'bg-error' },
}
const STATUS_STYLE = {
  'Open':                 { bg: 'bg-secondary-container',    text: 'text-on-secondary-container', dot: 'bg-secondary' },
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

/* ── Pipeline Panel ── */
function PipelinePanel({ reqId, clientId, canDrag, canManage }) {
  const [rcList, setRcList]     = useState([])
  const [stages, setStages]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadErr, setLoadErr]   = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

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
              <div className="flex-1 px-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 260 }}>
                {cards.map(rc => (
                  <div
                    key={rc.id}
                    draggable={canDrag}
                    onDragStart={canDrag ? (e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging({ rcId: rc.id, stage: stage.name })
                    } : undefined}
                    onDragEnd={canDrag ? () => { setDragging(null); setDragOver(null) } : undefined}
                    className={`group relative rounded-xl border transition-all select-none
                      ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
                      ${dragging?.rcId === rc.id ? 'opacity-40 scale-95' : 'hover:shadow-md'}
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

                    <div className="px-3 py-2.5">
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
                      {rc.submitted_at && (
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                          {new Date(rc.submitted_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <button
                        onClick={e => { e.stopPropagation(); removeCard(rc.id) }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md bg-white/80 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        title="Quitar candidato"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
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
    </div>
  )
}

/* ── Main Page ── */
export default function Requirements() {
  const { can } = usePermissions()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [catalogs, setCatalogs]         = useState({ statuses: [], clients: [], stages: [] })
  const [expanded, setExpanded]         = useState({})
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reqs, cats] = await Promise.all([
        listRequirements({ search, statusId: filterStatus, clientId: filterClient }),
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

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterClient('')
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Ledger</span>
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
          <button title="Notifications" className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center relative">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
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
                    {catalogs.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

          {/* Requirements List */}
          <div className="space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-16 gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Loading requirements…</span>
              </div>
            )}

            {!loading && requirements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">assignment</span>
                <p className="text-on-surface-variant font-medium">No requirements found</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">
                  {can('requirements.create') ? 'Create your first requirement to get started.' : 'No hay requerimientos activos.'}
                </p>
              </div>
            )}

            {!loading && requirements.map(req => {
              const isExpanded = expanded[req.id]
              const pri = PRIORITY[req.priority] ?? PRIORITY[2]
              const st  = STATUS_STYLE[req.status?.name] ?? DEFAULT_STATUS
              const candidateCount = req.rc_count?.length ?? 0

              return (
                <div key={req.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_12px_rgba(24,28,30,0.04)] overflow-hidden">
                  {/* Main row */}
                  <div
                    className="req-row grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-2 items-center px-5 py-4 cursor-pointer group hover:bg-surface-container/30 transition-colors"
                    onClick={() => toggleRow(req.id)}
                  >
                    {/* Priority */}
                    <div className="lg:col-span-1 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pri.dot} shrink-0`}></span>
                      <span className={`text-[10px] font-bold ${pri.color} uppercase tracking-wide`}>{pri.label}</span>
                    </div>

                    {/* ID + Title */}
                    <div className="lg:col-span-3">
                      <span className="font-mono text-xs text-on-surface-variant">{reqLabel(req.req_number, req.application_date)}</span>
                      <p className="font-semibold text-primary text-sm leading-tight group-hover:text-surface-tint transition-colors">{req.job_title}</p>
                    </div>

                    {/* Client */}
                    <div className="lg:col-span-2 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {req.client?.name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary">{req.client?.name ?? '—'}</p>
                        <p className="text-[10px] text-on-surface-variant">{candidateCount} candidate{candidateCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Comp + details */}
                    <div className="lg:col-span-2 space-y-0.5">
                      {req.salary_cap && (
                        <p className="text-xs text-on-surface-variant">
                          <span className="font-medium text-primary">${Number(req.salary_cap).toLocaleString()}</span>
                          {req.variable ? ` · ${req.variable}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-on-surface-variant">{req.work_arrangement?.name ?? '—'}{req.desired_location ? ` · ${req.desired_location}` : ''}</p>
                      <p className="text-xs text-on-surface-variant">{req.fte_count ?? 1} FTE{(req.fte_count ?? 1) !== 1 ? "'" : ''}{req.duration ? ` · ${req.duration}` : ''}</p>
                    </div>

                    {/* Target date */}
                    <div className="lg:col-span-2 text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Target Fill</p>
                      <p className="text-sm font-semibold text-primary">{fmt(req.target_fill_date)}</p>
                    </div>

                    {/* Status + actions */}
                    <div className="lg:col-span-2 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${st.bg} ${st.text} tracking-wide uppercase`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>{req.status?.name ?? '—'}
                      </span>
                      <div className="row-actions flex gap-1">
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
                        className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >expand_more</span>
                    </div>
                  </div>

                  {/* Pipeline panel */}
                  {isExpanded && (
                    <div className="border-t border-outline-variant/10 bg-surface-container/30 px-5 py-4">
                      <PipelinePanel
                        reqId={req.id}
                        clientId={req.client?.id}
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
      </div>
    </>
  )
}
