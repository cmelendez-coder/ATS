import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCatalogs, getRequirement, updateRequirement } from '../api/requirements'

const DURATION_OPTIONS = ['Permanent', '3 Months', '6 Months', '12 Months', 'Contract']

export default function EditRequirement() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [priority, setPriority] = useState(1)
  const [charCount, setCharCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [catalogs, setCatalogs] = useState({ statuses: [], arrangements: [], clients: [] })
  const [reqNumber, setReqNumber] = useState(null)
  const [applicationDate, setApplicationDate] = useState('')

  const [form, setForm] = useState({
    client_id: '',
    job_title: '',
    application_date: '',
    target_fill_date: '',
    first_resource_sent: '',
    stage: 'New',
    status_id: '',
    duration: '',
    fte_count: 1,
    desired_location: '',
    salary_cap: '',
    variable: '',
    periodicidad: '',
    work_arrangement_id: '',
    office_hours_id: '',
    visa_us_required: false,
    tech_reqs: '',
    special_request: '',
  })

  useEffect(() => {
    if (!id) return

    async function load() {
      setInitialLoading(true)
      setError(null)
      try {
        const [catalogData, requirement] = await Promise.all([
          getCatalogs(),
          getRequirement(id),
        ])

        setCatalogs(catalogData)
        setReqNumber(requirement.req_number)
        setApplicationDate(requirement.application_date ?? '')
        setPriority(requirement.priority ?? 2)

        setForm({
          client_id: requirement.client?.id ? String(requirement.client.id) : '',
          job_title: requirement.job_title ?? '',
          application_date: requirement.application_date ?? '',
          target_fill_date: requirement.target_fill_date ?? '',
          first_resource_sent: requirement.first_resource_sent ?? '',
          stage: requirement.stage ?? 'New',
          status_id: requirement.status_id ? String(requirement.status_id) : '',
          duration: requirement.duration ?? '',
          fte_count: requirement.fte_count ?? 1,
          desired_location: requirement.desired_location ?? '',
          salary_cap: requirement.salary_cap ?? '',
          variable: String(requirement.variable ?? '').replace('%', ''),
          periodicidad: requirement.periodicidad ?? '',
          work_arrangement_id: requirement.work_arrangement_id ? String(requirement.work_arrangement_id) : '',
          office_hours_id: requirement.office_hours_id ? String(requirement.office_hours_id) : '',
          visa_us_required: Boolean(requirement.visa_us_required),
          tech_reqs: requirement.tech_reqs ?? '',
          special_request: requirement.special_request ?? '',
        })
        setCharCount((requirement.special_request ?? '').length)
      } catch (err) {
        setError(err.message ?? 'Error al cargar el requerimiento.')
      } finally {
        setInitialLoading(false)
      }
    }

    load()
  }, [id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e?.preventDefault?.()
    if (!form.client_id || !form.job_title || !form.application_date || !form.target_fill_date) {
      setError('Complete los campos requeridos.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await updateRequirement(id, {
        client_id: Number(form.client_id),
        job_title: form.job_title,
        priority,
        stage: form.stage,
        status_id: Number(form.status_id) || null,
        application_date: form.application_date,
        target_fill_date: form.target_fill_date,
        first_resource_sent: form.first_resource_sent || null,
        duration: form.duration || null,
        fte_count: Number(form.fte_count) || 1,
        desired_location: form.desired_location || null,
        salary_cap: form.salary_cap ? Number(form.salary_cap) : null,
        variable: form.variable ? `${String(form.variable)}%` : null,
        periodicidad: form.periodicidad || null,
        work_arrangement_id: form.work_arrangement_id ? Number(form.work_arrangement_id) : null,
        office_hours_id: form.office_hours_id ? Number(form.office_hours_id) : null,
        visa_us_required: form.visa_us_required,
        tech_reqs: form.tech_reqs || null,
        special_request: form.special_request || null,
      })
      navigate('/requirements')
    } catch (err) {
      setError(err.message ?? 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  const reqLabel = reqNumber != null
    ? `REQ-${new Date(applicationDate || Date.now()).getFullYear()}-${String(reqNumber).padStart(3, '0')}`
    : 'Cargando...'

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface p-10">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          <span className="text-sm">Cargando requerimiento...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <Link to="/requirements" className="hover:text-primary transition-colors">Requirements</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-medium">Edit Requirement</span>
            </div>
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Edit Requirement</h1>
            <p className="text-on-surface-variant text-base max-w-xl">
              Update the client requirement details below. Fields marked <span className="text-error font-medium">*</span> are required.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border text-sm bg-error-container/30 border-error/20 text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">error</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary-container/60 rounded-l-2xl"></div>
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">tag</span>Identification
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Num. Requirement</label>
                    <input className="form-field font-mono opacity-70 cursor-not-allowed" value={reqLabel} type="text" readOnly />
                    <p className="text-xs text-on-surface-variant mt-1">Auto-generated.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Requisition Open Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" value={form.application_date} onChange={e => set('application_date', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Priority <span className="text-error">*</span></label>
                    <div className="flex bg-surface-container p-1 rounded-xl">
                      {[{ v: 0, l: '0' }, { v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: 'On hold' }].map(({ v, l }) => (
                        <button
                          key={v}
                          type="button"
                          className={`priority-btn flex-1 py-1.5 text-xs rounded-lg transition-all focus:outline-none ${priority === v ? 'active text-primary' : 'font-medium text-on-surface-variant hover:text-primary'}`}
                          onClick={() => setPriority(v)}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary/10 to-transparent"></div>
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">work</span>Position Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Client <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9" value={form.client_id} onChange={e => set('client_id', e.target.value)} required>
                        <option value="">Select client...</option>
                        {catalogs.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Job Title <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. Senior Backend Engineer" type="text" value={form.job_title} onChange={e => set('job_title', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Duration</label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9" value={form.duration} onChange={e => set('duration', e.target.value)}>
                        <option value="">Select...</option>
                        {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">FTE&apos;s <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. 2" type="number" min="1" value={form.fte_count} onChange={e => set('fte_count', e.target.value)} />
                    <p className="text-xs text-on-surface-variant mt-1">Number of positions to fill.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Target Fill Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" value={form.target_fill_date} onChange={e => set('target_fill_date', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Desired Location</label>
                    <input className="form-field" placeholder="e.g. Mexico City / Remote" type="text" value={form.desired_location} onChange={e => set('desired_location', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Tech Requirements</label>
                    <input className="form-field" placeholder="e.g. React, Node.js, PostgreSQL" type="text" value={form.tech_reqs} onChange={e => set('tech_reqs', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">payments</span>Compensation
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Salary Cap</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">$</span>
                      <input className="form-field pl-7" placeholder="0.00" type="number" min="0" step="100" value={form.salary_cap} onChange={e => set('salary_cap', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Variable</label>
                    <div className="relative">
                      <input className="form-field pr-8" placeholder="0" type="number" min="0" value={form.variable} onChange={e => set('variable', e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">%</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">Performance bonus percentage.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Periodicidad</label>
                    <select className="form-field appearance-none cursor-pointer" value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}>
                      <option value="">Seleccionar…</option>
                      <option value="Mensual">Mensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">apartment</span>Work Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Work Arrangement <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9" value={form.work_arrangement_id} onChange={e => set('work_arrangement_id', e.target.value)}>
                        <option value="">Select…</option>
                        {catalogs.arrangements.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">VISA US Required</label>
                    <div className="flex items-center gap-4">
                      {[{ value: true, label: 'Yes - Sponsorship available' }, { value: false, label: 'No - Not required' }].map(({ value, label }) => (
                        <label key={String(value)} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="radio" name="visa" checked={form.visa_us_required === value} onChange={() => set('visa_us_required', value)} className="text-secondary focus:ring-secondary/30" />
                          <span className="text-sm text-on-surface-variant">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Special Request / Notes</label>
                      <span className="text-xs text-on-surface-variant">{charCount} / 500</span>
                    </div>
                    <textarea
                      className="form-field resize-none"
                      rows={4}
                      placeholder="Any specific requirements, notes, or context for this position..."
                      maxLength={500}
                      value={form.special_request}
                      onChange={e => { set('special_request', e.target.value); setCharCount(e.target.value.length) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.04)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant filled">info</span>
                <p className="text-xs text-on-surface-variant">Fields marked <span className="text-error font-medium">*</span> are required.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/requirements">
                  <button type="button" className="px-5 py-2.5 rounded-full border border-outline-variant/30 text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-br from-primary to-primary-container text-on-primary py-2.5 px-7 rounded-full text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 group shadow-[0_4px_16px_rgba(0,7,38,0.12)] disabled:opacity-60"
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>Guardando...</>
                  ) : (
                    <><span>Update Requirement</span><span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span></>
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
