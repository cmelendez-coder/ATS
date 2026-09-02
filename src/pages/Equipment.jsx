import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { fetchEquipment, saveEquipment, deleteEquipment } from '../api/employees'

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
function noData(v) { return !v || v === 'No data' || v === 'N/A' }
function clean(v) { return noData(v) ? null : v }

const EMPTY_EQUIP = {
  id: null, nombre: '', puesto: '', disponible: 'Si', tipo: 'Laptop',
  propiedad: '', propiedad_2: '', carta_responsiva: 'No', facturada: 'No',
  fecha: '', factura: '', lugar: '', marca: '', modelo: '', color: '',
  no_serie: '', procesador: '', memoria: '', hdd: '', others: '', lugar_donde_esta: '',
}

function EquipmentModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_EQUIP, ...item })
  const [saving, setSaving] = useState(false)
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }
  async function handleSave() {
    setSaving(true)
    try { await onSave(form); onClose() }
    finally { setSaving(false) }
  }
  const field = 'w-full bg-[#0d2248] text-on-surface text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-on-surface-variant/40'
  const lbl   = 'block text-[10px] text-on-surface-variant/60 font-semibold uppercase tracking-wider mb-1'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0a1f3d] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">{form.id ? 'Editar equipo' : 'Registrar equipo'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><span className="material-symbols-outlined text-[20px]">close</span></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div><label className={lbl}>Asignado a</label><input className={field} value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del usuario" /></div>
          <div><label className={lbl}>Puesto</label><input className={field} value={form.puesto || ''} onChange={e => set('puesto', e.target.value)} placeholder="Cargo" /></div>
          <div>
            <label className={lbl}>Tipo</label>
            <select className={field} value={form.tipo || 'Laptop'} onChange={e => set('tipo', e.target.value)}>
              <option value="Laptop">Laptop</option>
              <option value="CELULAR">Celular</option>
              <option value="Monitor">Monitor</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Disponible</label>
            <select className={field} value={form.disponible || 'Si'} onChange={e => set('disponible', e.target.value)}>
              <option value="Si">Disponible</option>
              <option value="No">Asignado</option>
            </select>
          </div>
          <div><label className={lbl}>Propietario</label><input className={field} value={form.propiedad || ''} onChange={e => set('propiedad', e.target.value)} placeholder="Cliente o empresa" /></div>
          <div><label className={lbl}>Marca</label><input className={field} value={form.marca || ''} onChange={e => set('marca', e.target.value)} placeholder="Dell, HP, Apple…" /></div>
          <div className="col-span-2"><label className={lbl}>Modelo</label><input className={field} value={form.modelo || ''} onChange={e => set('modelo', e.target.value)} placeholder="Latitude 5440, MacBook Pro…" /></div>
          <div><label className={lbl}>Color</label><input className={field} value={form.color || ''} onChange={e => set('color', e.target.value)} placeholder="Color" /></div>
          <div className="col-span-2"><label className={lbl}>No. de serie</label><input className={field} value={form.no_serie || ''} onChange={e => set('no_serie', e.target.value)} placeholder="Serial number" /></div>
          <div><label className={lbl}>Procesador</label><input className={field} value={form.procesador || ''} onChange={e => set('procesador', e.target.value)} placeholder="Intel i5, AMD Ryzen 7…" /></div>
          <div><label className={lbl}>Memoria RAM</label><input className={field} value={form.memoria || ''} onChange={e => set('memoria', e.target.value)} placeholder="8GB, 16GB…" /></div>
          <div><label className={lbl}>Almacenamiento</label><input className={field} value={form.hdd || ''} onChange={e => set('hdd', e.target.value)} placeholder="256GB SSD, 1TB…" /></div>
          <div><label className={lbl}>Ubicación actual</label><input className={field} value={form.lugar_donde_esta || ''} onChange={e => set('lugar_donde_esta', e.target.value)} placeholder="La tiene el consultor…" /></div>
          <div><label className={lbl}>Lugar de compra</label><input className={field} value={form.lugar || ''} onChange={e => set('lugar', e.target.value)} placeholder="Ciudad" /></div>
          <div><label className={lbl}>Factura No.</label><input className={field} value={form.factura || ''} onChange={e => set('factura', e.target.value)} placeholder="I-623" /></div>
          <div>
            <label className={lbl}>Facturada</label>
            <select className={field} value={form.facturada || 'No'} onChange={e => set('facturada', e.target.value)}>
              <option value="Si">Sí</option><option value="No">No</option><option value="No data">Sin dato</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Carta responsiva</label>
            <select className={field} value={form.carta_responsiva || 'No'} onChange={e => set('carta_responsiva', e.target.value)}>
              <option value="Si">Sí</option><option value="No">No</option>
            </select>
          </div>
          <div className="col-span-2"><label className={lbl}>Otros</label><textarea className={field + ' resize-none'} rows={2} value={form.others || ''} onChange={e => set('others', e.target.value)} placeholder="Pantalla, S.O., Device ID…" /></div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="text-xs px-5 py-2 rounded-lg bg-primary text-on-primary font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Spec({ label, value }) {
  if (!value || noData(value)) return null
  return (
    <div className="py-2 border-b border-white/[0.06] last:border-0">
      <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-on-surface break-words">{value}</p>
    </div>
  )
}

function EquipmentDrawer({ item, onEdit, onDelete, onClose }) {
  if (!item) return null
  const isAvailable = item.disponible === 'Si'
  const hasName     = !noData(item.nombre)

  return createPortal(
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute inset-y-0 right-0 w-full max-w-[420px] bg-[#071d47] border-l border-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-on-surface-variant/60">
                  {item.tipo?.toUpperCase() === 'CELULAR' ? 'smartphone' : item.tipo?.toLowerCase() === 'monitor' ? 'monitor' : 'laptop_mac'}
                </span>
              </span>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">{clean(item.modelo) || clean(item.marca) || 'Equipo'}</h2>
                <p className="text-[11px] text-on-surface-variant/60">{[clean(item.marca), item.tipo].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white p-1 shrink-0">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              isAvailable ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-blue-500/15 text-blue-300 border-blue-500/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-blue-400'}`} />
              {isAvailable ? 'Disponible' : 'Asignado'}
            </span>
            {clean(item.propiedad) && (
              <span className="text-[11px] text-on-surface-variant/70 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
                {item.propiedad}
              </span>
            )}
            {item.carta_responsiva === 'Si' && (
              <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Carta responsiva
              </span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Assigned to */}
          {hasName && (
            <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${avatarBg(item.nombre)} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                {initials(item.nombre)}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{item.nombre}</p>
                {clean(item.puesto) && <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{item.puesto}</p>}
              </div>
            </div>
          )}

          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Especificaciones</p>
          <Spec label="Procesador" value={item.procesador} />
          <Spec label="Memoria RAM" value={item.memoria} />
          <Spec label="Almacenamiento" value={item.hdd} />
          <Spec label="Color" value={item.color} />
          <Spec label="No. de serie" value={item.no_serie} />
          <Spec label="Otros" value={item.others} />

          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-5 mb-1">Logística</p>
          <Spec label="Ubicación actual" value={item.lugar_donde_esta} />
          <Spec label="Lugar de compra" value={item.lugar} />
          <Spec label="Fecha de compra" value={item.fecha} />
          <Spec label="Factura" value={item.factura} />
          <Spec label="Facturada" value={item.facturada} />
          <Spec label="Propietario 2" value={item.propiedad_2} />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-white/[0.08] flex gap-2 shrink-0">
          <button
            onClick={() => { onEdit(item); onClose() }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>Editar
          </button>
          <button
            onClick={() => { onDelete(item); onClose() }}
            className="flex items-center justify-center py-2 px-3 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Equipment() {
  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [search,        setSearch]        = useState('')
  const [filterDisp,    setFilterDisp]    = useState('all')
  const [filterOwner,   setFilterOwner]   = useState('all')
  const [drawer,        setDrawer]        = useState(null)
  const [modal,         setModal]         = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchEquipment()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(item) {
    const saved = await saveEquipment(item)
    setItems(prev =>
      prev.some(i => i.id === saved.id)
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved]
    )
  }
  async function handleDelete(item) {
    await deleteEquipment(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeleteConfirm(null)
  }

  const total     = items.length
  const available = items.filter(i => i.disponible === 'Si').length
  const assigned  = items.filter(i => i.disponible === 'No').length
  const laptops   = items.filter(i => i.tipo?.toLowerCase() === 'laptop').length

  const owners = useMemo(() => {
    const set = new Set(items.map(i => i.propiedad).filter(v => !noData(v)))
    return [...set].sort()
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.nombre?.toLowerCase().includes(q) ||
        i.marca?.toLowerCase().includes(q) ||
        i.modelo?.toLowerCase().includes(q) ||
        i.no_serie?.toLowerCase().includes(q) ||
        i.puesto?.toLowerCase().includes(q)
      )
    }
    if (filterDisp !== 'all')  list = list.filter(i => i.disponible === filterDisp)
    if (filterOwner !== 'all') list = list.filter(i => i.propiedad  === filterOwner)
    return list
  }, [items, search, filterDisp, filterOwner])

  const hasFilters = search || filterDisp !== 'all' || filterOwner !== 'all'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Equipos</h1>
        <p className="text-sm text-on-surface-variant/60 mt-1">Inventario de activos tecnológicos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: 'computer',     label: 'Total',        value: total,     color: 'bg-primary/15',        text: 'text-primary'       },
          { icon: 'check_circle', label: 'Disponibles',  value: available, color: 'bg-green-500/15',      text: 'text-green-400'     },
          { icon: 'person_pin',   label: 'Asignados',    value: assigned,  color: 'bg-blue-500/15',       text: 'text-blue-400'      },
          { icon: 'laptop_mac',   label: 'Laptops',      value: laptops,   color: 'bg-violet-500/15',     text: 'text-violet-400'    },
        ].map(({ icon, label, value, color, text }) => (
          <div key={label} className="bg-surface-container border border-outline-variant/15 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl ${color} ${text} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </span>
            <div>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-extrabold text-on-surface leading-none">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface-variant/40">search</span>
          <input
            className="w-64 bg-surface-container border border-outline-variant/20 rounded-lg pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="Nombre, modelo, serial…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Disponible filter */}
        <div className="flex items-center gap-1 p-1 bg-surface-container border border-outline-variant/15 rounded-lg">
          {[['all','Todos'], ['Si','Disponible'], ['No','Asignado']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterDisp(val)}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                filterDisp === val ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Owner filter */}
        <select
          className="bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
        >
          <option value="all">Todos los propietarios</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterDisp('all'); setFilterOwner('all') }}
            className="flex items-center gap-1 text-[11px] text-on-surface-variant/60 hover:text-on-surface bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 transition-colors">
            <span className="material-symbols-outlined text-[14px]">filter_list_off</span>Limpiar
          </button>
        )}

        <button
          onClick={() => setModal({ ...EMPTY_EQUIP })}
          className="ml-auto flex items-center gap-1.5 bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(80,177,82,0.3)]"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>Registrar equipo
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant/40">
          <span className="material-symbols-outlined text-[40px] mb-2 block">search_off</span>
          <p className="text-sm">Sin resultados</p>
          {hasFilters && <button onClick={() => { setSearch(''); setFilterDisp('all'); setFilterOwner('all') }} className="mt-2 text-xs text-primary hover:underline">Limpiar filtros</button>}
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-wider border-b border-outline-variant/15">
                <th className="px-4 py-2.5 w-10" />
                <th className="px-3 py-2.5 text-left font-semibold">Asignado a</th>
                <th className="px-3 py-2.5 text-left font-semibold">Equipo</th>
                <th className="px-3 py-2.5 text-left font-semibold">Propietario</th>
                <th className="px-3 py-2.5 text-left font-semibold">Specs</th>
                <th className="px-3 py-2.5 text-left font-semibold">Estatus</th>
                <th className="px-3 py-2.5 text-left font-semibold">Ubicación</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map(item => {
                const isAvailable = item.disponible === 'Si'
                const hasName     = !noData(item.nombre)
                const modelName   = clean(item.modelo) || clean(item.marca) || '—'
                return (
                  <tr key={item.id} onClick={() => setDrawer(item)}
                    className="hover:bg-surface-container-high/40 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      {hasName
                        ? <div className={`w-7 h-7 rounded-lg ${avatarBg(item.nombre)} flex items-center justify-center text-white text-[10px] font-bold`}>{initials(item.nombre)}</div>
                        : <span className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant/30">laptop_mac</span>
                          </span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-on-surface">{hasName ? item.nombre : '—'}</p>
                      {clean(item.puesto) && <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{item.puesto}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-on-surface">{modelName}</p>
                      {clean(item.marca) && item.modelo !== item.marca && (
                        <p className="text-[10px] text-on-surface-variant/60">{item.marca}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{clean(item.propiedad) || '—'}</td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        {clean(item.procesador) && <p className="text-[10px] text-on-surface-variant/70 truncate max-w-[150px]">{item.procesador.substring(0, 35)}{item.procesador.length > 35 ? '…' : ''}</p>}
                        {clean(item.memoria) && <p className="text-[10px] text-on-surface-variant/50">{item.memoria} RAM</p>}
                        {clean(item.hdd) && !clean(item.procesador) && !clean(item.memoria) && <p className="text-[10px] text-on-surface-variant/50">{item.hdd}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isAvailable ? 'bg-green-500/15 text-green-300 border-green-500/25' : 'bg-blue-500/15 text-blue-300 border-blue-500/25'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-blue-400'}`} />
                        {isAvailable ? 'Disponible' : 'Asignado'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant/60 text-[11px] max-w-[120px] truncate">
                      {clean(item.lugar_donde_esta) || '—'}
                    </td>
                    <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal(item)} title="Editar"
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteConfirm(item)} title="Eliminar"
                          className="p-1 rounded text-on-surface-variant hover:text-red-400 hover:bg-surface-container transition-colors">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <p className="text-[11px] text-on-surface-variant/40 text-right mt-3">
          Mostrando {filtered.length} de {total} equipos
        </p>
      )}

      {modal     && <EquipmentModal item={modal} onSave={handleSave} onClose={() => setModal(null)} />}
      {drawer    && <EquipmentDrawer item={drawer} onEdit={setModal} onDelete={setDeleteConfirm} onClose={() => setDrawer(null)} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a1f3d] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm font-bold text-white mb-1">¿Eliminar equipo?</p>
            <p className="text-xs text-on-surface-variant/60 mb-4">{clean(deleteConfirm.modelo) || clean(deleteConfirm.marca) || 'Este equipo'}{deleteConfirm.nombre ? ` · ${deleteConfirm.nombre}` : ''}</p>
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
