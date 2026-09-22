import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  createRequirement,
  getCatalogs,
  getNextReqNumber,
} from '../api/requirements'

const DURATION_OPTIONS = ['Permanent', '3 Months', '6 Months', '12 Months', 'Contract']

const MEXICO_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
  'Yucatán', 'Zacatecas',
]

/* ── Selector de ubicación con búsqueda: Remote siempre resaltada, luego los estados de México ── */
function LocationCombobox({ value, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const options = ['Remote', ...MEXICO_STATES]
  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className="form-field cursor-pointer pr-9"
        value={open ? query : (value || '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder="Buscar ubicación…"
        autoComplete="off"
      />
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[1.125rem]">
        {open ? 'search' : 'arrow_drop_down'}
      </span>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/15 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filtered.length === 0 && <p className="px-4 py-3 text-xs text-on-surface-variant">Sin resultados</p>}
          {filtered.map(opt => {
            const isRemote = opt === 'Remote'
            const selected = opt === value
            return (
              <button
                key={opt}
                type="button"
                onMouseDown={() => { onChange(opt); setQuery(''); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-1.5 ${
                  isRemote
                    ? 'font-extrabold text-secondary bg-secondary-container/40 hover:bg-secondary-container/60'
                    : selected ? 'text-primary font-semibold bg-primary/5 hover:bg-surface-container' : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                {isRemote && <span className="material-symbols-outlined text-[1rem]">public</span>}
                {opt}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Selector de cliente con búsqueda: escribe para filtrar y elige de la lista ── */
function ClientCombobox({ clients, value, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const selectedName = clients.find(c => String(c.id) === String(value))?.name ?? ''
  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : clients

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className="form-field cursor-pointer pr-9"
        value={open ? query : selectedName}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder="Buscar cliente…"
        autoComplete="off"
      />
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[1.125rem]">
        {open ? 'search' : 'arrow_drop_down'}
      </span>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/15 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filtered.length === 0 && <p className="px-4 py-3 text-xs text-on-surface-variant">Sin resultados</p>}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onChange(String(c.id)); setQuery(''); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-surface-container ${String(c.id) === String(value) ? 'text-primary font-semibold bg-primary/5' : 'text-on-surface'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewRequirement() {
  const navigate            = useNavigate()
  const { session }         = useAuth()
  const [priority, setPriority]     = useState(1)
  const [charCount, setCharCount]   = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [submitted, setSubmitted]   = useState(false)
  const [savedReqLabel, setSavedReqLabel] = useState('')
  const [nextReqNum, setNextReqNum] = useState(null)
  const [catalogs, setCatalogs]     = useState({ statuses: [], arrangements: [], clients: [] })

  const [form, setForm] = useState({
    client_id:           '',
    job_title:           '',
    application_date:    '',
    target_fill_date:    '',
    first_resource_sent: '',
    stage:               'New',
    status_id:           '',
    duration:            '',
    fte_count:           1,
    desired_location:    '',
    salary_cap:          '',
    variable:            '',
    periodicidad:        '',
    work_arrangement_id: '',
    office_hours_id:     '',
    visa_us_required:    false,
    tech_reqs:           '',
    special_request:     '',
  })

  useEffect(() => {
    getCatalogs().then(c => {
      setCatalogs(c)
      setForm(f => ({
        ...f,
        status_id: c.statuses[0]?.id ?? '',
        work_arrangement_id: c.arrangements[0]?.id ?? '',
      }))
    })
    getNextReqNumber().then(setNextReqNum)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.client_id || !form.job_title || !form.application_date || !form.target_fill_date || !form.salary_cap || !form.duration) {
      setError('Complete los campos requeridos: cliente, puesto, fechas, duration y salary cap.')
      return
    }
    if (Number(form.salary_cap) < 20000) {
      setError('El salary cap debe ser de al menos $20,000.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const requirement = await createRequirement({
        req_number:          nextReqNum,
        client_id:           Number(form.client_id),
        job_title:           form.job_title,
        priority:            priority,
        stage:               form.stage,
        status_id:           2,
        application_date:    form.application_date,
        target_fill_date:    form.target_fill_date,
        first_resource_sent: form.first_resource_sent || null,
        duration:            form.duration || null,
        fte_count:           Number(form.fte_count) || 1,
        desired_location:    form.desired_location || null,
        salary_cap:          form.salary_cap ? Number(form.salary_cap) : null,
        variable:            form.variable ? String(form.variable) + '%' : null,
        periodicidad:        form.periodicidad || null,
        work_arrangement_id: form.work_arrangement_id ? Number(form.work_arrangement_id) : null,
        office_hours_id:     form.office_hours_id ? Number(form.office_hours_id) : null,
        visa_us_required:    form.visa_us_required,
        tech_reqs:           form.tech_reqs || null,
        special_request:     form.special_request || null,
        created_by_user_id:  session?.user?.id ?? null,
        created_at:          new Date().toISOString(),
      })

      setSavedReqLabel(`REQ-${new Date().getFullYear()}-${String(nextReqNum).padStart(3, '0')}`)
      setSubmitted(true)
    } catch (err) {
      setError(err.message ?? 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  const reqLabel = nextReqNum != null
    ? `REQ-${new Date().getFullYear()}-${String(nextReqNum).padStart(3, '0')}`
    : 'Cargando…'

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface p-8">
        <style>{`
          @keyframes reqPop {
            0%   { opacity: 0; transform: scale(0.4); }
            60%  { opacity: 1; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes reqRing {
            0%   { opacity: 0.55; transform: scale(0.7); }
            100% { opacity: 0; transform: scale(2); }
          }
          @keyframes reqFadeUp {
            0%   { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .req-success-icon    { animation: reqPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          .req-success-ring    { animation: reqRing 1.1s ease-out 0.15s both; }
          .req-success-ring2   { animation: reqRing 1.1s ease-out 0.4s both; }
          .req-success-text    { animation: reqFadeUp 0.45s ease-out 0.3s both; }
          .req-success-actions { animation: reqFadeUp 0.45s ease-out 0.45s both; }
          @media (prefers-reduced-motion: reduce) {
            .req-success-icon, .req-success-ring, .req-success-ring2, .req-success-text, .req-success-actions { animation: none; }
          }
        `}</style>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <span className="req-success-ring absolute inset-0 rounded-full bg-secondary/50" />
            <span className="req-success-ring2 absolute inset-0 rounded-full bg-secondary/40" />
            <div className="req-success-icon relative w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[2.5rem] text-secondary">check_circle</span>
            </div>
          </div>
          <div className="req-success-text">
            <h2 className="text-2xl font-extrabold tracking-tight text-primary">Requerimiento creado</h2>
            <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
              El requerimiento <span className="font-bold text-primary font-mono">{savedReqLabel}</span> fue creado exitosamente y ya está disponible en el sistema.
            </p>
          </div>
          <div className="req-success-actions flex gap-3 justify-center">
            <Link
              to="/requirements"
              className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Ir a Requerimientos
            </Link>
            <button
              onClick={() => { setSubmitted(false); setForm(f => ({ ...f, job_title: '', client_id: '' })) }}
              className="px-6 py-2.5 bg-surface-container text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors"
            >
              Crear otro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[1.25rem]">notifications</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Crear Requerimiento'}
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Page Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[0.875rem]">chevron_right</span>
              <Link to="/requirements" className="hover:text-primary transition-colors">Requirements</Link>
              <span className="material-symbols-outlined text-[0.875rem]">chevron_right</span>
              <span className="text-primary font-medium">New Requirement</span>
            </div>
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">New Requirement</h1>
            <p className="text-on-surface-variant text-base max-w-xl">
              Detail the new client specification below. Fields marked <span className="text-error font-medium">*</span> are required.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border text-sm bg-error-container/30 border-error/20 text-on-error-container">
              <span className="material-symbols-outlined text-[1.125rem]">error</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Row 1: Identification + Position */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Identification */}
              <div className="lg:col-span-5 bg-[#10284d] rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary-container/60 rounded-l-2xl"></div>
                <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[1.125rem] filled text-[#81b927]">tag</span>Identification
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Num. Requirement</label>
                    <input className="form-field font-mono opacity-70 cursor-not-allowed" value={reqLabel} type="text" readOnly />
                    <p className="text-xs text-white/40 mt-1">Auto-generated.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Requisition Open Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" value={form.application_date} onChange={e => set('application_date', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Priority <span className="text-error">*</span></label>
                    <div className="flex bg-surface-container p-1 rounded-xl">
                      {[{ v: 0, l: '0' }, { v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }, { v: 4, l: '4' }, { v: 5, l: '5' }].map(({ v, l }) => (
                        <button
                          key={v} type="button"
                          className={`priority-btn flex-1 py-1.5 text-xs rounded-lg transition-all focus:outline-none ${priority === v ? 'active text-primary' : 'font-medium text-on-surface-variant hover:text-primary'}`}
                          onClick={() => setPriority(v)}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Details */}
              <div className="lg:col-span-7 bg-[#10284d] rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-white/10 relative">
                <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[1.125rem] filled text-[#81b927]">work</span>Position Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Client <span className="text-error">*</span></label>
                    <ClientCombobox clients={catalogs.clients} value={form.client_id} onChange={id => set('client_id', id)} />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Job Title <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. Senior Backend Engineer" type="text" value={form.job_title} onChange={e => set('job_title', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Duration <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9" value={form.duration} onChange={e => set('duration', e.target.value)} required>
                        <option value="" disabled>Select…</option>
                        {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[1.125rem]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">FTE&apos;s <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. 2" type="number" min="1" value={form.fte_count} onChange={e => set('fte_count', e.target.value)} />
                    <p className="text-xs text-white/40 mt-1">Number of positions to fill.</p>
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Target Fill Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" value={form.target_fill_date} onChange={e => set('target_fill_date', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Desired Location</label>
                    <LocationCombobox value={form.desired_location} onChange={v => set('desired_location', v)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Tech Requirements</label>
                    <input className="form-field" placeholder="e.g. React, Node.js, PostgreSQL" type="text" value={form.tech_reqs} onChange={e => set('tech_reqs', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Compensation + Work Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Compensation */}
              <div className="lg:col-span-5 bg-[#10284d] rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-white/10">
                <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[1.125rem] filled text-[#81b927]">payments</span>Compensation
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Salary Cap <span className="text-error">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm font-medium">$</span>
                      <input className="form-field pl-7" placeholder="0.00" type="text" inputMode="numeric" value={form.salary_cap} onChange={e => set('salary_cap', e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Variable</label>
                    <div className="relative">
                      <input className="form-field pr-8" placeholder="0.00" type="text" inputMode="numeric" value={form.variable} onChange={e => set('variable', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm font-medium">%</span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">Performance bonus percentage.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Periodicidad</label>
                    <select className="form-field appearance-none cursor-pointer" value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}>
                      <option value="">Seleccionar…</option>
                      <option value="Mensual">Mensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="lg:col-span-7 bg-[#10284d] rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-white/10">
                <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[1.125rem] filled text-[#81b927]">apartment</span>Work Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest mb-2">Work Arrangement <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9" value={form.work_arrangement_id} onChange={e => set('work_arrangement_id', e.target.value)}>
                        <option value="">Select…</option>
                        {catalogs.arrangements.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[1.125rem]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[0.6875rem] font-bold text-white/50 uppercase tracking-widest">Special Request / Notes</label>
                      <span className="text-xs text-white/40">{charCount} / 500</span>
                    </div>
                    <textarea
                      className="form-field resize-none" rows={4}
                      placeholder="Any specific requirements, notes, or context for this position…"
                      maxLength={500}
                      value={form.special_request}
                      onChange={e => { set('special_request', e.target.value); setCharCount(e.target.value.length) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#10284d] rounded-2xl border border-white/10 shadow-[0_2px_16px_rgba(24,28,30,0.04)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1rem] text-white/50 filled">info</span>
                <p className="text-xs text-white/50">Fields marked <span className="text-error font-medium">*</span> are required.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/requirements">
                  <button type="button" className="px-5 py-2.5 rounded-full border border-white/20 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary py-2.5 px-7 rounded-full text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-150 flex items-center gap-2 group shadow-[0_4px_16px_rgba(0,7,38,0.12)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:active:scale-100"
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-[1rem]">progress_activity</span>Guardando…</>
                  ) : (
                    <><span>Submit Requirement</span><span className="material-symbols-outlined text-[1rem] group-hover:translate-x-0.5 transition-transform">arrow_forward</span></>
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
