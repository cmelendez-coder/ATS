import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="bg-surface text-on-surface h-screen flex overflow-hidden antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />
      <main
        className={`flex-1 flex flex-col relative h-full overflow-y-auto transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}
        onClick={() => { if (!sidebarCollapsed) setSidebarCollapsed(true) }}
      >
        {children}
      </main>
    </div>
  )
}
