import { useState, useCallback, useMemo } from 'react'
import { listClients } from '../../api/clients'
import { listRequirements } from '../../api/requirements'
import { useRefreshOnFocus, useRouteSheet, useCachedResource } from './hooks'
import { Skeleton, Sheet, UpdatedAt, initials } from './ui'
import { priorityStyle } from './priority'

const CLIENT_LOGOS = {
  'PacVue':          '/logos/pacvue.png',
  'LogicMonitor':    '/logos/logicmonitor.webp',
  'BlueConic':       '/logos/blueconic.png',
  'Mygo':            '/logos/mygo.png',
  'Numen':           '/logos/numen.png',
  'Yash':            '/logos/yash.png',
  'HTC':             '/logos/htc.png',
  'Bahwan Cybertek': '/logos/bahwan.avif',
  'Numeric':         '/logos/numeric.png',
  'Excelencia Consulting': '/logos/excelencia.png',
  'Avari':           '/logos/avari.png',
}

const DETAIL_KEYS = [
  ['sector',                'Sector'],
  ['country',               'País'],
  ['office_location',       'Oficina'],
  ['headquarters_location', 'Sede central'],
  ['business_hours',        'Horario'],
  ['timezone',              'Zona horaria'],
]

function LogoBox({ name, size = 'sm' }) {
  const [err, setErr] = useState(false)
  const src = CLIENT_LOGOS[name]
  const box = size === 'lg' ? 'w-20 h-14' : 'w-14 h-10'
  return (
    <div className={`${box} shrink-0 rounded-xl bg-white border border-[#10284d]/10 flex items-center justify-center overflow-hidden`}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} className="max-w-full max-h-full object-contain p-1.5" />
        : <span className="text-sm font-bold text-[#1f6d44]">{initials(name)}</span>}
    </div>
  )
}

function ClientCard({ client, openCount, onOpen }) {
  const sub = [client.sector, client.country].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-white border border-[#10284d]/10 p-4 active:bg-[#eef3f7] shadow-[0_1px_2px_rgba(16,40,77,0.04)]"
    >
      <div className="flex items-center gap-3">
        <LogoBox name={client.name} />
        <div className="flex-1 min-w-0">
          <h3 className="text-[0.9375rem] font-bold leading-snug text-[#10284d]">{client.name}</h3>
          <p className="text-xs text-[#4e5c70] mt-0.5 truncate">{sub || 'Sin información adicional'}</p>
        </div>
        <span className="material-symbols-outlined text-[1.125rem] text-[#4e5c70]/60 shrink-0">chevron_right</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="px-2 py-0.5 rounded-full bg-[#dfeadd] text-[#1f6d44] text-[0.6875rem] font-semibold">
          {openCount} req. abierto{openCount === 1 ? '' : 's'}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#10284d]/[0.07] text-[#10284d] text-[0.6875rem] font-semibold">
          {client.contacts?.length ?? 0} contacto{(client.contacts?.length ?? 0) === 1 ? '' : 's'}
        </span>
      </div>
    </button>
  )
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div className="sticky top-0 z-[1] px-5 py-2 bg-[#0b2a58] text-[0.6875rem] font-bold uppercase tracking-widest text-[#81b927]">{children}</div>
}

function ClientDetail({ client, openReqs }) {
  const stages = [...(client.stages ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const contacts = client.contacts ?? []
  return (
    <div className="pb-4">
      <div className="px-5 py-4 border-b border-white/[0.06] space-y-4">
        <div className="bg-white rounded-xl w-fit"><LogoBox name={client.name} size="lg" /></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {DETAIL_KEYS.map(([k, label]) => <Field key={k} label={label} value={client[k]} />)}
        </div>
        {client.benefits && (
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40 mb-1">Beneficios</p>
            <p className="text-sm text-white/90 whitespace-pre-line break-words">{client.benefits}</p>
          </div>
        )}
        {client.notes && (
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40 mb-1">Notas</p>
            <p className="text-sm text-white/90 whitespace-pre-line break-words">{client.notes}</p>
          </div>
        )}
      </div>

      <SectionTitle>Contactos · {contacts.length}</SectionTitle>
      {contacts.length === 0 && <p className="px-5 py-5 text-sm text-white/40">Sin contactos registrados.</p>}
      {contacts.map(ct => (
        <div key={ct.id} className="px-5 py-3 border-b border-white/[0.06] space-y-2">
          <div>
            <p className="text-sm font-semibold text-white">{ct.name}</p>
            {ct.job_title && <p className="text-xs text-white/60">{ct.job_title}</p>}
            {(ct.location || ct.timezone) && <p className="text-[0.6875rem] text-white/40 mt-0.5">{[ct.location, ct.timezone].filter(Boolean).join(' · ')}</p>}
          </div>
          {(ct.mobile || ct.email) && (
            <div className="flex gap-2">
              {ct.mobile && (
                <a href={`tel:${String(ct.mobile).replace(/\s+/g, '')}`} className="flex-1 min-w-0 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold active:bg-white/20">
                  <span className="material-symbols-outlined text-[1.125rem]">call</span>Llamar
                </a>
              )}
              {ct.email && (
                <a href={`mailto:${ct.email}`} className="flex-1 min-w-0 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold active:bg-white/20">
                  <span className="material-symbols-outlined text-[1.125rem]">mail</span>Correo
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      <SectionTitle>Requerimientos abiertos · {openReqs.length}</SectionTitle>
      {openReqs.length === 0 && <p className="px-5 py-5 text-sm text-white/40">No hay requerimientos abiertos.</p>}
      {openReqs.map(r => {
        const st = priorityStyle(r.priority)
        return (
          <div key={r.id} className="px-5 py-3 border-b border-white/[0.06] flex items-start justify-between gap-3">
            <p className="text-sm text-white">{r.job_title}</p>
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold" style={{ backgroundColor: st.bg, color: st.fg }}>P{r.priority ?? '—'}</span>
          </div>
        )
      })}

      {stages.length > 0 && (
        <>
          <SectionTitle>Etapas del pipeline</SectionTitle>
          <ol className="px-5 py-3 space-y-1.5">
            {stages.map((s, i) => (
              <li key={s.stage_id} className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-5 text-right text-xs font-bold text-white/40">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color ?? '#81b927' }} />
                {s.name}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

export default function MobileClients() {
  const [query, setQuery] = useState('')
  const { sheet, openSheet, closeSheet } = useRouteSheet()

  // Datos guardados: se ven al instante y se actualizan en segundo plano ('reqs' se comparte con la pantalla de Requerimientos)
  const { data: clients, error, refreshing: refC, updatedAt, reload: reloadClients } = useCachedResource('clients', listClients)
  const { data: reqsData, refreshing: refR, reload: reloadReqs } = useCachedResource('reqs', () => listRequirements({ excludePending: true }))
  const reqs = reqsData ?? []
  const refreshing = refC || refR
  const load = useCallback(() => { reloadClients(); reloadReqs() }, [reloadClients, reloadReqs])
  useRefreshOnFocus(load)

  const openByClient = useMemo(() => {
    const map = {}
    for (const r of reqs) {
      if (r.status?.name !== 'Open' || !r.client?.id) continue
      ;(map[r.client.id] ??= []).push(r)
    }
    for (const list of Object.values(map)) list.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    return map
  }, [reqs])

  const first = !clients && !error
  const q = query.trim().toLowerCase()
  const visible = (clients ?? [])
    .filter(c => !q || c.name.toLowerCase().includes(q) || (c.sector ?? '').toLowerCase().includes(q))
    // con requerimientos abiertos primero, luego alfabético
    .sort((a, b) => ((openByClient[b.id]?.length ?? 0) - (openByClient[a.id]?.length ?? 0)) || a.name.localeCompare(b.name))

  const detail = sheet?.kind === 'client' ? (clients ?? []).find(c => c.id === sheet.id) : null

  return (
    <div className="px-4 pb-6">
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-4 pb-2 bg-[#f2f5f9]/95 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[1.25rem] text-[#4e5c70] pointer-events-none">search</span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-[#10284d]/10 text-base placeholder:text-[#4e5c70]/70 focus:outline-none focus:border-[#1f6d44]"
            />
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            aria-label="Actualizar"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white border border-[#10284d]/10 text-[#1f6d44] active:bg-[#dfeadd] disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[1.375rem] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        <UpdatedAt t={updatedAt} refreshing={refreshing} className="px-1" />

        {error && (
          <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {clients
              ? 'No se pudo actualizar. Estás viendo la última información guardada; toca el botón de actualizar para reintentar.'
              : 'No se pudieron cargar los clientes. Revisa tu conexión y toca el botón de actualizar.'}
          </div>
        )}

        {first && [0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-[#10284d]/10 p-4 space-y-3">
            <div className="flex items-center gap-3"><Skeleton className="w-14 h-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div></div>
            <div className="flex gap-1.5"><Skeleton className="h-5 w-24 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
          </div>
        ))}

        {clients && visible.length === 0 && <p className="py-12 text-center text-sm text-[#4e5c70]">Ningún cliente coincide con la búsqueda.</p>}

        {visible.map(c => (
          <ClientCard key={c.id} client={c} openCount={openByClient[c.id]?.length ?? 0} onOpen={() => openSheet({ kind: 'client', id: c.id })} />
        ))}
      </div>

      {detail && (
        <Sheet title={detail.name} subtitle={[detail.sector, detail.country].filter(Boolean).join(' · ') || undefined} onClose={closeSheet}>
          <ClientDetail client={detail} openReqs={openByClient[detail.id] ?? []} />
        </Sheet>
      )}
    </div>
  )
}
