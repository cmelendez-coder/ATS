import { Link } from 'react-router-dom'

export default function RequirementAlertBell({ count = 0, show = false, loading = false }) {
  if (!show) return null

  const title = loading
    ? 'Cargando alertas'
    : count > 0
      ? `${count} requerimiento${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''} por agregar al pipeline`
      : 'Sin requerimientos pendientes'

  return (
    <Link
      to="/requirements"
      title={title}
      className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center relative"
    >
      <span className="material-symbols-outlined text-[20px]">notifications</span>
      {!loading && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
