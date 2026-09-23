import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import { useRequirementAlerts } from '../hooks/useRequirementAlerts'
import RequirementAlertBell from '../components/RequirementAlertBell'
import PortalButtons from '../components/PortalButtons'
import PipelinePanel from '../components/PipelinePanel'
import {
  listRequirements, deleteRequirement,
  getCatalogs,
  listPendingApprovals, approveRequirement, rejectRequirement,
  updateRequirementStatus, updateRequirementPriority, updateRequirementFte,
  getReqBoard, updateReqBoardRow, getWeeklyBoardStats, addReqBoardRow,
  getOpenRequirementsForBoard,
  saveRequirementClosure,
} from '../api/requirements'
import ClientsView from './Clients'

/* ── helpers ── */
const PRIORITY = {
  0: { label: '0',       bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25' },
  1: { label: '1',       bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/25' },
  2: { label: '2',       bg: 'bg-blue-500/15',   text: 'text-blue-300',   border: 'border-blue-500/25' },
  3: { label: '3',       bg: 'bg-surface-variant/50', text: 'text-on-surface-variant', border: 'border-outline-variant/30' },
  4: { label: '4',       bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/25' },
  5: { label: '5',       bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/25' },
}

const CLIENT_LOGOS = {
  'PacVue':          '/logos/pacvue.png',
  'LogicMonitor':    '/logos/logicmonitor.webp',
  'BlueConic':       '/logos/blueconic.png',
  'Mygo':            '/logos/mygo.png',
  'Numen':           '/logos/numen.png',
  'Yash':            '/logos/yash.png',
  'HTC':             '/logos/htc.png',
  'Bahwan Cybertek': '/logos/bahwan.avif',
  'Numeric':         '/logos/numeric.png',
  'Excelencia Consulting': '/logos/excelencia.png',
  'Avari':           '/logos/avari.png',
}

const LOGO_EXTRA = {}

function ClientLogo({ name = '', size = 'sm' }) {
  const [err, setErr] = useState(false)
  const src = CLIENT_LOGOS[name]
  if (src && !err) {
    const extra = LOGO_EXTRA[name]
    if (extra) {
      const wrapCls = size === 'header'
        ? `h-8 ${extra.headerW} overflow-hidden flex items-center justify-center`
        : `h-5 ${extra.smW} overflow-hidden flex items-center justify-center`
      const imgCls = size === 'header' ? 'h-8 w-auto object-contain' : 'h-5 w-auto object-contain'
      return (
        <div className={wrapCls}>
          <img src={src} alt={name} className={imgCls} style={{ transform: `scale(${extra.scale})` }} onError={() => setErr(true)} />
        </div>
      )
    }
    const cls = size === 'header' ? 'h-8 w-auto max-w-[120px]' : 'h-5 w-auto max-w-[56px]'
    return <img src={src} alt={name} className={`${cls} object-contain`} onError={() => setErr(true)} />
  }
  const av = size === 'header' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-[0.6875rem]'
  return (
    <div className={`${av} rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
const STATUS_STYLE = {
  'Open':                 { bg: 'bg-secondary-container',    text: 'text-on-secondary-container', dot: 'bg-[#22c55e]' },
  'Pending Approval':     { bg: 'bg-tertiary-container',     text: 'text-on-tertiary-container',  dot: 'bg-tertiary' },
  'Pending Validation':   { bg: 'bg-tertiary-container',     text: 'text-on-tertiary-container',  dot: 'bg-tertiary' },
  'Paused':               { bg: 'bg-surface-container-high', text: 'text-on-surface-variant',     dot: 'bg-outline' },
  'Closed - Covered':     { bg: 'bg-primary/10',             text: 'text-primary',                dot: 'bg-error' },
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
            <span className="material-symbols-outlined text-[1.25rem] text-yellow-400">pending_actions</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-yellow-300">
              {pending.length} requerimiento{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''} de aprobación
            </p>
            <p className="text-xs text-slate-400">Revisar y autorizar para que aparezcan en el sistema</p>
          </div>
        </div>
        <span
          className="material-symbols-outlined text-[1.25rem] text-yellow-400 transition-transform duration-200"
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
                    <span className={`text-[0.625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${PRI_BADGE[req.priority] ?? PRI_BADGE[2]}`}>
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
                      ? <span className="material-symbols-outlined animate-spin text-[0.9375rem]">progress_activity</span>
                      : <span className="material-symbols-outlined text-[0.9375rem]">check_circle</span>}
                    Aprobar
                  </button>
                  <button
                    disabled={!!acting}
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[0.9375rem]">cancel</span>
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
  4: { bg: '#fde68a', text: '#78350f' },
  5: { bg: '#38bdf8', text: '#0c4a6e' },
}

const PRIORITY_INFO = [
  { n: 0, text: 'Requerimiento nuevo o súper urgente.' },
  { n: 1, text: 'Ya se enviaron candidatos, pero se deben enviar más.' },
  { n: 2, text: 'Dejamos de hacer sourcing por que el cliente tiene buen pipeline. Seguimos entrevistando a los candidatos que previamente contactamos y que apenas están respondiendo, en caso de ser buen fit, se mandan a cliente.' },
  { n: 3, text: 'La posición está en hold.' },
  { n: 4, text: 'Jacobo: "Por definir".' },
  { n: 5, text: 'Oferta aceptada.' },
]

/* ── Info icon with priority legend (fixed-position so the table scroll doesn't clip it) ── */
function PriorityInfo() {
  const [anchor, setAnchor] = useState(null) // { cy, left } — icon's vertical center and tooltip left edge
  const [top, setTop]       = useState(null) // measured top, clamped inside the viewport
  const tipRef = useRef(null)

  function show(e) {
    const r = e.currentTarget.getBoundingClientRect()
    setTop(null)
    setAnchor({ cy: r.top + r.height / 2, left: r.right + 12 })
  }

  useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return
    const h = tipRef.current.offsetHeight
    setTop(Math.min(Math.max(anchor.cy - h / 2, 8), window.innerHeight - h - 8))
  }, [anchor])

  return (
    <>
      <span
        onMouseEnter={show}
        onMouseLeave={() => { setAnchor(null); setTop(null) }}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full cursor-help shrink-0 transition-transform hover:scale-110"
        aria-label="Significado de las prioridades"
      >
        <span className="material-symbols-outlined text-[1.5rem]" style={{ color: '#81b927', fontVariationSettings: "'FILL' 1" }}>info</span>
      </span>
      {anchor && (
        <div
          ref={tipRef}
          className="priority-tip fixed z-[70] w-[25rem] pointer-events-none text-left"
          style={{ top: top ?? 0, left: anchor.left, visibility: top === null ? 'hidden' : 'visible' }}
        >
          <div
            className="overflow-hidden rounded-2xl border border-[#81b927]/60"
            style={{
              background: 'linear-gradient(165deg, #17417a 0%, #0b1e3d 65%)',
              boxShadow: '0 22px 55px rgba(0,0,0,0.55), 0 0 32px rgba(129,185,39,0.28)',
            }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: 'linear-gradient(90deg, #81b927 0%, #5f9a1a 100%)' }}>
              <span className="material-symbols-outlined text-[1.25rem]" style={{ color: '#10284d', fontVariationSettings: "'FILL' 1" }}>flag</span>
              <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#10284d' }}>Guía de prioridades</p>
            </div>
            <ul className="p-3 space-y-1.5">
              {PRIORITY_INFO.map(({ n, text }) => (
                <li key={n} className="flex items-start gap-3 rounded-xl px-2.5 py-2 bg-white/[0.05]">
                  <span
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-extrabold shadow-md"
                    style={{ backgroundColor: PRI_TABLE[n].bg, color: PRI_TABLE[n].text }}
                  >{n}</span>
                  <p className="text-[0.7813rem] leading-snug text-white/90 pt-[5px]">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Save chime (Web Audio API, no external files) ── */
function playChime() {
  try { new Audio('/sounds/Prioridades.mp3').play() } catch {}
}

/* ── Celebración al marcar una posición como 5 (oferta aceptada) ── */
function playCelebration() {
  try { new Audio('/sounds/5.mp3').play() } catch {}
}

const CONFETTI_COLORS = ['#38bdf8', '#7dd3fc', '#0ea5e9', '#bae6fd', '#e0f2fe', '#0284c7']

function ConfettiBurst({ x, y }) {
  const pieces = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.4
    const dist = 60 + Math.random() * 100
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 30,
      rot: Math.random() * 540 - 270,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      delay: Math.random() * 0.12,
    }
  }), [])
  return (
    <div className="confetti-burst fixed pointer-events-none z-[80]" style={{ left: x, top: y }} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, background: p.color, width: p.w, height: p.h, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  )
}

/* ── Inline editable cell ── */
function EditableCell({ value, onChange, onRequestChange, type = 'text', placeholder = '', disabled = false, glow = false, large = false, lime = false, min }) {
  const [draft, setDraft] = useState(value ?? '')
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)

  useEffect(() => { setDraft(value ?? '') }, [value])

  function handleSave() {
    if (min !== undefined && (draft === '' || Number(draft) < min)) {
      setDraft(value ?? '')
      return
    }
    if (!disabled && draft !== (value ?? '')) {
      // With onRequestChange the parent asks for confirmation first and applies the change itself
      if (onRequestChange) { onRequestChange(draft); return }
      onChange(draft)
      playChime()
      clearTimeout(savedTimer.current)
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <input
      type={type}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className={`w-full bg-transparent text-center text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:bg-surface-container rounded px-1 py-0.5 border border-[#81b927]/60 focus:border-[#81b927] disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${large ? 'text-xl font-bold' : 'text-sm'} ${lime ? 'cell-lime' : ''} ${saved ? 'cell-saved' : glow && !disabled ? 'cell-glow' : ''}`}
    />
  )
}

/* ── Toggle switch ── */
function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex items-center shrink-0 cursor-pointer transition-all duration-300 focus:outline-none"
      style={{ width: 40, height: 22 }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute inset-0 rounded-full transition-colors duration-300"
        style={{ backgroundColor: on ? '#50B152' : '#ea580c' }}
      />
      <span
        className="absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-300"
        style={{ transform: on ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  )
}

/* ── Add-from-requirement modal ── */
function AddReqModal({ onAdd, onClose }) {
  const [reqs, setReqs]       = useState([])
  const [loadingReqs, setLoadingReqs] = useState(true)
  const [search, setSearch]   = useState('')
  const [adding, setAdding]   = useState(null)

  useEffect(() => {
    listRequirements({ excludePending: true })
      .then(data => setReqs(data.filter(r => r.status?.name === 'Open')))
      .finally(() => setLoadingReqs(false))
  }, [])

  const filtered = reqs.filter(r =>
    !search.trim() ||
    r.job_title?.toLowerCase().includes(search.toLowerCase()) ||
    r.client?.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSelect(req) {
    if (adding) return
    setAdding(req.id)
    try {
      await onAdd({
        requirement_id: req.id,
        position:  req.job_title,
        cliente:   req.client?.name ?? null,
        ftes:      req.fte_count    ?? null,
        prioridad: req.priority     ?? null,
        recruiter: null,
        everscale: null,
        interno:   null,
      })
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-outline-variant/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div>
            <h2 className="font-bold text-primary text-base">Agregar Requerimiento</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Selecciona un requerimiento activo</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[1.25rem]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[1.125rem]">search</span>
            <input
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant"
              placeholder="Buscar por posición o cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="px-3 pb-4 max-h-80 overflow-y-auto space-y-1">
          {loadingReqs && (
            <div className="flex items-center justify-center py-8 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[1.25rem]">progress_activity</span>
            </div>
          )}
          {!loadingReqs && filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-on-surface-variant/60">No se encontraron requerimientos</div>
          )}
          {!loadingReqs && filtered.map(req => {
            const pri = PRI_TABLE[req.priority] ?? PRI_TABLE[2]
            const isAdding = adding === req.id
            return (
              <button
                key={req.id}
                disabled={!!adding}
                onClick={() => handleSelect(req)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-container transition-colors text-left disabled:opacity-50"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: pri.bg, color: pri.text }}
                >
                  {req.priority ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{req.job_title}</p>
                  <p className="text-xs text-on-surface-variant">{req.client?.name ?? '—'} · {req.fte_count ?? 1} FTE</p>
                </div>
                {isAdding
                  ? <span className="material-symbols-outlined animate-spin text-primary text-[1.125rem]">progress_activity</span>
                  : <span className="material-symbols-outlined text-primary/40 text-[1.125rem]">add_circle</span>
                }
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getISOWeekReq(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return { week: 1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7), year: d.getFullYear() }
}

function shiftWeek({ week, year }, delta) {
  // Get Monday of the given ISO week, shift by delta weeks, return new ISO week
  const jan4    = new Date(year, 0, 4)
  const dow     = jan4.getDay() || 7
  const monday  = new Date(jan4)
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7 + delta * 7)
  return getISOWeekReq(monday)
}

/* ── Standalone Board Table (reads/writes only req_board) ── */
function ReqBoardTable() {
  const { can }                         = usePermissions()
  const currentWeek                     = getISOWeekReq()
  const [selWeek, setSelWeek]           = useState(currentWeek)
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [kpi, setKpi]                   = useState(null)
  const [pipelineModal, setPipelineModal] = useState(null) // { reqId, clientId, clientName, position }
  const [closeConfirm, setCloseConfirm]       = useState(null) // { requirementId, position }
  const [closeReasonModal, setCloseReasonModal] = useState(null) // { requirementId } | null
  const [fteConfirm, setFteConfirm]     = useState(null) // { requirementId, position, cliente, from, to } | null
  const [fteResetKey, setFteResetKey]   = useState(0)    // bumped to make FTE cells discard a cancelled edit
  const [burst, setBurst]               = useState(null) // { id, x, y, reqId } — celebración de oferta aceptada (prioridad 5)
  const burstTimer = useRef(null)

  function celebrateOffer(el, reqId) {
    const r = el.getBoundingClientRect()
    setBurst({ id: Date.now(), x: r.left + r.width / 2, y: r.top + r.height / 2, reqId })
    playCelebration()
    clearTimeout(burstTimer.current)
    burstTimer.current = setTimeout(() => setBurst(null), 1800)
  }

  const isCurrentWeek = selWeek.week === currentWeek.week && selWeek.year === currentWeek.year
  const isPastWeek = selWeek.year < currentWeek.year ||
    (selWeek.year === currentWeek.year && selWeek.week < currentWeek.week)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getOpenRequirementsForBoard(selWeek.week, selWeek.year),
      getWeeklyBoardStats(selWeek.week, selWeek.year),
    ]).then(([boardRows, stats]) => {
      setRows(boardRows)
      setKpi(stats)
    }).finally(() => setLoading(false))
  }, [selWeek.week, selWeek.year])

  async function handleUpdate(requirementId, patch) {
    if (isPastWeek) return
    const row = rows.find(r => r.requirement_id === requirementId)
    if (!row) return
    setRows(prev => prev.map(r => r.requirement_id === requirementId ? { ...r, ...patch } : r))
    try {
      if (row.id === null) {
        const newBoardRow = await addReqBoardRow({
          requirement_id: requirementId,
          position:  row.position,
          cliente:   row.cliente,
          ftes:      patch.ftes      ?? row.ftes,
          prioridad: patch.prioridad ?? row.prioridad,
          recruiter: patch.recruiter ?? row.recruiter,
          everscale: patch.everscale ?? row.everscale,
          interno:   patch.interno   ?? row.interno,
          activo:    patch.activo    ?? row.activo ?? false,
          week_number: selWeek.week,
          week_year:   selWeek.year,
        })
        setRows(prev => prev.map(r => r.requirement_id === requirementId ? { ...r, id: newBoardRow.id } : r))
      } else {
        await updateReqBoardRow(row.id, patch)
      }
      // Sync prioridad → requirement.priority so Pipeline stays in sync
      if ('prioridad' in patch) {
        updateRequirementPriority(requirementId, patch.prioridad).catch(() => {})
      }
      // Sync FTEs → requirement.fte_count (the board reads FTEs from the requirement)
      if ('ftes' in patch) {
        updateRequirementFte(requirementId, patch.ftes).catch(err => {
          setRows(prev => prev.map(r => r.requirement_id === requirementId ? { ...r, ftes: row.ftes } : r))
          alert(`No se pudo guardar el FTE: ${err.message}`)
        })
      }
      if ('activo' in patch) {
        getWeeklyBoardStats(selWeek.week, selWeek.year).then(setKpi)
      }
    } catch { /* optimistic fallback */ }
  }

  const enBusqueda = rows.filter(r => r.activo).length
  const ratio = enBusqueda > 0 && kpi
    ? (kpi.sent / enBusqueda).toFixed(1)
    : null

  const COLS = [
    { label: 'Búsqueda',       width: '80px'  },
    { label: 'Recruiter',      width: '150px' },
    { label: 'Position',       width: '210px' },
    { label: 'Prioridad',      width: '110px' },
    { label: 'Pipeline',       width: '50px'  },
    { label: "FTE's",          width: '80px'  },
    { label: 'Everscale Group',width: '115px' },
    { label: 'Interno',        width: '85px'  },
    { label: 'Enviados en esta semana', width: '110px' },
    { label: 'Enviados totales',        width: '100px' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-[1.5rem]">progress_activity</span>
      <span className="text-sm">Cargando…</span>
    </div>
  )

  function requestFteChange(row, rawValue) {
    const to = Math.max(1, Math.round(Number(rawValue)))
    if (to === row.ftes) { setFteResetKey(k => k + 1); return }
    setFteConfirm({ requirementId: row.requirement_id, position: row.position, cliente: row.cliente, from: row.ftes, to })
  }

  function confirmFteChange() {
    const { requirementId, to } = fteConfirm
    setFteConfirm(null)
    handleUpdate(requirementId, { ftes: to })
    playChime()
  }

  function cancelFteChange() {
    setFteConfirm(null)
    setFteResetKey(k => k + 1)
  }

  function handleCloseRequirement() {
    if (!closeConfirm) return
    const { requirementId } = closeConfirm
    setCloseConfirm(null)
    setCloseReasonModal({ requirementId })
  }

  async function handleCloseReasonConfirm({ closeReason, coveredByEverscale }) {
    if (!closeReasonModal) return
    const { requirementId } = closeReasonModal
    setCloseReasonModal(null)
    try {
      await saveRequirementClosure({ requirementId, closeReason, coveredByEverscale })
    } catch (_) {}
    try {
      const statusId = coveredByEverscale ? 4 : 5 // 4 = Covered, 5 = Not Covered
      await updateRequirementStatus(requirementId, statusId)
      setRows(prev => prev.filter(r => r.requirement_id !== requirementId))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
    {closeConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0b1e3d] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[1.75rem] text-red-400">warning</span>
            <h2 className="text-base font-bold text-white">Cerrar posición</h2>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Esta posición se cerrará y se quitará del tablero de prioridades semanales.
          </p>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => setCloseConfirm(null)}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              No
            </button>
            <button
              onClick={handleCloseRequirement}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Sí, cerrar
            </button>
          </div>
        </div>
      </div>
    )}
    {fteConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={cancelFteChange}>
        <div
          className="bg-[#0b1e3d] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm mx-4 p-6 flex flex-col gap-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[1.75rem]" style={{ color: '#81b927' }}>groups</span>
            <h2 className="text-base font-bold text-white">Modificar FTE's</h2>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Esta acción modificará los FTE's para este rol en todas las tablas. ¿Continuar?
          </p>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[0.625rem] font-bold text-white/40 uppercase tracking-widest mb-0.5">{fteConfirm.cliente ?? '—'}</p>
            <p className="text-sm font-bold text-white">{fteConfirm.position ?? '—'}</p>
            <p className="text-sm text-white/70 mt-1">
              FTE's: <span className="font-bold text-white">{fteConfirm.from ?? '—'}</span>
              <span className="mx-2" style={{ color: '#81b927' }}>→</span>
              <span className="font-bold" style={{ color: '#81b927' }}>{fteConfirm.to}</span>
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={cancelFteChange}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              No
            </button>
            <button
              onClick={confirmFteChange}
              className="px-5 py-2 rounded-xl text-sm font-bold text-[#10284d] hover:brightness-110 transition"
              style={{ backgroundColor: '#81b927' }}
            >
              Sí, continuar
            </button>
          </div>
        </div>
      </div>
    )}
    {closeReasonModal && (
      <CloseRequirementModal
        onConfirm={handleCloseReasonConfirm}
        onCancel={() => setCloseReasonModal(null)}
      />
    )}
    {pipelineModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPipelineModal(null)}>
        <div
          className="relative bg-[#0b1e3d] rounded-2xl shadow-2xl border border-white/10 w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <p className="text-[0.625rem] font-bold text-white/40 uppercase tracking-widest mb-0.5">{pipelineModal.clientName ?? '—'}</p>
              <h2 className="text-base font-bold text-white">{pipelineModal.position ?? 'Pipeline'}</h2>
            </div>
            <button
              onClick={() => setPipelineModal(null)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[1.25rem]">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <PipelinePanel
              reqId={pipelineModal.reqId}
              clientId={pipelineModal.clientId}
              clientName={pipelineModal.clientName}
              canDrag={can('requirements.pipeline')}
              canManage={can('requirements.edit')}
            />
          </div>
        </div>
      </div>
    )}
    <div className="space-y-5">
      <style>{`
        @keyframes cellGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(129,185,39,0); border-color: rgba(129,185,39,0.4); }
          50%       { box-shadow: 0 0 10px 3px rgba(129,185,39,0.5); border-color: rgba(129,185,39,1); }
        }
        .cell-glow { animation: cellGlow 2.2s ease-in-out infinite; }

        @keyframes savedFlash {
          0%   { background-color: #81b927; color: #fff; border-color: #5c8a15; box-shadow: 0 0 0 5px rgba(129,185,39,0.55), 0 0 18px rgba(129,185,39,0.5); transform: scale(1.07); }
          35%  { background-color: rgba(129,185,39,0.42); color: #1a4a00; border-color: #81b927; box-shadow: 0 0 0 3px rgba(129,185,39,0.35); transform: scale(1.03); }
          100% { background-color: transparent; color: inherit; border-color: rgba(129,185,39,0.6); box-shadow: none; transform: scale(1); }
        }
        .cell-saved { animation: savedFlash 2.5s ease-out forwards; }
        .cell-lime { background-color: #81b927 !important; color: #10284d !important; }

        @keyframes priTipIn {
          from { opacity: 0; transform: translateX(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .priority-tip { animation: priTipIn 0.16s ease-out; }

        /* Prioridad 5 — oferta aceptada: celeste con marco dorado, resplandor en las esquinas
           y una lucecita dorada que recorre el perímetro (arriba →, abajo ←) */
        @keyframes offerSweep {
          0%   { background-position: 94% 0, -20% 3px, 120% calc(100% - 3px), 0 0; }
          100% { background-position: -6% 0, 120% 3px, -20% calc(100% - 3px), 0 0; }
        }
        .row-offer {
          background-image:
            linear-gradient(105deg, transparent 36%, rgba(255,255,255,0.95) 50%, transparent 64%),
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(250,204,21,1) 50%, rgba(255,255,255,0.9) 60%, transparent 100%),
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(250,204,21,1) 50%, rgba(255,255,255,0.9) 60%, transparent 100%),
            linear-gradient(90deg, rgba(56,189,248,0.34) 0%, rgba(125,211,252,0.30) 100%);
          background-size: 260% 100%, 40% 3px, 40% 3px, 100% 100%;
          background-repeat: no-repeat;
          animation: offerSweep 6.5s linear infinite;
        }
        .row-offer td {
          border-top: 1.5px solid rgba(250,204,21,0.6);
          border-bottom-color: rgba(250,204,21,0.6) !important;
        }
        .row-offer td:first-child {
          border-left: 1.5px solid rgba(250,204,21,0.6);
          border-radius: 10px 0 0 10px;
          box-shadow: inset 8px 0 12px -8px rgba(250,204,21,0.55);
        }
        .row-offer td:last-child {
          border-right: 1.5px solid rgba(250,204,21,0.6);
          border-radius: 0 10px 10px 0;
          box-shadow: inset -8px 0 12px -8px rgba(250,204,21,0.55);
        }
        @keyframes offerBurst {
          0%   { box-shadow: inset 0 0 44px 10px rgba(250,204,21,0.95), inset 0 0 0 2px rgba(255,255,255,0.9); }
          100% { box-shadow: inset 0 0 0 0 rgba(250,204,21,0); }
        }
        .row-offer-burst td { animation: offerBurst 1.6s ease-out; }

        @keyframes confettiFly {
          0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
          65%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) + 70px)) rotate(var(--rot)) scale(0.8); }
        }
        .confetti-piece { position: absolute; left: 0; top: 0; border-radius: 2px; opacity: 0; animation: confettiFly 1.4s cubic-bezier(0.15, 0.7, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .row-offer, .row-offer-burst td { animation: none; }
          .confetti-burst { display: none; }
        }
      `}</style>

      {burst && <ConfettiBurst key={burst.id} x={burst.x} y={burst.y} />}

      {/* ── KPI bar ── */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#81b927' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-white">Prioridades Semanales</h2>
            <p className="text-[0.6875rem] text-white/70 mt-0.5">Actividad semanal por posición</p>
          </div>

          {/* Week navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container rounded-xl px-1 py-1">
              <button
                onClick={() => setSelWeek(w => shiftWeek(w, -1))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[1.125rem]">chevron_left</span>
              </button>
              <span className="text-sm font-semibold text-primary px-2 whitespace-nowrap">
                Week {String(selWeek.week).padStart(2, '0')} · {selWeek.year}
              </span>
              <button
                onClick={() => setSelWeek(w => shiftWeek(w, 1))}
                disabled={isCurrentWeek}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[1.125rem]">chevron_right</span>
              </button>
            </div>
            {!isCurrentWeek && (
              <button
                onClick={() => setSelWeek(currentWeek)}
                className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>

        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">

          {/* Semana */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem] text-on-surface-variant/50">calendar_today</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Semana</span>
            </div>
            <p className="text-5xl font-light tracking-tighter text-primary">{selWeek.week}</p>
          </div>

          {/* Requerimientos Abiertos */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem] text-on-surface-variant/50">toggle_on</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Req. Abiertos</span>
            </div>
            <p className="text-5xl font-light tracking-tighter text-primary">{kpi?.activePositions ?? 0}</p>
          </div>

          {/* Req. en búsqueda */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem] text-on-surface-variant/50">manage_search</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Req. en búsqueda</span>
            </div>
            <p className="text-5xl font-light tracking-tighter text-primary">{rows.filter(r => r.activo).length}</p>
          </div>

          {/* Enviados */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem]" style={{ color: '#50B152' }}>send</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Enviados</span>
            </div>
            <p className="text-5xl font-light tracking-tighter" style={{ color: '#50B152' }}>{kpi?.sent ?? 0}</p>
          </div>

          {/* Rechazados */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem]" style={{ color: '#ba1a1a' }}>cancel</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Rechazados</span>
            </div>
            <p className="text-5xl font-light tracking-tighter" style={{ color: '#ba1a1a' }}>{kpi?.rejected ?? 0}</p>
          </div>

          {/* Promedio Semanal */}
          <div className="bg-white rounded-xl p-5 border border-white/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[1rem] text-on-surface-variant/50">calculate</span>
              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-on-surface-variant">Promedio Semanal</span>
            </div>
            <p className="text-5xl font-light tracking-tighter text-primary">
              {ratio !== null ? ratio : <span className="text-on-surface-variant/30 text-3xl">—</span>}
            </p>
          </div>

        </div>
      </div>

      {/* ── Table ── */}
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.05)]">
      <table className="w-full border-collapse" style={{ minWidth: 960 }}>
        <thead>
          <tr>
            {COLS.map(col => (
              <th
                key={col.label}
                style={{ width: col.width }}
                className={`text-[0.875rem] font-bold uppercase tracking-[0.1em] text-white text-center px-3 py-4 border-b border-white/20 ${col.label.length > 16 && col.label !== 'Everscale Group' ? 'whitespace-normal leading-tight min-w-[110px]' : 'whitespace-nowrap'}`} style={{ backgroundColor: '#81b927' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(selWeek.year < 2026 || (selWeek.year === 2026 && selWeek.week < 33)) ? (
            <tr>
              <td colSpan={COLS.length}>
                <style>{`
                  @keyframes priorGlow {
                    0%   { box-shadow: 0 0 12px 4px #ffe033, 0 0 32px 10px #ffb700; }
                    50%  { box-shadow: 0 0 32px 14px #ffe033, 0 0 72px 28px #ffb700; }
                    100% { box-shadow: 0 0 12px 4px #ffe033, 0 0 32px 10px #ffb700; }
                  }
                `}</style>
                <div style={{
                  backgroundColor: '#ffe033',
                  color: '#000',
                  fontStyle: 'italic',
                  fontSize: '2rem',
                  fontWeight: '700',
                  textAlign: 'center',
                  padding: '3.5rem 2rem',
                  lineHeight: 1.4,
                  animation: 'priorGlow 2s ease-in-out infinite',
                }}>
                  No información encontrada:<br />
                  <span style={{ fontSize: '1.4rem', fontWeight: '500' }}>
                    Esta sección se implementó a partir de la semana 33
                  </span>
                </div>
              </td>
            </tr>
          ) : (() => {
            const CLIENT_LAST = ['LogicMonitor', 'PacVue']
            const clientKey = c => {
              const i = CLIENT_LAST.findIndex(n => n.toLowerCase() === (c ?? '').toLowerCase())
              return i === -1 ? 0 : i + 1  // others=0 (top), LogicMonitor=1, PacVue=2 (bottom)
            }
            const grouped = rows.reduce((acc, row) => {
              const c = row.cliente ?? '—'
              if (!acc[c]) acc[c] = []
              acc[c].push(row)
              return acc
            }, {})
            const sortedClients = Object.keys(grouped).sort((a, b) => {
              const ia = clientKey(a), ib = clientKey(b)
              if (ia !== ib) return ia - ib
              return a.localeCompare(b)
            })
            return sortedClients.flatMap(cliente => [
              <tr key={`group-${cliente}`}>
                <td colSpan={COLS.length} className="px-4 py-2" style={{ backgroundColor: '#10284d', color: '#fff' }}>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="flex items-center justify-center h-10 px-3 rounded-xl bg-white shadow-sm border border-outline-variant/10 shrink-0 w-fit">
                      <ClientLogo name={cliente} size="header" />
                    </div>
                    <div className="flex items-center gap-6 text-[0.6875rem] font-bold uppercase tracking-wider">
                      <span className="animate-glow text-white">
                        Posiciones en búsqueda: {grouped[cliente].filter(r => r.activo).length}
                      </span>
                      <span className="animate-glow text-white">
                        Posiciones on hold: {grouped[cliente].filter(r => !r.activo).length}
                      </span>
                    </div>
                    <span />
                  </div>
                </td>
              </tr>,
              ...grouped[cliente].map(row => {
            const pri    = PRI_TABLE[row.prioridad] ?? PRI_TABLE[2]
            const activo = row.activo ?? false
            const rowBg  = activo
              ? 'rgba(80,177,82,0.10)'
              : 'rgba(234,88,12,0.08)'
            const rowBorder = activo
              ? 'rgba(80,177,82,0.20)'
              : 'rgba(234,88,12,0.15)'
            const isOffer = row.prioridad === 5 // oferta aceptada

            return (
              <tr
                key={row.requirement_id}
                className={isOffer ? `row-offer${burst?.reqId === row.requirement_id ? ' row-offer-burst' : ''}` : undefined}
                style={{
                  backgroundColor: isOffer ? 'rgba(56,189,248,0.10)' : rowBg,
                  borderBottom: `1px solid ${isOffer ? 'rgba(125,211,252,0.9)' : rowBorder}`,
                }}
              >
                {/* Toggle búsqueda */}
                <td className="px-3 py-3 text-center" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <div className={`flex justify-center ${isPastWeek ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Toggle on={activo} onChange={val => handleUpdate(row.requirement_id, { activo: val })} />
                  </div>
                </td>

                {/* Recruiter */}
                <td className="px-2 py-2" style={{ borderBottom: `1px solid ${rowBorder}`, minWidth: '150px', width: '150px' }}>
                  <select
                    value={row.recruiter ?? ''}
                    onChange={e => handleUpdate(row.requirement_id, { recruiter: e.target.value || null })}
                    disabled={isPastWeek}
                    className="w-full bg-transparent text-center text-sm font-bold text-on-surface outline-none cursor-pointer rounded px-1 py-0.5 border border-[#81b927]/60 focus:border-[#81b927] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">—</option>
                    <option value="César">César</option>
                    <option value="Enrique">Enrique</option>
                    <option value="Roberto">Roberto</option>
                    <option value="César/Enrique">César/Enrique</option>
                  </select>
                </td>

                {/* Position (read-only) */}
                <td className="px-3 py-2 text-center text-sm font-bold text-on-surface-variant" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  {row.position ?? '—'}
                </td>

                {/* Prioridad */}
                <td className="px-2 py-2 text-center" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <div className="flex items-center justify-center gap-1.5">
                  <select
                    value={row.prioridad ?? ''}
                    onChange={e => {
                      if (e.target.value === 'cerrada') {
                        setCloseConfirm({ requirementId: row.requirement_id, position: row.position })
                        e.target.value = row.prioridad ?? ''
                      } else {
                        const val = e.target.value === '' ? null : Number(e.target.value)
                        if (val === 5 && row.prioridad !== 5) celebrateOffer(e.currentTarget, row.requirement_id)
                        handleUpdate(row.requirement_id, { prioridad: val })
                      }
                    }}
                    disabled={isPastWeek}
                    className="rounded-lg text-sm font-bold text-center cursor-pointer outline-none border-none appearance-none px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: pri.bg, color: pri.text, width: 52, backgroundImage: 'none', paddingLeft: 0, paddingRight: 0, textAlignLast: 'center',
                      ...(isOffer ? { boxShadow: '0 0 0 2px #ffffff, 0 0 14px rgba(56,189,248,0.9)' } : {}),
                    }}
                  >
                    <option value="" disabled>—</option>
                    {[0, 1, 2, 3, 4, 5].map(value => (
                      <option key={value} value={value}
                        style={{ backgroundColor: PRI_TABLE[value].bg, color: PRI_TABLE[value].text }}
                      >{value}</option>
                    ))}
                    <option value="cerrada" style={{ backgroundColor: '#450a0a', color: '#fca5a5' }}>Cerrada</option>
                  </select>
                  <PriorityInfo />
                  </div>
                </td>

                {/* Eye button — open pipeline modal */}
                <td className="px-2 py-2 text-center" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <button
                    title="Ver pipeline"
                    onClick={() => setPipelineModal({ reqId: row.requirement_id, clientId: row.client_id, clientName: row.cliente, position: row.position })}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/10"
                  >
                    <span className="material-symbols-outlined text-[1.125rem] animate-glow" style={{ color: '#81b927' }}>visibility</span>
                  </button>
                </td>

                {/* FTEs (editable, synced to requirement.fte_count) */}
                <td className="px-2 py-2" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <EditableCell
                    key={`fte-${row.requirement_id}-${fteResetKey}`}
                    type="number"
                    min={1}
                    value={row.ftes != null ? String(row.ftes) : ''}
                    placeholder="—"
                    disabled={isPastWeek}
                    glow={!isPastWeek}
                    large
                    lime
                    onRequestChange={val => requestFteChange(row, val)}
                  />
                </td>

                {/* Everscale */}
                <td className="px-2 py-2" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <EditableCell
                    type="number"
                    value={row.everscale != null ? String(row.everscale) : ''}
                    placeholder="—"
                    disabled={isPastWeek}
                    glow={!isPastWeek}
                    large
                    onChange={val => handleUpdate(row.requirement_id, { everscale: val === '' ? null : Number(val) })}
                  />
                </td>

                {/* Interno */}
                <td className="px-2 py-2" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  <EditableCell
                    type="number"
                    value={row.interno != null ? String(row.interno) : ''}
                    placeholder="—"
                    disabled={isPastWeek}
                    glow={!isPastWeek}
                    large
                    onChange={val => handleUpdate(row.requirement_id, { interno: val === '' ? null : Number(val) })}
                  />
                </td>

                {/* Enviados (read-only) */}
                <td className="px-3 py-2 text-center text-xl font-bold text-on-surface-variant" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  {row.enviados ?? '—'}
                </td>

                {/* Enviados totales (pipeline activo + rechazados, read-only) */}
                <td className="px-3 py-2 text-center text-xl font-bold text-on-surface-variant" style={{ borderBottom: `1px solid ${rowBorder}` }}>
                  {row.enviados_totales ?? '—'}
                </td>
              </tr>
            )
          })
          ])
        })() }
        </tbody>
      </table>
    </div>

    </div>
    </>
  )
}

/* ── Close Requirement Modal ── */
function CloseRequirementModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const [covered, setCovered] = useState(null) // true | false | null
  const [attempted, setAttempted] = useState(false)

  // La razón solo es obligatoria cuando la posición NO fue cubierta por Everscale
  const reasonRequired = covered === false
  const reasonMissing  = reasonRequired && !reason.trim()

  function handleSubmit(e) {
    e.preventDefault()
    if (covered === null) return
    if (reasonMissing) { setAttempted(true); return }
    onConfirm({ closeReason: reason.trim() || null, coveredByEverscale: covered })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface-container rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-on-surface">Cerrar requerimiento</h2>
          <button type="button" onClick={onCancel} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[1.25rem]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-on-surface-variant">
            Razón de cierre{reasonRequired && <span className="text-error"> *</span>}
          </label>
          <textarea
            rows={3}
            placeholder="Describe brevemente por qué se cierra..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`bg-surface-container-high border rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              attempted && reasonMissing ? 'border-error ring-1 ring-error/50' : 'border-outline-variant/30'
            }`}
          />
          {attempted && reasonMissing && (
            <p className="text-[0.6875rem] text-error">Indica la razón de cierre: es obligatoria cuando la posición no fue cubierta por Everscale.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-on-surface-variant">¿Posición cubierta por Everscale?</label>
          <div className="flex gap-3">
            {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setCovered(opt.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  covered === opt.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {covered === null && (
            <p className="text-[0.6875rem] text-error">Selecciona una opción para continuar.</p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={covered === null}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-error text-on-error disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Confirmar cierre
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Main Page ── */
export default function Requirements() {
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const { pendingCount, loading: alertsLoading, showAlerts } = useRequirementAlerts()
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [catalogs, setCatalogs]         = useState({ statuses: [], clients: [], stages: [] })
  const [expanded, setExpanded]         = useState({})
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  // Pre-filled when arriving from a client's stat card on the Dashboard (?client=<id>)
  const [filterClient, setFilterClient] = useState(searchParams.get('client') ?? '')
  const [activeTab, setActiveTab] = useState('open')
  const [viewMode, setViewMode]   = useState('pipeline') // 'pipeline' | 'tabla'
  const [statusPickerId, setStatusPickerId] = useState(null)
  const [statusPickerPos, setStatusPickerPos] = useState(null)
  const [priorityPickerId, setPriorityPickerId] = useState(null)
  const [priorityPickerPos, setPriorityPickerPos] = useState(null)
  const [closeModal, setCloseModal] = useState(null) // { reqId, statusId, statusName } | null
  const [notePopover, setNotePopover] = useState(null) // { text, top, left } | null

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
  const anyExpanded = Object.values(expanded).some(Boolean)

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

  async function handleCloseConfirm({ closeReason, coveredByEverscale }) {
    const { reqId, statusId, statusName } = closeModal
    setCloseModal(null)
    try {
      await saveRequirementClosure({ requirementId: reqId, closeReason, coveredByEverscale })
      setRequirements(prev => prev.map(r => r.id === reqId ? { ...r, close_reason: closeReason || null, covered_by_everscale: coveredByEverscale } : r))
    } catch (_) {
      // table may not exist yet — status change proceeds regardless
    }
    await handleStatusChange(reqId, statusId, statusName)
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
      {closeModal && (
        <CloseRequirementModal
          onConfirm={handleCloseConfirm}
          onCancel={() => setCloseModal(null)}
        />
      )}
      {notePopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotePopover(null)} />
          <div
            className="fixed z-50 max-w-xs bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-xl px-4 py-3 text-xs text-on-surface leading-relaxed"
            style={{ top: notePopover.top, left: notePopover.left }}
          >
            <p className="font-semibold text-on-surface-variant text-[0.625rem] uppercase tracking-wider mb-1.5">Nota de cierre</p>
            <p>{notePopover.text}</p>
          </div>
        </>
      )}
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
                  className="w-full text-left px-3 py-2 text-[0.6875rem] hover:bg-surface-container transition-colors flex items-center gap-2"
                  onClick={() => handlePriorityChange(priorityPickerId, Number(v))}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold border ${p.bg} ${p.text} ${p.border}`}>
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
                    className="w-full text-left px-3 py-2 text-[0.6875rem] hover:bg-surface-container transition-colors text-on-surface flex items-center gap-2"
                    onClick={() => {
                      if (s.name.startsWith('Closed')) {
                        setStatusPickerId(null); setStatusPickerPos(null)
                        setCloseModal({ reqId: statusPickerId, statusId: s.id, statusName: s.name })
                      } else {
                        handleStatusChange(statusPickerId, s.id, s.name)
                      }
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.name.startsWith('Closed') ? 'bg-error' : (STATUS_STYLE[s.name] ?? DEFAULT_STATUS).dot}`}></span>
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
        </div>
        <div className="flex items-center gap-2">
          <RequirementAlertBell count={pendingCount} loading={alertsLoading} show={showAlerts} />
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
        </div>
      </header>

      {/* Backdrop when a requirement is expanded */}
      {anyExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-20 transition-opacity duration-300"
          onClick={() => setExpanded({})}
        />
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[0.875rem]">chevron_right</span>
                <span className="text-primary font-medium">Requirements</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Requirements</h1>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">{requirements.length}</span>
                {filterClient && (
                  <button
                    type="button"
                    onClick={() => setFilterClient('')}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                    title="Quitar filtro de cliente"
                  >
                    {catalogs.clients.find(c => String(c.id) === String(filterClient))?.name ?? 'Cliente'}
                    <span className="material-symbols-outlined text-[0.875rem]">close</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <PortalButtons />
              {/* Controls row */}
              <div className="flex gap-2">
                <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl">
                  <button
                    onClick={() => setViewMode('pipeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'pipeline' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[0.875rem]">view_kanban</span>
                    Pipeline
                  </button>
                  <button
                    onClick={() => setViewMode('tabla')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'tabla' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[0.875rem]">table_view</span>
                    Prioridades
                  </button>
                  <button
                    onClick={() => setViewMode('clientes')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'clientes' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[0.875rem]">domain</span>
                    Clientes
                  </button>
                </div>
                {can('requirements.create') && (
                  <Link to="/requirements/new">
                    <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                      <span className="material-symbols-outlined text-[1rem]">add</span>New Requirement
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Open FTE Stats ── */}
          {viewMode === 'pipeline' && !loading && (() => {
            const openReqs        = requirements.filter(r => r.status?.name === 'Open')
            const totalFTEs       = openReqs.reduce((s, r) => s + (r.fte_count ?? 1), 0)
            const lmFTEs          = openReqs.filter(r => r.client?.name === 'LogicMonitor').reduce((s, r) => s + (r.fte_count ?? 1), 0)
            const pacvueFTEs      = openReqs.filter(r => r.client?.name === 'PacVue').reduce((s, r) => s + (r.fte_count ?? 1), 0)
            const contractorFTEs  = openReqs.filter(r => r.client?.name !== 'LogicMonitor' && r.client?.name !== 'PacVue').reduce((s, r) => s + (r.fte_count ?? 1), 0)
            return (
              <div className="flex flex-wrap items-stretch gap-3 mb-6">
                {/* Main card */}
                <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl px-6 py-4 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg shadow-primary/10 min-w-[160px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[1.375rem]">group</span>
                  </div>
                  <div>
                    <p className="text-[0.5625rem] font-bold text-primary/70 uppercase tracking-[0.15em] leading-none mb-1.5">Open FTE's</p>
                    <p className="text-4xl font-black text-primary leading-none">{totalFTEs}</p>
                  </div>
                  <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-primary/10 blur-xl" />
                </div>
                {/* Divider */}
                <div className="w-px self-stretch bg-outline-variant/20 mx-1" />
                {/* Mini cards */}
                {[
                  { label: 'LogicMonitor', count: lmFTEs,         num: 'text-blue-400',   border: 'border-blue-500/25',   glow: 'shadow-blue-500/10',   icon: 'monitor',          bg: 'from-blue-500/10 to-blue-500/5'   },
                  { label: 'PacVue',       count: pacvueFTEs,     num: 'text-purple-400', border: 'border-purple-500/25', glow: 'shadow-purple-500/10', icon: 'campaign',         bg: 'from-purple-500/10 to-purple-500/5' },
                  { label: 'Contractor',   count: contractorFTEs, num: 'text-amber-400',  border: 'border-amber-500/25',  glow: 'shadow-amber-500/10',  icon: 'handshake',        bg: 'from-amber-500/10 to-amber-500/5'  },
                ].map(({ label, count, num, border, glow, icon, bg }) => (
                  <div key={label} className={`relative overflow-hidden flex items-center gap-3 rounded-2xl px-5 py-4 bg-gradient-to-br ${bg} border ${border} shadow-lg ${glow} min-w-[130px]`}>
                    <span className={`material-symbols-outlined text-[1.125rem] ${num} opacity-70`}>{icon}</span>
                    <div>
                      <p className={`text-[0.5625rem] font-bold uppercase tracking-[0.15em] leading-none mb-1.5 ${num} opacity-70`}>{label}</p>
                      <p className={`text-3xl font-black leading-none ${num}`}>{count}</p>
                    </div>
                    <div className={`absolute -right-2 -bottom-2 w-12 h-12 rounded-full ${num.replace('text-','bg-')} opacity-10 blur-xl`} />
                  </div>
                ))}
              </div>
            )
          })()}

          {/* ── TABLA VIEW ── */}
          {viewMode === 'tabla' && <ReqBoardTable />}

          {/* ── CLIENTES VIEW ── */}
          {viewMode === 'clientes' && <ClientsView embedded />}

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
                    <span className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full ${
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
                    <span className="material-symbols-outlined animate-spin text-[1.5rem]">progress_activity</span>
                    <span className="text-sm">Loading requirements…</span>
                  </div>
                )}

                {!loading && tabFiltered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-[3rem] text-on-surface-variant/30 mb-3">assignment</span>
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
                      <span className="text-[0.625rem] italic text-on-surface-variant/70 shrink-0">
                        {reqs.length} Requerimiento{reqs.length !== 1 ? 's' : ''} {activeTab === 'closed' ? 'cerrado' : 'abierto'}{reqs.length !== 1 ? 's' : ''}
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

                        const isClosed = activeTab === 'closed'

                        return (
                          <div key={req.id} className={`bg-[#10284d] rounded-2xl border border-white/[0.08] shadow-[0_2px_12px_rgba(7,29,71,0.3)] overflow-hidden transition-shadow duration-200 ${isExpanded ? 'relative z-30 shadow-[0_8px_40px_rgba(0,0,0,0.45)]' : ''}`}>
                            {/* Main row */}
                            <div
                              className="grid grid-cols-1 lg:grid-cols-12 gap-x-3 gap-y-2 items-center px-5 py-4 cursor-pointer group hover:bg-white/5 transition-colors"
                              onClick={() => toggleRow(req.id)}
                            >
                              {/* Priority pill */}
                              <div className="lg:col-span-2 flex items-center">
                                <button
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold border tracking-wide whitespace-nowrap hover:opacity-75 transition-opacity ${pri.bg} ${pri.text} ${pri.border}`}
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
                                  <span className="material-symbols-outlined text-[0.6875rem] leading-none">arrow_drop_down</span>
                                </button>
                              </div>

                              {/* Title */}
                              <div className={isClosed ? 'lg:col-span-3' : 'lg:col-span-4'}>
                                <p className="font-semibold text-white text-sm leading-snug group-hover:text-[#81b927] transition-colors">{req.job_title}</p>
                                {req.application_date && (
                                  <p className="text-[0.625rem] text-white font-semibold mt-0.5 animate-glow">
                                    Requerimiento abierto el {new Date(req.application_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                )}
                              </div>

                              {/* Closed-only: Nota + Cubierta por Everscale */}
                              {isClosed && (
                                <>
                                  <div className="lg:col-span-2 min-w-0">
                                    <p className="text-[0.5625rem] font-bold text-white/40 uppercase tracking-[0.12em] mb-0.5">Nota</p>
                                    {req.close_reason ? (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation()
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          setNotePopover({ text: req.close_reason, top: rect.bottom + 6, left: rect.left })
                                        }}
                                        className="text-xs text-[#81b927]/80 hover:text-[#81b927] underline underline-offset-2 transition-colors text-left"
                                      >
                                        Click here to view the note
                                      </button>
                                    ) : (
                                      <p className="text-xs text-white/25">—</p>
                                    )}
                                  </div>
                                  <div className="lg:col-span-1">
                                    <p className="text-[0.5625rem] font-bold text-white/40 uppercase tracking-[0.12em] mb-0.5">¿Cubierta por nosotros?</p>
                                    {req.covered_by_everscale === true && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold bg-secondary/15 text-secondary border border-secondary/20">Sí</span>
                                    )}
                                    {req.covered_by_everscale === false && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold bg-error/10 text-error border border-error/20">No</span>
                                    )}
                                    {req.covered_by_everscale == null && (
                                      <p className="text-xs text-white/25">—</p>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Salary + mode */}
                              <div className={`${isClosed ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-0.5`}>
                                {req.salary_cap ? (
                                  <p className="text-xs">
                                    <span className="font-semibold text-[#81b927]">${Number(req.salary_cap).toLocaleString()}</span>
                                    {req.variable && parseFloat(req.variable) !== 0 && <span className="text-white/50"> · {req.variable}</span>}
                                  </p>
                                ) : (
                                  <p className="text-xs text-white/30">No salary</p>
                                )}
                                <p className="text-xs text-white/50">
                                  {req.work_arrangement?.name ?? '—'}{req.desired_location ? ` · ${req.desired_location}` : ''}
                                </p>
                              </div>

                              {/* FTE — hidden in closed tab */}
                              {!isClosed && (
                                <div className="lg:col-span-1">
                                  <p className="text-xs text-white/50">{req.fte_count ?? 1} FTE</p>
                                  {req.duration && <p className="text-[0.625rem] text-white/35">{req.duration}</p>}
                                </div>
                              )}

                              {/* Status + actions */}
                              <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                                <button
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.625rem] font-bold whitespace-nowrap ${st.bg} ${st.text} tracking-wide hover:opacity-80 transition-opacity`}
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
                                  <span className="material-symbols-outlined text-[0.6875rem] leading-none">arrow_drop_down</span>
                                </button>
                                <div className="flex gap-0.5 shrink-0">
                                  {can('requirements.edit') && (
                                    <Link
                                      to={`/requirements/edit/${req.id}`}
                                      title="Edit"
                                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-[#81b927] transition-colors"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <span className="material-symbols-outlined text-[0.9375rem]">edit</span>
                                    </Link>
                                  )}
                                </div>
                                <span
                                  className="material-symbols-outlined text-[1.125rem] text-white/40 transition-transform duration-200 shrink-0"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >expand_more</span>
                              </div>
                            </div>

                            {/* Pipeline panel */}
                            {isExpanded && (
                              <div className="border-t border-white/[0.06] bg-[#0b2a58]/40 px-5 py-4">
                                <PipelinePanel
                                  reqId={req.id}
                                  clientId={client?.id}
                                  clientName={client?.name ?? req.client?.name}
                                  canDrag={can('requirements.pipeline')}
                                  canManage={can('requirements.edit')}
                                />
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
