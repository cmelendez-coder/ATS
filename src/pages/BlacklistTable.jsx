import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import PortalButtons from '../components/PortalButtons'
import { fetchBlacklist, saveBlacklistReason } from '../api/blacklist'

function ReasonCell({ row, onSaved }) {
  const [value, setValue] = useState(row.reason ?? '')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => { setValue(row.reason ?? '') }, [row.reason])

  const dirty = value !== (row.reason ?? '')

  async function save() {
    if (!dirty) return
    setSaving(true)
    try {
      await saveBlacklistReason(row.candidate_id, value.trim())
      onSaved(row.candidate_id, value.trim())
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        rows={2}
        placeholder="Sin detalles — escribe el motivo…"
        className="w-full bg-white text-slate-700 text-xs px-2.5 py-2 rounded-lg border border-slate-200 resize-y outline-none focus:ring-2 focus:ring-[#a12d2d]/30 focus:border-[#a12d2d]/40 placeholder:text-slate-300"
      />
      <div className="absolute right-2 -bottom-4 text-[10px] font-semibold">
        {saving && <span className="text-slate-400">Guardando…</span>}
        {!saving && savedOk && <span className="text-green-600">✓ Guardado</span>}
        {!saving && !savedOk && dirty && <span className="text-[#a12d2d]/70">Sin guardar</span>}
      </div>
    </div>
  )
}

export default function BlacklistTable() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchBlacklist())
      setError(null)
    } catch {
      setError('Error al cargar la lista negra.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleReasonSaved(candidateId, reason) {
    setRows(prev => prev.map(r => r.candidate_id === candidateId ? { ...r, reason } : r))
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
          <h2 className="hidden md:block text-sm font-semibold text-on-surface-variant">Lista Negra</h2>
        </div>
        <div className="flex items-center gap-2">
          <UserAvatar />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <Link to="/talent" className="hover:text-primary transition-colors">Talent Directory</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Lista Negra</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold" style={{ color: '#a12d2d' }}>Lista Negra</h1>
                {!loading && (
                  <span className="px-2.5 py-1 rounded-full text-white text-xs font-bold" style={{ backgroundColor: '#a12d2d' }}>{rows.length}</span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">Candidatos con estatus "Lista Negra". El motivo es editable — se guarda al salir del campo.</p>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <PortalButtons />
              <Link
                to="/talent"
                className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Volver al directorio
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.05)] overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Cargando…</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-6 text-red-500 text-sm">
                <span className="material-symbols-outlined text-[20px]">error</span>{error}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] opacity-30 mb-2">block</span>
                <p className="text-sm">No hay candidatos en la lista negra.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-black" style={{ color: '#ef4444' }}>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Candidato</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Rol</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-[45%]">Detalles del porqué</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.candidate_id} className={`${i % 2 === 1 ? 'bg-[#b9bdc4]' : 'bg-[#e4e6e9]'} border-b border-black/5 align-top`}>
                        <td className="px-4 py-3">
                          <Link
                            to={`/talent/edit/${r.candidate_code}`}
                            className="text-sm font-semibold text-black hover:underline"
                          >
                            {r.full_name}
                          </Link>
                          {r.blacklisted_at && (
                            <p className="text-[10px] text-black/50 mt-0.5">
                              Agregado: {new Date(r.blacklisted_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-black whitespace-nowrap">
                          {r.role?.name ?? '—'}{r.seniority?.name ? ` · ${r.seniority.name}` : ''}
                        </td>
                        <td className="px-4 py-3 pb-6">
                          <ReasonCell row={r} onSaved={handleReasonSaved} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
