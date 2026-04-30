import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'

export default function Dashboard() {
  const { can } = usePermissions()
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
  }, [])

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Ledger</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder="Search entries..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button title="Notifications" className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center relative">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button title="Settings" className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          {can('requirements.create') && (
            <Link to="/requirements/new">
              <button className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
                Create Request
              </button>
            </Link>
          )}
          <img alt="User profile" className="w-8 h-8 rounded-full border border-outline-variant/30 cursor-pointer object-cover ml-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLD9bP3-r7Y1FMgA_DiydrgkO9ruUJqcqfRJjnKEGiVhTxGM9VRWq4oWh0IQrY7mdo0ng7EnsDh2R9CVM0E7BxasiieXGD7-IqdDYRJwjzcgguemcXWw0LWJFMdqApM8frbNogeoLTzOkoXA-9j-DVeKFne2MEjjTZiddIA9G9BY2VNcLrsqjBdPxBVfuBaWYCgSGoDcIR77HbI7afuiz_hyqCrrNCIo46sQQAWhsWDEiDAK8S2QMZcrDtkbXa-v_oU6rkYoSf" />
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Overview</h1>
            <p className="text-sm font-medium text-on-surface-variant shrink-0 pb-1">{currentDate}</p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {can('requirements.create') && (
              <Link to="/requirements/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Requirement
              </Link>
            )}
            <Link to="/requirements" className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-primary rounded-full text-sm font-medium hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">list_alt</span>
              All Requirements
            </Link>
          </div>

          {/* Summary Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link to="/requirements" className="stat-card block bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-outline-variant/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none"></div>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">Open Requirements</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[10px] font-bold">
                  <span className="material-symbols-outlined filled text-[10px]">arrow_upward</span>+2 this week
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl tracking-tighter font-light text-primary">5</span>
                <span className="material-symbols-outlined text-secondary text-2xl filled">trending_up</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-3">2 flagged as high priority</p>
            </Link>

            <Link to="/clients" className="stat-card block bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(24,28,30,0.05)] relative overflow-hidden border border-outline-variant/10">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.12] via-primary/[0.03] to-transparent pointer-events-none"></div>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xs uppercase tracking-[0.08em] font-bold text-on-surface-variant">Client&apos;s</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                  <span className="material-symbols-outlined filled text-[10px]">apartment</span>Directory
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl tracking-tighter font-light text-primary">3</span>
                <span className="material-symbols-outlined text-secondary text-2xl filled">business</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-3">Office, timezone, sector and business details</p>
            </Link>
          </div>

          {/* Priority Requests + Recent Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-surface-container-low rounded-2xl p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-primary">Priority Requests</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Sorted by urgency — action required</p>
                </div>
                <Link to="/requirements" className="text-sm font-medium text-surface-tint hover:text-primary transition-colors flex items-center gap-1">
                  View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'REQ-102', title: 'Sr. Product Manager', client: 'Logic Monitor', due: 'Oct 12, 2023', level: 'High', levelBg: 'bg-error-container', levelText: 'text-on-error-container', iconBg: 'bg-error-container/20', icon: 'warning', iconColor: 'text-error', dueColor: 'text-error', note: 'Overdue 2 days' },
                  { id: 'REQ-098', title: 'UX Researcher', client: 'PacVue', due: 'Oct 15, 2023', level: 'Medium', levelBg: 'bg-secondary-container', levelText: 'text-on-secondary-container', iconBg: 'bg-secondary-container/30', icon: 'pending', iconColor: 'text-on-secondary-container', dueColor: 'text-primary', note: '3 days left' },
                  { id: 'REQ-114', title: 'Lead Engineer', client: 'Pacvue', due: 'Oct 20, 2023', level: 'Low', levelBg: 'bg-surface-variant', levelText: 'text-on-surface-variant', iconBg: 'bg-surface-container-highest', icon: 'schedule', iconColor: 'text-outline', dueColor: 'text-primary', note: '8 days left' },
                ].map((req) => (
                  <div key={req.id} className="bg-surface-container-lowest p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_8px_rgba(24,28,30,0.04)] hover:shadow-[0_4px_20px_rgba(24,28,30,0.07)] transition-all duration-200 cursor-pointer group border border-outline-variant/10">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl ${req.iconBg} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined ${req.iconColor} filled`}>{req.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">{req.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${req.levelBg} ${req.levelText}`}>{req.level}</span>
                        </div>
                        <h4 className="text-base font-semibold text-primary group-hover:text-surface-tint transition-colors">{req.title}</h4>
                        <p className="text-sm text-on-surface-variant mt-0.5">{req.client} · <span className={`${req.dueColor} font-medium text-xs`}>{req.note}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Due Date</span>
                        <span className={`font-medium text-sm ${req.dueColor} mt-0.5`}>{req.due}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button title="View details" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </button>
                        <button title="Edit" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl p-7 shadow-[0_2px_16px_rgba(24,28,30,0.05)] border border-outline-variant/10 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold tracking-tight text-primary">Recent Activity</h2>
                <button className="text-xs font-medium text-on-surface-variant hover:text-primary transition-colors">Mark all read</button>
              </div>
              <div className="flex-1 space-y-5">
                {[
                  { icon: 'check_circle', iconBg: 'bg-secondary-container', iconColor: 'text-on-secondary-container', text: <><span className="font-semibold text-primary">REQ-097</span> marked as <span className="text-secondary font-medium">Resolved</span></>, sub: 'Data Analyst · Blue Conic', time: '2h ago' },
                  { icon: 'priority_high', iconBg: 'bg-error-container', iconColor: 'text-error', text: <><span className="font-semibold text-primary">REQ-102</span> escalated to <span className="text-error font-medium">High Priority</span></>, sub: 'Sr. Product Manager · Logic Monitor', time: '5h ago' },
                  { icon: 'add_circle', iconBg: 'bg-surface-container', iconColor: 'text-primary', text: <>New requirement <span className="font-semibold text-primary">REQ-114</span> created</>, sub: 'Lead Engineer · Pacvue', time: 'Yesterday' },
                  { icon: 'edit_note', iconBg: 'bg-primary-fixed', iconColor: 'text-on-primary-fixed', text: <><span className="font-semibold text-primary">REQ-098</span> details updated</>, sub: 'UX Researcher · PacVue', time: '2 days ago' },
                ].map((activity, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-full ${activity.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`material-symbols-outlined ${activity.iconColor} text-[15px] filled`}>{activity.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface leading-snug">{activity.text}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{activity.sub}</p>
                    </div>
                    <span className="text-xs text-on-surface-variant shrink-0 mt-0.5">{activity.time}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-outline-variant/10">
                <a href="#" className="text-sm font-medium text-surface-tint hover:text-primary transition-colors flex items-center gap-1">
                  View full history <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
