import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'

const INITIAL_BOARDS = {
  acme: {
    color: 'blue',
    lanes: [
      { id: 'l1', name: 'Test 1', subtitle: 'Initial screening', cards: [{ id: 'c1', name: 'Ariana Lopez', status: 'Portfolio and intro call completed', note: 'Responsive and aligned with product thinking. Ready for Test 2.' }] },
      { id: 'l2', name: 'Test 2', subtitle: 'Design exercise', cards: [{ id: 'c2', name: 'Julia Chen', status: 'Waiting on design challenge feedback', note: 'Great UX rationale. Need final score from design lead.' }] },
      { id: 'l3', name: "Luke's Interview", subtitle: 'Completed panel', cards: [{ id: 'c3', name: 'Diego Tran', status: 'Passed collaborative round', note: "Strong stakeholder management. Move to Mark's interview this week." }] },
      { id: 'l4', name: "Mark's Interview", subtitle: 'Current focus', isCurrent: true, cards: [{ id: 'c4', name: 'Mark Lewis', status: 'Panel scheduled for Thursday', note: 'Strong product storytelling. Confirm availability and send case study prep.' }] },
      { id: 'l5', name: "Ross' Interview", subtitle: 'Tech assessment', cards: [{ id: 'c5', name: 'Ross Logan', status: 'Ready to schedule next step', note: 'Candidate passed previous round. Waiting for interviewer availability.' }] },
      { id: 'l6', name: "Kellena's Interview", subtitle: 'Follow-up stage', cards: [{ id: 'c6', name: 'Kellena Price', status: 'Pending response in 48h', note: 'Needs stronger follow-up and clearer scheduling options.' }] },
      { id: 'l7', name: '5th Interview', subtitle: 'Executive checkpoint', cards: [] },
      { id: 'l8', name: 'Final Interview', subtitle: 'Offer readiness', cards: [] },
    ],
  },
  pacvue: {
    color: 'orange',
    lanes: [
      { id: 'l1', name: 'HR Interview', subtitle: 'Recruiter screen', cards: [{ id: 'c1', name: 'Emma Stone', status: 'Salary and notice period validated', note: 'Good communication. Cleared to move to hiring manager.' }] },
      { id: 'l2', name: 'Hiring Manager', subtitle: 'Current stage', isCurrent: true, cards: [{ id: 'c2', name: 'Noah Ortiz', status: 'Backend deep dive pending', note: 'Share system design brief before the interview and collect scorecard feedback.' }] },
      { id: 'l3', name: 'Tech Interview', subtitle: 'Engineering review', cards: [{ id: 'c3', name: 'Liam Scott', status: 'Awaiting coding review slot', note: 'Candidate prefers mornings. Strong microservices background.' }] },
      { id: 'l4', name: 'Presentation', subtitle: 'Final loop', cards: [] },
    ],
  },
  blueconic: {
    color: 'violet',
    lanes: [
      { id: 'l1', name: 'HR Interview', subtitle: 'Talent acquisition', cards: [{ id: 'c1', name: 'Sofia Miller', status: 'Aligned on compensation range', note: 'Strong GTM exposure. Ready for next panel.' }] },
      { id: 'l2', name: 'Hiring Manager', subtitle: 'Business alignment', cards: [{ id: 'c2', name: 'Alex Rivera', status: 'Manager round completed', note: 'High executive presence. Move to team interview.' }] },
      { id: 'l3', name: 'Team Interview', subtitle: 'Current stage', isCurrent: true, cards: [{ id: 'c3', name: 'Jamie Brooks', status: 'Panel score still open', note: 'Need GTM case feedback from 2 interviewers before moving forward.' }] },
      { id: 'l4', name: 'Presentation', subtitle: 'Final presentation', cards: [] },
    ],
  },
}

const REQUIREMENTS = [
  { id: 'req-1', boardId: 'acme', reqId: 'REQ-2024-084', priorityLabel: 'High', priorityColor: 'text-error', priorityDot: 'bg-error', title: 'Senior Product Designer', client: 'Logic Monitor', clientInitial: 'A', clientBadgeBg: 'bg-blue-100', clientBadgeText: 'text-blue-700', salary: '$95,000', variable: '15% var', arrangement: 'Hybrid · New York, US', fte: "2 FTE's · 6 Months", targetFill: 'Nov 30, 2024', statusLabel: 'Open', statusBg: 'bg-secondary-container', statusText: 'text-on-secondary-container', statusDot: 'bg-secondary', phasesBg: 'bg-blue-50/40', phasesLabel: 'text-blue-600', phasesBorder: 'border-blue-100', phasesCompleted: '3 of 8', appDate: 'Oct 24, 2024', visa: 'Not required' },
  { id: 'req-2', boardId: 'pacvue', reqId: 'REQ-2024-085', priorityLabel: 'High', priorityColor: 'text-error', priorityDot: 'bg-error', title: 'Lead Backend Engineer', client: 'Pacvue', clientInitial: 'G', clientBadgeBg: 'bg-orange-100', clientBadgeText: 'text-orange-700', salary: '$120,000', variable: '20% var', arrangement: 'Remote · Austin, TX', fte: '1 FTE · Permanent', targetFill: 'Dec 15, 2024', statusLabel: 'Urgent', statusBg: 'bg-error-container', statusText: 'text-on-error-container', statusDot: 'bg-error', phasesBg: 'bg-orange-50/40', phasesLabel: 'text-orange-600', phasesBorder: 'border-orange-100', phasesCompleted: '1 of 4', appDate: 'Oct 22, 2024', visa: 'TBD' },
  { id: 'req-3', boardId: 'blueconic', reqId: 'REQ-2024-081', priorityLabel: 'Med', priorityColor: 'text-surface-tint', priorityDot: 'bg-surface-tint', title: 'Marketing Director', client: 'Blue Conic', clientInitial: 'S', clientBadgeBg: 'bg-violet-100', clientBadgeText: 'text-violet-700', salary: '$150,000', variable: '25% var', arrangement: 'On-site · Chicago, IL', fte: '1 FTE · Permanent', targetFill: 'Jan 10, 2025', statusLabel: 'Testing', statusBg: 'bg-surface-container-high', statusText: 'text-on-surface-variant', statusDot: 'bg-outline', phasesBg: 'bg-violet-50/40', phasesLabel: 'text-violet-600', phasesBorder: 'border-violet-100', phasesCompleted: '2 of 4', appDate: 'Oct 15, 2024', visa: 'Not required' },
]

function KanbanBoard({ boardId, board, onDragStart, onDragOver, onDrop, onDragEnd, onDragLeave, dragging, dragOver, canDrag }) {
  const c = board.color
  const laneBase = `rounded-3xl border border-${c}-100 bg-surface-container-lowest/70 p-3 space-y-3`
  const laneCurrent = `rounded-3xl border-2 border-${c}-200 bg-${c}-100/45 p-3 space-y-3`
  const badgeBg = `bg-${c}-100`
  const badgeText = `text-${c}-600`
  const labelText = `text-${c}-600`

  return (
    <div className="kanban-board">
      {board.lanes.map((lane) => {
        const isDragOver = dragOver?.boardId === boardId && dragOver?.laneId === lane.id
        return (
          <section key={lane.id} className="kanban-column">
            <div
              className={`kanban-lane ${lane.isCurrent ? laneCurrent : laneBase}${isDragOver ? ' drag-over' : ''}`}
              onDragOver={canDrag ? (e) => { e.preventDefault(); onDragOver(boardId, lane.id) } : undefined}
              onDrop={canDrag ? () => onDrop(boardId, lane.id) : undefined}
              onDragLeave={canDrag ? onDragLeave : undefined}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${lane.isCurrent ? `text-${c}-700` : labelText}`}>{lane.name}</p>
                  <p className={`text-xs ${lane.isCurrent ? `text-${c}-700/80` : 'text-on-surface-variant'}`}>{lane.subtitle}</p>
                </div>
                <span className={`text-[10px] font-bold ${lane.isCurrent ? `text-${c}-700 bg-surface-container-lowest` : `${badgeText} ${badgeBg}`} px-2 py-1 rounded-full`}>
                  {lane.cards.length}
                </span>
              </div>
              {lane.cards.map((card) => {
                const isDragging = dragging?.boardId === boardId && dragging?.cardId === card.id
                return (
                  <article
                    key={card.id}
                    className={`kanban-card rounded-2xl p-3 space-y-3${isDragging ? ' dragging' : ''}`}
                    draggable={canDrag}
                    onDragStart={canDrag ? () => onDragStart(boardId, lane.id, card.id) : undefined}
                    onDragEnd={canDrag ? onDragEnd : undefined}
                  >
                    <div>
                      <p className="text-sm font-bold text-primary">{card.name}</p>
                      <p className="text-[11px] text-on-surface-variant">{card.status}</p>
                    </div>
                    <textarea
                      className={`w-full rounded-2xl border border-${c}-100 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-${c}-200 focus:border-${c}-200`}
                      onClick={(e) => e.stopPropagation()}
                      defaultValue={card.note}
                      placeholder="Add recruiter notes..."
                    />
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default function Requirements() {
  const { can } = usePermissions()
  const [expanded, setExpanded] = useState({})
  const [boards, setBoards] = useState(INITIAL_BOARDS)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const toggleRow = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const handleDragStart = (boardId, laneId, cardId) => setDragging({ boardId, laneId, cardId })
  const handleDragEnd = () => { setDragging(null); setDragOver(null) }
  const handleDragOver = (boardId, laneId) => setDragOver({ boardId, laneId })
  const handleDragLeave = () => setDragOver(null)

  const handleDrop = (boardId, targetLaneId) => {
    if (!dragging || dragging.boardId !== boardId) return
    if (dragging.laneId === targetLaneId) return
    setBoards((prev) => {
      const board = prev[boardId]
      const srcIdx = board.lanes.findIndex((l) => l.id === dragging.laneId)
      const tgtIdx = board.lanes.findIndex((l) => l.id === targetLaneId)
      const card = board.lanes[srcIdx].cards.find((c) => c.id === dragging.cardId)
      if (!card) return prev
      const newLanes = board.lanes.map((lane, i) => {
        if (i === srcIdx) return { ...lane, cards: lane.cards.filter((c) => c.id !== dragging.cardId) }
        if (i === tgtIdx) return { ...lane, cards: [...lane.cards, card] }
        return lane
      })
      return { ...prev, [boardId]: { ...board, lanes: newLanes } }
    })
    setDragging(null)
    setDragOver(null)
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Ledger</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder="Search requirements..." type="text" />
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
          <img alt="User profile" className="w-8 h-8 rounded-full border border-outline-variant/30 cursor-pointer object-cover ml-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcjxCoEU9wqgY-RA76AIwKTdn1GjOF66DwOYITaUQg7dQ5rjK9CS9w5YxzIg1-zw6ZLzaieMyWh4iVZJYuWjJB_RB0DbrYWSTt6gcOYiaw8vPuvj5eUP0NqEg5LPou3UcQ1YY5s6p35xp827zSyE6oywlUV5eSwQib2m5kCcFwNLcGrCnhNWaZ17fsBzhrliKPw8wu1m0g9tTyxRCD0_6nRVtmuoBii36VvWbn3-2MXqCjK3i0Uij3nxvIi5n20KRR2ZZUfWRj" />
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Requirements</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Requirements</h1>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold">42</span>
              </div>
              <p className="text-on-surface-variant text-base">Manage and track active client requisitions across all portfolios.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 text-primary rounded-xl text-sm font-medium hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[16px]">download</span>Export
              </button>
              {can('requirements.create') && (
                <Link to="/requirements/new">
                  <button className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined text-[16px]">add</span>New Requirement
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:w-1/3">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Search</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-shadow placeholder:text-on-surface-variant" placeholder="ID, title, or client..." type="text" />
                </div>
              </div>
              <div className="w-full lg:w-2/3 flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Status</label>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    <option>All Statuses</option><option>Open</option><option>Testing</option><option>Urgent</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Client</label>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    <option>All Clients</option><option>Logic Monitor</option><option>Pacvue</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Date Range</label>
                  <select className="w-full px-3 py-2.5 bg-surface-container-high border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    <option>Last 30 Days</option><option>Last 90 Days</option><option>This Year</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button className="px-4 py-2.5 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">Clear</button>
                  <button className="px-4 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">filter_list</span>Apply
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/10">
              <span className="text-xs font-medium text-on-surface-variant mr-1">Active filters:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/[0.08] text-primary text-xs font-medium border border-primary/[0.15]">
                Status: Open <button className="hover:text-error transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium border border-outline-variant/20">
                Last 30 days <button className="hover:text-error transition-colors"><span className="material-symbols-outlined text-[12px]">close</span></button>
              </span>
            </div>
          </div>

          {/* Requirement Rows */}
          <div className="space-y-3">
            {REQUIREMENTS.map((req) => {
              const isExpanded = expanded[req.id]
              const board = boards[req.boardId]
              return (
                <div key={req.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_12px_rgba(24,28,30,0.04)] overflow-hidden">
                  {/* Main row */}
                  <div
                    className="req-row grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-2 items-center px-5 py-4 cursor-pointer group hover:bg-surface-container/30 transition-colors"
                    onClick={() => toggleRow(req.id)}
                  >
                    <div className="lg:col-span-1 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${req.priorityDot} shrink-0`}></span>
                      <span className={`text-[10px] font-bold ${req.priorityColor} uppercase tracking-wide`}>{req.priorityLabel}</span>
                    </div>
                    <div className="lg:col-span-3">
                      <span className="font-mono text-xs text-on-surface-variant">{req.reqId}</span>
                      <p className="font-semibold text-primary text-sm leading-tight group-hover:text-surface-tint transition-colors">{req.title}</p>
                    </div>
                    <div className="lg:col-span-2 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${req.clientBadgeBg} flex items-center justify-center text-[11px] font-bold ${req.clientBadgeText} shrink-0`}>{req.clientInitial}</div>
                      <div>
                        <p className="text-xs font-semibold text-primary">{req.client}</p>
                        <p className="text-[10px] text-on-surface-variant">Stage: Active</p>
                      </div>
                    </div>
                    <div className="lg:col-span-2 space-y-0.5">
                      <p className="text-xs text-on-surface-variant"><span className="font-medium text-primary">{req.salary}</span> · {req.variable}</p>
                      <p className="text-xs text-on-surface-variant">{req.arrangement}</p>
                      <p className="text-xs text-on-surface-variant">{req.fte}</p>
                    </div>
                    <div className="lg:col-span-2 text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Target Fill</p>
                      <p className="text-sm font-semibold text-primary">{req.targetFill}</p>
                    </div>
                    <div className="lg:col-span-2 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${req.statusBg} ${req.statusText} tracking-wide uppercase`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${req.statusDot}`}></span>{req.statusLabel}
                      </span>
                      <div className="row-actions flex gap-1">
                        {can('requirements.edit') && (
                          <button title="Edit" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors" onClick={(e) => e.stopPropagation()}>
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        )}
                        {can('requirements.delete') && (
                          <button title="Delete" className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors" onClick={(e) => e.stopPropagation()}>
                            <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                          </button>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                    </div>
                  </div>

                  {/* Pipeline panel */}
                  {isExpanded && (
                    <div className={`border-t ${req.phasesBorder} ${req.phasesBg} px-5 py-4`}>
                      <p className={`text-[10px] font-bold ${req.phasesLabel} uppercase tracking-widest mb-3`}>
                        Interview Pipeline — {req.client}
                      </p>
                      <KanbanBoard
                        boardId={req.boardId}
                        board={board}
                        dragging={dragging}
                        dragOver={dragOver}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        canDrag={can('requirements.pipeline')}
                      />
                      <div className={`flex items-center justify-between mt-2 pt-3 border-t ${req.phasesBorder}`}>
                        <p className={`text-xs ${req.phasesLabel}`}>
                          <span className="font-bold">{req.phasesCompleted}</span> phases completed · App. Date: {req.appDate} · VISA: {req.visa}
                        </p>
                        {can('requirements.edit') && (
                          <Link to="/requirements/new" className={`text-xs font-semibold ${req.phasesLabel} hover:opacity-80 transition-opacity flex items-center gap-1`}>
                            Edit Requirement <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination */}
            <div className="mt-2 px-1 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-on-surface-variant">
                Showing <span className="font-semibold text-primary">1</span>–<span className="font-semibold text-primary">3</span> of <span className="font-semibold text-primary">42</span> requirements
              </p>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40" disabled>
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-primary text-on-primary text-sm font-bold">1</button>
                <button className="w-8 h-8 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">2</button>
                <button className="w-8 h-8 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">3</button>
                <span className="text-on-surface-variant px-1">…</span>
                <button className="w-8 h-8 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">14</button>
                <button className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
