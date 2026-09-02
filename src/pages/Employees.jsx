import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { fetchEmployees, saveEmployee, deleteEmployee, fetchClients } from '../api/employees'

const CLIENT_ORDER = ['LogicMonitor', 'BlueConic', 'PacVue']

const CLIENT_COLOR = {
  LogicMonitor: {
    text: 'text-blue-300', dot: 'bg-blue-400',
    badge: 'bg-blue-400/10 text-blue-300 border border-blue-400/20',
    header: 'bg-blue-500/10 border border-blue-400/20',
  },
  BlueConic: {
    text: 'text-emerald-300', dot: 'bg-emerald-400',
    badge: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
    header: 'bg-emerald-500/10 border border-emerald-400/20',
  },
  PacVue: {
    text: 'text-orange-300', dot: 'bg-orange-400',
    badge: 'bg-orange-400/10 text-orange-300 border border-orange-400/20',
    header: 'bg-orange-500/10 border border-orange-400/20',
  },
}

const AVATAR_PALETTE = [
  'bg-blue-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600',
  'bg-teal-600', 'bg-pink-600', 'bg-cyan-700', 'bg-indigo-600',
]
function avatarBg(name = '') {
  const s = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[s % AVATAR_PALETTE.length]
}
function initials(name = '') {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?'
}

function daysSince(d) {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}
function probationBadge(emp) {
  if (emp.status !== 'active' || !emp.start_date) return null
  const d = daysSince(emp.start_date)
  if (d < 0) return null
  if (d < 60) return 'green'
  if (d < 90) return 'red'
  return 'activo'
}
function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`
}
function formatSalary(n) {
  if (!n) return '—'
  return `$${Number(n).toLocaleString('es-MX')}`
}

function ProbationBadge({ emp }) {
  const badge = probationBadge(emp)
  if (!badge) return null
  const d = daysSince(emp.start_date)
  if (badge === 'activo') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-600/20 text-green-300 border border-green-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Activo
    </span>
  )
  if (badge === 'green') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-600/20 text-green-300 border border-green-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />{d}d prueba
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{d}d — Avisar
    </span>
  )
}

const EMPTY_EMP = {
  id: null, client_id: 2, full_name: '', position: '', phone: '', email: '',
  start_date: '', job_offer_date: '', monthly_salary: '', variable: '',
  variable_note: '', parking: null, status: 'active', exit_date: '', exit_reason: '',
}

function EmployeeModal({ emp, clients, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_EMP, ...emp })
  const [saving, setSaving] = useState(false)
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }
  async function handleSave() {
    if (!form.full_name.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        monthly_salary: form.monthly_salary === '' ? null : Number(form.monthly_salary),
        variable: form.variable === '' ? null : Number(form.variable),
        start_date: form.start_date || null,
        job_offer_date: form.job_offer_date || null,
        exit_date: form.exit_date || null,
      })
      onClose()
    } finally { setSaving(false) }
  }
  const field = 'w-full bg-[#0d2248] text-on-surface text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant/40'
  const label = 'block text-[10px] text-on-surface-variant/60 font-semibold uppercase tracking-wider mb-1'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0a1f3d] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">{form.id ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Nombre completo *</label>
            <input className={field} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={label}>Cliente</label>
            <select className={field} value={form.client_id} onChange={e => set('client_id', Number(e.target.value))}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Posición</label>
            <input className={field} value={form.position || ''} onChange={e => set('position', e.target.value)} placeholder="Título del puesto" />
          </div>
          <div>
            <label className={label}>Teléfono</label>
            <input className={field} value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="52 55 1234 5678" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={field} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@ejemplo.com" />
          </div>
          <div>
            <label className={label}>Fecha de inicio</label>
            <input type="date" className={field} value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={label}>Fecha de oferta</label>
            <input type="date" className={field} value={form.job_offer_date || ''} onChange={e => set('job_offer_date', e.target.value)} />
          </div>
          <div>
            <label className={label}>Salario mensual (MXN)</label>
            <input type="number" className={field} value={form.monthly_salary || ''} onChange={e => set('monthly_salary', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={label}>Variable mensual (MXN)</label>
            <input type="number" className={field} value={form.variable || ''} onChange={e => set('variable', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={label}>Nota de variable</label>
            <input className={field} value={form.variable_note || ''} onChange={e => set('variable_note', e.target.value)} placeholder="ej. 15% del Bruto" />
          </div>
          <div>
            <label className={label}>Estatus</label>
            <select className={field} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="exited">Exited</option>
            </select>
          </div>
          {form.status === 'exited' && <>
            <div>
              <label className={label}>Fecha de salida</label>
              <input type="date" className={field} value={form.exit_date || ''} onChange={e => set('exit_date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Motivo de salida</label>
              <input className={field} value={form.exit_reason || ''} onChange={e => set('exit_reason', e.target.value)} placeholder="Voluntary resignation, Non-renewal…" />
            </div>
          </>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="text-xs px-5 py-2 rounded-lg bg-primary text-on-primary font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xs text-on-surface">{value}</p>
      </div>
    </div>
  )
}

function EmployeeDrawer({ emp, onEdit, onMoveToExit, onDelete, onClose }) {
  if (!emp) return null
  const clientName = emp.client?.name
  const colors = CLIENT_COLOR[clientName] ?? { dot: 'bg-white/40', badge: 'bg-white/10 text-white/60 border border-white/10', text: 'text-white/60' }
  const badge = probationBadge(emp)
  const d = daysSince(emp.start_date)

  return createPortal(
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-y-0 right-0 w-full max-w-[400px] bg-[#071d47] border-l border-white/[0.08] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${avatarBg(emp.full_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {initials(emp.full_name)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{emp.full_name}</h2>
              <p className="text-[11px] text-on-surface-variant/60">{emp.position || 'Sin posición'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-white/[0.06] shrink-0">
          {emp.status === 'active'
            ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Active
              </span>
            : <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Exited
              </span>
          }
          {clientName && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />{clientName}
            </span>
          )}
          {badge === 'green' && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/25">Prueba: {d}d</span>}
          {badge === 'red' && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 animate-pulse">⚠ {d}d — Avisar</span>}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 px-5 py-3 overflow-y-auto">
          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Contacto</p>
          <DetailRow icon="mail" label="Email" value={emp.email} />
          <DetailRow icon="phone" label="Teléfono" value={emp.phone} />

          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-5 mb-1">Empleo</p>
          <DetailRow icon="calendar_today" label="Fecha de inicio" value={formatDate(emp.start_date)} />
          <DetailRow icon="event_available" label="Fecha de oferta" value={formatDate(emp.job_offer_date)} />
          {emp.status === 'exited' && <>
            <DetailRow icon="event_busy" label="Fecha de salida" value={formatDate(emp.exit_date)} />
            <DetailRow icon="info" label="Motivo de salida" value={emp.exit_reason} />
          </>}

          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-5 mb-1">Compensación</p>
          <DetailRow icon="payments" label="Salario mensual" value={formatSalary(emp.monthly_salary)} />
          {emp.variable ? <DetailRow icon="trending_up" label="Variable mensual" value={formatSalary(emp.variable)} /> : null}
          <DetailRow icon="description" label="Nota de variable" value={emp.variable_note} />
          {emp.annual_cost_usd ? <DetailRow icon="attach_money" label="Costo anual (USD)" value={`$${Number(emp.annual_cost_usd).toLocaleString()} USD`} /> : null}
          {emp.parking === true && <DetailRow icon="local_parking" label="Estacionamiento" value="Sí" />}
          {emp.parking === false && <DetailRow icon="local_parking" label="Estacionamiento" value="No" />}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-white/[0.08] flex gap-2 shrink-0">
          <button
            onClick={() => { onEdit(emp); onClose() }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>Editar
          </button>
          {emp.status === 'active' && (
            <button
              onClick={() => { onMoveToExit(emp); onClose() }}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 transition-colors"
              title="Mover a Exits"
            >
              <span className="material-symbols-outlined text-[15px]">exit_to_app</span>
            </button>
          )}
          <button
            onClick={() => { onDelete(emp); onClose() }}
            className="flex items-center justify-center py-2 px-3 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Employees() {
  const [employees,     setEmployees]     = useState([])
  const [clients,       setClients]       = useState([])
  const [tab,           setTab]           = useState('active')
  const [modal,         setModal]         = useState(null)
  const [drawer,        setDrawer]        = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [collapsed,     setCollapsed]     = useState({})
  const [search,        setSearch]        = useState('')
  const [clientFilter,  setClientFilter]  = useState('all')

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchClients()])
      .then(([emps, cls]) => { setEmployees(emps); setClients(cls) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(emp) {
    const saved = await saveEmployee(emp)
    setEmployees(prev =>
      prev.some(e => e.id === saved.id)
        ? prev.map(e => e.id === saved.id ? saved : e)
        : [...prev, saved]
    )
  }
  async function handleDelete(emp) {
    await deleteEmployee(emp.id)
    setEmployees(prev => prev.filter(e => e.id !== emp.id))
    setDeleteConfirm(null)
  }
  function handleMoveToExit(emp) {
    setModal({ ...emp, status: 'exited', exit_date: '', exit_reason: '' })
  }
  function toggleCollapse(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeEmps  = employees.filter(e => e.status === 'active')
  const exitedEmps  = employees.filter(e => e.status === 'exited')
  const expiring    = activeEmps.filter(e => probationBadge(e) === 'red')
  const currentList = tab === 'active' ? activeEmps : exitedEmps

  const filtered = useMemo(() => {
    let list = currentList
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.full_name?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      )
    }
    if (clientFilter !== 'all') list = list.filter(e => e.client?.name === clientFilter)
    return list
  }, [currentList, search, clientFilter])

  function groupByClient(list) {
    const grouped = {}
    CLIENT_ORDER.forEach(n => { grouped[n] = [] })
    list.forEach(e => {
      const n = e.client?.name
      if (n && n in grouped) grouped[n].push(e)
    })
    return grouped
  }
  const grouped = groupByClient(filtered)
  const isExits = tab !== 'active'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Employees</h1>
        <p className="text-sm text-on-surface-variant/60 mt-1">Headcount colocado por cliente</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container border border-outline-variant/15 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">group</span>
          </span>
          <div>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Total</p>
            <p className="text-xl font-extrabold text-on-surface leading-none">{employees.length}</p>
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant/15 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-green-400 text-[18px]">person_check</span>
          </span>
          <div>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Activos</p>
            <p className="text-xl font-extrabold text-on-surface leading-none">{activeEmps.length}</p>
          </div>
        </div>
        <div className="bg-surface-container border border-outline-variant/15 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-on-surface-variant/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant/50 text-[18px]">person_off</span>
          </span>
          <div>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Exits</p>
            <p className="text-xl font-extrabold text-on-surface/60 leading-none">{exitedEmps.length}</p>
          </div>
        </div>
        <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${expiring.length > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-surface-container border-outline-variant/15'}`}>
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${expiring.length > 0 ? 'bg-red-500/20' : 'bg-on-surface-variant/10'}`}>
            <span className={`material-symbols-outlined text-[18px] ${expiring.length > 0 ? 'text-red-400' : 'text-on-surface-variant/40'}`}>warning</span>
          </span>
          <div>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">Prueba — Avisar</p>
            <p className={`text-xl font-extrabold leading-none ${expiring.length > 0 ? 'text-red-300' : 'text-on-surface/40'}`}>{expiring.length}</p>
          </div>
        </div>
      </div>

      {/* Client breakdown — clickable to filter */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {CLIENT_ORDER.map(name => {
          const colors  = CLIENT_COLOR[name]
          const active  = employees.filter(e => e.status === 'active'  && e.client?.name === name).length
          const exits   = employees.filter(e => e.status === 'exited'  && e.client?.name === name).length
          const active_ = clientFilter === name
          return (
            <button
              key={name}
              onClick={() => setClientFilter(f => f === name ? 'all' : name)}
              className={`rounded-xl border px-4 py-3 text-left transition-all hover:scale-[1.01] ${
                active_ ? `${colors.header} ring-1 ring-inset ring-white/20` : 'bg-surface-container border-outline-variant/15 hover:border-outline-variant/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`text-xs font-bold ${active_ ? colors.text : 'text-on-surface'}`}>{name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xl font-extrabold text-on-surface leading-none">{active}</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">activos</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <p className="text-xl font-extrabold text-on-surface/50 leading-none">{exits}</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">exits</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Probation alert */}
      {expiring.length > 0 && tab === 'active' && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-600/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-red-400 text-[16px]">warning</span>
            <p className="text-xs font-bold text-red-300 uppercase tracking-wider">Contratos de prueba próximos a vencer ({expiring.length})</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiring.sort((a, b) => daysSince(b.start_date) - daysSince(a.start_date)).map(emp => {
              const d = daysSince(emp.start_date)
              return (
                <button key={emp.id} onClick={() => setDrawer(emp)}
                  className="flex items-start gap-2.5 bg-red-600/10 border border-red-500/20 rounded-lg px-3 py-2.5 hover:bg-red-600/15 transition-colors text-left">
                  <div className={`w-7 h-7 rounded-lg ${avatarBg(emp.full_name)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                    {initials(emp.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{emp.full_name}</p>
                    <p className="text-[10px] text-on-surface-variant/70 truncate">{emp.client?.name} · {emp.position}</p>
                    <p className="text-[10px] text-red-300 mt-0.5">{d}d · {90 - d > 0 ? `${90 - d}d restantes` : 'Plazo cumplido'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface-variant/40">search</span>
          <input
            className="w-full bg-surface-container border border-outline-variant/20 rounded-lg pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="Buscar por nombre, posición…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(search || clientFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setClientFilter('all') }}
            className="flex items-center gap-1 text-[11px] text-on-surface-variant/60 hover:text-on-surface bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 transition-colors">
            <span className="material-symbols-outlined text-[14px]">filter_list_off</span>Limpiar
          </button>
        )}
        <button
          onClick={() => setModal({ ...EMPTY_EMP })}
          className="ml-auto flex items-center gap-1.5 bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(80,177,82,0.3)]"
        >
          <span className="material-symbols-outlined text-[15px]">person_add</span>Agregar empleado
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant/15 rounded-xl w-fit mb-5">
        {[
          ['active', 'person_check', 'Active', activeEmps.length],
          ['exits',  'person_off',   'Exits',  exitedEmps.length],
        ].map(([val, icon, lbl, count]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === val ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
            {lbl}
            <span className="text-[10px] opacity-60">({count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant/40">
          <span className="material-symbols-outlined text-[40px] mb-2 block">manage_search</span>
          <p className="text-sm">Sin empleados que coincidan</p>
          {(search || clientFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setClientFilter('all') }} className="mt-2 text-xs text-primary hover:underline">Limpiar filtros</button>
          )}
        </div>
      ) : (
        CLIENT_ORDER.map(clientName => {
          const emps = grouped[clientName] ?? []
          if (emps.length === 0) return null
          const colors = CLIENT_COLOR[clientName] ?? { dot: 'bg-white/30', header: 'bg-white/5 border border-white/10', text: 'text-white/70', badge: 'bg-white/10 text-white/60 border border-white/10' }
          const colKey = isExits ? `${clientName}_exits` : clientName
          return (
            <div key={clientName} className="mb-5">
              <button
                type="button"
                onClick={() => toggleCollapse(colKey)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 hover:opacity-90 transition-all ${colors.header}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{clientName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{emps.length}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50 transition-transform duration-200"
                  style={{ transform: collapsed[colKey] ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
              </button>

              {!collapsed[colKey] && (
                <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
                  <table className="w-full text-xs min-w-[720px]">
                    <thead>
                      <tr className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-wider border-b border-outline-variant/15">
                        <th className="px-4 py-2.5 w-10" />
                        <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Posición</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Inicio</th>
                        {!isExits && <th className="px-3 py-2.5 text-left font-semibold">Prueba</th>}
                        {isExits  && <th className="px-3 py-2.5 text-left font-semibold">Salida</th>}
                        {isExits  && <th className="px-3 py-2.5 text-left font-semibold">Motivo</th>}
                        <th className="px-3 py-2.5 text-left font-semibold">Salario</th>
                        <th className="px-3 py-2.5 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {emps.map(emp => (
                        <tr
                          key={emp.id}
                          onClick={() => setDrawer(emp)}
                          className="hover:bg-surface-container-high/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            <div className={`w-7 h-7 rounded-lg ${avatarBg(emp.full_name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                              {initials(emp.full_name)}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-on-surface whitespace-nowrap">{emp.full_name}</td>
                          <td className="px-3 py-3 text-on-surface-variant max-w-[180px] truncate">{emp.position || '—'}</td>
                          <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(emp.start_date)}</td>
                          {!isExits && <td className="px-3 py-3"><ProbationBadge emp={emp} /></td>}
                          {isExits  && <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(emp.exit_date)}</td>}
                          {isExits  && <td className="px-3 py-3 text-on-surface-variant/60 max-w-[140px] truncate">{emp.exit_reason || '—'}</td>}
                          <td className="px-3 py-3 text-on-surface-variant font-mono whitespace-nowrap">{formatSalary(emp.monthly_salary)}</td>
                          <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setModal(emp)} title="Editar"
                                className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              {!isExits && (
                                <button onClick={() => handleMoveToExit(emp)} title="Mover a Exits"
                                  className="p-1 rounded text-on-surface-variant hover:text-orange-400 hover:bg-surface-container transition-colors">
                                  <span className="material-symbols-outlined text-[14px]">exit_to_app</span>
                                </button>
                              )}
                              <button onClick={() => setDeleteConfirm(emp)} title="Eliminar"
                                className="p-1 rounded text-on-surface-variant hover:text-red-400 hover:bg-surface-container transition-colors">
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Edit modal */}
      {modal && <EmployeeModal emp={modal} clients={clients} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Detail drawer */}
      {drawer && (
        <EmployeeDrawer
          emp={drawer}
          onEdit={emp => setModal(emp)}
          onMoveToExit={handleMoveToExit}
          onDelete={emp => setDeleteConfirm(emp)}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a1f3d] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm font-bold text-white mb-1">¿Eliminar empleado?</p>
            <p className="text-xs text-on-surface-variant/60 mb-4">{deleteConfirm.full_name}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-4 py-2 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="text-xs px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
