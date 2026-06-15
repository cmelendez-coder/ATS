import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { searchCandidates } from '../api/talent'
import { usePermissions } from '../hooks/usePermissions'

// Deterministic color per tech name
const TECH_PALETTE = [
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-green-50 text-green-700 border-green-100',
  'bg-yellow-50 text-yellow-700 border-yellow-100',
  'bg-purple-50 text-purple-700 border-purple-100',
  'bg-orange-50 text-orange-700 border-orange-100',
  'bg-teal-50 text-teal-700 border-teal-100',
  'bg-sky-50 text-sky-700 border-sky-100',
  'bg-rose-50 text-rose-700 border-rose-100',
]
function techColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return TECH_PALETTE[Math.abs(h) % TECH_PALETTE.length]
}

const SENIORITY_CLS = {
  'Junior':    'bg-slate-700 text-slate-200',
  'Mid-Level': 'bg-primary-fixed text-on-primary-fixed',
  'Senior':    'bg-secondary-container text-on-secondary-container',
  'Lead':      'bg-primary text-on-primary',
  'Principal': 'bg-purple-900 text-purple-100',
}

const STATUS_CLS = {
  'Available':  { bg: 'bg-secondary-container/60', text: 'text-secondary',         dot: 'bg-secondary' },
  'In Process': { bg: 'bg-blue-900/40',             text: 'text-blue-300',           dot: 'bg-blue-400' },
  'Placed':     { bg: 'bg-surface-container',       text: 'text-on-surface-variant', dot: 'bg-on-surface-variant/40' },
  'Inactive':   { bg: 'bg-red-900/40',              text: 'text-red-300',            dot: 'bg-red-400' },
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase() || '?'
}

function englishLabel(score) {
  if (!score) return null
  if (score >= 90) return 'C2'
  if (score >= 80) return 'C1'
  if (score >= 70) return 'B2'
  if (score >= 55) return 'B1'
  return 'A2'
}

// PDF palette matching the on-screen badge colors
const PDF_PALETTE = [
  ['#dbeafe', '#1d4ed8'],
  ['#dcfce7', '#15803d'],
  ['#fef9c3', '#a16207'],
  ['#f3e8ff', '#7e22ce'],
  ['#ffedd5', '#c2410c'],
  ['#ccfbf1', '#0f766e'],
  ['#e0f2fe', '#0369a1'],
  ['#ffe4e6', '#be123c'],
]
function pdfTechColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PDF_PALETTE[Math.abs(h) % PDF_PALETTE.length]
}

const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.552a.75.75 0 0 0 .92.92l5.697-1.475A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.373l-.364-.215-3.38.875.893-3.257-.235-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`
const LI_SVG  = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
const CV_SVG  = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2L2 21l10-8z" fill="#00AC47"/><path d="M12 2l10 19-10-8z" fill="#FBBC04"/><path d="M2 21h20l-10-8z" fill="#4285F4"/></svg>`

function exportToPDF(candidates, searchQuery) {
  const win = window.open('', '_blank', 'width=1200,height=800')
  if (!win) { alert('Activa las ventanas emergentes para exportar el PDF.'); return }

  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  const rows = candidates.map((c, i) => {
    const techs = [...new Set((c.candidate_stack ?? []).map(s => s.technology?.ct_name_tech).filter(Boolean))]
    const waLink = c.phone ? `https://wa.me/${c.phone.replace(/\D/g, '')}` : null

    const badges = techs.map(t => {
      const [bg, fg] = pdfTechColor(t)
      return `<span style="display:inline-block;background:${bg};color:${fg};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;margin:1px 2px;white-space:nowrap">${t}</span>`
    }).join('')

    const icons = [
      c.linkedin_url ? `<a href="${c.linkedin_url}" style="color:#0077B5;text-decoration:none" title="LinkedIn">${LI_SVG}</a>` : '',
      c.cv_url       ? `<a href="${c.cv_url}"       style="text-decoration:none"              title="Ver CV">${CV_SVG}</a>`  : '',
      waLink         ? `<a href="${waLink}"          style="color:#25D366;text-decoration:none" title="WhatsApp">${WA_SVG}</a>` : '',
    ].filter(Boolean).join('')

    return `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">
        <div style="font-weight:700;color:#071D47;font-size:13px">${c.full_name}</div>
        <div style="color:#64748b;font-size:11px;margin-top:2px">${c.role?.name ?? ''}</div>
        ${c.email ? `<div style="color:#94a3b8;font-size:10px;margin-top:1px">${c.email}</div>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">${badges || '<span style="color:#94a3b8">—</span>'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:#071D47;vertical-align:middle">${c.english_score != null ? c.english_score + '%' : '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#071D47;vertical-align:middle">${c.years_experience != null ? c.years_experience + 'y' : '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;vertical-align:middle;white-space:nowrap">${c.location?.name ?? '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:middle">
        <div style="display:flex;gap:10px;align-items:center">${icons}</div>
      </td>
    </tr>`
  }).join('')

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Talent Directory${searchQuery ? ' — ' + searchQuery : ''}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1e293b;padding:28px 36px}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #071D47}
    .hdr h1{font-size:22px;font-weight:800;color:#071D47}
    .hdr .meta{font-size:12px;color:#64748b;margin-top:4px}
    .brand{text-align:right;font-size:11px;color:#94a3b8;line-height:1.5}
    table{width:100%;border-collapse:collapse;font-size:13px}
    thead tr{background:#071D47}
    th{padding:10px 12px;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;text-align:left}
    svg{display:inline-block;vertical-align:middle}
    @media print{body{padding:10px 14px}@page{margin:.8cm;size:A4 landscape}}
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1>PRT — Talent Directory</h1>
      <div class="meta">${candidates.length} candidato${candidates.length !== 1 ? 's' : ''}${searchQuery ? ` · Búsqueda: "<strong>${searchQuery}</strong>"` : ' · Todos los perfiles'}</div>
      <div class="meta" style="margin-top:2px">${dateStr}</div>
    </div>
    <div class="brand">Everscale Group<br>PRT Suite</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nombre / E-mail</th>
        <th>Skills / Tecnologías</th>
        <th style="text-align:center">English</th>
        <th style="text-align:center">YoE</th>
        <th>Ubicación</th>
        <th>Contacto</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body>
</html>`)
  win.document.close()
}

export default function TalentDirectory() {
  const { can } = usePermissions()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [query, setQuery]           = useState('')
  const [englishMin, setEnglishMin] = useState('')
  const [englishMax, setEnglishMax] = useState('')
  const [searching, setSearching]   = useState(false)

  const load = useCallback(async (q = '', eMin = '', eMax = '') => {
    try {
      setSearching(true)
      const data = await searchCandidates({ q, englishMin: eMin, englishMax: eMax })
      setCandidates(data)
      setError(null)
    } catch {
      setError('Error al cargar candidatos. Verifica la conexión.')
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSearch(e) {
    e.preventDefault()
    load(query, englishMin, englishMax)
  }

  function clearFilters() {
    setQuery('')
    setEnglishMin('')
    setEnglishMax('')
    load('', '', '')
  }

  const total = candidates.length

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Suite</span>
          <form onSubmit={handleSearch} className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input
              className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant"
              placeholder="Buscar talent…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </form>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-outline-variant/30 cursor-pointer ml-1">R</div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Talent Directory</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Talent Directory</h1>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">{total}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {candidates.length > 0 && !loading && (
                <button
                  type="button"
                  onClick={() => exportToPDF(candidates, query)}
                  className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-high transition-colors"
                  title="Exportar resultados a PDF"
                >
                  <span className="material-symbols-outlined text-[18px] text-red-400">picture_as_pdf</span>
                  Exportar PDF
                </button>
              )}
              {can('talent.create') && (
                <Link to="/talent/new">
                  <button className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">add</span>Add Talent
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <form onSubmit={handleSearch} className="p-4 bg-surface-container-lowest rounded-2xl shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-on-surface-variant text-on-surface"
                placeholder="Buscar por nombre, skill o rol…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 flex-wrap items-center justify-start">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">English</span>
                <input
                  type="number"
                  min="0" max="100"
                  placeholder="Min"
                  className="bg-surface-container-high border-none text-sm text-on-surface rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-primary/20 w-20 placeholder:text-on-surface-variant/50"
                  value={englishMin}
                  onChange={e => setEnglishMin(e.target.value)}
                />
                <span className="text-on-surface-variant/50 text-sm">–</span>
                <input
                  type="number"
                  min="0" max="100"
                  placeholder="Max"
                  className="bg-surface-container-high border-none text-sm text-on-surface rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-primary/20 w-20 placeholder:text-on-surface-variant/50"
                  value={englishMax}
                  onChange={e => setEnglishMax(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[18px] ${searching ? 'animate-spin' : ''}`}>
                  {searching ? 'progress_activity' : 'search'}
                </span>
                {searching ? 'Buscando…' : 'Buscar'}
              </button>
              {(query || englishMin || englishMax) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>Limpiar
                </button>
              )}
            </div>
          </form>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_2px_16px_rgba(24,28,30,0.04)] overflow-hidden border border-outline-variant/10">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Cargando candidatos…</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 mb-3" style={{ fontSize: 48 }}>group_off</span>
                <p className="text-base font-semibold text-on-surface-variant">No se encontraron candidatos</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">Agrega un perfil o ajusta los filtros.</p>
                {can('talent.create') && (
                  <Link to="/talent/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[16px]">add</span>Agregar candidato
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1140px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {['Name / E-mail', 'Technology', 'English', 'YoE', 'Location'].map(h => (
                        <th
                          key={h}
                          className="py-3.5 px-5 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="py-3.5 px-4 sticky right-0 bg-surface-container-low z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.25)]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {candidates.map(c => {
                      const statusName   = c.status?.name    ?? '—'
                      const seniorityName = c.seniority?.name ?? '—'
                      const sc = STATUS_CLS[statusName]     ?? STATUS_CLS['Inactive']
                      const sn = SENIORITY_CLS[seniorityName] ?? 'bg-surface-container text-on-surface-variant'
                      const techs = [...new Set(
                        (c.candidate_stack ?? []).map(s => s.technology?.ct_name_tech).filter(Boolean)
                      )].slice(0, 3)

                      return (
                        <tr key={c.candidate_code} className="hover:bg-surface-container/40 transition-colors group cursor-pointer">

                          {/* Name + Role + Email */}
                          <td className="py-4 px-5">
                            <p className="font-semibold text-primary text-sm group-hover:text-surface-tint transition-colors whitespace-nowrap">{c.full_name}</p>
                            <p className="text-xs text-on-surface-variant">{c.role?.name ?? '—'}</p>
                            {c.email && (
                              <p className="text-[11px] text-on-surface-variant/60 mt-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">mail</span>
                                {c.email}
                              </p>
                            )}
                          </td>

                          {/* Technologies */}
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1">
                              {techs.length > 0
                                ? techs.map(t => (
                                  <span key={t} className={`${techColor(t)} px-2 py-0.5 rounded-full text-xs font-semibold border`}>{t}</span>
                                ))
                                : <span className="text-xs text-on-surface-variant/40">—</span>}
                            </div>
                          </td>

                          {/* English */}
                          <td className="py-4 px-5">
                            {c.english_score != null
                              ? <span className="text-sm font-bold text-on-surface tabular-nums">{c.english_score}%</span>
                              : <span className="text-xs text-on-surface-variant/40">—</span>}
                          </td>

                          {/* Experience */}
                          <td className="py-4 px-5 text-sm font-medium text-primary whitespace-nowrap">
                            {c.years_experience != null ? `${c.years_experience}y` : '—'}
                          </td>

                          {/* Location */}
                          <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">location_on</span>
                              {c.location?.name ?? '—'}
                            </span>
                          </td>

                          {/* Actions — sticky right */}
                          <td className="py-4 px-4 sticky right-0 bg-surface-container-lowest z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.15)] group-hover:bg-surface-container/80">
                            <div className="flex items-center gap-1.5">
                              {c.linkedin_url && (
                                <a
                                  href={c.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ver LinkedIn"
                                  className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                                  style={{ color: '#0077B5' }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                  </svg>
                                </a>
                              )}
                              {c.cv_url && (
                                <a
                                  href={c.cv_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ver CV en Google Drive"
                                  className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                                    <path d="M12 2L2 21l10-8z" fill="#00AC47"/>
                                    <path d="M12 2l10 19-10-8z" fill="#FBBC04"/>
                                    <path d="M2 21h20l-10-8z" fill="#4285F4"/>
                                  </svg>
                                </a>
                              )}
                              {c.phone && (
                                <a
                                  href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Abrir en WhatsApp"
                                  className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors text-green-500 hover:text-green-400"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.552a.75.75 0 0 0 .92.92l5.697-1.475A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.373l-.364-.215-3.38.875.893-3.257-.235-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                  </svg>
                                </a>
                              )}
                              {can('talent.edit') && (
                                <Link
                                  to={`/talent/edit/${c.candidate_code}`}
                                  className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-surface-tint"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </Link>
                              )}
                              <Link
                                to={`/talent/edit/${c.candidate_code}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                              >
                                Ver <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table footer */}
            {!loading && candidates.length > 0 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-outline-variant/10">
                <p className="text-sm text-on-surface-variant">
                  Mostrando <span className="font-semibold text-primary">{candidates.length}</span> candidato{candidates.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
