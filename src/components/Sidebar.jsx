import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

const linkClass = ({ isActive }) =>
  isActive
    ? 'nav-active flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150'
    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors duration-200'

function NavItem({ to, end, icon, label }) {
  return (
    <NavLink to={to} end={end} className={linkClass}>
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined text-[20px]${isActive ? ' filled' : ''}`}>{icon}</span>
          <span className="font-medium text-sm">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { session, clearSession } = useAuth()
  const navigate = useNavigate()
  const { can } = usePermissions()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="hidden md:flex flex-col h-full py-6 px-4 bg-surface-container-low border-r border-outline-variant/20 w-64 fixed left-0 top-0 z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm shrink-0">
          <span className="material-symbols-outlined text-on-primary text-[18px] filled">corporate_fare</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-primary tracking-tight leading-tight">PRT Suite</h1>
          <p className="text-[11px] text-on-surface-variant leading-tight">Talent, Client&apos;s &amp; Requirements</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest px-3 mb-1.5">Requirements</p>
          <div className="space-y-0.5">
            <NavItem to="/" end icon="dashboard" label="Dashboard" />
            <NavItem to="/requirements" icon="list_alt" label="Requirements" />
            {can('requirements.create') && <NavItem to="/requirements/new" icon="add_circle" label="New Requirement" />}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest px-3 mb-1.5">Client&apos;s</p>
          <div className="space-y-0.5">
            <NavItem to="/clients" icon="apartment" label="Client Directory" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest px-3 mb-1.5">Talent</p>
          <div className="space-y-0.5">
            <NavItem to="/talent" end icon="group" label="Talent Directory" />
            {can('talent.create') && <NavItem to="/talent/new" icon="person_add" label="Add Talent" />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-outline-variant/20">
        {/* Logged-in user */}
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-surface-container">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-on-primary text-xs font-bold">
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{session.user.name}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{session.user.username}</p>
            </div>
          </div>
        )}
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
          <span className="text-sm">Help Center</span>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </nav>
  )
}
