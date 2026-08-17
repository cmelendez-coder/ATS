function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildReportHtml({ title, subtitle = '', bodyHtml = '' }) {
  const svgLogoUrl = `${window.location.origin}/${encodeURIComponent('Recurso 1.svg')}`
  const fallbackLogoUrl = `${window.location.origin}/logo-prt.png`

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --ink: #10213d;
        --muted: #60708b;
        --line: #d6dce5;
        --panel: #f8fafc;
        --brand: #143b7a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: var(--ink);
        background: white;
      }
      .page { padding: 40px 44px 56px; }
      .header {
        border-bottom: 2px solid var(--brand);
        padding-bottom: 18px;
        margin-bottom: 24px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
      }
      .header-copy { flex: 1 1 auto; min-width: 0; }
      .header-logo { flex: 0 0 auto; }
      .header-logo img { width: 180px; height: auto; display: block; }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 700;
      }
      h1 { margin: 10px 0 8px; font-size: 32px; line-height: 1.05; }
      .subtitle { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 760px; }
      .timestamp { margin-top: 14px; font-size: 12px; color: var(--muted); }
      .section { margin-top: 28px; }
      .section h2 { font-size: 18px; margin: 0 0 12px; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .card {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        padding: 14px 16px;
      }
      .card .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--muted);
        font-weight: 700;
      }
      .card .value { margin-top: 8px; font-size: 28px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td {
        border-bottom: 1px solid var(--line);
        padding: 10px 8px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 11px;
      }
      .pill {
        display: inline-block;
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 11px;
        font-weight: 700;
        background: #e9eef8;
        color: var(--brand);
      }
      .stage-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .stage-row {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .stage-name { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 700; }
      .dot {
        width: 11px;
        height: 11px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,0.08);
        flex: 0 0 auto;
      }
      .muted { color: var(--muted); }
      @media print { .page { padding: 22px 24px 28px; } }
      @media screen and (max-width: 900px) {
        .grid, .stage-list { grid-template-columns: 1fr; }
        .header { flex-direction: column; }
        .header-logo img { width: 100px; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="header-copy">
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="header-logo">
          <img
            src="${escapeHtml(svgLogoUrl)}"
            alt="PRT Logo"
            onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogoUrl)}';"
          />
        </div>
      </div>
      ${bodyHtml}
    </div>
  </body>
</html>`
}

export function openPrintableReport(report) {
  const reportHtml = buildReportHtml(report)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'

  document.body.appendChild(iframe)

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 1000)
  }

  const iframeWindow = iframe.contentWindow
  if (!iframeWindow) {
    document.body.removeChild(iframe)
    throw new Error('No se pudo preparar la impresion del reporte.')
  }

  iframe.onload = () => {
    setTimeout(() => {
      iframeWindow.focus()
      iframeWindow.print()
      cleanup()
    }, 250)
  }

  iframeWindow.document.open()
  iframeWindow.document.write(reportHtml)
  iframeWindow.document.close()
}

export function downloadReportHtml({ filename, title, subtitle = '', bodyHtml = '' }) {
  const reportHtml = buildReportHtml({ title, subtitle, bodyHtml })
  const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function renderMetricCards(metrics) {
  return `
    <section class="section">
      <div class="grid">
        ${metrics.map(metric => `
          <div class="card">
            <div class="label">${escapeHtml(metric.label)}</div>
            <div class="value">${escapeHtml(metric.value)}</div>
            ${metric.subvalue ? `<div class="muted">${escapeHtml(metric.subvalue)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `
}

export function renderStageList(title, stages) {
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <div class="stage-list">
        ${stages.map(stage => `
          <div class="stage-row">
            <div class="stage-name">
              <span class="dot" style="background:${escapeHtml(stage.color ?? '#64748B')}"></span>
              <span>${escapeHtml(stage.name)}</span>
            </div>
            <strong>${escapeHtml(stage.count)}</strong>
          </div>
        `).join('')}
      </div>
    </section>
  `
}

export function renderTable(title, columns, rows) {
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </section>
  `
}

export { escapeHtml }
