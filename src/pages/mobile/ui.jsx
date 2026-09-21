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
