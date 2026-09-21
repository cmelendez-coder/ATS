import { useEffect } from 'react'

/** Bloque gris pulsante para estados de carga */
export function Skeleton({ className = '', tone = 'light' }) {
  return (
    <div className={`animate-pulse rounded-lg ${tone === 'dark' ? 'bg-white/15' : 'bg-[#10284d]/10'} ${className}`} />
  )
}

/** Iniciales (máx. 2) de un nombre completo */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** "Week 39 · 2026" */
export function weekLabel(week, year) {
  return `Week ${String(week).padStart(2, '0')} · ${year}`
}

/** "5 ago 2026" */
export function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Hoja inferior oscura de solo lectura. Se cierra con el fondo, la X o el botón "atrás" (vía useRouteSheet). */
export function Sheet({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="sheet-up w-full max-h-[88dvh] flex flex-col rounded-t-3xl bg-[#0b1e3d] border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 -mr-2 -mt-1 shrink-0 flex items-center justify-center rounded-full text-white/50 active:bg-white/10"
          >
            <span className="material-symbols-outlined text-[1.375rem]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
