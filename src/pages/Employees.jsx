import { useState, useEffect, useRef } from 'react'
import { fetchEmployees, saveEmployee, deleteEmployee, fetchClients } from '../api/employees'

const CLIENT_ORDER = ['LogicMonitor', 'BlueConic', 'PacVue']

// Days since start_date
function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

// Badge: null = no badge, 'green' = <60d, 'red' = >=60d (within 90d window is "alert zone")
function probationBadge(emp) {
  if (emp.status !== 'active' || !emp.start_date) return null
  const d = daysSince(emp.start_date)
  if (d < 0) return null          // hasn't started yet
  if (d < 60) return 'green'
  if (d <= 120) return 'red'      // still within a reasonable window to show alert
  return null                     // past probation, no badge
}

function ProbationBadge({ emp }) {
  const badge = probationBadge(emp)
  if (!badge) return null
  const d = daysSince(emp.start_date)
  if (badge === 'green') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-600/20 text-green-300 border border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        {d}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
      {d}d — Avisar
    </span>
  )
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

const EMPTY_EMP = {
  id: null,
  client_id: 2,
  full_name: '',
  position: '',
  phone: '',
  email: '',
  start_date: '',
  job_offer_date: '',
  monthly_salary: '',
  variable: '',
  variable_note: '',
  parking: null,
  status: 'active',
  exit_date: '',
  exit_reason: '',
}

function EmployeeModal({ emp, clients, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_EMP, ...emp })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.full_name.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        monthly_salary: form.monthly_salary === '' ? null : Number(form.monthly_salary),
        variable: form.variable === '' ? null : Number(form.variable),
        start_date: form.start_date || null,
        job_offer_date: form.job_offer_date || null,
        exit_date: form.exit_date || null,
      }
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full bg-surface-container text-on-surface text-xs px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant/40'
  const label = 'block text-[10px] text-on-surface-variant/70 font-semibold uppercase tracking-wider mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <h2 className="text-sm font-bold text-on-surface">{form.id ? 'Editar empleado' : 'Agregar empleado'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
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
            <label className={label}>Salario bruto mensual (MXN)</label>
            <input type="number" className={field} value={form.monthly_salary || ''} onChange={e => set('monthly_salary', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={label}>Variable mensual (MXN)</label>
            <input type="number" className={field} value={form.variable || ''} onChange={e => set('variable', e.target.value)} placeholder="0 o dejar vacío" />
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
          {form.status === 'exited' && (
            <>
              <div>
                <label className={label}>Fecha de salida</label>
                <input type="date" className={field} value={form.exit_date || ''} onChange={e => set('exit_date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={label}>Motivo de salida</label>
                <input className={field} value={form.exit_reason || ''} onChange={e => set('exit_reason', e.target.value)} placeholder="Voluntary resignation, Non-renewal…" />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant/20">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="text-xs px-4 py-2 rounded-lg bg-primary text-on-primary font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeTable({ title, employees, onEdit, onMoveToExit, onDelete, isExits }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2 px-1">
        <h3 className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">{title}</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant/60">
          {employees.length}
        </span>
      </div>
      <div className="rounded-xl border border-outline-variant/20 overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant text-[10px] uppercase tracking-wider">
              <th className="px-3 py-2.5 text-left font-semibold">Nombre</th>
              <th className="px-3 py-2.5 text-left font-semibold">Posición</th>
              <th className="px-3 py-2.5 text-left font-semibold">Teléfono</th>
              <th className="px-3 py-2.5 text-left font-semibold">Email</th>
              <th className="px-3 py-2.5 text-left font-semibold">Inicio</th>
              {!isExits && <th className="px-3 py-2.5 text-left font-semibold">Contrato</th>}
              {isExits  && <th className="px-3 py-2.5 text-left font-semibold">Salida</th>}
              {isExits  && <th className="px-3 py-2.5 text-left font-semibold">Motivo</th>}
              <th className="px-3 py-2.5 text-left font-semibold">Salario</th>
              <th className="px-3 py-2.5 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={isExits ? 8 : 7} className="px-3 py-6 text-center text-on-surface-variant/40 text-[11px]">
                  Sin registros
                </td>
              </tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className="group hover:bg-surface-container/40 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-on-surface whitespace-nowrap">{emp.full_name}</td>
                <td className="px-3 py-2.5 text-on-surface-variant max-w-[180px] truncate">{emp.position || '—'}</td>
                <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{emp.phone || '—'}</td>
                <td className="px-3 py-2.5 text-on-surface-variant">{emp.email || '—'}</td>
                <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{formatDate(emp.start_date)}</td>
                {!isExits && (
                  <td className="px-3 py-2.5">
                    <ProbationBadge emp={emp} />
                  </td>
                )}
                {isExits && <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{formatDate(emp.exit_date)}</td>}
                {isExits && <td className="px-3 py-2.5 text-on-surface-variant max-w-[160px] truncate">{emp.exit_reason || '—'}</td>}
                <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{formatSalary(emp.monthly_salary)}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(emp)}
                      className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                    {!isExits && (
                      <button
                        onClick={() => onMoveToExit(emp)}
                        className="p-1 rounded text-on-surface-variant hover:text-orange-400 hover:bg-surface-container transition-colors"
                        title="Mover a Exits"
                      >
                        <span className="material-symbols-outlined text-[15px]">exit_to_app</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(emp)}
                      className="p-1 rounded text-on-surface-variant hover:text-red-400 hover:bg-surface-container transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [clients, setClients] = useState([])
  const [tab, setTab] = useState('active')
  const [modal, setModal] = useState(null)   // null | emp object
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  // Derived
  const activeEmps = employees.filter(e => e.status === 'active')
  const exitedEmps = employees.filter(e => e.status === 'exited')

  // Expiring soon (red badge)
  const expiring = activeEmps.filter(e => probationBadge(e) === 'red')
    .sort((a, b) => daysSince(b.start_date) - daysSince(a.start_date))

  function groupByClient(list) {
    const grouped = {}
    CLIENT_ORDER.forEach(name => { grouped[name] = [] })
    list.forEach(e => {
      const name = e.client?.name
      if (grouped[name]) grouped[name].push(e)
      else {
        grouped[name] = grouped[name] || []
        grouped[name].push(e)
      }
    })
    return grouped
  }

  const activeByClient = groupByClient(activeEmps)
  const exitsByClient  = groupByClient(exitedEmps)

  const tabClass = active =>
    active
      ? 'px-4 py-2 text-xs font-bold text-primary border-b-2 border-primary transition-colors'
      : 'px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface border-b-2 border-transparent transition-colors'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Employees</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {activeEmps.length} activos · {exitedEmps.length} exits
          </p>
        </div>
        <button
          onClick={() => setModal({ ...EMPTY_EMP })}
          className="flex items-center gap-1.5 bg-primary text-on-primary text-[11px] font-bold px-3 py-1.5 rounded-full shadow-[0_0_12px_rgba(80,177,82,0.35)] hover:shadow-[0_0_18px_rgba(80,177,82,0.55)] hover:scale-105 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[14px]">person_add</span>
          Agregar empleado
        </button>
      </div>

      {/* Expiring alert panel */}
      {expiring.length > 0 && tab === 'active' && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-600/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-red-400 text-[18px]">warning</span>
            <h2 className="text-xs font-bold text-red-300 uppercase tracking-wider">
              Próximos vencimientos de contrato de prueba ({expiring.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiring.map(emp => {
              const d = daysSince(emp.start_date)
              const daysLeft = 90 - d
              return (
                <div key={emp.id} className="flex items-start gap-2 bg-red-600/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-red-400 text-[14px] mt-0.5 shrink-0">person_alert</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">{emp.full_name}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{emp.client?.name} · {emp.position}</p>
                    <p className="text-[10px] text-red-300 mt-0.5">
                      {d} días desde inicio
                      {daysLeft > 0 ? ` · ${daysLeft}d para cumplir 3 meses` : ' · Plazo cumplido'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/20 mb-6">
        <button className={tabClass(tab === 'active')} onClick={() => setTab('active')}>
          Active <span className="ml-1 text-[10px] opacity-60">({activeEmps.length})</span>
        </button>
        <button className={tabClass(tab === 'exits')} onClick={() => setTab('exits')}>
          Exits <span className="ml-1 text-[10px] opacity-60">({exitedEmps.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : tab === 'active' ? (
        <div>
          {CLIENT_ORDER.map(clientName => (
            <EmployeeTable
              key={clientName}
              title={clientName}
              employees={activeByClient[clientName] ?? []}
              onEdit={setModal}
              onMoveToExit={handleMoveToExit}
              onDelete={setDeleteConfirm}
              isExits={false}
            />
          ))}
          {activeEmps.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-12">No hay empleados activos.</p>
          )}
        </div>
      ) : (
        <div>
          {CLIENT_ORDER.map(clientName => (
            <EmployeeTable
              key={clientName}
              title={clientName}
              employees={exitsByClient[clientName] ?? []}
              onEdit={setModal}
              onMoveToExit={() => {}}
              onDelete={setDeleteConfirm}
              isExits={true}
            />
          ))}
          {exitedEmps.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-12">No hay exits registrados.</p>
          )}
        </div>
      )}

      {/* Edit/Add modal */}
      {modal && (
        <EmployeeModal
          emp={modal}
          clients={clients}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm text-on-surface mb-1 font-semibold">¿Eliminar empleado?</p>
            <p className="text-xs text-on-surface-variant mb-4">{deleteConfirm.full_name}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="text-xs px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
