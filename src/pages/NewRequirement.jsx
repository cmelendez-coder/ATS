import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function NewRequirement() {
  const [priority, setPriority] = useState('medium')
  const [charCount, setCharCount] = useState(0)

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
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors w-9 h-9 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/40 mx-1"></div>
          <button className="hidden sm:flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm opacity-60 cursor-default">
            Create Request
          </button>
          <img alt="User profile" className="w-8 h-8 rounded-full border border-outline-variant/30 cursor-pointer object-cover ml-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfoZntbnSVquXsK50Nw-YLiq5gTq1lvOmGXF-Nz-TV0dhUEgcIx78M-gK8NDnYgrHFThkoLEhP7ahgd6WTZunDQwpcoO2Ti_j0CPMiDSx9UlfJPfhX1M5lChydNM-i6Zp6m80XsWvGHCrHT3djYpRKpwfOfuPt51fOMZXu9v2ZoIUYiYRounp0Z9xsN9WHD-uyEUcLdj0kOhQCsC9PZ3bb-s6CH4HNBpn-NnvR2jJ2z1PMc4N_RbxUiKixTZ_OyaafId8Rcu9X" />
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Page Header */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <Link to="/requirements" className="hover:text-primary transition-colors">Requirements</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-medium">New Requirement</span>
            </div>
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">New Requirement</h1>
            <p className="text-on-surface-variant text-base max-w-xl">
              Detail the new client specification below. Fields marked <span className="text-error font-medium">*</span> are required.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">

            {/* Row 1: Identification + Position */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Identification */}
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary-container/60 rounded-l-2xl"></div>
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">tag</span>Identification
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Num. Requirement</label>
                    <input className="form-field font-mono opacity-70 cursor-not-allowed" value="REQ-2024-086" type="text" readOnly />
                    <p className="text-xs text-on-surface-variant mt-1">Auto-generated.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Application Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Stage</label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9">
                        <option value="new">New</option>
                        <option value="active">Active</option>
                        <option value="on-hold">On Hold</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Status <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9">
                        <option value="open">Open</option>
                        <option value="in-process">In Process</option>
                        <option value="testing">Testing</option>
                        <option value="urgent">Urgent</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Priority <span className="text-error">*</span></label>
                    <div className="flex bg-surface-container p-1 rounded-xl">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`priority-btn flex-1 py-1.5 text-xs rounded-lg transition-all focus:outline-none ${priority === p ? 'active text-primary' : 'font-medium text-on-surface-variant hover:text-primary'}`}
                          onClick={() => setPriority(p)}
                        >
                          {p === 'low' ? 'Low' : p === 'medium' ? 'Med' : 'High'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">First Resource Sent</label>
                    <input className="form-field" type="date" />
                    <p className="text-xs text-on-surface-variant mt-1">Date the first candidate was submitted.</p>
                  </div>
                </div>
              </div>

              {/* Position Details */}
              <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary/10 to-transparent"></div>
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">work</span>Position Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Client <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. Acme Corp" type="text" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Job Title <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. Senior Backend Engineer" type="text" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Duration</label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9">
                        <option value="">Select…</option>
                        <option value="permanent">Permanent</option>
                        <option value="3m">3 Months</option>
                        <option value="6m">6 Months</option>
                        <option value="12m">12 Months</option>
                        <option value="contract">Contract</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">FTE&apos;s <span className="text-error">*</span></label>
                    <input className="form-field" placeholder="e.g. 2" type="number" min="1" />
                    <p className="text-xs text-on-surface-variant mt-1">Number of positions to fill.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Target Fill Date <span className="text-error">*</span></label>
                    <input className="form-field" type="date" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Desired Location</label>
                    <input className="form-field" placeholder="e.g. Mexico City / Remote" type="text" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Compensation + Work Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Compensation */}
              <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">payments</span>Compensation
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Salary Cap <span className="text-error">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">$</span>
                      <input className="form-field pl-7" placeholder="0.00" type="number" min="0" step="100" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Variable</label>
                    <div className="relative">
                      <input className="form-field pr-8" placeholder="0" type="number" min="0" max="100" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-medium">%</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">Performance bonus percentage.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Employment Benefits</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Health Insurance', 'Life Insurance', 'Dental & Vision', '401(k) / Pension', 'PTO / Paid Leave', 'Stock Options'].map((b) => (
                        <label key={b} className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
                          <input type="checkbox" className="rounded border-outline-variant/40 text-secondary focus:ring-secondary/30" /> {b}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10">
                <h2 className="text-base font-semibold text-primary mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">apartment</span>Work Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Work Arrangement <span className="text-error">*</span></label>
                    <div className="relative">
                      <select className="form-field appearance-none cursor-pointer pr-9">
                        <option value="">Select…</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="on-site">On-site</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">arrow_drop_down</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Office Hours</label>
                    <input className="form-field" placeholder="e.g. Mon–Fri 9am–6pm CST" type="text" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">VISA US Required</label>
                    <div className="flex items-center gap-4">
                      {[{ value: 'yes', label: 'Yes — Sponsorship available' }, { value: 'no', label: 'No — Not required' }, { value: 'tbd', label: 'TBD' }].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="radio" name="visa" value={value} defaultChecked={value === 'no'} className="text-secondary focus:ring-secondary/30" />
                          <span className="text-sm text-on-surface-variant">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Special Request / Notes</label>
                      <span className="text-xs text-on-surface-variant">{charCount} / 500</span>
                    </div>
                    <textarea
                      className="form-field resize-none"
                      rows={4}
                      placeholder="Any specific requirements, notes, or context for this position…"
                      maxLength={500}
                      onChange={(e) => setCharCount(e.target.value.length)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.04)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant filled">info</span>
                <p className="text-xs text-on-surface-variant">Fields marked <span className="text-error font-medium">*</span> are required. Entry saved as draft until submitted.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/requirements">
                  <button type="button" className="px-5 py-2.5 rounded-full border border-outline-variant/30 text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                </Link>
                <button type="button" className="px-5 py-2.5 rounded-full border border-outline-variant/30 text-primary text-sm font-medium hover:bg-surface-container transition-colors">
                  Save Draft
                </button>
                <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary py-2.5 px-7 rounded-full text-sm font-semibold hover:opacity-90 hover:shadow-[0_8px_24px_rgba(0,7,38,0.18)] transition-all flex items-center gap-2 group shadow-[0_4px_16px_rgba(0,7,38,0.12)]">
                  <span>Submit Requirement</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
