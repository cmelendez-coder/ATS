import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const TABS = [
  { to: '/m',         label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/m/tracker', label: 'Tracker',   icon: 'fact_check' },
]

export default function MobileLayout({ title, children }) {
  const { clearSession } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f2f5f9] text-[#10284d] antialiased">
      <header className="shrink-0 bg-[#071d47] pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/pwa-192.png" alt="" className="w-8 h-8 rounded-lg" />
            <div className="leading-tight">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-white/50">EverTrack</p>
              <h1 className="text-base font-bold text-white">{title}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-white/60 active:bg-white/10"
          >
            <span className="material-symbols-outlined text-[1.375rem]">logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>

      <nav className="shrink-0 grid grid-cols-2 bg-[#071d47] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 h-16 text-[0.6875rem] font-semibold transition-colors ${
                isActive ? 'text-[#81b927]' : 'text-white/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[1.5rem]"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >{tab.icon}</span>
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
