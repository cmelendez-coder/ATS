import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchTrackerEntries,
  fetchActiveRequirements,
  searchCandidatesSimple,
  saveTrackerEntry,
  deleteTrackerEntry,
  uploadCVFile,
  recruiterFromEmail,
} from '../api/tracker'

const TABS = [
  { key: 'enrique', label: 'Enrique' },
  { key: 'cesar',   label: 'César'   },
]

const STATUS_OPTIONS  = ['Screening', 'Sent', 'Rejected', 'HSE', 'On Hold', 'Backed Out']
const ENGLISH_OPTIONS = [90, 85, 80, 75, 70, 60, 50, 40, 30]
const AMOUNT_TYPES    = ['Gross', 'Net']

const STATUS_STYLE = {
  'Screening':  'bg-blue-600/20 text-blue-300 border border-blue-500/40',
  'Sent':       'bg-pink-600/20 text-pink-300 border border-pink-500/40',
  'Rejected':   'bg-red-600/20 text-red-300 border border-red-500/40',
  'HSE':        'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40',
  'On Hold':    'bg-slate-600/20 text-slate-300 border border-slate-500/40',
  'Backed Out': 'bg-neutral-700 text-neutral-300 border border-neutral-500/40',
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
    requirement_id: null,
    status: 'Screening',
    english_score: null,
    salary: '',
    amount_type: '',
    notes: '',
    synced_to_req: false,
    _editing: true,
    _key: Date.now() + Math.random(),
  }
}

// Candidate search input with dropdown
function CandidateSearch({ value, candidateId, onSelect, disabled }) {
  const [query, setQuery]       = useState(value || '')
  const [results, setResults]   = useState([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const timerRef = useRef(null)
  const wrapRef  = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    onSelect({ candidate_name: q, candidate_id: null })
    clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const rows = await searchCandidatesSimple(q)
      setResults(rows)
      setOpen(rows.length > 0)
      setLoading(false)
    }, 300)
  }

  function pick(row) {
    setQuery(row.full_name)
    setOpen(false)
    onSelect({ candidate_name: row.full_name, candidate_id: row.candidate_id, cv_url: row.cv_url || '' })
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        className="w-full bg-transparent text-on-surface text-xs px-2 py-1.5 focus:outline-none placeholder:text-on-surface-variant/40"
        placeholder="Nombre del candidato…"
        value={query}
        onChange={handleChange}
        disabled={disabled}
      />
      {candidateId && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-secondary" title="En Talent Directory">
          <span className="material-symbols-outlined text-[12px]">check_circle</span>
        </span>
      )}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl w-64 max-h-48 overflow-y-auto">
          {loading
            ? <p className="text-xs text-on-surface-variant p-3">Buscando…</p>
            : results.map(r => (
              <button
                key={r.candidate_id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-surface-container text-xs"
                onMouseDown={() => pick(r)}
              >
                <span className="text-primary font-medium block">{r.full_name}</span>
                {r.email && <span className="text-on-surface-variant/60">{r.email}</span>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// Requirement dropdown — native select (renders outside overflow:hidden containers)
function RequirementSearch({ value, requirements, onSelect, disabled }) {
  return (
    <select
      className="w-full bg-surface-container text-on-surface text-xs px-2 py-1.5 rounded focus:outline-none cursor-pointer"
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onSelect(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">Seleccionar posición…</option>
      {requirements.map(r => (
        <option key={r.id} value={r.id}>
          {r.job_title}{r.client?.name ? ` — ${r.client.name}` : ''}
        </option>
      ))}
    </select>
  )
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

// Single editable row
function TrackerRow({ row, requirements, onSave, onDelete, readOnly }) {
  const [data, setData]           = useState({ ...row })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [editing, setEditing]     = useState(!readOnly && (row._editing ?? false))
  const [showSentModal, setShowSentModal] = useState(false)
  const [cvUploading, setCvUploading]     = useState(false)

  function set(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function handleCVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCvUploading(true)
    try {
      const url = await uploadCVFile(file, data.candidate_name)
      set('cv_url', url)
    } catch (err) {
      setError('Error al subir el CV: ' + (err.message ?? 'intenta de nuevo'))
    } finally {
      setCvUploading(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    if (!data.candidate_name?.trim()) { setError('Ingresa el nombre del candidato.'); return }
    if (!data.requirement_id)         { setError('Selecciona una posición/requerimiento.'); return }
    setSaving(true)
    setError(null)
    try {
      const { entryId, candidateId } = await saveTrackerEntry(data)
      setData(prev => ({ ...prev, id: entryId, candidate_id: candidateId, synced_to_req: data.status === 'Sent' ? true : prev.synced_to_req }))
      setEditing(false)
      onSave()
    } catch (e) {
      setError(e.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (data.id) {
      await deleteTrackerEntry(data.id)
    }
    onDelete()
  }

  const req = requirements.find(r => r.id === data.requirement_id)

  if (!editing) {
    return (
      <tr className="hover:bg-surface-container/30 transition-colors group border-b border-outline-variant/10">
        <td className="px-3 py-2 text-xs text-primary font-medium whitespace-nowrap">
          {data.candidate_name}
          {data.candidate_id && <span className="ml-1 text-secondary" title="En Talent Directory"><span className="material-symbols-outlined text-[11px] align-middle">check_circle</span></span>}
        </td>
        <td className="px-3 py-2 text-xs">
          {data.cv_url
            ? <a href={data.cv_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">open_in_new</span>CV</a>
            : <span className="text-on-surface-variant/40">—</span>}
        </td>
        <td className="px-3 py-2 text-xs">
          {data.linkedin_url
            ? <a href={data.linkedin_url} target="_blank" rel="noreferrer" className="text-[#0A66C2] hover:opacity-75 transition-opacity inline-block" title="Ver LinkedIn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            : <span className="text-on-surface-variant/40">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">
          {req ? <span>{req.job_title} <span className="text-on-surface-variant/50">· {req.client?.name}</span></span> : '—'}
        </td>
        <td className="px-3 py-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_STYLE[data.status] ?? STATUS_STYLE['Pending']}`}>
            {data.status}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-on-surface-variant text-center">{data.english_score != null ? `${data.english_score}%` : '—'}</td>
        <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">
          {data.salary ? `${data.salary}${data.amount_type ? ` (${data.amount_type})` : ''}` : '—'}
        </td>
        <td className="px-3 py-2 text-xs text-on-surface-variant max-w-[220px] truncate">{data.notes || '—'}</td>
        <td className="px-3 py-2">
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => setEditing(true)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </button>
              <button type="button" onClick={handleDelete} className="p-1 rounded hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors">
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          )}
          {readOnly && (
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant/30" title="Solo lectura">lock</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <tr className="bg-surface-container/40 border-b border-primary/20">
      {/* Candidato */}
      <td className="px-2 py-1.5 min-w-[160px]">
        <CandidateSearch
          value={data.candidate_name}
          candidateId={data.candidate_id}
          onSelect={({ candidate_name, candidate_id, cv_url }) => {
            setData(prev => ({
              ...prev,
              candidate_name,
              candidate_id: candidate_id ?? prev.candidate_id,
              cv_url: cv_url !== undefined ? cv_url : prev.cv_url,
            }))
          }}
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
                ? 'text-on-surface-variant/50 pointer-events-none'
                : data.cv_url
                  ? 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container border border-dashed border-outline-variant/40'
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
      <td className="px-2 py-1.5 min-w-[110px]">
        {data.linkedin_url ? (
          <div className="flex items-center gap-1.5">
            <a
              href={data.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#0A66C2] hover:opacity-75 transition-opacity shrink-0"
              title="Ver LinkedIn"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <button
              type="button"
              onClick={() => set('linkedin_url', '')}
              className="text-on-surface-variant/40 hover:text-red-400 transition-colors"
              title="Quitar URL"
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          </div>
        ) : (
          <input
            className="w-full bg-transparent text-on-surface text-xs px-2 py-1 focus:outline-none placeholder:text-on-surface-variant/30 border border-dashed border-outline-variant/30 rounded"
            placeholder="linkedin.com/in/…"
            value={data.linkedin_url || ''}
            onChange={e => set('linkedin_url', e.target.value)}
          />
        )}
      </td>

      {/* Posición / Requerimiento */}
      <td className="px-2 py-1.5 min-w-[200px]">
        <RequirementSearch
          value={data.requirement_id}
          requirements={requirements}
          onSelect={id => set('requirement_id', id)}
        />
      </td>

      {/* Status */}
      <td className="px-2 py-1.5 min-w-[120px]">
        <select
          className="w-full bg-surface-container text-on-surface text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
          value={data.status}
          onChange={e => {
            if (e.target.value === 'Sent') {
              setShowSentModal(true)
            } else {
              set('status', e.target.value)
            }
          }}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {showSentModal && (
          <SentConfirmModal
            onConfirm={() => { set('status', 'Sent'); setShowSentModal(false) }}
            onCancel={() => setShowSentModal(false)}
          />
        )}
      </td>

      {/* English */}
      <td className="px-2 py-1.5 min-w-[80px]">
        <select
          className="w-full bg-surface-container text-on-surface text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
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
            className="w-16 bg-surface-container text-on-surface text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
            placeholder="$"
            value={data.salary || ''}
            onChange={e => set('salary', e.target.value)}
          />
          <select
            className="flex-1 bg-surface-container text-on-surface text-xs px-1 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
            value={data.amount_type || ''}
            onChange={e => set('amount_type', e.target.value)}
          >
            <option value="">—</option>
            {AMOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </td>

      {/* Notas */}
      <td className="px-2 py-1.5 min-w-[180px]">
        <input
          className="w-full bg-transparent text-on-surface text-xs px-2 py-1.5 focus:outline-none placeholder:text-on-surface-variant/40"
          placeholder="Notas…"
          value={data.notes || ''}
          onChange={e => set('notes', e.target.value)}
        />
      </td>

      {/* Acciones */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
          >
            {saving
              ? <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
              : <span className="material-symbols-outlined text-[12px]">save</span>}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={handleDelete} className="p-1 rounded hover:bg-red-500/10 text-on-surface-variant hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-[14px]">delete</span>
          </button>
        </div>
        {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
      </td>
    </tr>
  )
}

export default function Tracker() {
  const { session }                   = useAuth()
  const myRecruiter                   = recruiterFromEmail(session?.user?.email ?? '')
  const { week: currentWeek, year: currentYear } = getISOWeek()

  const [activeTab, setActiveTab]     = useState('enrique')
  const [week, setWeek]               = useState(currentWeek)
  const [year, setYear]               = useState(currentYear)
  const [entries, setEntries]         = useState([])
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshKey, setRefreshKey]   = useState(0)

  // Can the logged-in user edit the active tab?
  const canEdit = myRecruiter === activeTab

  useEffect(() => {
    fetchActiveRequirements()
      .then(setRequirements)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchTrackerEntries(week, year, activeTab)
      .then(rows => {
        setEntries(rows.map(r => ({ ...r, _editing: false, _key: r.id })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [week, year, activeTab, refreshKey])

  function addRow() {
    if (!canEdit) return
    setEntries(prev => [...prev, emptyRow(week, year, activeTab)])
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

  const sent      = entries.filter(e => e.status === 'Sent').length
  const rejected  = entries.filter(e => ['Rejected', 'HSE', 'Backed Out'].includes(e.status)).length
  const onHold    = entries.filter(e => e.status === 'On Hold').length

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Suite</span>
          <h2 className="hidden md:block text-sm font-semibold text-on-surface-variant">Tracker de Candidatos</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-outline-variant/30 cursor-pointer ml-1">R</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-6">

          {/* Breadcrumb + Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
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

            {/* Week selector */}
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2 shadow-sm">
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

          {/* Summary chips */}
          {entries.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">{entries.length} candidatos</span>
              {sent > 0 && <span className="px-3 py-1 rounded-full bg-pink-600/20 text-pink-300 text-xs font-bold border border-pink-500/30">{sent} Sent</span>}
              {rejected > 0 && <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-300 text-xs font-bold border border-red-500/30">{rejected} Rejected/HSE/Backed Out</span>}
              {onHold > 0 && <span className="px-3 py-1 rounded-full bg-slate-600/20 text-slate-300 text-xs font-bold border border-slate-500/30">{onHold} On Hold</span>}
            </div>
          )}

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.04)] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/10">
                      {['Candidato', 'CV', 'LinkedIn', 'Posición / Requerimiento', 'Status', 'English', 'Salario', 'Notas', ''].map(h => (
                        <th key={h} className="px-3 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-on-surface-variant/50 text-sm">
                          Sin candidatos esta semana. Agrega uno con el botón de abajo.
                        </td>
                      </tr>
                    )}
                    {entries.map((row) => {
                      const key = row._key ?? row.id
                      return (
                        <TrackerRow
                          key={key}
                          row={row}
                          requirements={requirements}
                          onSave={refresh}
                          onDelete={() => removeRow(key)}
                          readOnly={!canEdit}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add row button — only visible if can edit */}
            {canEdit && (
              <div className="px-4 py-3 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-secondary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Agregar candidato
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
