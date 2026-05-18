import { useState } from 'react'

const inputCls = 'bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/30 w-full'

export default function ClientCreateForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: '',
    sector: '',
    country: '',
    office_location: '',
    business_hours: '',
    benefits: '',
    timezone: '',
    headquarters_location: '',
    notes: '',
  })

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-[0_2px_16px_rgba(24,28,30,0.08)] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">Nuevo cliente</p>
          <h2 className="text-xl font-bold text-primary mt-1">Agregar cliente</h2>
          <p className="text-sm text-on-surface-variant mt-1">Crea una nueva cuenta de cliente y completa sus datos operativos principales.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
          title="Cerrar formulario"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={inputCls} placeholder="Nombre del cliente *" value={form.name} onChange={e => set('name', e.target.value)} />
        <input className={inputCls} placeholder="Sector" value={form.sector} onChange={e => set('sector', e.target.value)} />
        <input className={inputCls} placeholder="País" value={form.country} onChange={e => set('country', e.target.value)} />
        <input className={inputCls} placeholder="Oficina" value={form.office_location} onChange={e => set('office_location', e.target.value)} />
        <input className={inputCls} placeholder="Horario (ej. 9am-6pm)" value={form.business_hours} onChange={e => set('business_hours', e.target.value)} />
        <input className={inputCls} placeholder="Zona horaria" value={form.timezone} onChange={e => set('timezone', e.target.value)} />
        <input className={`${inputCls} md:col-span-2`} placeholder="Beneficios" value={form.benefits} onChange={e => set('benefits', e.target.value)} />
        <input className={`${inputCls} md:col-span-2`} placeholder="Sede central" value={form.headquarters_location} onChange={e => set('headquarters_location', e.target.value)} />
        <textarea className={`${inputCls} md:col-span-2 resize-none`} rows={3} placeholder="Notas adicionales" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/20"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || saving}
          className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
          Guardar cliente
        </button>
      </div>
    </section>
  )
}
