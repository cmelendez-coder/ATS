import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

function NavItem({ to, end, icon, label, collapsed = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        collapsed
          ? 'flex justify-center py-1 rounded-lg transition-all duration-150'
          : isActive
            ? 'nav-active flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/8 hover:text-white transition-colors duration-200'
      }
    >
      {({ isActive }) => (
        <>
          {collapsed ? (
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-[#1f6d44]/30 text-[#81b927]' : 'bg-white/8 text-white/50 hover:bg-white/12 hover:text-white'}`}>
              <span className={`material-symbols-outlined text-[20px]${isActive ? ' filled' : ''}`}>{icon}</span>
            </span>
          ) : (
            <span className={`material-symbols-outlined text-[20px] shrink-0${isActive ? ' filled' : ''}`}>{icon}</span>
          )}
          {!collapsed && <span className="font-medium text-sm">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed = false, onToggle }) {
  const { session, clearSession } = useAuth()
  const navigate = useNavigate()
  const { can } = usePermissions()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <nav className={`hidden md:flex flex-col h-full py-6 px-4 bg-surface-container-low border-r border-white/[0.06] fixed left-0 top-0 z-50 shrink-0 transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Brand */}
      <div className={`flex items-center px-2 mb-8 ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
          <img
            src="/icon-prt.png"
            alt="PRT Icon"
            className="w-10 h-10 object-contain shrink-0"
          />
          {!collapsed && (
            <div>
              <h1 className="text-[1.2rem] font-bold text-[#81b927] tracking-tight leading-tight">EverTrack</h1>
              <p className="text-[10px] text-white/40 leading-snug italic">&ldquo;Talento alineado.<br />Requerimientos cubiertos.<br />Clientes satisfechos.&rdquo;</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors ${collapsed ? 'absolute top-6 -right-4 bg-[#10284d] border border-white/10 shadow-sm' : ''}`}
          title={collapsed ? 'Expandir menu' : 'Contraer menu'}
        >
          <span className="material-symbols-outlined text-[18px]">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div>
          {!collapsed && <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-1.5">Requirements</p>}
          <div className="space-y-0.5">
            <NavItem to="/" end icon="dashboard" label="Dashboard" collapsed={collapsed} />
            <NavItem to="/reports" icon="analytics" label="Reports" collapsed={collapsed} />
            <NavItem to="/tracker" icon="table_view" label="Tracker" collapsed={collapsed} />
            <NavItem to="/requirements" icon="list_alt" label="Requirements" collapsed={collapsed} />
          </div>
        </div>
        <div>
          {!collapsed && <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-1.5">Client&apos;s</p>}
          <div className="space-y-0.5">
            <NavItem to="/clients" icon="apartment" label="Client Directory" collapsed={collapsed} />
          </div>
        </div>
        <div>
          {!collapsed && <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-1.5">Talent</p>}
          <div className="space-y-0.5">
            <NavItem to="/talent" end icon="group" label="Talent Directory" collapsed={collapsed} />
            {can('talent.create') && <NavItem to="/talent/new" icon="person_add" label="Add Talent" collapsed={collapsed} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-white/[0.08]">
        {/* Logged-in user */}
        {session?.user && (
          <div className={`px-3 py-2 mb-2 rounded-lg bg-white/8 ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`} title={collapsed ? session.user.name : undefined}>
            <div className="w-7 h-7 rounded-full bg-[#1f6d44] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {session.user.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                <p className="text-[10px] text-white/40 truncate">{session.user.username}</p>
              </div>
            )}
          </div>
        )}
        <a href="#" className={`px-3 py-2 rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`} title="Help Center">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
          {!collapsed && <span className="text-sm">Help Center</span>}
        </a>
        <button
          onClick={handleLogout}
          className={`w-full px-3 py-2 rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}
          title="Log Out"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span className="text-sm">Log Out</span>}
        </button>
      </div>
    </nav>
  )
}
