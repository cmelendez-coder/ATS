import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import ClientCreateForm from '../components/ClientCreateForm'
import { listClients, createClient, updateClient, createContact, updateContact, deleteContact } from '../api/clients'

const EMPTY_FORM = { name: '', job_title: '', email: '', mobile: '', location: '', timezone: '' }

const inputCls = 'bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 w-full'

function ContactForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="mt-3 p-4 rounded-xl border border-outline-variant/20 bg-surface-container space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Nombre *" value={form.name}      onChange={e => set('name', e.target.value)} />
        <input className={inputCls} placeholder="Puesto"   value={form.job_title} onChange={e => set('job_title', e.target.value)} />
        <input className={inputCls} placeholder="E-mail"   value={form.email}     onChange={e => set('email', e.target.value)} type="email" />
        <input className={inputCls} placeholder="Móvil"    value={form.mobile}    onChange={e => set('mobile', e.target.value)} />
        <input className={inputCls} placeholder="Ubicación" value={form.location} onChange={e => set('location', e.target.value)} />
        <input className={inputCls} placeholder="Zona horaria" value={form.timezone} onChange={e => set('timezone', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/20"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || saving}
          className="px-4 py-1.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
          Guardar
        </button>
      </div>
    </div>
  )
}

const DETAIL_KEYS = [
  ['sector',                'Sector'],
  ['country',               'País'],
  ['office_location',       'Oficina'],
  ['business_hours',        'Horario'],
  ['benefits',              'Beneficios'],
  ['timezone',              'Zona Horaria'],
  ['headquarters_location', 'Sede Central'],
  ['notes',                 'Notas'],
]

function ClientForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    sector: '', country: '', office_location: '', business_hours: '',
    benefits: '', timezone: '', headquarters_location: '', notes: '',
    ...initial,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3 pt-3 border-t border-outline-variant/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Editar detalles del cliente</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['sector',            'Sector'],
          ['country',           'País'],
          ['office_location',   'Oficina'],
          ['business_hours',    'Horario (ej. 9am–6pm)'],
          ['benefits',          'Beneficios'],
          ['timezone',          'Zona Horaria'],
        ].map(([k, label]) => (
          <input key={k} className={inputCls} placeholder={label} value={form[k] ?? ''} onChange={e => set(k, e.target.value)} />
        ))}
        <input className={`${inputCls} col-span-2`} placeholder="Sede Central (Headquarters)" value={form.headquarters_location ?? ''} onChange={e => set('headquarters_location', e.target.value)} />
        <textarea className={`${inputCls} col-span-2 resize-none`} rows={2} placeholder="Notas adicionales" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/20">
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-4 py-1.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
          Guardar
        </button>
      </div>
    </div>
  )
}

export default function Clients() {
  const { can } = usePermissions()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // contact ui state: null | { clientId, mode: 'add' } | { clientId, mode: 'edit', contact }
  const [editing, setEditing]         = useState(null)
  const [editingClient, setEditingClient] = useState(null) // clientId being edited
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [saving, setSaving]           = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listClients()
      setClients(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function sortClients(rows) {
    return [...rows].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' }))
  }

  async function handleCreateClient(form) {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const newClient = await createClient(form)
      setClients(prev => sortClients([...prev, newClient]))
      setShowCreateClient(false)
      setError(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveClient(clientId, form) {
    setSaving(true)
    try {
      await updateClient(clientId, form)
      setClients(prev => sortClients(prev.map(c => c.id === clientId ? { ...c, ...form } : c)))
      setEditingClient(null)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleSaveNew(clientId, form) {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const newContact = await createContact(clientId, form)
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, contacts: [...(c.contacts ?? []), newContact] } : c
      ))
      setEditing(null)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleSaveEdit(contactId, clientId, form) {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const updated = await updateContact(contactId, form)
      setClients(prev => prev.map(c =>
        c.id === clientId
          ? { ...c, contacts: c.contacts.map(ct => ct.id === contactId ? updated : ct) }
          : c
      ))
      setEditing(null)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(clientId, contactId) {
    if (!confirm('¿Eliminar este contacto?')) return
    try {
      await deleteContact(contactId)
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, contacts: c.contacts.filter(ct => ct.id !== contactId) } : c
      ))
    } catch (e) { alert(e.message) }
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Suite</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
            Dashboard
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Clients</span>
              </div>
              <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Clients</h1>
              <p className="text-on-surface-variant text-base">Oficinas, zonas horarias, sector y detalles operativos de cada cliente.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!loading && (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-sm font-semibold shrink-0">
                  <span className="material-symbols-outlined text-[16px]">apartment</span>
                  {clients.length} clientes activos
                </span>
              )}
              {can('clients.create') && (
                <button
                  type="button"
                  onClick={() => setShowCreateClient(prev => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[16px]">{showCreateClient ? 'close' : 'add'}</span>
                  {showCreateClient ? 'Cerrar formulario' : 'Nuevo cliente'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {showCreateClient && can('clients.create') && (
            <ClientCreateForm
              onSave={handleCreateClient}
              onCancel={() => setShowCreateClient(false)}
              saving={saving}
            />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              <span className="text-sm">Cargando clientes…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {clients.map(client => {
                const contacts = client.contacts ?? []
                const isAdding = editing?.clientId === client.id && editing?.mode === 'add'

                return (
                  <article key={client.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 space-y-4 shadow-[0_2px_16px_rgba(24,28,30,0.08)]">

                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">Cliente</p>
                        <h2 className="text-xl font-bold text-primary mt-1">{client.name}</h2>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {client.sector && (
                          <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border border-outline-variant/20">
                            {client.sector}
                          </span>
                        )}
                        {can('clients.contacts.manage') && (
                          <button
                            onClick={() => setEditingClient(editingClient === client.id ? null : client.id)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Editar datos del cliente"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {editingClient === client.id ? 'close' : 'edit'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details tiles / edit form */}
                    {editingClient === client.id ? (
                      <ClientForm
                        initial={client}
                        onSave={form => handleSaveClient(client.id, form)}
                        onCancel={() => setEditingClient(null)}
                        saving={saving}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {DETAIL_KEYS.filter(([k]) => k !== 'headquarters_location' && k !== 'notes' && client[k]).map(([k, label]) => (
                          <div key={k} className="rounded-xl bg-surface-container border border-outline-variant/15 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">{label}</p>
                            <p className="font-medium text-on-surface text-sm">{client[k]}</p>
                          </div>
                        ))}
                        {client.headquarters_location && (
                          <div className="rounded-xl bg-surface-container border border-outline-variant/15 p-3 col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Sede Central</p>
                            <p className="font-medium text-on-surface text-sm">{client.headquarters_location}</p>
                          </div>
                        )}
                        {client.notes && (
                          <div className="rounded-xl bg-surface-container border border-outline-variant/15 p-3 col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Notas</p>
                            <p className="font-medium text-on-surface text-sm">{client.notes}</p>
                          </div>
                        )}
                        {!DETAIL_KEYS.some(([k]) => client[k]) && (
                          <div className="col-span-2 text-xs text-on-surface-variant/50 italic py-2">
                            Sin detalles — haz clic en <span className="material-symbols-outlined text-[11px] align-middle">edit</span> para agregar
                          </div>
                        )}
                      </div>
                    )}

                    {/* HR Contacts */}
                    <div className="pt-4 border-t border-outline-variant/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px]">contacts</span>
                          HR Contacts
                        </h3>
                        {can('clients.contacts.manage') && (
                          <button
                            onClick={() => setEditing({ clientId: client.id, mode: 'add' })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                          >
                            <span className="material-symbols-outlined text-[11px]">add</span>
                            Agregar
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-[11px] min-w-[480px]">
                          <thead>
                            <tr className="border-b border-outline-variant/20">
                              {['Nombre', 'Puesto', 'E-mail', 'Móvil', 'Ubicación', 'TZ', ''].map(col => (
                                <th key={col} className="text-left pb-2 px-1.5 font-bold uppercase tracking-widest text-on-surface-variant/50 text-[9px] whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {contacts.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-4 text-center text-on-surface-variant/50 text-[11px] italic">
                                  Sin contactos registrados
                                </td>
                              </tr>
                            ) : contacts.map(contact => {
                              const isEditingThis = editing?.mode === 'edit' && editing?.contact?.id === contact.id
                              return (
                                <tr key={contact.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors group">
                                  {isEditingThis ? (
                                    <td colSpan={7} className="py-1">
                                      <ContactForm
                                        initial={{
                                          name:      contact.name      ?? '',
                                          job_title: contact.job_title ?? '',
                                          email:     contact.email     ?? '',
                                          mobile:    contact.mobile    ?? '',
                                          location:  contact.location  ?? '',
                                          timezone:  contact.timezone  ?? '',
                                        }}
                                        onSave={form => handleSaveEdit(contact.id, client.id, form)}
                                        onCancel={() => setEditing(null)}
                                        saving={saving}
                                      />
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-2 px-1.5 font-semibold text-on-surface whitespace-nowrap">{contact.name}</td>
                                      <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.job_title ?? '—'}</td>
                                      <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.email ?? '—'}</td>
                                      <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.mobile ?? '—'}</td>
                                      <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.location ?? '—'}</td>
                                      <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.timezone ?? '—'}</td>
                                      <td className="py-2 px-1.5">
                                        {can('clients.contacts.manage') && (
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => setEditing({ clientId: client.id, mode: 'edit', contact })}
                                              className="p-1 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                                              title="Editar"
                                            >
                                              <span className="material-symbols-outlined text-[13px]">edit</span>
                                            </button>
                                            <button
                                              onClick={() => handleDelete(client.id, contact.id)}
                                              className="p-1 rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
                                              title="Eliminar"
                                            >
                                              <span className="material-symbols-outlined text-[13px]">delete</span>
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Inline add form */}
                      {can('clients.contacts.manage') && isAdding && (
                        <ContactForm
                          onSave={form => handleSaveNew(client.id, form)}
                          onCancel={() => setEditing(null)}
                          saving={saving}
                        />
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
