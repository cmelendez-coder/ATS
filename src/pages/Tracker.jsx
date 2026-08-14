import { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import PortalButtons from '../components/PortalButtons'
import UserAvatar from '../components/UserAvatar'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchTrackerEntries,
  fetchActiveRequirements,
  fetchClosedRequirements,
  saveTrackerEntry,
  deleteTrackerEntry,
  uploadCVFile,
  extractCVInfo,
  backfillSentCandidates,
  createScreeningEvent,
  recruiterFromEmail,
} from '../api/tracker'

const TABS = [
  { key: 'enrique', label: 'Enrique' },
  { key: 'cesar',   label: 'César'   },
]

const MX_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla',
  'Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas',
  'Tlaxcala','Veracruz','Yucatán','Zacatecas',
]

const STATUS_OPTIONS  = ['Review', 'WA', 'Contacted', 'Screening', 'CV', 'Sent', 'Rejected', 'Backed Out', 'HSE', 'On Hold']
const STATUS_ORDER    = { 'Review': 0, 'WA': 1, 'Contacted': 2, 'Screening': 3, 'CV': 4, 'Sent': 5, 'On Hold': 6, 'HSE': 7, 'Backed Out': 8, 'Rejected': 9 }
const ENGLISH_OPTIONS = [90, 85, 80, 75, 70, 60, 50, 40, 30]
const AMOUNT_TYPES    = ['Gross', 'Net']

function toTitleCase(str) {
  return (str ?? '').trim().toLowerCase()
    .split(/\s+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ')
}

const STATUS_DOT = {
  'Review':     'bg-orange-400',
  'WA':         'bg-green-400',
  'Contacted':  'bg-cyan-400',
  'CV':         'bg-purple-400',
  'Screening':  'bg-blue-400',
  'Sent':       'bg-pink-400',
  'Rejected':   'bg-red-400',
  'HSE':        'bg-yellow-400',
  'On Hold':    'bg-slate-400',
  'Backed Out': 'bg-neutral-400',
}

const STATUS_STYLE = {
  'Review':     'bg-amber-500/20 text-amber-300 border border-amber-400/40',
  'WA':         'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40',
  'Contacted':  'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40',
  'CV':         'bg-purple-600/20 text-purple-300 border border-purple-500/40',
  'Screening':  'bg-blue-600/20 text-blue-300 border border-blue-500/40',
  'Sent':       'bg-pink-500/20 text-pink-300 border border-pink-400/40',
  'Rejected':   'bg-red-700/25 text-red-400 border border-red-500/40',
  'HSE':        'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40',
  'On Hold':    'bg-slate-600/20 text-slate-400 border border-slate-500/40',
  'Backed Out': 'bg-zinc-700/40 text-zinc-400 border border-zinc-500/40',
}

function toAbsoluteUrl(url) {
  if (!url) return url
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return 'https://' + trimmed
}

function getISOWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return { week, year: d.getFullYear() }
}

function weekLabel(week, year) {
  return `Week ${String(week).padStart(2, '0')} · ${year}`
}

function emptyRow(weekNumber, weekYear, recruiter) {
  return {
    id: null,
    week_number: weekNumber,
    week_year: weekYear,
    recruiter,
    candidate_id: null,
    candidate_name: '',
    cv_url: '',
    linkedin_url: '',
    state: '',
    screening_note:     '',
    screening_datetime: null,
    email: '',
    phone: '',
    yoe: '',
    target_role: '',
    technologies: '',
    skills: '',
    modules: '',
    requirement_id: null,
    status: 'Review',
    english_score: null,
    salary: '',
    amount_type: '',
    ote: '',
    notes: '',
    synced_to_req: false,
    _editing: true,
    _key: Date.now() + Math.random(),
  }
}


const CLIENT_PRIORITY = ['LogicMonitor', 'PacVue', 'BlueConic']

function groupByClient(list) {
  const map = {}
  for (const r of list) {
    const key = r.client?.name ?? '—'
    if (!map[key]) map[key] = []
    map[key].push(r)
  }
  return Object.entries(map).sort(([a], [b]) => {
    const ia = CLIENT_PRIORITY.indexOf(a)
    const ib = CLIENT_PRIORITY.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

// Requirement dropdown — native select (renders outside overflow:hidden containers)
function RequirementSearch({ value, requirements, closedRequirements = [], currentReq, onSelect, disabled }) {
  // If currentReq is not in open or closed lists (deleted req), add it as orphan
  const allKnown = [...requirements, ...closedRequirements]
  const orphan = currentReq && !allKnown.find(r => r.id === currentReq.id) ? currentReq : null

  const openGroups   = groupByClient(orphan ? [orphan, ...requirements] : requirements)
  const closedGroups = groupByClient(closedRequirements)

  return (
    <select
      className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none cursor-pointer border border-white/10"
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">Seleccionar posición…</option>
      {openGroups.map(([client, reqs]) => (
        <optgroup key={client} label={client}>
          {reqs.map(r => <option key={r.id} value={r.id}>{r.job_title}</option>)}
        </optgroup>
      ))}
      {closedGroups.length > 0 && (
        <>
          <option disabled style={{ color: '#6b7280', fontStyle: 'italic' }}>── Cerradas ──</option>
          {closedGroups.map(([client, reqs]) => (
            <optgroup key={`closed-${client}`} label={client}>
              {reqs.map(r => (
                <option key={r.id} value={r.id} style={{ color: '#6b7280' }}>
                  {r.job_title}
                </option>
              ))}
            </optgroup>
          ))}
        </>
      )}
    </select>
  )
}

function RejectedFeedbackModal({ onConfirm, onCancel }) {
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef(null)
  useEffect(() => { textareaRef.current?.focus() }, [])
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-2xl shadow-2xl border border-outline-variant/20 p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-400 text-[18px]">thumb_down</span>
          </span>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Marcar como Rejected</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Agrega el feedback del rechazo (opcional)</p>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="w-full bg-surface-container text-on-surface text-xs px-3 py-2 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-red-400/50 resize-none placeholder:text-on-surface-variant/40"
          rows={4}
          placeholder="Motivo del rechazo…"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onConfirm(feedback) }}
        />
        <p className="text-[10px] text-on-surface-variant/50 mt-1 mb-4">Ctrl+Enter para guardar</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => onConfirm(feedback)}
            className="px-4 py-1.5 text-xs rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">
            Guardar Rejected
          </button>
        </div>
      </div>
    </div>
  )
}

function playSentSound() {
  try { new Audio('/sounds/sent.wav').play() } catch {}
}

// Two-step confirmation modal for "Sent" status
function SentConfirmModal({ onConfirm, onCancel }) {
  const [step, setStep] = useState(1)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-2xl shadow-2xl border border-outline-variant/20 p-6 w-full max-w-sm mx-4">
        {step === 1 ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="material-symbols-outlined text-pink-400 text-[28px] shrink-0">send</span>
              <div>
                <h3 className="text-base font-bold text-on-surface leading-snug">¿Este candidato se envió a cliente el día de hoy?</h3>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Al dar click en <strong className="text-primary">"Sí"</strong>, este candidato contaría para el promedio de <strong className="text-primary">Weekly Submittals</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
              >
                Sí
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-yellow-400 text-[28px] shrink-0">help</span>
              <h3 className="text-base font-bold text-on-surface">¿Seguro?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Esta acción marcará al candidato como <strong className="text-pink-300">Sent</strong> y lo vinculará al requerimiento seleccionado.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-pink-600 text-white hover:opacity-90 transition-opacity"
              >
                Sí
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatScreeningDatetime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const days   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const h = d.getHours(); const m = String(d.getMinutes()).padStart(2,'0')
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${h % 12 || 12}:${m} ${ampm}`
}

function ScreeningNoteModal({ onConfirm, onCancel }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayStr)
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')

  function handleConfirm() {
    const datetime = date && time ? new Date(`${date}T${time}`).toISOString() : null
    onConfirm({ note, datetime })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-blue-400 text-[20px]">event</span>
          <h3 className="text-base font-bold text-on-surface">Agendar Screening</h3>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Fecha <span className="text-error">*</span></label>
            <input
              type="date"
              autoFocus
              className="w-full bg-surface text-on-surface text-sm px-3 py-2 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Hora <span className="text-error">*</span></label>
            <input
              type="time"
              className="w-full bg-surface text-on-surface text-sm px-3 py-2 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
              value={time}
              onChange={e => setTime(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && date && time) handleConfirm() }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Nota <span className="text-on-surface-variant/40 font-normal normal-case">(opcional)</span></label>
            <input
              type="text"
              className="w-full bg-surface text-on-surface text-sm px-3 py-2 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
              placeholder='Ej. "Google Meet · con Enrique"'
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && date && time) handleConfirm() }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg text-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!date || !time}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// Expandable cell for long text — shows preview, click to open modal
function CellPopover({ text, limit = 55, wordLimit = null }) {
  const [open, setOpen] = useState(false)
  if (!text) return <span className="text-on-surface-variant/40">—</span>
  const words = text.split(' ')
  const isTruncated = wordLimit != null ? words.length > wordLimit : text.length > limit
  const preview = wordLimit != null ? words.slice(0, wordLimit).join(' ') : text.slice(0, limit)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-xs text-[#8ab0d0] hover:text-[#81b927] transition-colors whitespace-nowrap"
        title="Click para ver completo"
      >
        {isTruncated ? <>{preview}<span className="text-primary/60">…</span></> : text}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0b2a58] rounded-2xl border border-white/10 shadow-2xl p-10 max-w-2xl w-full mx-4 max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base text-white/90 leading-relaxed whitespace-pre-wrap">{text}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 text-base text-[#81b927] hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Single editable row
function TrackerRow({ row, requirements, closedRequirements = [], onSave, onDelete, readOnly, isEditing, onStartEdit, onEndEdit }) {
  const [data, setData]           = useState({ ...row })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const editing = isEditing
  const [showSentModal, setShowSentModal]           = useState(false)
  const [showScreeningModal, setShowScreeningModal] = useState(false)
  const [showRejectedModal, setShowRejectedModal]   = useState(false)
  const [cvUploading, setCvUploading]               = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false)
  const [showStatusMenu, setShowStatusMenu]         = useState(false)
  const [linkedinExempt, setLinkedinExempt]         = useState(false)
  const statusMenuRef = useRef(null)
  const savingRef     = useRef(false)
  const stateListId = useId()

  useEffect(() => {
    if (!showStatusMenu) return
    function handleClick(e) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) setShowStatusMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showStatusMenu])

  useEffect(() => {
    if (!editing) return
    function handleEscape(e) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (row.id) { setData({ ...row }); setError(null); onEndEdit() }
      else onDelete()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [editing, row, onEndEdit, onDelete])

  function set(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function handleCVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvUploading(true)
    try {
      const [url, extracted] = await Promise.all([
        uploadCVFile(file, data.candidate_name),
        extractCVInfo(file).catch(() => ({})),
      ])
      setData(prev => {
        const updated = {
          ...prev,
          cv_url: url,
          email: extracted?.email || prev.email,
          phone: extracted?.phone || prev.phone,
        }
        if (updated.id) saveTrackerEntry(updated).catch(() => {})
        return updated
      })
    } catch (err) {
      setError('Error al subir el CV: ' + (err.message ?? 'intenta de nuevo'))
    } finally {
      setCvUploading(false)
      e.target.value = ''
    }
  }

  async function quickUpdateStatus(newStatus, extraFields = {}) {
    if (!data.id) return
    const updatedData = { ...data, status: newStatus, ...extraFields }
    setData(updatedData)
    try {
      await saveTrackerEntry(updatedData)
      if (newStatus === 'Screening' && extraFields.screening_datetime) {
        const req = requirements.find(r => r.id === updatedData.requirement_id)
        createScreeningEvent({
          candidateName:     updatedData.candidate_name,
          requirementTitle:  req ? `${req.job_title} · ${req.client?.name}` : undefined,
          screeningDatetime: extraFields.screening_datetime,
          screeningNote:     extraFields.screening_note || undefined,
        }).catch(() => {})
      }
      onSave()
    } catch (e) {
      setData(prev => ({ ...prev, status: data.status }))
      setError(e.message ?? 'Error al guardar status')
    }
  }

  function isValidLinkedIn(url) {
    const u = (url || '').trim().toLowerCase()
    return u.startsWith('linkedin.com/') || u.startsWith('www.linkedin.com/') || u.startsWith('https://linkedin.com/') || u.startsWith('https://www.linkedin.com/')
  }

  async function handleSave() {
    if (savingRef.current) return
    if (!data.candidate_name?.trim()) { setError('Ingresa el nombre del candidato.'); return }
    if (!data.requirement_id)         { setError('Selecciona una posición/requerimiento.'); return }
    if (data.salary?.toString().trim() && !data.amount_type) { setError('Selecciona Gross o Net para el salario ingresado.'); return }
    if (!linkedinExempt && !isValidLinkedIn(data.linkedin_url)) { setError('LinkedIn requerido (debe comenzar con linkedin.com/in/…).'); return }
    const normalizedName = toTitleCase(data.candidate_name)
    setData(prev => ({ ...prev, candidate_name: normalizedName }))
    const savePayload = { ...data, candidate_name: normalizedName }
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      const { entryId, candidateId } = await saveTrackerEntry(savePayload)
      setData(prev => ({ ...prev, id: entryId, candidate_id: candidateId, synced_to_req: savePayload.status === 'Sent' ? true : prev.synced_to_req }))
      if (data.status === 'Screening' && data.screening_datetime) {
        const req = requirements.find(r => r.id === data.requirement_id)
        createScreeningEvent({
          candidateName:     data.candidate_name,
          requirementTitle:  req ? `${req.job_title} · ${req.client?.name}` : undefined,
          screeningDatetime: data.screening_datetime,
          screeningNote:     data.screening_note || undefined,
        }).catch(() => {})
      }
      onEndEdit()
      onSave()
    } catch (e) {
      setError(e.message ?? 'Error al guardar.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (data.id) {
      await deleteTrackerEntry(data.id)
    }
    onDelete()
  }

  const req = requirements.find(r => r.id === data.requirement_id) ?? data.requirement

  if (!editing) {
    return (
      <tr
        className={`odd:bg-transparent even:bg-[#0b2a58]/50 hover:bg-[#0b2a58]/80 transition-colors group border-b border-white/[0.05] ${!readOnly ? 'cursor-pointer' : ''}`}
        onDoubleClick={() => { if (!readOnly) onStartEdit() }}
        title={!readOnly ? 'Doble clic para editar' : undefined}
      >
        <td className="sticky left-0 z-10 w-[200px] group-odd:bg-[#071d47] group-even:bg-[#0b2a58] px-3 py-2 text-xs text-white font-bold whitespace-nowrap">
          <span>{data.candidate_name}</span>
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">
          {req ? <span>{req.job_title} <span className="text-[#8ab0d0]/50">· {req.client?.name}</span></span> : '—'}
        </td>
        <td className="px-3 py-2 text-xs">
          {data.cv_url
            ? <a href={data.cv_url} target="_blank" rel="noreferrer" className="text-[#81b927] hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">open_in_new</span>CV</a>
            : <span className="text-[#8ab0d0]/30">—</span>}
        </td>
        <td className="px-3 py-2 text-xs">
          {data.linkedin_url
            ? <a href={toAbsoluteUrl(data.linkedin_url)} target="_blank" rel="noreferrer" className="text-[#5aaae0] hover:opacity-75 transition-opacity inline-block" title="Ver LinkedIn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            : <span className="text-[#8ab0d0]/30">—</span>}
        </td>
        <td className={`sticky left-[200px] ${showStatusMenu ? 'z-50' : 'z-10'} group-odd:bg-[#071d47] group-even:bg-[#0b2a58] px-3 py-2`}>
          <div className="relative" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => { if (!readOnly && data.id) setShowStatusMenu(s => !s) }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_STYLE[data.status] ?? ''} ${!readOnly && data.id ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
            >
              {data.status}
            </button>
            {showStatusMenu && !readOnly && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-[#0b2a58] border border-white/10 rounded-lg shadow-xl min-w-[130px] py-1">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#071d47] transition-colors flex items-center gap-2 ${s === data.status ? 'text-[#81b927] font-bold' : 'text-white/80'}`}
                    onClick={() => {
                      setShowStatusMenu(false)
                      if (s === data.status) return
                      if (s === 'Sent') setShowSentModal(true)
                      else if (s === 'Screening') setShowScreeningModal(true)
                      else if (s === 'Rejected') setShowRejectedModal(true)
                      else quickUpdateStatus(s)
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s] ?? 'bg-gray-400'}`}></span>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {data.status === 'Screening' && data.screening_datetime && (
            <p className="text-[10px] text-blue-300/70 mt-0.5 whitespace-nowrap">{formatScreeningDatetime(data.screening_datetime)}{data.screening_note ? ` · ${data.screening_note}` : ''}</p>
          )}
          {data.status === 'Screening' && !data.screening_datetime && data.screening_note && (
            <p className="text-[10px] text-blue-300/70 mt-0.5 whitespace-nowrap">{data.screening_note}</p>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] max-w-[220px]"><CellPopover text={data.notes} wordLimit={3} /></td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] text-center">{data.english_score != null ? `${data.english_score}%` : '—'}</td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">
          {data.salary
            ? `$${Number(String(data.salary).replace(/[^0-9.]/g,'')).toLocaleString('en-US').replace(/,/g,"'")}${data.amount_type ? ` (${data.amount_type})` : ''}`
            : '—'}
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">
          {data.ote ? `$${Number(String(data.ote).replace(/[^0-9.]/g,'')).toLocaleString('en-US').replace(/,/g,"'")}` : '—'}
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">{data.email || <span className="text-[#8ab0d0]/30">—</span>}</td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">{data.phone || <span className="text-[#8ab0d0]/30">—</span>}</td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] whitespace-nowrap">
          {data.state || <span className="text-[#8ab0d0]/30">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0] text-center">
          {data.yoe != null && data.yoe !== '' ? `${data.yoe} yrs` : <span className="text-[#8ab0d0]/30">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0]">
          <CellPopover text={data.target_role} wordLimit={2} />
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0]">
          <CellPopover text={data.technologies} wordLimit={2} />
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0]">
          <CellPopover text={data.skills} wordLimit={2} />
        </td>
        <td className="px-3 py-2 text-xs text-[#8ab0d0]">
          <CellPopover text={data.modules} wordLimit={2} />
        </td>
        <td className="px-3 py-2">
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={handleDelete} className="p-1 rounded hover:bg-red-500/10 text-[#8ab0d0]/50 hover:text-red-400 transition-colors" title="Eliminar">
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          )}
          {readOnly && (
            <span className="material-symbols-outlined text-[14px] text-[#8ab0d0]/30" title="Solo lectura">lock</span>
          )}
          {showSentModal && !editing && (
            <SentConfirmModal
              onConfirm={() => { playSentSound(); quickUpdateStatus('Sent'); setShowSentModal(false) }}
              onCancel={() => setShowSentModal(false)}
            />
          )}
          {showScreeningModal && !editing && (
            <ScreeningNoteModal
              onConfirm={({ note, datetime }) => { quickUpdateStatus('Screening', { screening_note: note, screening_datetime: datetime }); setShowScreeningModal(false) }}
              onCancel={() => setShowScreeningModal(false)}
            />
          )}
          {showRejectedModal && !editing && (
            <RejectedFeedbackModal
              onConfirm={(feedback) => { quickUpdateStatus('Rejected', { notes: feedback || data.notes }); setShowRejectedModal(false) }}
              onCancel={() => setShowRejectedModal(false)}
            />
          )}
        </td>
      </tr>
    )
  }

  return (
    <tr
      className="bg-[#0b2a58] border-b border-[#81b927]/20"
      onKeyDown={e => {
        if (e.key === 'Enter' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          handleSave()
        }
      }}
    >
      {/* Candidato + Guardar */}
      <td className="sticky left-0 z-10 w-[200px] bg-[#0b2a58] backdrop-blur-sm px-2 py-1.5 min-w-[200px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-[#8ab0d0]/50"
          placeholder="Nombre del candidato…"
          value={data.candidate_name || ''}
          onChange={e => {
            const raw = e.target.value
            setData(prev => ({ ...prev, candidate_name: raw, candidate_id: null }))
          }}
          onBlur={e => {
            const normalized = toTitleCase(e.target.value)
            if (normalized && normalized !== e.target.value)
              setData(prev => ({ ...prev, candidate_name: normalized }))
          }}
        />
        <div className="flex items-center gap-1.5 mt-1 px-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 bg-[#1f6d44] text-white text-xs font-semibold rounded-lg hover:bg-[#1f6d44]/80 transition-opacity disabled:opacity-50 shadow-[0_0_8px_rgba(31,109,68,0.4)]"
          >
            {saving
              ? <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined text-[12px]">save</span>}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="p-1 rounded hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors" title="Eliminar">
            <span className="material-symbols-outlined text-[14px]">delete</span>
          </button>
        </div>
        {error && <p className="text-red-400 text-[10px] mt-1 px-2">{error}</p>}
      </td>

      {/* Requerimiento/Cliente */}
      <td className="px-2 py-1.5 min-w-[200px]">
        <RequirementSearch
          value={data.requirement_id}
          requirements={requirements}
          closedRequirements={closedRequirements}
          currentReq={data.requirement}
          onSelect={id => set('requirement_id', id)}
        />
      </td>

      {/* CV — file upload */}
      <td className="px-2 py-1.5 min-w-[110px]">
        <div className="flex items-center gap-1.5">
          {data.cv_url && (
            <a
              href={data.cv_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold shrink-0"
              title="Ver CV"
            >
              <span className="material-symbols-outlined text-[14px]">description</span>
              CV
            </a>
          )}
          <label
            className={`flex items-center gap-1 text-xs cursor-pointer rounded px-1.5 py-1 transition-colors shrink-0 ${
              cvUploading
                ? 'text-white/30 pointer-events-none'
                : data.cv_url
                  ? 'text-white/50 hover:text-[#81b927] hover:bg-white/5'
                  : 'text-white/50 hover:text-[#81b927] hover:bg-white/5 border border-dashed border-white/20'
            }`}
            title={data.cv_url ? 'Reemplazar CV' : 'Adjuntar CV'}
          >
            {cvUploading
              ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined text-[14px]">{data.cv_url ? 'swap_horiz' : 'attach_file'}</span>}
            {!data.cv_url && !cvUploading && <span>Adjuntar</span>}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleCVUpload}
              disabled={cvUploading}
            />
          </label>
        </div>
      </td>

      {/* LinkedIn URL */}
      <td className="px-2 py-1.5 min-w-[160px]">
        <div className="flex items-center gap-1">
          <input
            className={`w-full bg-transparent text-white text-xs px-2 py-1 focus:outline-none placeholder:text-white/30 rounded border ${linkedinExempt ? 'border-dashed border-white/20 opacity-40' : isValidLinkedIn(data.linkedin_url) ? 'border-dashed border-white/20' : 'border-red-500/60 bg-red-500/5'}`}
            placeholder={linkedinExempt ? 'Sin LinkedIn' : 'linkedin.com/in/…'}
            value={linkedinExempt ? '' : (data.linkedin_url || '')}
            disabled={linkedinExempt}
            onChange={e => set('linkedin_url', e.target.value)}
          />
          {!linkedinExempt && data.linkedin_url && (
            <a href={toAbsoluteUrl(data.linkedin_url)} target="_blank" rel="noreferrer" className="text-[#0A66C2] hover:opacity-75 transition-opacity shrink-0" title="Ver LinkedIn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          )}
        </div>
        {linkedinExempt ? (
          <button
            type="button"
            onClick={() => { setLinkedinExempt(false); set('linkedin_url', '') }}
            className="mt-1 text-[10px] text-white/40 hover:text-[#81b927] transition-colors underline"
          >
            Agregar LinkedIn
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setLinkedinExempt(true); set('linkedin_url', '') }}
            className="mt-1 text-[10px] text-white/40 hover:text-orange-400 transition-colors"
          >
            No cuento con LinkedIn
          </button>
        )}
      </td>

      {/* Status */}
      <td className="sticky left-[200px] z-10 bg-[#0b2a58] backdrop-blur-sm px-2 py-1.5 min-w-[120px]">
        <select
          className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#81b927]/30 border border-white/10"
          value={data.status}
          onChange={e => {
            if (e.target.value === 'Sent') {
              setShowSentModal(true)
            } else if (e.target.value === 'Screening') {
              setShowScreeningModal(true)
            } else if (e.target.value === 'Rejected') {
              setShowRejectedModal(true)
            } else {
              set('status', e.target.value)
            }
          }}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {data.status === 'Screening' && data.screening_datetime && (
          <p className="text-[10px] text-blue-300/70 mt-0.5 px-1">{formatScreeningDatetime(data.screening_datetime)}{data.screening_note ? ` · ${data.screening_note}` : ''}</p>
        )}
        {data.status === 'Screening' && !data.screening_datetime && data.screening_note && (
          <p className="text-[10px] text-blue-300/70 mt-0.5 px-1">{data.screening_note}</p>
        )}
        {showSentModal && createPortal(
          <SentConfirmModal
            onConfirm={() => { playSentSound(); set('status', 'Sent'); setShowSentModal(false) }}
            onCancel={() => setShowSentModal(false)}
          />, document.body
        )}
        {showScreeningModal && createPortal(
          <ScreeningNoteModal
            onConfirm={({ note, datetime }) => { set('status', 'Screening'); set('screening_note', note); set('screening_datetime', datetime); setShowScreeningModal(false) }}
            onCancel={() => setShowScreeningModal(false)}
          />, document.body
        )}
        {showRejectedModal && createPortal(
          <RejectedFeedbackModal
            onConfirm={(feedback) => { set('status', 'Rejected'); if (feedback) set('notes', feedback); setShowRejectedModal(false) }}
            onCancel={() => setShowRejectedModal(false)}
          />, document.body
        )}
      </td>

      {/* Notas */}
      <td className="px-2 py-1.5 min-w-[180px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="Notas…"
          value={data.notes || ''}
          onChange={e => set('notes', e.target.value)}
        />
      </td>

      {/* English */}
      <td className="px-2 py-1.5 min-w-[80px]">
        <select
          className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#81b927]/30 border border-white/10"
          value={data.english_score ?? ''}
          onChange={e => set('english_score', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">—</option>
          {ENGLISH_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
        </select>
      </td>

      {/* Salario + Amount Type */}
      <td className="px-2 py-1.5 min-w-[140px]">
        <div className="flex gap-1">
          <input
            className="w-16 bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#81b927]/30 border border-white/10 placeholder:text-white/30"
            placeholder="$"
            value={data.salary || ''}
            onChange={e => set('salary', e.target.value)}
          />
          <select
            className={`flex-1 bg-[#071d47] text-white text-xs px-1 py-1.5 rounded focus:outline-none focus:ring-1 border ${data.salary?.toString().trim() && !data.amount_type ? 'ring-1 ring-red-500 border-red-500' : 'border-white/10 focus:ring-[#81b927]/30'}`}
            value={data.amount_type || ''}
            onChange={e => set('amount_type', e.target.value)}
          >
            <option value="">—</option>
            {AMOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </td>

      {/* OTE */}
      <td className="px-2 py-1.5 min-w-[100px]">
        <input
          className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#81b927]/30 border border-white/10 placeholder:text-white/30"
          placeholder="$"
          value={data.ote || ''}
          onChange={e => set('ote', e.target.value)}
        />
      </td>

      {/* Email */}
      <td className="px-2 py-1.5 min-w-[160px]">
        <input
          type="email"
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="email@ejemplo.com"
          value={data.email || ''}
          onChange={e => set('email', e.target.value)}
        />
      </td>

      {/* Phone */}
      <td className="px-2 py-1.5 min-w-[130px]">
        <input
          type="tel"
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="5512345678"
          value={data.phone || ''}
          onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
        />
      </td>

      {/* Estado (entidad federativa) */}
      <td className="px-2 py-1.5 min-w-[150px]">
        <select
          className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#81b927]/30 border border-white/10"
          value={data.state || ''}
          onChange={e => set('state', e.target.value)}
        >
          <option value="">— Estado —</option>
          {MX_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      {/* YoE */}
      <td className="px-2 py-1.5 min-w-[60px]">
        <input
          type="text"
          inputMode="numeric"
          className="w-full bg-[#071d47] text-white text-xs px-2 py-1.5 rounded focus:outline-none text-center border border-white/10"
          placeholder="0"
          value={data.yoe ?? ''}
          onChange={e => set('yoe', e.target.value === '' ? null : Number(e.target.value))}
        />
      </td>

      {/* Target Role */}
      <td className="px-2 py-1.5 min-w-[140px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="Target Role…"
          value={data.target_role || ''}
          onChange={e => set('target_role', e.target.value)}
        />
      </td>

      {/* Technologies */}
      <td className="px-2 py-1.5 min-w-[180px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="Technologies…"
          value={data.technologies || ''}
          onChange={e => set('technologies', e.target.value)}
        />
      </td>

      {/* Skills */}
      <td className="px-2 py-1.5 min-w-[180px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="Skills…"
          value={data.skills || ''}
          onChange={e => set('skills', e.target.value)}
        />
      </td>

      {/* Modules (SAP) */}
      <td className="px-2 py-1.5 min-w-[120px]">
        <input
          className="w-full bg-transparent text-white text-xs px-2 py-1.5 focus:outline-none placeholder:text-white/30"
          placeholder="Modules…"
          value={data.modules || ''}
          onChange={e => set('modules', e.target.value)}
        />
      </td>

      {/* Acciones (modales fuera del td sticky) */}
      <td className="px-2 py-1.5">
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-container-high rounded-2xl shadow-2xl border border-outline-variant/20 p-6 w-full max-w-xs mx-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-red-400 text-[26px]">delete</span>
                <h3 className="text-base font-bold text-on-surface">¿Eliminar candidato?</h3>
              </div>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors">
                  No
                </button>
                <button type="button" onClick={() => { setShowDeleteConfirm(false); handleDelete() }} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:opacity-90 transition-opacity">
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function Tracker() {
  const { session }                   = useAuth()
  const myRecruiter                   = recruiterFromEmail(session?.user?.email ?? '')
  const userRole                      = String(session?.user?.role ?? '').toLowerCase()
  const { week: currentWeek, year: currentYear } = getISOWeek()

  const [activeTab, setActiveTab]     = useState('enrique')
  const [week, setWeek]               = useState(currentWeek)
  const [year, setYear]               = useState(currentYear)
  const [entries, setEntries]         = useState([])
  const [requirements, setRequirements] = useState([])
  const [closedRequirements, setClosedRequirements] = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [editingKey, setEditingKey]   = useState(null)
  const tableScrollRef                = useRef(null)

  // Admins can edit any tab; recruiters can only edit their own
  const canEdit = userRole === 'administrador'
    ? myRecruiter != null
    : myRecruiter != null && myRecruiter === activeTab

  useEffect(() => {
    Promise.all([fetchActiveRequirements(), fetchClosedRequirements()])
      .then(([open, closed]) => { setRequirements(open); setClosedRequirements(closed) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const FLAG = 'tracker_backfill_sent_v1'
    if (localStorage.getItem(FLAG)) return
    backfillSentCandidates()
      .then(() => localStorage.setItem(FLAG, '1'))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setEditingKey(null)
    fetchTrackerEntries(week, year, activeTab)
      .then(rows => {
        setEntries(rows.map(r => ({ ...r, _editing: false, _key: r.id })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [week, year, activeTab, refreshKey])

  function addRow() {
    if (!canEdit) return
    const newRow = emptyRow(week, year, activeTab)
    setEntries(prev => [...prev, newRow])
    setEditingKey(newRow._key)
    setTimeout(() => tableScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 30)
  }

  function refresh() {
    setRefreshKey(k => k + 1)
  }

  function removeRow(key) {
    setEntries(prev => prev.filter(e => (e._key ?? e.id) !== key))
  }

  // Week navigation
  function prevWeek() {
    if (week === 1) { setWeek(52); setYear(y => y - 1) }
    else setWeek(w => w - 1)
  }
  function nextWeek() {
    if (week === 52) { setWeek(1); setYear(y => y + 1) }
    else setWeek(w => w + 1)
  }

  const review    = entries.filter(e => e.status === 'Review').length
  const sent      = entries.filter(e => e.status === 'Sent').length
  const rejected  = entries.filter(e => ['Rejected', 'HSE', 'Backed Out'].includes(e.status)).length
  const onHold    = entries.filter(e => e.status === 'On Hold').length

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
          <h2 className="hidden md:block text-sm font-semibold text-on-surface-variant">Tracker de Candidatos</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <UserAvatar />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-6">

          {/* Breadcrumb + Title */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Tracker</span>
              </div>
              <h1 className="text-[2rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Tracker</h1>
              {/* Recruiter tabs */}
              <div className="flex gap-1 pt-2">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      activeTab === tab.key
                        ? 'bg-[#071d47] text-white shadow-sm'
                        : 'bg-[#071d47]/8 text-[#071d47] hover:bg-[#071d47]/15 border border-[#071d47]/10'
                    }`}
                  >
                    {tab.label}
                    {tab.key === myRecruiter && (
                      <span className="ml-1.5 text-[10px] opacity-70">(yo)</span>
                    )}
                  </button>
                ))}
                {!canEdit && (
                  <span className="flex items-center gap-1 text-xs text-on-surface-variant/50 ml-2">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    Solo lectura
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <PortalButtons />
              {/* Week selector */}
              <div className="flex items-center gap-2 bg-white border border-[#071d47]/15 rounded-xl px-4 py-2 shadow-sm">
              <button type="button" onClick={prevWeek} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-primary min-w-[100px] text-center">{weekLabel(week, year)}</span>
              <button type="button" onClick={nextWeek} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
              {(week !== currentWeek || year !== currentYear) && (
                <button type="button" onClick={() => { setWeek(currentWeek); setYear(currentYear) }} className="ml-1 text-xs text-primary hover:underline">
                  Hoy
                </button>
              )}
            </div>
            </div>
          </div>

          {/* Summary chips */}
          {entries.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#071d47]/10 text-[#071d47] text-xs font-bold border border-[#071d47]/10">{entries.length} candidatos</span>
              {review > 0 && <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">{review} In Review</span>}
              {sent > 0 && <span className="px-3 py-1 rounded-full bg-[#1f6d44]/10 text-[#1f6d44] text-xs font-bold border border-[#1f6d44]/20">{sent} Sent</span>}
              {rejected > 0 && <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">{rejected} Rejected/HSE/Backed Out</span>}
              {onHold > 0 && <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">{onHold} On Hold</span>}
            </div>
          )}

          {/* Table */}
          <div className="bg-[#071d47] rounded-2xl border border-white/5 shadow-[0_4px_32px_rgba(7,29,71,0.25)] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : (
              <div ref={tableScrollRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-10px)]">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="sticky top-0 z-30 bg-[#0b2a58] border-b border-white/5">
                      <th className="sticky left-0 z-20 w-[200px] bg-[#0b2a58] px-3 py-3 text-[10px] font-bold text-[#81b927] uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span>Candidato</span>
                          {canEdit && myRecruiter === activeTab && (year > currentYear || (year === currentYear && week >= currentWeek)) && (
                            <button
                              type="button"
                              onClick={addRow}
                              className="flex items-center gap-1.5 bg-primary text-on-primary text-[11px] font-bold px-3 py-1 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.35)] hover:shadow-[0_0_18px_rgba(34,197,94,0.55)] hover:scale-105 transition-all duration-150 normal-case tracking-normal"
                            >
                              <span className="material-symbols-outlined text-[14px]">add_circle</span>
                              Agregar candidato
                            </button>
                          )}
                        </div>
                      </th>
                      {['Requerimiento/Cliente', 'CV', 'LinkedIn', 'Status', 'Notas', 'English', 'Salario', 'OTE', 'Email', 'Phone', 'Estado', 'YoE', 'Target Role', 'Technologies', 'Skills', 'Modules', ''].map(h => (
                        <th
                          key={h}
                          className={`px-3 py-3 text-[10px] font-bold text-[#81b927]/70 uppercase tracking-widest whitespace-nowrap${h === 'Status' ? ' sticky left-[200px] z-20 bg-[#0b2a58]' : ''}`}
                        >{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-[#8ab0d0]/50 text-sm">
                          Sin candidatos esta semana. Agrega uno con el botón de arriba.
                        </td>
                      </tr>
                    )}
                    {[...entries]
                      .sort((a, b) => {
                        if (a._editing && !b._editing) return -1
                        if (!a._editing && b._editing) return 1
                        const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
                        if (statusDiff !== 0) return statusDiff
                        const reqA = a.requirement?.job_title ?? ''
                        const reqB = b.requirement?.job_title ?? ''
                        return reqA.localeCompare(reqB)
                      })
                      .map((row) => {
                      const key = row._key ?? row.id
                      return (
                        <TrackerRow
                          key={key}
                          row={row}
                          requirements={requirements}
                          closedRequirements={closedRequirements}
                          onSave={refresh}
                          onDelete={() => removeRow(key)}
                          readOnly={!canEdit}
                          isEditing={editingKey === key}
                          onStartEdit={() => setEditingKey(key)}
                          onEndEdit={() => setEditingKey(null)}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      </div>
    </>
  )
}
