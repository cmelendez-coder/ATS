import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { searchCandidates, fetchCandidatesByIds } from '../api/talent'

// Hardcoded admin searches — each entry is a labeled set of candidate_ids
const ADMIN_SEARCHES = [
  {
    label: 'Integration Platform Engineer',
    description: 'DevOps + Azure, CI/CD, OAuth2 — candidatos para posición de integración',
    ids: [14823, 11720, 11722, 11719, 11717],
  },
  {
    label: 'Developer Experience / Platform Engineer',
    description: 'MuleSoft / Anypoint — candidatos para posición de integración y ETL',
    ids: [12096, 14460, 12095, 14589, 12094, 12099, 12093, 12100, 12098, 12097],
  },
  {
    label: 'API Governance & Standards Specialist',
    description: 'Master Data Governance (SAP MDG) — closest match ~50% · lado organizacional/proceso',
    ids: [12499, 12704, 12709, 12498, 12496],
  },
]
import { usePermissions } from '../hooks/usePermissions'
import PortalButtons from '../components/PortalButtons'
import UserAvatar from '../components/UserAvatar'

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

// Minimal XLSX (Open XML) builder — no external dependency, no Excel format warning
function exportToExcel(candidates, searchQuery) {
  const date = new Date().toISOString().slice(0, 10)
  const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

  const COLS = ['Nombre','Email','Teléfono','Rol','English %','Años Exp.','Ciudad','Status','Tecnologías','Skillset (notas)','BDD Tecnología','BDD Skills','Último Contacto','Salario','LinkedIn','CV']
  const COL_WIDTHS = [22,26,17,16,10,10,16,13,24,32,22,22,16,18,30,34]

  // Map col index → letter(s)
  const colLetter = i => i < 26 ? String.fromCharCode(65+i) : String.fromCharCode(64+Math.floor(i/26)) + String.fromCharCode(65+(i%26))

  // Build shared strings table
  const strings = []
  const siMap   = {}
  const si = v => {
    const s = String(v ?? '')
    if (siMap[s] == null) { siMap[s] = strings.length; strings.push(s) }
    return siMap[s]
  }

  // Pre-register all values
  COLS.forEach(h => si(h))
  const rows = candidates.map(c => {
    const techs       = [...new Set((c.candidate_stack ?? []).map(t => t.technology?.ct_name_tech).filter(Boolean))].join(', ')
    const skillset    = (c.candidate_note ?? []).find(n => n.note_type === 'skillset')?.note_text ?? ''
    const bddTech     = c.bdd_technology ?? ''
    const bddSkill    = [c.bdd_skills, c.bdd_module].filter(Boolean).join(' | ')
    const lastContact = (c.candidate_availability ?? [])
      .sort((a, b) => new Date(b.last_contact_date) - new Date(a.last_contact_date))[0]?.last_contact_date ?? ''
    const salary      = c._cost_text ?? ''
    return [
      c.full_name,
      c.email ?? '',
      c.phone ?? '',
      c.role?.name ?? '',
      c.english_score    != null ? c.english_score + '%' : '',
      c.years_experience != null ? String(c.years_experience) : '',
      c.location?.name   ?? '',
      c.status?.name     ?? '',
      techs, skillset, bddTech, bddSkill,
      lastContact, salary,
      c.linkedin_url ?? '',
      c.cv_url       ?? '',
    ].map(v => { si(v); return v })
  })

  // — styles.xml (minimal: 2 fills + 2 fonts + border + 4 cell xfs) —
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF071d47"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF071d47"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFf4f8ee"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFc8d8b0"/></left>
      <right style="thin"><color rgb="FFc8d8b0"/></right>
      <top style="thin"><color rgb="FFc8d8b0"/></top>
      <bottom style="thin"><color rgb="FFc8d8b0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`

  // — sheet1.xml —
  const colsXml = COL_WIDTHS.map((w,i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')

  const headerRow = `<row r="1" ht="20" customHeight="1">${COLS.map((h,ci) =>
    `<c r="${colLetter(ci)}1" t="s" s="1"><v>${si(h)}</v></c>`
  ).join('')}</row>`

  const dataRowsXml = rows.map((row, ri) => {
    const r  = ri + 2
    const s  = ri % 2 === 1 ? 3 : 0  // odd=striped fill, even=plain; first col always bold style
    const s0 = ri % 2 === 1 ? 3 : 2  // name cell: bold navy font
    return `<row r="${r}">${row.map((v, ci) =>
      `<c r="${colLetter(ci)}${r}" t="s" s="${ci === 0 ? s0 : s}"><v>${si(v)}</v></c>`
    ).join('')}</row>`
  }).join('')

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${headerRow}${dataRowsXml}</sheetData>
</worksheet>`

  // — sharedStrings.xml —
  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('\n')}
</sst>`

  // — workbook.xml —
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Talent" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

  // — relationships —
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`

  const pkgRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"            ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"              ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml"       ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`

  // Build ZIP using fflate (bundled with Vite projects via rollup)
  // fflate is available because it's a dependency of many Vite plugins
  // We build it manually as a ZIP file with stored (no compression) entries
  function strToU8(s) {
    return new TextEncoder().encode(s)
  }

  function makeZip(files) {
    const parts = []
    const centralDir = []
    let offset = 0

    for (const [name, data] of files) {
      const nameBytes  = strToU8(name)
      const localHeader = new Uint8Array(30 + nameBytes.length)
      const view = new DataView(localHeader.buffer)
      view.setUint32(0,  0x04034b50, true)  // signature
      view.setUint16(4,  20,         true)   // version needed
      view.setUint16(6,  0,          true)   // flags
      view.setUint16(8,  0,          true)   // compression (stored)
      view.setUint16(10, 0,          true)   // mod time
      view.setUint16(12, 0,          true)   // mod date
      view.setUint32(14, crc32(data),true)   // CRC-32
      view.setUint32(18, data.length, true)  // compressed size
      view.setUint32(22, data.length, true)  // uncompressed size
      view.setUint16(26, nameBytes.length, true)
      view.setUint16(28, 0,          true)   // extra len
      localHeader.set(nameBytes, 30)

      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length)
      const cdView  = new DataView(cdEntry.buffer)
      cdView.setUint32(0,  0x02014b50, true) // central dir sig
      cdView.setUint16(4,  20,         true)
      cdView.setUint16(6,  20,         true)
      cdView.setUint16(8,  0,          true)
      cdView.setUint16(10, 0,          true)
      cdView.setUint16(12, 0,          true)
      cdView.setUint16(14, 0,          true)
      cdView.setUint32(16, crc32(data),true)
      cdView.setUint32(20, data.length, true)
      cdView.setUint32(24, data.length, true)
      cdView.setUint16(28, nameBytes.length, true)
      cdView.setUint16(30, 0,          true)
      cdView.setUint16(32, 0,          true)
      cdView.setUint16(34, 0,          true)
      cdView.setUint16(36, 0,          true)
      cdView.setUint32(38, 0x0000,     true)
      cdView.setUint32(42, offset,     true)
      cdEntry.set(nameBytes, 46)

      parts.push(localHeader, data)
      centralDir.push(cdEntry)
      offset += localHeader.length + data.length
    }

    const cdSize   = centralDir.reduce((s,e) => s + e.length, 0)
    const eocd     = new Uint8Array(22)
    const eocdView = new DataView(eocd.buffer)
    eocdView.setUint32(0,  0x06054b50, true)
    eocdView.setUint16(4,  0,          true)
    eocdView.setUint16(6,  0,          true)
    eocdView.setUint16(8,  files.length, true)
    eocdView.setUint16(10, files.length, true)
    eocdView.setUint32(12, cdSize,     true)
    eocdView.setUint32(16, offset,     true)
    eocdView.setUint16(20, 0,          true)

    const all = [...parts, ...centralDir, eocd]
    const total = new Uint8Array(all.reduce((s,b) => s + b.length, 0))
    let pos = 0
    for (const b of all) { total.set(b, pos); pos += b.length }
    return total
  }

  function crc32(data) {
    const table = crc32.t ?? (crc32.t = (() => {
      const t = new Uint32Array(256)
      for (let i = 0; i < 256; i++) {
        let c = i
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
        t[i] = c
      }
      return t
    })())
    let c = 0xFFFFFFFF
    for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xFF] ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }

  const zip = makeZip([
    ['[Content_Types].xml',           strToU8(contentTypes)],
    ['_rels/.rels',                   strToU8(pkgRels)],
    ['xl/workbook.xml',               strToU8(wbXml)],
    ['xl/_rels/workbook.xml.rels',    strToU8(wbRels)],
    ['xl/worksheets/sheet1.xml',      strToU8(sheetXml)],
    ['xl/styles.xml',                 strToU8(stylesXml)],
    ['xl/sharedStrings.xml',          strToU8(ssXml)],
  ])

  const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `talent${searchQuery ? '-' + searchQuery.replace(/\s+/g, '_') : ''}-${date}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function MultiSelectFilter({ options, selected, onChange, placeholder, maxWidth = '150px', searchable = false }) {
  const [open, setOpen]       = useState(false)
  const [pending, setPending] = useState(new Set(selected))
  const [search, setSearch]   = useState('')
  const ref = useRef(null)

  function handleOpen() {
    setPending(new Set(selected))
    setSearch('')
    setOpen(true)
  }

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(val) {
    setPending(prev => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
  }

  function apply() {
    onChange(new Set(pending))
    setOpen(false)
  }

  const label = selected.size === 0 ? placeholder : `${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}`

  return (
    <div ref={ref} className="relative" style={{ maxWidth }}>
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full text-xs px-2 py-1 rounded border border-outline-variant/30 bg-surface-container text-on-surface focus:outline-none focus:border-primary/50 flex items-center justify-between gap-1"
      >
        <span className={`truncate ${selected.size === 0 ? 'text-on-surface-variant/60' : ''}`}>{label}</span>
        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 13 }}>{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-surface-container border border-outline-variant/20 rounded-lg shadow-xl min-w-[190px]">
          {searchable && (
            <div className="px-3 pt-2 pb-1">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="w-full text-xs px-2 py-1 rounded border border-outline-variant/30 bg-surface-container-high text-on-surface focus:outline-none focus:border-primary/50 placeholder:text-on-surface-variant/50"
              />
            </div>
          )}
          <div className="border-b border-outline-variant/20 px-3 py-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant font-semibold select-none">
              <input
                type="checkbox"
                checked={pending.size === options.length && options.length > 0}
                onChange={() => setPending(pending.size === options.length ? new Set() : new Set(options))}
                className="accent-primary"
              />
              Seleccionar todo
            </label>
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase())).map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-high cursor-pointer text-xs text-on-surface select-none">
                <input type="checkbox" checked={pending.has(opt)} onChange={() => toggle(opt)} className="accent-primary" />
                {opt}
              </label>
            ))}
          </div>
          <div className="border-t border-outline-variant/20 px-3 py-2">
            <button
              type="button"
              onClick={apply}
              className="w-full text-xs font-semibold bg-primary text-on-primary rounded-md py-1.5 hover:opacity-90 transition-opacity"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TalentDirectory() {
  const { can } = usePermissions()
  const location = useLocation()
  const restored = location.state?.restoreSearch

  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [query, setQuery]           = useState(restored?.q ?? '')
  const [englishMin, setEnglishMin] = useState(restored?.englishMin ?? '')
  const [englishMax, setEnglishMax] = useState(restored?.englishMax ?? '')
  const [searching, setSearching]   = useState(false)
  const [hasSearched, setHasSearched] = useState(!!restored)
  const [adminModal, setAdminModal]   = useState(false)
  const [fCity,   setFCity]         = useState(new Set())
  const [fRole,   setFRole]         = useState(new Set())
  const [fTech,   setFTech]         = useState(new Set())
  const [fModule, setFModule]       = useState(new Set())
  const [fEng,    setFEng]          = useState(new Set())
  const [fYoe,    setFYoe]          = useState(new Set())

  const load = useCallback(async (q = '', eMin = '', eMax = '', forceSearch = false) => {
    if (!forceSearch && !q.trim() && eMin === '' && eMax === '') return
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

  useEffect(() => {
    if (restored) {
      setHasSearched(true)
      load(restored.q ?? '', restored.englishMin ?? '', restored.englishMax ?? '', true)
    }
  }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setHasSearched(true)
    load(query, englishMin, englishMax, true)
  }

  function clearFilters() {
    setQuery('')
    setEnglishMin('')
    setEnglishMax('')
    setHasSearched(false)
    setCandidates([])
  }

  async function runAdminSearch(search) {
    setAdminModal(false)
    setQuery(search.label)
    setHasSearched(true)
    setSearching(true)
    try {
      const data = await fetchCandidatesByIds(search.ids)
      setCandidates(data)
      setError(null)
    } catch {
      setError('Error al cargar candidatos.')
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }

  const uniqueCities  = [...new Set(candidates.map(c => c.location?.name).filter(Boolean))].sort()
  const uniqueRoles   = [...new Set(candidates.map(c => c.role?.name).filter(Boolean))].sort()
  const uniqueTechs   = [...new Set(candidates.flatMap(c => (c.candidate_stack ?? []).map(s => s.technology?.ct_name_tech)).filter(Boolean))].sort()
  const uniqueModules = [...new Set(candidates.map(c => c.bdd_module).filter(Boolean))].sort()
  const uniqueEnglish = [...new Set(candidates.map(c => c.english_score).filter(v => v != null))].sort((a, b) => a - b).map(v => `${v}%`)
  const uniqueYoe     = [...new Set(candidates.map(c => c.years_experience).filter(v => v != null))].sort((a, b) => a - b).map(v => `${v}y`)

  const displayed = candidates.filter(c => {
    if (fCity.size   > 0 && !fCity.has(c.location?.name))  return false
    if (fRole.size   > 0 && !fRole.has(c.role?.name))       return false
    if (fTech.size   > 0 && !(c.candidate_stack ?? []).some(s => fTech.has(s.technology?.ct_name_tech))) return false
    if (fModule.size > 0 && !fModule.has(c.bdd_module))     return false
    if (fEng.size    > 0 && !fEng.has(`${c.english_score}%`)) return false
    if (fYoe.size    > 0 && !fYoe.has(`${c.years_experience}y`)) return false
    return true
  })

  const hasColumnFilters = fCity.size > 0 || fRole.size > 0 || fTech.size > 0 || fModule.size > 0 || fEng.size > 0 || fYoe.size > 0

  const total = displayed.length

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
          <form onSubmit={handleSearch} className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input
              className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant"
              placeholder="Buscar por nombre o tecnologías…"
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
          <UserAvatar />
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Talent Directory</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Talent Directory</h1>
                {hasSearched && (
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">{total}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <PortalButtons />
              <div className="flex items-center gap-2">
              {candidates.length > 0 && !loading && (
                <button
                  type="button"
                  onClick={() => exportToExcel(displayed, query)}
                  className="flex items-center gap-2 bg-surface-container border border-outline-variant/30 text-on-surface px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-high transition-colors"
                  title="Exportar resultados a Excel"
                >
                  <span className="material-symbols-outlined text-[18px] text-green-400">table_view</span>
                  Exportar Excel
                </button>
              )}
              <button
                type="button"
                onClick={() => setAdminModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#000', color: '#4ade80', border: '1px solid #166534' }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#4ade80' }}>manage_search</span>
                Admin-Search
              </button>
              {can('talent.create') && (
                <Link to="/talent/new">
                  <button className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">add</span>Add Talent
                  </button>
                </Link>
              )}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <form onSubmit={handleSearch} className="p-4 bg-surface-container-lowest rounded-2xl shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-on-surface-variant text-on-surface"
                placeholder="Buscar por nombre o tecnologías…"
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
          <div className="-mx-6 md:-mx-10 bg-surface-container-lowest shadow-[0_2px_16px_rgba(24,28,30,0.04)] overflow-hidden border-y border-outline-variant/10">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 mb-4" style={{ fontSize: 56 }}>manage_search</span>
                <p className="text-base font-semibold text-on-surface-variant">Busca un candidato para comenzar</p>
                <p className="text-sm text-on-surface-variant/50 mt-1">Ingresa un nombre, skill o rol y presiona Buscar.</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span className="text-sm">Cargando candidatos…</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 mb-3" style={{ fontSize: 48 }}>group_off</span>
                <p className="text-base font-semibold text-on-surface-variant">No se encontraron candidatos</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">Prueba con otro nombre, skill o rol.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1400px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {['Name', 'Role', 'Technology', 'Module', 'English', 'YoE', 'Location'].map(h => (
                        <th key={h} className="py-3.5 px-5 text-[11px] font-bold text-white uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                      <th className="py-3.5 px-4 bg-surface-container-low"></th>
                    </tr>
                    {/* Column filters row */}
                    <tr className="bg-surface-container-low border-t border-outline-variant/10">
                      {/* Name — no filter */}
                      <td className="px-5 pb-2 pt-1" />
                      {/* Role filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueRoles} selected={fRole} onChange={setFRole} placeholder="Todos los roles" searchable />
                      </td>
                      {/* Technology filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueTechs} selected={fTech} onChange={setFTech} placeholder="Todas las techs" searchable />
                      </td>
                      {/* Module filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueModules} selected={fModule} onChange={setFModule} placeholder="Todos los módulos" searchable />
                      </td>
                      {/* English filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueEnglish} selected={fEng} onChange={setFEng} placeholder="English" />
                      </td>
                      {/* YoE filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueYoe} selected={fYoe} onChange={setFYoe} placeholder="YoE" />
                      </td>
                      {/* City filter */}
                      <td className="px-5 pb-2 pt-1">
                        <MultiSelectFilter options={uniqueCities} selected={fCity} onChange={setFCity} placeholder="Todas las ciudades" maxWidth="160px" searchable />
                      </td>
                      {/* Clear filters */}
                      <td className="px-4 pb-2 pt-1 bg-surface-container-low">
                        {hasColumnFilters && (
                          <button onClick={() => { setFCity(new Set()); setFRole(new Set()); setFTech(new Set()); setFModule(new Set()); setFEng(new Set()); setFYoe(new Set()) }}
                            className="text-[10px] text-primary hover:underline whitespace-nowrap font-semibold">
                            Limpiar
                          </button>
                        )}
                      </td>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {displayed.map((c, idx) => {
                      const statusName   = c.status?.name    ?? '—'
                      const seniorityName = c.seniority?.name ?? '—'
                      const sc = STATUS_CLS[statusName]     ?? STATUS_CLS['Inactive']
                      const sn = SENIORITY_CLS[seniorityName] ?? 'bg-surface-container text-on-surface-variant'
                      const techs = [...new Set(
                        (c.candidate_stack ?? []).map(s => s.technology?.ct_name_tech).filter(Boolean)
                      )].slice(0, 3)
                      const rowBg = idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container/40'

                      return (
                        <tr key={c.candidate_code} className={`${rowBg} hover:bg-primary/5 transition-colors group cursor-pointer`}>

                          {/* Name */}
                          <td className="py-4 px-5">
                            <p className="font-semibold text-primary text-sm group-hover:text-surface-tint transition-colors whitespace-nowrap">{c.full_name}</p>
                            {c.source === 'client' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full mt-0.5">
                                <span className="material-symbols-outlined text-[10px]">business</span>
                                Candidato de cliente
                              </span>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                            {c.role?.name ?? <span className="text-on-surface-variant/40">—</span>}
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

                          {/* Module */}
                          <td className="py-4 px-5 text-sm text-on-surface-variant whitespace-nowrap">
                            {c.bdd_module ?? <span className="text-on-surface-variant/40">—</span>}
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
                          <td className={`py-4 px-4 ${rowBg} group-hover:bg-primary/5 whitespace-nowrap`}>
                            <div className="flex items-center" style={{ gap: 0 }}>
                              {/* LinkedIn — fixed slot */}
                              <div className="w-8 flex justify-center">
                                {c.linkedin_url ? (
                                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" title="Ver LinkedIn"
                                    className="p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors" style={{ color: '#0077B5' }}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                  </a>
                                ) : null}
                              </div>
                              {/* Drive (CV) — fixed slot */}
                              <div className="w-8 flex justify-center">
                                {c.cv_url ? (
                                  <a href={c.cv_url} target="_blank" rel="noreferrer" title="Ver CV en Google Drive"
                                    className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
                                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                                      <path d="M12 2L2 21l10-8z" fill="#00AC47"/>
                                      <path d="M12 2l10 19-10-8z" fill="#FBBC04"/>
                                      <path d="M2 21h20l-10-8z" fill="#4285F4"/>
                                    </svg>
                                  </a>
                                ) : null}
                              </div>
                              {/* WhatsApp — fixed slot */}
                              <div className="w-8 flex justify-center">
                                {c.phone ? (
                                  <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Abrir en WhatsApp"
                                    className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors text-green-500 hover:text-green-400">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L.057 23.552a.75.75 0 0 0 .92.92l5.697-1.475A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.373l-.364-.215-3.38.875.893-3.257-.235-.376A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                    </svg>
                                  </a>
                                ) : null}
                              </div>
                              {/* Edit — fixed slot */}
                              <div className="w-8 flex justify-center">
                                {can('talent.edit') ? (
                                  <Link to={`/talent/edit/${c.candidate_code}`} state={{ backSearch: { q: query, englishMin, englishMax } }}
                                    className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-surface-tint" title="Editar">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </Link>
                                ) : null}
                              </div>
                              {/* Ver button */}
                              <div className="ml-2">
                                <Link to={`/talent/edit/${c.candidate_code}`} state={{ backSearch: { q: query, englishMin, englishMax } }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                                  Ver <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                                </Link>
                              </div>
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
                  Mostrando <span className="font-semibold text-primary">{total}</span>{hasColumnFilters ? ` de ${candidates.length}` : ''} candidato{total !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Admin-Search modal */}
      {adminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl border shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
            style={{ backgroundColor: '#0a0a0a', borderColor: '#166534' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: '#4ade80' }}>manage_search</span>
                <h2 className="text-base font-bold" style={{ color: '#4ade80' }}>Admin-Search</h2>
              </div>
              <button onClick={() => setAdminModal(false)}
                className="text-white/40 hover:text-white/80 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs" style={{ color: '#86efac' }}>Búsquedas predefinidas por posición</p>
            <div className="flex flex-col gap-2">
              {ADMIN_SEARCHES.map((s, i) => (
                <button key={i} onClick={() => runAdminSearch(s)}
                  className="text-left rounded-xl p-4 border transition-colors hover:brightness-110"
                  style={{ backgroundColor: '#0f1f0f', borderColor: '#166834' }}>
                  <p className="text-sm font-bold" style={{ color: '#4ade80' }}>{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#86efac80' }}>{s.description}</p>
                  <p className="text-[10px] mt-1.5" style={{ color: '#166834' }}>{s.ids.length} candidatos · IDs: {s.ids.join(', ')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
