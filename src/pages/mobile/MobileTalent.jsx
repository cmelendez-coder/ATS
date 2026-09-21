import { useState, useEffect } from 'react'
import { searchCandidates } from '../../api/talent'
import { useRouteSheet } from './hooks'
import { Skeleton, Sheet, initials, dateOnly } from './ui'
import { CandidateHistoryView } from './PipelineViews'

const MAX_SHOWN = 50

function toAbsoluteUrl(url) {
  if (!url) return null
  const t = url.trim()
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

const isBlacklisted = c => /lista negra/i.test(c.status?.name ?? '')

function techsOf(c) {
  return (c.candidate_stack ?? []).map(s => s.technology?.ct_name_tech).filter(Boolean)
}

function noteOf(c, type) {
  return (c.candidate_note ?? []).find(n => n.note_type === type)?.note_text ?? ''
}

function lastContactOf(c) {
  const dates = (c.candidate_availability ?? []).map(a => a.last_contact_date).filter(Boolean).sort()
  return dates[dates.length - 1] ?? null
}

function CandidateCard({ c, onOpen }) {
  const techs = techsOf(c).slice(0, 4)
  const sub = [c.role?.name, c.seniority?.name].filter(Boolean).join(' · ')
  const bad = isBlacklisted(c)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-2.5 active:bg-[#eef3f7] shadow-[0_1px_2px_rgba(16,40,77,0.04)]"
    >
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${bad ? 'bg-red-100 text-red-800' : 'bg-[#dfeadd] text-[#1f6d44]'}`}>
          {initials(c.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[0.9375rem] font-bold leading-snug text-[#10284d]">{c.full_name}</h3>
            <span className="material-symbols-outlined text-[1.125rem] text-[#4e5c70]/60 shrink-0">chevron_right</span>
          </div>
          <p className="text-xs text-[#4e5c70] mt-0.5">{sub || 'Sin puesto registrado'}{c.location?.name ? ` · ${c.location.name}` : ''}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {bad && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[0.6875rem] font-bold">Lista negra</span>}
        {c.english_score != null && <span className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">English {c.english_score}%</span>}
        {c.years_experience != null && <span className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">{c.years_experience} años</span>}
        {c._cost_text && <span className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">{c._cost_text}</span>}
      </div>
      {techs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {techs.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-[#10284d]/[0.07] text-[0.625rem] font-medium text-[#10284d]">{t}</span>)}
        </div>
      )}
    </button>
  )
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  )
}

function TextBlock({ label, value }) {
  if (!value) return null
  return (
    <div className="px-5 py-3 border-b border-white/[0.06]">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-sm text-white/90 whitespace-pre-line break-words">{value}</p>
    </div>
  )
}

function ActionBtn({ href, icon, label, external }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex-1 min-w-0 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold active:bg-white/20"
    >
      <span className="material-symbols-outlined text-[1.125rem]">{icon}</span>
      {label}
    </a>
  )
}

function CandidateDetail({ c }) {
  const cv = toAbsoluteUrl(c.cv_url)
  const linkedin = toAbsoluteUrl(c.linkedin_url)
  const techs = techsOf(c)
  const lastContact = lastContactOf(c)
  const bad = isBlacklisted(c)
  return (
    <div className="pb-4">
      <div className="px-5 py-4 border-b border-white/[0.06] space-y-3">
        {bad && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200">
            <span className="material-symbols-outlined text-[1.125rem]">block</span>
            Este candidato está en la lista negra.
          </div>
        )}
        {(cv || linkedin || c.phone || c.email) && (
          <div className="flex gap-2">
            {cv && <ActionBtn href={cv} icon="description" label="CV" external />}
            {linkedin && <ActionBtn href={linkedin} icon="link" label="LinkedIn" external />}
            {c.phone && <ActionBtn href={`tel:${String(c.phone).replace(/\s+/g, '')}`} icon="call" label="Llamar" />}
            {c.email && <ActionBtn href={`mailto:${c.email}`} icon="mail" label="Correo" />}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Puesto" value={c.role?.name} />
          <Field label="Seniority" value={c.seniority?.name} />
          <Field label="Ubicación" value={c.location?.name} />
          <Field label="Años de experiencia" value={c.years_experience} />
          <Field label="Inglés" value={c.english_score != null ? `${c.english_score}%` : null} />
          <Field label="Expectativa salarial" value={c._cost_text} />
          <Field label="Estatus" value={c.status?.name} />
          <Field label="Fuente" value={c.source} />
          <Field label="Último contacto" value={dateOnly(lastContact)} />
          <Field label="Código" value={c.candidate_code} />
          <Field label="Correo" value={c.email} />
          <Field label="Teléfono" value={c.phone} />
        </div>
      </div>

      {techs.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40 mb-2">Tecnologías</p>
          <div className="flex flex-wrap gap-1.5">
            {techs.map(t => <span key={t} className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-white/85">{t}</span>)}
          </div>
        </div>
      )}
      <TextBlock label="Skills" value={c.bdd_skills} />
      <TextBlock label="Módulos" value={c.bdd_module} />
      <TextBlock label="Tecnologías (BDD)" value={techs.length === 0 ? c.bdd_technology : null} />
      <TextBlock label="Skillset" value={noteOf(c, 'skillset')} />
      <TextBlock label="Notas" value={noteOf(c, 'General')} />

      <div className="sticky top-0 z-[1] px-5 py-2 mt-1 bg-[#0b2a58] text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">Historial</div>
      <CandidateHistoryView candidateId={c.candidate_id} name={c.full_name} />
    </div>
  )
}

const ENGLISH_OPTIONS = [
  { v: '', label: 'Inglés: cualquiera' },
  { v: '60', label: 'Inglés 60% o más' },
  { v: '70', label: 'Inglés 70% o más' },
  { v: '80', label: 'Inglés 80% o más' },
  { v: '90', label: 'Inglés 90% o más' },
]

export default function MobileTalent() {
  const [query, setQuery]     = useState('')
  const [english, setEnglish] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)
  const [searched, setSearched] = useState('') // término del último resultado mostrado
  const { sheet, openSheet, closeSheet } = useRouteSheet()

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setResults([]); setSearched(''); setLoading(false); setError(false); return }
    let cancelled = false
    setLoading(true)
    setError(false)
    const timer = setTimeout(() => {
      searchCandidates({ q: term, englishMin: english })
        .then(rows => { if (!cancelled) { setResults(rows); setSearched(term) } })
        .catch(() => { if (!cancelled) { setResults([]); setError(true) } })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 450)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, english])

  const shown = results.slice(0, MAX_SHOWN)
  const detail = sheet?.kind === 'cand' ? results.find(c => c.candidate_id === sheet.id) : null
  const hasQuery = query.trim().length >= 2

  return (
    <div className="px-4 pb-6">
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-2 space-y-2.5 bg-[#f2f5f9]/95 backdrop-blur">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[1.25rem] text-[#4e5c70] pointer-events-none">search</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nombre, puesto, tecnología, módulo…"
            className="w-full h-12 pl-10 pr-3 rounded-xl bg-white border border-[#10284d]/10 text-base placeholder:text-[#4e5c70]/70 focus:outline-none focus:border-[#1f6d44]"
          />
        </div>
        <select
          value={english}
          onChange={e => setEnglish(e.target.value)}
          className="w-full h-11 px-3 rounded-xl bg-white border border-[#10284d]/10 text-base text-[#10284d] focus:outline-none focus:border-[#1f6d44]"
        >
          {ENGLISH_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-2.5 pt-2">
        {!hasQuery && (
          <div className="py-12 px-4 text-center space-y-2">
            <span className="material-symbols-outlined text-[2.75rem] text-[#10284d]/25">person_search</span>
            <p className="text-sm font-semibold text-[#10284d]">Busca en el Talent Directory</p>
            <p className="text-xs text-[#4e5c70] leading-relaxed">
              Escribe un nombre, un puesto, una tecnología o un módulo. Puedes combinar palabras,<br />por ejemplo: <span className="font-semibold">SAP FICO senior</span>.
            </p>
          </div>
        )}

        {hasQuery && loading && [0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-3">
            <div className="flex gap-3"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-4/5" /></div></div>
            <div className="flex gap-1.5"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div>
          </div>
        ))}

        {error && (
          <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            No se pudo buscar. Revisa tu conexión e inténtalo de nuevo.
          </div>
        )}

        {hasQuery && !loading && !error && searched && results.length === 0 && (
          <p className="py-12 text-center text-sm text-[#4e5c70]">Sin resultados para “{searched}”.</p>
        )}

        {!loading && results.length > 0 && (
          <p className="px-1 text-xs font-semibold text-[#4e5c70]">
            {results.length} resultado{results.length !== 1 ? 's' : ''}
            {results.length > MAX_SHOWN ? ` · mostrando los primeros ${MAX_SHOWN}. Afina tu búsqueda para ver menos.` : ''}
          </p>
        )}

        {!loading && shown.map(c => (
          <CandidateCard key={c.candidate_id} c={c} onOpen={() => openSheet({ kind: 'cand', id: c.candidate_id })} />
        ))}
      </div>

      {detail && (
        <Sheet title={detail.full_name} subtitle={[detail.role?.name, detail.seniority?.name].filter(Boolean).join(' · ') || undefined} onClose={closeSheet}>
          <CandidateDetail c={detail} />
        </Sheet>
      )}
    </div>
  )
}
