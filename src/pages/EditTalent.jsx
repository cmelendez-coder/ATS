import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { getCandidate, updateCandidate } from '../api/talent'

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || '?'
}

function englishLabel(score) {
  if (!score && score !== 0) return '—'
  if (score >= 90) return 'C2'
  if (score >= 80) return 'C1'
  if (score >= 70) return 'B2'
  if (score >= 55) return 'B1'
  return 'A2'
}

function Field({ id, label, children }) {
  return (
    <div className="relative input-underline border-b border-outline pb-1">
      {children}
      <label className="floating-label absolute left-0 top-4 text-on-surface-variant pointer-events-none text-sm" htmlFor={id}>{label}</label>
    </div>
  )
}

export default function EditTalent() {
  const { code }   = useParams()
  const navigate   = useNavigate()
  const backSearch = useLocation().state?.backSearch ?? null
  const formRef    = useRef(null)
  const draftKey   = code ? `edit-talent-draft:${code}` : null

  const [talent, setTalent]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(null)

  const [stack, setStack]           = useState([])
  const [stackModified, setStackModified] = useState(false)
  const [newTech, setNewTech]       = useState('')
  const [addingTech, setAddingTech] = useState(false)

  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  useEffect(() => {
    if (!code) return
    async function load() {
      try {
        const data = await getCandidate(code)
        setTalent(data)
        setStack(
          (data.candidate_stack ?? [])
            .map(s => s.technology?.ct_name_tech)
            .filter(Boolean)
        )
      } catch {
        setLoadError('No se encontró el candidato o hubo un error de conexión.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [code])

  function removeTech(t) {
    setStack(prev => prev.filter(x => x !== t))
    setStackModified(true)
  }

  function commitTech() {
    const t = newTech.trim()
    if (t && !stack.includes(t)) {
      setStack(prev => [...prev, t])
      setStackModified(true)
    }
    setNewTech('')
    setAddingTech(false)
  }

  useEffect(() => {
    if (!talent || !draftKey || !formRef.current) return
    const rawDraft = sessionStorage.getItem(draftKey)
    if (!rawDraft) return
    try {
      const draft = JSON.parse(rawDraft)
      const form = formRef.current
      Object.entries(draft.fields ?? {}).forEach(([name, value]) => {
        const field = form.elements.namedItem(name)
        if (!field || typeof value !== 'string') return
        if ('value' in field) field.value = value
      })
      if (Array.isArray(draft.stack)) setStack(draft.stack)
      if (typeof draft.stackModified === 'boolean') setStackModified(draft.stackModified)
    } catch {
      sessionStorage.removeItem(draftKey)
    }
  }, [talent, draftKey])

  useEffect(() => {
    if (!talent || !draftKey || !formRef.current) return
    function saveDraft() {
      const form = formRef.current
      if (!form) return
      const fields = {}
      for (const [name, value] of new FormData(form).entries()) {
        fields[name] = String(value)
      }
      sessionStorage.setItem(draftKey, JSON.stringify({ fields, stack, stackModified }))
    }
    const form = formRef.current
    form.addEventListener('input', saveDraft)
    form.addEventListener('change', saveDraft)
    saveDraft()
    return () => {
      form.removeEventListener('input', saveDraft)
      form.removeEventListener('change', saveDraft)
    }
  }, [talent, draftKey, stack, stackModified])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await updateCandidate(code, {
        fullName:     fd.get('fullName'),
        email:        fd.get('email'),
        phone:        fd.get('phone'),
        location:     fd.get('location'),
        cvUrl:        fd.get('cvUrl'),
        linkedin:     fd.get('linkedin'),
        role:         fd.get('role'),
        yearsExp:     fd.get('yearsExp'),
        englishScore: fd.get('englishScore'),
        skillset:     fd.get('skillset'),
        recruiter_notes: fd.get('recruiterNotes'),
        ...(stackModified && { technologies: stack, replaceStack: true }),
      })
      if (draftKey) sessionStorage.removeItem(draftKey)
      navigate('/talent')
    } catch {
      setSaveError('Error al actualizar el candidato. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const noteByType = (type) =>
    talent?.candidate_note?.find(n => n.note_type === type)?.note_text ?? ''

  const lastUpdate = talent?.updated_at
    ? new Date(talent.updated_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20 gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
        <span className="text-sm">Cargando candidato…</span>
      </div>
    )
  }

  if (loadError || !talent) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400 max-w-xl">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="text-sm font-medium">{loadError ?? 'Candidato no encontrado.'}</p>
        </div>
        <Link to="/talent" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>Volver al directorio
        </Link>
      </div>
    )
  }

  const completeness = (() => {
    const fields = [talent.full_name, talent.email, talent.phone, talent.cv_url,
      talent.role?.name, talent.location?.name, talent.english_score, talent.years_experience,
      stack.length > 0, noteByType('skillset')]
    return Math.round(fields.filter(Boolean).length / fields.length * 100)
  })()

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder="Search talent..." type="text" readOnly />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          <Link to="/talent/new">
            <button className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
              Add New Talent
            </button>
          </Link>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-outline-variant/30 cursor-pointer ml-1">R</div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Breadcrumb + Title */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link
                  to="/talent"
                  state={backSearch ? { restoreSearch: backSearch } : undefined}
                  className="hover:text-primary transition-colors"
                >Talent Directory</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Editar Perfil</span>
              </div>
              <h1 className="text-[2rem] leading-none tracking-[-0.02em] font-extrabold text-primary">{talent.full_name}</h1>
              <p className="text-on-surface-variant text-sm">{talent.role?.name ?? 'Sin rol asignado'} · {talent.candidate_code}</p>
            </div>
            {backSearch && (
              <Link
                to="/talent"
                state={{ restoreSearch: backSearch }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant hover:text-primary hover:border-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Volver{backSearch.q ? ` a "${backSearch.q}"` : ' al directorio'}
              </Link>
            )}
          </div>

          {saveError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm font-medium">{saveError}</p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── Left sidebar ─────────────────────────────── */}
              <div className="lg:col-span-1 flex flex-col gap-6">

                {/* Profile card */}
                <section className="bg-surface-container-lowest rounded-2xl p-8 relative overflow-hidden shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary to-primary-container opacity-10 pointer-events-none" />
                  <div className="flex flex-col items-center text-center relative z-10 pt-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-sm bg-surface-container flex items-center justify-center mb-4">
                      <span className="text-3xl font-bold text-primary">{getInitials(talent.full_name)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary">{talent.full_name}</h3>
                    <p className="text-on-surface-variant font-medium mb-3">{talent.role?.name ?? '—'}</p>
                    <div className="flex gap-2 flex-wrap justify-center mb-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${talent.status?.name === 'Available' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                        {talent.status?.name ?? 'Unknown'}
                      </span>
                      {talent.seniority?.name && (
                        <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                          {talent.seniority.name}
                        </span>
                      )}
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Completeness</span>
                        <span className="text-xs font-bold text-secondary">{completeness}%</span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full transition-all" style={{ width: `${completeness}%` }} />
                      </div>
                    </div>
                  </div>
                </section>

              </div>

              {/* ── Right form columns ────────────────────────── */}
              <div className="lg:col-span-2 flex flex-col gap-6">

                {/* Personal Info */}
                <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
                  <h3 className="text-xl font-bold text-primary mb-6 pb-4 border-b border-outline-variant/15 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    <Field id="fullName" label="Nombre completo">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="fullName" name="fullName" defaultValue={talent.full_name} placeholder="Nombre" type="text" required />
                    </Field>
                    <Field id="email" label="Email">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="email" name="email" defaultValue={talent.email ?? ''} placeholder="email" type="email" />
                    </Field>
                    <Field id="phone" label="Teléfono">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="phone" name="phone" defaultValue={talent.phone ?? ''} placeholder="phone" type="tel" />
                    </Field>
                    <Field id="location" label="Ubicación">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="location" name="location" defaultValue={talent.location?.name ?? ''} placeholder="location" type="text" />
                    </Field>
                    <Field id="linkedin" label="LinkedIn URL">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="linkedin" name="linkedin" defaultValue={talent.linkedin_url ?? ''} placeholder="linkedin" type="url" />
                    </Field>
                    <Field id="cvUrl" label="CV URL">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="cvUrl" name="cvUrl" defaultValue={talent.cv_url ?? ''} placeholder="cv" type="url" />
                    </Field>
                  </div>
                </section>

                {/* Role & Experience */}
                <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
                  <h3 className="text-xl font-bold text-primary mb-6 pb-4 border-b border-outline-variant/15 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">work</span>
                    Rol y Experiencia
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
                    <Field id="role" label="Rol principal">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="role" name="role" defaultValue={talent.role?.name ?? ''} placeholder="role" type="text" />
                    </Field>
                    <Field id="yearsExp" label="Años de experiencia">
                      <input className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm" id="yearsExp" name="yearsExp" defaultValue={talent.years_experience ?? ''} placeholder="years" type="number" min="0" />
                    </Field>
                    <div className="relative border-b border-outline pb-1">
                      <input
                        className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-5 pb-1 text-primary font-medium placeholder-transparent text-sm"
                        id="englishScore" name="englishScore"
                        defaultValue={talent.english_score ?? ''}
                        placeholder="score" type="number" min="0" max="100"
                      />
                      <label className="floating-label absolute left-0 top-4 text-on-surface-variant pointer-events-none text-sm" htmlFor="englishScore">
                        English Score (0–100) {talent.english_score != null && `— ${englishLabel(talent.english_score)}`}
                      </label>
                    </div>
                  </div>
                </section>

                {/* Technology Stack */}
                <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">layers</span>
                      Technology Stack
                    </h3>
                    <button type="button" onClick={() => setAddingTech(true)} className="text-secondary font-semibold text-sm hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">add</span>Add Tech
                    </button>
                  </div>

                  {stackModified && (
                    <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-4">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      Al guardar, el stack actual será reemplazado por esta lista.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {stack.map(t => (
                      <div key={t} className="bg-surface-container px-4 py-2 rounded-full flex items-center gap-2 group hover:bg-surface-container-high transition-colors">
                        <span className="font-medium text-primary text-sm">{t}</span>
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-error cursor-pointer" onClick={() => removeTech(t)}>close</span>
                      </div>
                    ))}
                    {stack.length === 0 && !addingTech && (
                      <p className="text-sm text-on-surface-variant/60 italic">Sin tecnologías registradas.</p>
                    )}
                    {addingTech && (
                      <span className="flex items-center gap-1">
                        <input
                          autoFocus
                          className="px-3 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface bg-surface-container focus:outline-none focus:ring-1 focus:ring-primary/20 w-36"
                          value={newTech}
                          onChange={e => setNewTech(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitTech() }
                            if (e.key === 'Escape') setAddingTech(false)
                          }}
                          placeholder="Ej. React"
                        />
                        <button type="button" onClick={commitTech} className="px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-semibold">Add</button>
                        <button type="button" onClick={() => setAddingTech(false)} className="px-2 py-1.5 text-on-surface-variant text-xs hover:text-primary">✕</button>
                      </span>
                    )}
                  </div>
                </section>

                {/* Professional Summary */}
                <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10">
                  <h3 className="text-xl font-bold text-primary mb-6 pb-4 border-b border-outline-variant/15 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                    Resumen Profesional
                  </h3>
                  <div className="space-y-6">
                    <div className="relative input-underline border-b border-outline">
                      <textarea
                        className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-6 pb-2 text-primary font-medium placeholder-transparent resize-none text-sm"
                        id="skillset" name="skillset" rows="3"
                        defaultValue={noteByType('skillset')}
                        placeholder="skills"
                      />
                      <label className="floating-label absolute left-0 top-4 text-on-surface-variant pointer-events-none text-sm" htmlFor="skillset">Skills / Resumen técnico</label>
                    </div>
                    <div className="relative input-underline border-b border-outline">
                      <textarea
                        className="input-field w-full bg-transparent border-none focus:ring-0 px-0 pt-6 pb-2 text-primary font-medium placeholder-transparent resize-none text-sm"
                        id="recruiterNotes" name="recruiterNotes" rows="3"
                        defaultValue={noteByType('recruiter_notes')}
                        placeholder="notes"
                      />
                      <label className="floating-label absolute left-0 top-4 text-on-surface-variant pointer-events-none text-sm" htmlFor="recruiterNotes">Notas internas del recruiter</label>
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-2 pb-4 gap-4">
                  {lastUpdate && (
                    <p className="text-slate-500 text-sm italic">Última actualización: {lastUpdate}</p>
                  )}
                  <div className="flex gap-4 ml-auto">
                    <button
                      type="button"
                      onClick={() => navigate('/talent')}
                      className="px-8 py-3 rounded-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-10 py-3 rounded-lg font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-lg transition-all flex items-center gap-2 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          Guardando…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">save</span>
                          Actualizar Perfil
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
