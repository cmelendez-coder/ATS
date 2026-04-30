import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'

const EMPTY_FORM = { name: '', jobTitle: '', email: '', mobile: '', location: '', timeZone: '' }

const clients = [
  {
    name: 'Logic Monitor',
    sector: 'SaaS',
    details: {
      'Office Location': 'New York, US',
      Country: 'United States',
      'Business Hours': '9:00 AM - 6:00 PM',
      Benefits: 'Health, PTO, Bonus',
      'Headquarters Location': 'Santa Barbara, California',
      'Time Zone': 'EST / PST',
      Sector: 'Monitoring Software',
    },
    contacts: [
      { id: 1, name: 'Sarah Johnson', jobTitle: 'HR Director', email: 'sarah.j@logicmonitor.com', mobile: '+1 212-555-0101', location: 'New York, US', timeZone: 'EST' },
    ],
  },
  {
    name: 'Pacvue',
    sector: 'Ecommerce',
    details: {
      'Office Location': 'Austin, Texas',
      Country: 'United States',
      'Business Hours': '8:00 AM - 5:00 PM',
      Benefits: 'Medical, 401k, Remote',
      'Headquarters Location': 'Seattle, Washington',
      'Time Zone': 'CST / PST',
      Sector: 'Retail Media',
    },
    contacts: [
      { id: 2, name: 'Michael Chen', jobTitle: 'HR Manager', email: 'm.chen@pacvue.com', mobile: '+1 512-555-0202', location: 'Austin, TX', timeZone: 'CST' },
    ],
  },
  {
    name: 'BlueConic',
    sector: 'MarTech',
    details: {
      'Office Location': 'Chicago, Illinois',
      Country: 'United States',
      'Business Hours': '9:00 AM - 5:30 PM',
      Benefits: 'Dental, Vision, Equity',
      'Headquarters Location': 'Boston, Massachusetts',
      'Time Zone': 'CST / EST',
      Sector: 'Customer Data Platform',
    },
    contacts: [
      { id: 3, name: 'Emma Davis', jobTitle: 'People Operations Lead', email: 'e.davis@blueconic.com', mobile: '+1 773-555-0303', location: 'Chicago, IL', timeZone: 'CST' },
    ],
  },
]

export default function Clients() {
  const { can } = usePermissions()
  const [contactsMap, setContactsMap] = useState(() =>
    Object.fromEntries(clients.map(c => [c.name, c.contacts ?? []]))
  )
  const [addingFor, setAddingFor] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function openAdd(clientName) {
    setAddingFor(clientName)
    setForm(EMPTY_FORM)
  }

  function handleSave(clientName) {
    if (!form.name.trim()) return
    setContactsMap(prev => ({
      ...prev,
      [clientName]: [...prev[clientName], { ...form, id: Date.now() }],
    }))
    setAddingFor(null)
    setForm(EMPTY_FORM)
  }

  function handleDelete(clientName, id) {
    setContactsMap(prev => ({
      ...prev,
      [clientName]: prev[clientName].filter(c => c.id !== id),
    }))
  }

  const inputCls = 'bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary/30 w-full'

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Ledger</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder="Search clients..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto bg-surface p-6 md:p-10 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-medium">Client&apos;s</span>
              </div>
              <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">Client&apos;s</h1>
              <p className="text-on-surface-variant text-base">Office, timezone, sector and client operating details used during recruiting intake.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-sm font-semibold">
              <span className="material-symbols-outlined text-[16px]">apartment</span>
              3 active clients
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {clients.map((client) => {
              const entries = Object.entries(client.details)
              const hqEntry = entries.find(([k]) => k === 'Headquarters Location')
              const others = entries.filter(([k]) => k !== 'Headquarters Location')
              const contacts = contactsMap[client.name] ?? []

              return (
                <article key={client.name} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 space-y-4 shadow-[0_2px_16px_rgba(24,28,30,0.08)]">

                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">Client</p>
                      <h2 className="text-xl font-bold text-primary mt-1">{client.name}</h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide border border-outline-variant/20">
                      {client.sector}
                    </span>
                  </div>

                  {/* Details tiles */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {others.map(([key, val]) => (
                      <div key={key} className="rounded-xl bg-surface-container border border-outline-variant/15 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">{key}</p>
                        <p className="font-medium text-on-surface text-sm">{val}</p>
                      </div>
                    ))}
                    {hqEntry && (
                      <div className="rounded-xl bg-surface-container border border-outline-variant/15 p-3 col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">{hqEntry[0]}</p>
                        <p className="font-medium text-on-surface text-sm">{hqEntry[1]}</p>
                      </div>
                    )}
                  </div>

                  {/* HR Contacts subtable */}
                  <div className="pt-4 border-t border-outline-variant/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px]">contacts</span>
                        HR Contacts
                      </h3>
                      {can('clients.contacts.manage') && (
                        <button
                          onClick={() => openAdd(client.name)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                        >
                          <span className="material-symbols-outlined text-[11px]">add</span>
                          Add
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-[11px] min-w-[480px]">
                        <thead>
                          <tr className="border-b border-outline-variant/20">
                            {['Client', 'Name (HR Contact)', 'Job Title', 'E-mail', 'Mobile', 'Location', 'Time Zone', ''].map(col => (
                              <th key={col} className="text-left pb-2 px-1.5 font-bold uppercase tracking-widest text-on-surface-variant/50 text-[9px] whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-4 text-center text-on-surface-variant/50 text-[11px] italic">No contacts registered</td>
                            </tr>
                          ) : contacts.map(contact => (
                            <tr key={contact.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors group">
                              <td className="py-2 px-1.5 font-semibold text-primary whitespace-nowrap">{client.name}</td>
                              <td className="py-2 px-1.5 font-semibold text-on-surface whitespace-nowrap">{contact.name}</td>
                              <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.jobTitle}</td>
                              <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.email}</td>
                              <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.mobile}</td>
                              <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.location}</td>
                              <td className="py-2 px-1.5 text-on-surface-variant whitespace-nowrap">{contact.timeZone}</td>
                              <td className="py-2 px-1.5">
                                {can('clients.contacts.manage') && (
                                  <button
                                    onClick={() => handleDelete(client.name, contact.id)}
                                    className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-error transition-all"
                                    title="Remove contact"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Inline add form */}
                    {can('clients.contacts.manage') && addingFor === client.name && (
                      <div className="mt-3 p-4 rounded-xl border border-outline-variant/20 bg-surface-container space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">New Contact — {client.name}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputCls} placeholder="HR Contact Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                          <input className={inputCls} placeholder="Job Title" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
                          <input className={inputCls} placeholder="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                          <input className={inputCls} placeholder="Mobile" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
                          <input className={inputCls} placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                          <input className={inputCls} placeholder="Time Zone" value={form.timeZone} onChange={e => setForm(f => ({ ...f, timeZone: e.target.value }))} />
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => setAddingFor(null)} className="px-4 py-1.5 rounded-full text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant/20">
                            Cancel
                          </button>
                          <button onClick={() => handleSave(client.name)} className="px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-on-primary hover:opacity-90 transition-opacity">
                            Save Contact
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
