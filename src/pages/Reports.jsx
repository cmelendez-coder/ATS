import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getReportsSummary,
  listOpenRequirementsForReports,
  getClientReportPdfData,
  getClientMonthlyReportData,
  getAllClientsMonthlyReportData,
  getRequirementReportPdfData,
  getWeeklySubmittalsData,
} from '../api/reports'
import {
  buildReportHtml,
  downloadReportHtml,
  openPrintableReport,
  renderMetricCards,
  renderStageList,
  renderTable,
  escapeHtml,
} from '../lib/reportPdf'
import ReportPreviewModal from '../components/ReportPreviewModal'
import PortalButtons from '../components/PortalButtons'

function MetricCard({ label, value, icon, tone = 'primary', sublabel = '' }) {
  const toneMap = {
    primary: 'from-primary/10 to-primary-container/5 text-primary',
    secondary: 'from-secondary/10 to-secondary-container/5 text-secondary',
    tertiary: 'from-tertiary/10 to-tertiary-container/5 text-tertiary',
    neutral: 'from-surface-container-high to-surface-container text-on-surface',
  }

  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[tone] ?? toneMap.primary} opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight text-primary">{value}</p>
          {sublabel && <p className="mt-2 text-xs text-on-surface-variant">{sublabel}</p>}
        </div>
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant/45">{icon}</span>
      </div>
    </div>
  )
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generateWeeks2026() {
  const weeks = []
  const start = new Date(2025, 11, 29) // ISO Week 1 of 2026 — local date
  for (let w = 0; w < 52; w++) {
    const monday = new Date(start)
    monday.setDate(start.getDate() + w * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mondayStr = localDateStr(monday)
    const mDay = monday.getDate()
    const sDay = sunday.getDate()
    const mMonth = MESES[monday.getMonth()]
    const sMonth = MESES[sunday.getMonth()]
    const label = monday.getMonth() === sunday.getMonth()
      ? `Semana ${w + 1} — ${mDay} a ${sDay} de ${mMonth}`
      : `Semana ${w + 1} — ${mDay} de ${mMonth} a ${sDay} de ${sMonth}`
    weeks.push({ value: mondayStr, label })
  }
  return weeks
}

const WEEKS_2026 = generateWeeks2026()

function toTitleCase(str) {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [requirementOptions, setRequirementOptions] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('all')
  const [clientReportMonth, setClientReportMonth] = useState(() => new Date().getMonth() + 1)
  const [generalMonthlyMonth, setGeneralMonthlyMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedRequirementId, setSelectedRequirementId] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState('')

  // Weekly Submittals state
  const [weeklySubmittals, setWeeklySubmittals] = useState([])
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeklyError, setWeeklyError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    return localDateStr(monday)
  })

  useEffect(() => {
    Promise.all([getReportsSummary(), listOpenRequirementsForReports()])
      .then(([summary, requirements]) => {
        setReport(summary)
        setRequirementOptions(requirements)
        setSelectedClientId('all')
        setSelectedRequirementId(String(requirements?.[0]?.id ?? ''))
        setError(null)
      })
      .catch(err => setError(err.message ?? 'No se pudieron cargar los reportes.'))
      .finally(() => setLoading(false))
  }, [])

  function fmtDate(dateStr) {
    if (!dateStr) return 'Sin fecha'
    return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function isWithinRange(dateStr) {
    if (!dateStr) return false
    const value = new Date(dateStr).getTime()
    if (Number.isNaN(value)) return false
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      if (value < from) return false
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime()
      if (value > to) return false
    }
    return true
  }

  const visibleClientsDetailed = useMemo(() => {
    if (!report?.clients) return []
    return report.clients
      .filter(client => selectedClientId === 'all' || String(client.clientId) === String(selectedClientId))
      .map(client => {
        const requirements = client.requirements.filter(req => isWithinRange(req.applicationDate))
        const stageCounts = {}

        for (const requirement of requirements) {
          for (const [stageName, count] of Object.entries(requirement.stageCounts ?? {})) {
            stageCounts[stageName] = (stageCounts[stageName] ?? 0) + count
          }
        }

        const stages = Object.entries(stageCounts)
          .map(([name, count]) => {
            const stage = client.stages.find(item => item.name === name)
            return {
              name,
              count,
              color: stage?.color ?? '#64748B',
              position: stage?.position ?? Number.MAX_SAFE_INTEGER,
            }
          })
          .filter(stage => stage.count > 0)
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

        return {
          ...client,
          requirements,
          requirementCount: requirements.length,
          candidateCount: requirements.reduce((sum, req) => sum + (req.candidateCount ?? 0), 0),
          stages,
        }
      })
      .filter(client => client.requirementCount > 0)
  }, [report, selectedClientId, dateFrom, dateTo])

  const visibleRequirementOptions = useMemo(() => {
    const filtered = requirementOptions.filter(req => isWithinRange(req.applicationDate))
    if (selectedClientId === 'all') return filtered
    return filtered.filter(req => String(req.clientId) === String(selectedClientId))
  }, [requirementOptions, selectedClientId, dateFrom, dateTo])

  useEffect(() => {
    if (!visibleRequirementOptions.length) {
      setSelectedRequirementId('')
      return
    }
    if (!visibleRequirementOptions.some(req => String(req.id) === String(selectedRequirementId))) {
      setSelectedRequirementId(String(visibleRequirementOptions[0].id))
    }
  }, [visibleRequirementOptions, selectedRequirementId])

  const visibleStageTotals = useMemo(() => {
    const stageMap = new Map()
    for (const client of visibleClientsDetailed) {
      for (const stage of client.stages) {
        if (!stageMap.has(stage.name)) {
          stageMap.set(stage.name, { name: stage.name, count: 0, color: stage.color, position: stage.position })
        }
        stageMap.get(stage.name).count += stage.count
      }
    }

    return [...stageMap.values()]
      .filter(stage => stage.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5)
  }, [visibleClientsDetailed])

  const totalRequirementsVisible = visibleClientsDetailed.reduce((sum, client) => sum + client.requirementCount, 0)
  const totalClientCandidatesVisible = visibleClientsDetailed.reduce((sum, client) => sum + client.candidateCount, 0)
  const totalCandidatesGeneral = report?.totalCandidates ?? 0
  const topStage = visibleStageTotals?.[0]

  function openPreview(title, subtitle, bodyHtml, onDownload) {
    setPreview({
      title,
      html: buildReportHtml({ title, subtitle, bodyHtml }),
      onDownload,
    })
  }

  function buildGeneralBody(stageTotals, clients, totals) {
    return [
      renderStageList('Fases principales', stageTotals),
      renderTable(
        'Resumen por cliente',
        ['Cliente', 'Requerimientos abiertos', 'Candidatos', 'Fase dominante'],
        clients.map(client => [
          escapeHtml(client.clientName),
          escapeHtml(client.requirementCount),
          escapeHtml(client.candidateCount),
          escapeHtml(client.stages[0]?.name ?? 'Sin candidatos'),
        ]),
      ),
    ].join('')
  }

  function buildClientBody(client) {
    return [
      renderMetricCards([
        { label: 'Cliente', value: client.clientName },
        { label: 'Req. abiertos', value: client.requirementCount.toLocaleString() },
        { label: 'Candidatos', value: client.candidateCount.toLocaleString() },
        { label: 'Fases activas', value: client.stages.length.toLocaleString() },
      ]),
      renderStageList('Candidatos por fase', client.stages),
      renderTable(
        'Requerimientos abiertos del cliente',
        ['Folio', 'Posicion', 'Status', 'Aplicacion', 'Target', 'Candidatos'],
        client.requirements.map(requirement => [
          escapeHtml(`REQ-${new Date(requirement.applicationDate ?? Date.now()).getFullYear()}-${String(requirement.reqNumber).padStart(3, '0')}`),
          escapeHtml(requirement.jobTitle),
          `<span class="pill">${escapeHtml(requirement.statusName)}</span>`,
          escapeHtml(fmtDate(requirement.applicationDate)),
          escapeHtml(fmtDate(requirement.targetFillDate)),
          escapeHtml(requirement.candidateCount),
        ]),
      ),
    ].join('')
  }

  function buildRequirementBody(requirement) {
    return [
      renderMetricCards([
        { label: 'Cliente', value: requirement.clientName },
        { label: 'Status', value: requirement.statusName },
        { label: 'Candidatos', value: requirement.candidateCount.toLocaleString() },
        { label: 'Target Fill', value: fmtDate(requirement.targetFillDate) },
      ]),
      renderTable(
        'Resumen del requerimiento',
        ['Folio', 'Posicion', 'Aplicacion', 'Target', 'Status actual'],
        [[
          escapeHtml(`REQ-${new Date(requirement.applicationDate ?? Date.now()).getFullYear()}-${String(requirement.reqNumber).padStart(3, '0')}`),
          escapeHtml(requirement.jobTitle),
          escapeHtml(fmtDate(requirement.applicationDate)),
          escapeHtml(fmtDate(requirement.targetFillDate)),
          `<span class="pill">${escapeHtml(requirement.statusName)}</span>`,
        ]],
      ),
      renderStageList('Distribucion de candidatos por fase', requirement.stages),
    ].join('')
  }

  function getWeekRange(mondayStr) {
    const start = new Date(`${mondayStr}T00:00:00`)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString(), sundayStr: end.toISOString().slice(0, 10) }
  }

  async function loadWeeklySubmittals(mondayStr) {
    setWeeklyLoading(true)
    setWeeklyError(null)
    try {
      const { start, end } = getWeekRange(mondayStr)
      const rows = await getWeeklySubmittalsData(start, end)
      setWeeklySubmittals(rows)
    } catch {
      setWeeklyError('No se pudieron cargar los submittals de la semana.')
    } finally {
      setWeeklyLoading(false)
    }
  }

  useEffect(() => { loadWeeklySubmittals(selectedWeek) }, [selectedWeek])

  function buildWeeklyBody(rows, weekLabel) {
    if (!rows.length) {
      return `<p style="color:#64748b;font-size:14px;">Sin candidatos enviados a cliente esta semana.</p>`
    }

    const total = rows.length

    const byClient = {}
    const byPosition = {}
    for (const row of rows) {
      byClient[row.clientName] = (byClient[row.clientName] ?? 0) + 1
      byPosition[row.jobTitle] = (byPosition[row.jobTitle] ?? 0) + 1
    }

    const clientEntries = Object.entries(byClient).sort((a, b) => b[1] - a[1])
    const positionEntries = Object.entries(byPosition).sort((a, b) => b[1] - a[1])

    const CLIENT_COLORS = ['#143b7a','#1e56a0','#2563eb','#3b82f6','#60a5fa','#93c5fd']
    const POSITION_COLORS = ['#166534','#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0']

    const rowList = (entries, colors) => entries.map(([name, count], i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e9eef8;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${escapeHtml(colors[i % colors.length])};flex-shrink:0;"></span>
          <span style="font-size:13px;">${escapeHtml(name)}</span>
        </div>
        <strong style="font-size:14px;min-width:24px;text-align:right;">${count}</strong>
      </div>`).join('')

    const dashboardHtml = `
      <section class="section">
        <div style="display:grid;grid-template-columns:160px 1fr 1fr;gap:16px;align-items:start;">
          <div class="card" style="background:#10213d;border-color:#10213d;text-align:center;padding:24px 16px;">
            <div class="label" style="color:rgba(255,255,255,0.55);">Total enviados</div>
            <div style="font-size:64px;font-weight:800;color:#4ade80;line-height:1.1;margin:12px 0 8px;">${total}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);">candidatos</div>
          </div>
          <div class="card">
            <div class="label" style="margin-bottom:8px;">Por cliente</div>
            ${rowList(clientEntries, CLIENT_COLORS)}
          </div>
          <div class="card">
            <div class="label" style="margin-bottom:8px;">Por posición</div>
            ${rowList(positionEntries, POSITION_COLORS)}
          </div>
        </div>
      </section>`

    const tableHtml = renderTable(
      `Detalle — ${weekLabel}`,
      ['Candidato', 'Cliente', 'Requerimiento', 'Posición', 'Fase actual', 'Fecha enviado'],
      rows.map(row => [
        escapeHtml(toTitleCase(row.candidateName)),
        escapeHtml(row.clientName),
        escapeHtml(`REQ-${String(row.reqNumber).padStart(3, '0')}`),
        escapeHtml(row.jobTitle),
        escapeHtml(row.currentStage),
        escapeHtml(fmtDate(row.sentAt)),
      ]),
    )

    return dashboardHtml + tableHtml
  }

  function getWeekLabel(mondayStr) {
    const weekNum = WEEKS_2026.findIndex(w => w.value === mondayStr) + 1
    const [y, mo, d] = mondayStr.split('-').map(Number)
    const start = new Date(y, mo - 1, d)
    const end = new Date(y, mo - 1, d + 6)
    const startFmt = start.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
    const endFmt = end.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    return `Semana ${weekNum > 0 ? weekNum : ''}: del ${startFmt} al ${endFmt}`
  }

  function handleWeeklyPreview() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    openPreview(title, subtitle, bodyHtml, () =>
      downloadReportHtml({ filename: `weekly-submittals-${selectedWeek}.html`, title, subtitle, bodyHtml })
    )
  }

  function handleWeeklyDownload() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    downloadReportHtml({ filename: `weekly-submittals-${selectedWeek}.html`, title, subtitle, bodyHtml })
  }

  function handleWeeklyPrint() {
    const weekLabel = getWeekLabel(selectedWeek)
    const title = 'Weekly Submittals'
    const subtitle = `Candidatos enviados a cliente en la ${weekLabel}`
    const bodyHtml = buildWeeklyBody(weeklySubmittals, weekLabel)
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  function buildAllClientsMonthlyBody(data) {
    const monthLabel     = `${MESES[data.month - 1]} ${data.year}`
    const totalClients   = data.clients.length
    const totalPositions = data.clients.reduce((s, c) => s + c.requirements.length, 0)
    const totalSent      = data.clients.reduce((s, c) => s + c.requirements.reduce((s2, r) => s2 + r.candidatesSent, 0), 0)

    const POS_COLOR    = '#c2410c'
    const CLIENT_COLOR = '#1e3a5f'

    const CLIENT_LOGOS = {
      'LogicMonitor':    '/logos/logicmonitor.webp',
      'Bahwan Cybertek': '/logos/bahwan.png',
      'HTC':             '/logos/htc.png',
      'Yash':            '/logos/yash.png',
      'PacVue':          '/logos/pacvue.png',
      'BlueConic':       '/logos/blueconic.png',
      'Mygo':            '/logos/mygo.png',
      'Numen':           '/logos/numen.png',
    }

    const clientNameOrLogo = (name) => {
      const src = CLIENT_LOGOS[name]
      if (src) {
        return `<div style="background:white;border-radius:7px;padding:4px 10px;display:inline-flex;align-items:center;"><img src="${src}" alt="${escapeHtml(name)}" style="height:22px;object-fit:contain;display:block;"></div>`
      }
      return `<span style="font-weight:800;font-size:15px;">${escapeHtml(name)}</span>`
    }

    const kpiBanner = `
      <section class="section">
        <div style="background:linear-gradient(135deg,#10213d 0%,#143b7a 100%);border-radius:18px;padding:28px 32px;color:white;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:0;">
          <div style="padding-right:20px;">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Periodo</div>
            <div style="margin-top:8px;font-size:22px;font-weight:800;line-height:1.1;">${escapeHtml(monthLabel)}</div>
          </div>
          <div style="padding:0 16px;border-left:1px solid rgba(255,255,255,.15);">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Clientes</div>
            <div style="margin-top:6px;font-size:42px;font-weight:800;line-height:1;color:#fbbf24;">${totalClients}</div>
          </div>
          <div style="padding:0 16px;border-left:1px solid rgba(255,255,255,.15);">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Posiciones</div>
            <div style="margin-top:6px;font-size:42px;font-weight:800;line-height:1;color:#a78bfa;">${totalPositions}</div>
          </div>
          <div style="padding:0 16px;border-left:1px solid rgba(255,255,255,.15);">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Enviados</div>
            <div style="margin-top:6px;font-size:42px;font-weight:800;line-height:1;color:#60a5fa;">${totalSent}</div>
          </div>
        </div>
      </section>`

    const summaryRows = data.clients.map(c => {
      const sent = c.requirements.reduce((s, r) => s + r.candidatesSent, 0)
      return `
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid #e9eef8;font-weight:700;font-size:13px;">${escapeHtml(c.clientName)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e9eef8;font-size:13px;">${c.requirements.length}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e9eef8;font-size:13px;font-weight:700;color:#143b7a;">${sent}</td>
        </tr>`
    }).join('')

    const summarySection = `
      <section class="section">
        <h2 style="font-size:17px;margin:0 0 12px;color:#10213d;">Resumen por cliente</h2>
        <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#10213d;color:white;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">Cliente</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">Posiciones</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">Candidatos enviados</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </section>`

    const clientDetailSections = data.clients.map((client) => {
      const clientColor = CLIENT_COLOR
      const maxCand = Math.max(...client.requirements.map(r => r.candidatesSent), 1)
      const posCards = client.requirements.map((req) => {
        const color  = POS_COLOR
        const barPct = Math.round((req.candidatesSent / maxCand) * 100)
        return `
          <div style="border:1px solid #d6dce5;border-radius:14px;overflow:hidden;background:white;display:flex;flex-direction:column;">
            <div style="background:${color};padding:10px 12px;">
              <div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:700;">REQ-${String(req.reqNumber).padStart(3,'0')} · Apertura: ${escapeHtml(fmtDate(req.applicationDate ?? req.createdAt))}</div>
              <div style="margin-top:2px;font-size:12px;font-weight:700;color:white;line-height:1.3;">${escapeHtml(req.jobTitle)}</div>
            </div>
            <div style="padding:14px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;">
              <div style="font-size:9px;color:#60708b;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Enviados</div>
              <div style="font-size:52px;font-weight:900;color:${color};line-height:1;">${req.candidatesSent}</div>
            </div>
          </div>`
      }).join('')

      return `
        <section class="section" style="margin-top:28px;">
          <div style="background:${clientColor};color:white;padding:10px 18px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px;">
            ${clientNameOrLogo(client.clientName)}
            <span style="font-size:17px;background:rgba(255,255,255,.2);padding:3px 18px;border-radius:999px;font-weight:700;">${client.requirements.length} posiciones · ${client.requirements.reduce((s,r)=>s+r.candidatesSent,0)} enviados</span>
          </div>
          <div style="border:1px solid #d6dce5;border-top:none;border-radius:0 0 12px 12px;padding:14px;">
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;">${posCards}</div>
          </div>
        </section>`
    }).join('')

    const candGroups = data.clients.map((client) => {
      const clientColor = CLIENT_COLOR
      const reqBlocks = client.requirements.map((req) => {
        const color = POS_COLOR
        const bodyRows = req.candidates?.length
          ? req.candidates.map((c, j) => `
              <tr style="background:${j % 2 === 0 ? 'white' : '#f8fafc'};">
                <td style="padding:7px 12px;border-bottom:1px solid #e9eef8;font-size:12px;font-weight:600;">${escapeHtml(c.name)}</td>
                <td style="padding:7px 12px;border-bottom:1px solid #e9eef8;font-size:11px;color:#60708b;">${escapeHtml(fmtDate(c.sentAt))}</td>
              </tr>`).join('')
          : `<tr><td colspan="2" style="padding:8px 12px;color:#60708b;font-size:12px;">Sin candidatos enviados este mes.</td></tr>`
        return `
          <div style="margin-bottom:14px;break-inside:avoid;">
            <div style="background:${color};color:white;padding:7px 12px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;">
              <span style="font-weight:700;font-size:12px;">REQ-${String(req.reqNumber).padStart(3,'0')} — ${escapeHtml(req.jobTitle)}</span>
              <span style="font-size:11px;background:rgba(255,255,255,.2);padding:2px 9px;border-radius:999px;font-weight:700;">${req.candidatesSent}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #d6dce5;border-top:none;">
              <thead><tr style="background:#f0f4fa;">
                <th style="padding:6px 12px;text-align:left;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#60708b;font-weight:700;border-bottom:1px solid #d6dce5;">Candidato</th>
                <th style="padding:6px 12px;text-align:left;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#60708b;font-weight:700;border-bottom:1px solid #d6dce5;">Fecha enviado</th>
              </tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>`
      }).join('')
      return `
        <div style="margin-bottom:28px;">
          <div style="background:${clientColor};color:white;padding:9px 16px;border-radius:10px;margin-bottom:10px;">
            <span style="font-weight:800;font-size:14px;">${escapeHtml(client.clientName)}</span>
          </div>
          ${reqBlocks}
        </div>`
    }).join('')

    const candSection = `
      <section class="section" style="page-break-before:always;padding-top:8px;">
        <h2 style="font-size:17px;margin:0 0 18px;color:#10213d;">Candidatos enviados — ${escapeHtml(monthLabel)}</h2>
        ${candGroups}
      </section>`

    return kpiBanner + summarySection + clientDetailSections + candSection
  }

  async function handleGeneralMonthlyPreview() {
    setBusy('gen-monthly-preview')
    try {
      const data = await getAllClientsMonthlyReportData(2026, generalMonthlyMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte General Mensual — ${monthLabel}`
      const subtitle = `Posiciones activas y candidatos enviados por todos los clientes en ${monthLabel}`
      const bodyHtml = buildAllClientsMonthlyBody(data)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-general-${monthLabel}`)}.html`, title, subtitle, bodyHtml,
      }))
    } finally { setBusy('') }
  }

  async function handleGeneralMonthlyDownload() {
    setBusy('gen-monthly-download')
    try {
      const data = await getAllClientsMonthlyReportData(2026, generalMonthlyMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte General Mensual — ${monthLabel}`
      const subtitle = `Posiciones activas y candidatos enviados por todos los clientes en ${monthLabel}`
      const bodyHtml = buildAllClientsMonthlyBody(data)
      downloadReportHtml({ filename: `${slugify(`reporte-general-${monthLabel}`)}.html`, title, subtitle, bodyHtml })
    } finally { setBusy('') }
  }

  async function handleGeneralMonthlyPrint() {
    setBusy('gen-monthly-print')
    try {
      const data = await getAllClientsMonthlyReportData(2026, generalMonthlyMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte General Mensual — ${monthLabel}`
      const subtitle = `Posiciones activas y candidatos enviados por todos los clientes en ${monthLabel}`
      const bodyHtml = buildAllClientsMonthlyBody(data)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally { setBusy('') }
  }

  function buildClientMonthlyBody(data) {
    const totalSent  = data.requirements.reduce((sum, r) => sum + r.candidatesSent, 0)
    const monthLabel = `${MESES[data.month - 1]} ${data.year}`
    const maxCand    = Math.max(...data.requirements.map(r => r.candidatesSent), 1)

    const POS_COLORS = ['#143b7a','#166534','#9a3412','#581c87','#0c4a6e','#7c2d12','#064e3b','#1e1b4b']

    // ── KPI Banner ──────────────────────────────────────────────────────
    const kpiBanner = `
      <section class="section">
        <div style="background:linear-gradient(135deg,#10213d 0%,#143b7a 100%);border-radius:18px;padding:28px 32px;color:white;display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;">
          <div style="padding-right:24px;">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Cliente</div>
            <div style="margin-top:8px;font-size:20px;font-weight:800;line-height:1.1;">${escapeHtml(data.clientName)}</div>
            <div style="margin-top:4px;font-size:15px;font-weight:600;color:rgba(255,255,255,.6);">${escapeHtml(monthLabel)}</div>
          </div>
          <div style="padding:0 24px;border-left:1px solid rgba(255,255,255,.15);">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Posiciones activas</div>
            <div style="margin-top:6px;font-size:44px;font-weight:800;line-height:1;color:#4ade80;">${data.requirements.length}</div>
          </div>
          <div style="padding:0 24px;border-left:1px solid rgba(255,255,255,.15);">
            <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700;">Candidatos enviados</div>
            <div style="margin-top:6px;font-size:44px;font-weight:800;line-height:1;color:#60a5fa;">${totalSent}</div>
          </div>
        </div>
      </section>`

    // ── Position cards with bar ─────────────────────────────────────────
    const posCards = data.requirements.map((req, i) => {
      const color  = POS_COLORS[i % POS_COLORS.length]
      const barPct = Math.round((req.candidatesSent / maxCand) * 100)
      return `
        <div style="border:1px solid #d6dce5;border-radius:16px;overflow:hidden;background:white;">
          <div style="background:${color};padding:14px 16px;">
            <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:700;">REQ-${String(req.reqNumber).padStart(3,'0')} · Apertura: ${escapeHtml(fmtDate(req.applicationDate ?? req.createdAt))}</div>
            <div style="margin-top:4px;font-size:15px;font-weight:700;color:white;line-height:1.25;">${escapeHtml(req.jobTitle)}</div>
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="font-size:10px;color:#60708b;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Candidatos enviados</div>
            <div style="font-size:56px;font-weight:900;color:${color};line-height:1.05;">${req.candidatesSent}</div>
          </div>
        </div>`
    }).join('')

    const posSection = `
      <section class="section">
        <h2 style="font-size:17px;margin:0 0 14px;color:#10213d;">Desglose por posición</h2>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">${posCards}</div>
      </section>`

    // ── Candidate list (page 2) ─────────────────────────────────────────
    const candGroups = data.requirements.map((req, i) => {
      const color = POS_COLORS[i % POS_COLORS.length]
      const bodyRows = req.candidates?.length
        ? req.candidates.map((c, j) => `
            <tr style="background:${j % 2 === 0 ? 'white' : '#f8fafc'};">
              <td style="padding:8px 14px;border-bottom:1px solid #e9eef8;font-size:13px;font-weight:600;">${escapeHtml(c.name)}</td>
              <td style="padding:8px 14px;border-bottom:1px solid #e9eef8;font-size:12px;color:#60708b;">${escapeHtml(fmtDate(c.sentAt))}</td>
            </tr>`).join('')
        : `<tr><td colspan="2" style="padding:12px 14px;color:#60708b;font-size:13px;">Sin candidatos registrados.</td></tr>`

      return `
        <div style="margin-bottom:24px;break-inside:avoid;">
          <div style="background:${color};color:white;padding:11px 16px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:700;font-size:14px;">REQ-${String(req.reqNumber).padStart(3,'0')} — ${escapeHtml(req.jobTitle)}</span>
            <span style="font-size:12px;background:rgba(255,255,255,.2);padding:3px 11px;border-radius:999px;font-weight:700;">${req.candidatesSent} candidatos</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #d6dce5;border-top:none;border-radius:0 0 12px 12px;overflow:hidden;">
            <thead>
              <tr style="background:#f0f4fa;">
                <th style="padding:8px 14px;text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#60708b;font-weight:700;border-bottom:1px solid #d6dce5;">Candidato</th>
                <th style="padding:8px 14px;text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#60708b;font-weight:700;border-bottom:1px solid #d6dce5;">Fecha enviado</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>`
    }).join('')

    const candSection = `
      <section class="section" style="page-break-before:always;padding-top:8px;">
        <h2 style="font-size:17px;margin:0 0 18px;color:#10213d;">Candidatos enviados — ${escapeHtml(monthLabel)}</h2>
        ${candGroups}
      </section>`

    return kpiBanner + posSection + candSection
  }

  async function handleClientMonthlyPreview() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-monthly-preview')
    try {
      const data  = await getClientMonthlyReportData(Number(selectedClientId), 2026, clientReportMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte Mensual — ${data.clientName}`
      const subtitle = `Posiciones abiertas y candidatos enviados en ${monthLabel}`
      const bodyHtml = buildClientMonthlyBody(data)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-mensual-${data.clientName}-${monthLabel}`)}.html`,
        title, subtitle, bodyHtml,
      }))
    } finally { setBusy('') }
  }

  async function handleClientMonthlyDownload() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-monthly-download')
    try {
      const data  = await getClientMonthlyReportData(Number(selectedClientId), 2026, clientReportMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte Mensual — ${data.clientName}`
      const subtitle = `Posiciones abiertas y candidatos enviados en ${monthLabel}`
      const bodyHtml = buildClientMonthlyBody(data)
      downloadReportHtml({
        filename: `${slugify(`reporte-mensual-${data.clientName}-${monthLabel}`)}.html`,
        title, subtitle, bodyHtml,
      })
    } finally { setBusy('') }
  }

  async function handleClientMonthlyPrint() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-monthly-print')
    try {
      const data  = await getClientMonthlyReportData(Number(selectedClientId), 2026, clientReportMonth)
      const monthLabel = `${MESES[data.month - 1]} ${data.year}`
      const title    = `Reporte Mensual — ${data.clientName}`
      const subtitle = `Posiciones abiertas y candidatos enviados en ${monthLabel}`
      const bodyHtml = buildClientMonthlyBody(data)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally { setBusy('') }
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setSelectedClientId('all')
  }

  function handleGeneralPreview() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({ filename: 'reporte-general.html', title, subtitle, bodyHtml }))
  }

  function handleGeneralDownload() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    downloadReportHtml({ filename: 'reporte-general.html', title, subtitle, bodyHtml })
  }

  function handleGeneralPrint() {
    if (!report) return
    const title = 'Reporte General'
    const subtitle = 'Vista consolidada de clientes con requerimientos abiertos, candidatos asociados y fases principales del pipeline.'
    const bodyHtml = buildGeneralBody(report.stageTotals, report.clients, {
      candidates: totalCandidatesGeneral,
      requirements: report.totalRequirements ?? 0,
      clients: report.totalClients ?? 0,
      visibleCandidates: report.totalClientCandidates ?? 0,
    })
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  function handleFilteredPreview() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({ filename: 'reporte-con-filtro.html', title, subtitle, bodyHtml }))
  }

  function handleFilteredDownload() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    downloadReportHtml({ filename: 'reporte-con-filtro.html', title, subtitle, bodyHtml })
  }

  function handleFilteredPrint() {
    if (!report) return
    const title = 'Reporte Con Filtro'
    const subtitle = 'Resumen ajustado por cliente y rango de fechas.'
    const bodyHtml = buildGeneralBody(visibleStageTotals, visibleClientsDetailed, {
      candidates: totalCandidatesGeneral,
      requirements: totalRequirementsVisible,
      clients: visibleClientsDetailed.length,
      visibleCandidates: totalClientCandidatesVisible,
    })
    openPrintableReport({ title, subtitle, bodyHtml })
  }

  async function handleClientPreview() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-preview')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-cliente-${client.clientName}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      }))
    } finally {
      setBusy('')
    }
  }

  async function handleClientDownload() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-download')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      downloadReportHtml({
        filename: `${slugify(`reporte-cliente-${client.clientName}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      })
    } finally {
      setBusy('')
    }
  }

  async function handleClientPrint() {
    if (!selectedClientId || selectedClientId === 'all') return
    setBusy('client-print')
    try {
      const client = await getClientReportPdfData(Number(selectedClientId))
      const title = `Reporte de Cliente - ${client.clientName}`
      const subtitle = 'Desglose del pipeline para requerimientos abiertos del cliente seleccionado.'
      const bodyHtml = buildClientBody(client)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementPreview() {
    if (!selectedRequirementId) return
    setBusy('requirement-preview')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      openPreview(title, subtitle, bodyHtml, () => downloadReportHtml({
        filename: `${slugify(`reporte-requerimiento-${requirement.jobTitle}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      }))
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementDownload() {
    if (!selectedRequirementId) return
    setBusy('requirement-download')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      downloadReportHtml({
        filename: `${slugify(`reporte-requerimiento-${requirement.jobTitle}`)}.html`,
        title,
        subtitle,
        bodyHtml,
      })
    } finally {
      setBusy('')
    }
  }

  async function handleRequirementPrint() {
    if (!selectedRequirementId) return
    setBusy('requirement-print')
    try {
      const requirement = await getRequirementReportPdfData(Number(selectedRequirementId))
      const title = `Reporte por Requerimiento - ${requirement.jobTitle}`
      const subtitle = `Cliente: ${requirement.clientName}`
      const bodyHtml = buildRequirementBody(requirement)
      openPrintableReport({ title, subtitle, bodyHtml })
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">EverTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/requirements" className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
            Ver requerimientos
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Reports</span>
              </div>
              <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Reports</h1>
              <p className="text-on-surface-variant text-base max-w-3xl">
                Resumen operativo de candidatos, requerimientos por cliente y distribucion de candidatos en cada fase del pipeline.
              </p>
            </div>
            <PortalButtons />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              <span className="text-sm">Cargando reportes...</span>
            </div>
          ) : report && (
            <>
              {/* 1. Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Candidatos totales" value={totalCandidatesGeneral.toLocaleString()} icon="group" tone="primary" />
                <MetricCard label="Requerimientos abiertos" value={totalRequirementsVisible.toLocaleString()} icon="assignment" tone="secondary" />
                <MetricCard label="Clientes visibles" value={visibleClientsDetailed.length.toLocaleString()} icon="apartment" tone="tertiary" />
                <MetricCard
                  label="Fase con mas candidatos"
                  value={topStage?.count?.toLocaleString?.() ?? '0'}
                  icon="insights"
                  tone="neutral"
                  sublabel={topStage ? topStage.name : 'Sin datos'}
                />
              </div>

              {/* 3. Tipos de reporte: Por cliente, General mensual */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Por cliente</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Selecciona un cliente y mes para ver posiciones abiertas, FTEs y candidatos enviados.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                      <option value="all">Selecciona un cliente</option>
                      {report.clients.map(client => (
                        <option key={client.clientId} value={client.clientId}>{client.clientName}</option>
                      ))}
                    </select>
                    <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={clientReportMonth} onChange={e => setClientReportMonth(Number(e.target.value))}>
                      {MESES.map((mes, i) => (
                        <option key={i + 1} value={i + 1}>{mes} 2026</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleClientMonthlyPreview} disabled={!selectedClientId || selectedClientId === 'all' || !!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleClientMonthlyDownload} disabled={!selectedClientId || selectedClientId === 'all' || !!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleClientMonthlyPrint} disabled={!selectedClientId || selectedClientId === 'all' || !!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-tertiary to-tertiary-container text-on-tertiary-container text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-primary">General mensual</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Todos los clientes: posiciones activas, FTEs y candidatos enviados en el mes.</p>
                  </div>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer" value={generalMonthlyMonth} onChange={e => setGeneralMonthlyMonth(Number(e.target.value))}>
                    {MESES.map((mes, i) => (
                      <option key={i + 1} value={i + 1}>{mes} 2026</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleGeneralMonthlyPreview} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Vista previa
                    </button>
                    <button onClick={handleGeneralMonthlyDownload} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Descargar
                    </button>
                    <button onClick={handleGeneralMonthlyPrint} disabled={!!busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      Imprimir PDF
                    </button>
                  </div>
                </section>
              </div>

              {/* 4. Weekly Submittals */}
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Weekly Submittals</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Candidatos enviados a cliente (fase "Submitted to Client") en la semana seleccionada.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedWeek}
                      onChange={e => setSelectedWeek(e.target.value)}
                      className="px-3 py-2 bg-surface-container-high border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                    >
                      {WEEKS_2026.map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {weeklyLoading ? (
                  <div className="flex items-center gap-2 py-4 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Cargando…
                  </div>
                ) : weeklyError ? (
                  <p className="text-sm text-red-400">{weeklyError}</p>
                ) : weeklySubmittals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container/40 px-4 py-6 text-sm text-on-surface-variant text-center">
                    Sin candidatos enviados a cliente en esta semana.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-container border-b border-outline-variant/10">
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Candidato</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Cliente</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Requerimiento</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Posición</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Fase actual</th>
                          <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Fecha enviado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklySubmittals.map((row, i) => (
                          <tr key={row.id} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container/30'}>
                            <td className="px-4 py-3 font-semibold text-primary">{toTitleCase(row.candidateName)}</td>
                            <td className="px-4 py-3 text-on-surface-variant">{row.clientName}</td>
                            <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">REQ-{String(row.reqNumber).padStart(3, '0')}</td>
                            <td className="px-4 py-3 text-on-surface-variant">{row.jobTitle}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                {row.currentStage}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-on-surface-variant">{fmtDate(row.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold self-center">
                    {weeklySubmittals.length} candidato{weeklySubmittals.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={handleWeeklyPreview} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    Vista previa
                  </button>
                  <button onClick={handleWeeklyDownload} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Descargar
                  </button>
                  <button onClick={handleWeeklyPrint} disabled={weeklyLoading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Imprimir PDF
                  </button>
                </div>
              </section>

              {/* 5. Detalle por cliente */}
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-primary">Detalle por cliente</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Solo se muestran clientes con requerimientos abiertos y las fases principales.</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {visibleClientsDetailed.map(client => (
                    <article key={client.clientId} className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-[0_2px_18px_rgba(24,28,30,0.06)] overflow-hidden">
                      <div className="px-6 py-5 border-b border-outline-variant/10 bg-gradient-to-r from-surface-container/60 to-transparent">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/70">Cliente</p>
                            <h3 className="mt-1 text-xl font-bold text-primary">{client.clientName}</h3>
                          </div>
                          <div className="flex gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {client.requirementCount} req
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                              {client.candidateCount} cand
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        {client.stages.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-outline-variant/25 bg-surface-container/40 px-4 py-4 text-sm text-on-surface-variant">
                            Este cliente no tiene fases configuradas.
                          </div>
                        ) : (
                          client.stages.map(stage => (
                            <div key={stage.name} className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-3 h-3 rounded-full border border-white/60 shrink-0" style={{ backgroundColor: stage.color }}></span>
                                <span className="text-sm font-semibold text-primary truncate">{stage.name}</span>
                              </div>
                              <span className="text-sm font-bold text-on-surface-variant">{stage.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* 6. Distribución global por fase */}
              <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0_2px_18px_rgba(24,28,30,0.06)] p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Distribucion global por fase</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Total de candidatos en las fases principales del pipeline para los clientes visibles.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">
                    {totalClientCandidatesVisible} candidatos ligados a requerimientos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {visibleStageTotals.map(stage => (
                    <div key={stage.name} className="rounded-2xl border border-outline-variant/10 bg-surface-container p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-white/60" style={{ backgroundColor: stage.color }}></span>
                        <p className="text-sm font-semibold text-primary">{stage.name}</p>
                      </div>
                      <p className="mt-3 text-3xl font-extrabold tracking-tight text-primary">{stage.count}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <ReportPreviewModal
        open={Boolean(preview)}
        title={preview?.title ?? ''}
        html={preview?.html ?? ''}
        onClose={() => setPreview(null)}
        onDownload={preview?.onDownload}
      />
    </>
  )
}
