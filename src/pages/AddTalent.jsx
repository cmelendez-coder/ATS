import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCandidate } from '../api/talent'

export default function AddTalent() {
  const navigate = useNavigate()

  const [skills, setSkills]         = useState([])
  const [newSkill, setNewSkill]     = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  function removeSkill(skill) {
    setSkills(prev => prev.filter(s => s !== skill))
  }

  function commitSkill() {
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed)) setSkills(prev => [...prev, trimmed])
    setNewSkill('')
    setAddingSkill(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    // Combine primary tech field + skills tags into the technologies array
    const primaryTech = fd.get('primaryTech')?.trim()
    const techList = primaryTech
      ? [primaryTech, ...skills.filter(s => s !== primaryTech)]
      : [...skills]

    try {
      await createCandidate({
        fullName:         fd.get('fullName'),
        email:            fd.get('email'),
        phone:            fd.get('phone'),
        location:         fd.get('location'),
        linkedin:         fd.get('linkedin'),
        cvUrl:            fd.get('cvUrl'),
        role:             fd.get('role'),
        yearsExp:         fd.get('experience'),
        technologies:     techList,
        skillset:         skills.join(', '),
        englishLevel:     fd.get('englishLevel'),
        scheme:           fd.get('scheme'),
        salaryExpectation: fd.get('expectations'),
      })
      navigate('/talent')
    } catch (err) {
      setError('Error al guardar el candidato. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* TOP HEADER */}
      <header className="flex justify-between items-center h-16 px-8 w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-lg font-bold tracking-tight text-primary">PRT Ledger</span>
          <div className="relative hidden md:block group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[18px]">search</span>
            <input className="bg-surface-container-high border-none outline-none ring-0 h-9 pl-10 pr-4 rounded-full text-sm w-60 focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-on-surface-variant" placeholder="Search talent..." type="text" />
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
            Add New Talent
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-outline-variant/30 cursor-pointer ml-1">R</div>
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
              <Link to="/talent" className="hover:text-primary transition-colors">Talent Directory</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-medium">New Profile</span>
            </div>
            <h1 className="text-[2.25rem] leading-none tracking-[-0.02em] font-extrabold text-primary">New Talent Profile</h1>
            <p className="text-on-surface-variant text-base">
              Enter the candidate's core details to initiate their ledger entry. Fields marked <span className="text-error font-medium">*</span> are required.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-8" onSubmit={handleSubmit}>

            {/* Section 1: Personal Information */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary-container/60 rounded-l-2xl"></div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-primary mb-0.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">person</span>
                  Personal Information
                </h3>
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest">Core Identity</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="form-input-container">
                    <input className="form-input rounded-t-lg" id="fullName" name="fullName" placeholder=" " type="text" required />
                    <label className="form-label" htmlFor="fullName">Full Legal Name <span className="text-error text-xs">*</span></label>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 ml-1">As it appears on official documents.</p>
                </div>
                <div>
                  <div className="form-input-container">
                    <input className="form-input rounded-t-lg" id="email" name="email" placeholder=" " type="email" required />
                    <label className="form-label" htmlFor="email">Primary Email <span className="text-error text-xs">*</span></label>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 ml-1">Used for all candidate communications.</p>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="phone" name="phone" placeholder=" " type="tel" />
                  <label className="form-label" htmlFor="phone">Contact Number</label>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="location" name="location" placeholder=" " type="text" />
                  <label className="form-label" htmlFor="location">Current Location (City, Country)</label>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="linkedin" name="linkedin" placeholder=" " type="url" />
                  <label className="form-label" htmlFor="linkedin">LinkedIn URL</label>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="cvUrl" name="cvUrl" placeholder=" " type="url" />
                  <label className="form-label" htmlFor="cvUrl">CV URL (Drive, Dropbox…)</label>
                </div>
              </div>
            </section>

            {/* Section 2: Technical Profile */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary rounded-l-2xl"></div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-primary mb-0.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] filled">code</span>
                  Technical Profile
                </h3>
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest">Skills &amp; Expertise</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="primaryTech" name="primaryTech" placeholder=" " type="text" />
                  <label className="form-label" htmlFor="primaryTech">Primary Technology</label>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="role" name="role" placeholder=" " type="text" />
                  <label className="form-label" htmlFor="role">Target Role</label>
                </div>
                <div className="form-input-container">
                  <input className="form-input rounded-t-lg" id="experience" name="experience" placeholder=" " type="number" min="0" />
                  <label className="form-label" htmlFor="experience">Years Experience</label>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Additional Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span key={skill} className="px-4 py-2 bg-surface-container rounded-full text-sm text-on-surface flex items-center gap-2 cursor-pointer hover:bg-surface-container-high transition-colors">
                      {skill}
                      <span className="material-symbols-outlined text-[14px]" onClick={() => removeSkill(skill)}>close</span>
                    </span>
                  ))}
                  {addingSkill ? (
                    <span className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="px-3 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface bg-surface-container focus:outline-none focus:ring-1 focus:ring-primary/20 w-32"
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); commitSkill() }
                          if (e.key === 'Escape') setAddingSkill(false)
                        }}
                      />
                      <button type="button" onClick={commitSkill} className="px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-semibold">Add</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingSkill(true)}
                      className="px-4 py-2 border border-dashed border-outline-variant rounded-full text-sm text-on-surface-variant flex items-center gap-2 hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span> Add Skill
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Logistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_2px_16px_rgba(24,28,30,0.04)] border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-surface-tint rounded-l-2xl"></div>
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-primary mb-0.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] filled">tune</span>
                    Logistics
                  </h3>
                  <p className="text-[11px] text-on-surface-variant uppercase tracking-widest">Requirements &amp; Status</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-input-container">
                    <select className="form-input rounded-t-lg appearance-none cursor-pointer" id="englishLevel" name="englishLevel" defaultValue="">
                      <option disabled value=""></option>
                      <option value="b1">B1 — Intermediate (≈60)</option>
                      <option value="b2">B2 — Upper Intermediate (≈72)</option>
                      <option value="c1">C1 — Advanced (≈85)</option>
                      <option value="c2">C2 — Native / Bilingual (≈95)</option>
                    </select>
                    <label className="form-label" htmlFor="englishLevel">English Level</label>
                    <span className="material-symbols-outlined absolute right-4 top-5 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
                  </div>
                  <div className="form-input-container">
                    <select className="form-input rounded-t-lg appearance-none cursor-pointer" id="scheme" name="scheme" defaultValue="">
                      <option disabled value=""></option>
                      <option value="W2">W2</option>
                      <option value="C2C">C2C</option>
                      <option value="1099">1099</option>
                      <option value="Contract">Contract</option>
                      <option value="Full-Time">Full-Time</option>
                    </select>
                    <label className="form-label" htmlFor="scheme">Preferred Scheme</label>
                    <span className="material-symbols-outlined absolute right-4 top-5 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
                  </div>
                  <div className="form-input-container md:col-span-2">
                    <input className="form-input rounded-t-lg" id="expectations" name="expectations" placeholder=" " type="text" />
                    <label className="form-label" htmlFor="expectations">Salary / Rate Expectations (USD/mo)</label>
                  </div>
                </div>
              </section>

              {/* CV info panel */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-[0_2px_16px_rgba(24,28,30,0.04)] flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-surface-container-highest flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-[28px]">link</span>
                </div>
                <h4 className="text-base font-semibold text-primary mb-1">CV Link</h4>
                <p className="text-sm text-on-surface-variant mb-2">Add a Google Drive, Dropbox or OneDrive link in the Personal Information section.</p>
                <p className="text-xs text-outline mt-2">PDF or DOCX preferred</p>
              </section>
            </div>

            {/* Submit Actions */}
            <div className="flex justify-end gap-3">
              <Link to="/talent">
                <button type="button" className="px-6 py-3 rounded-full text-primary font-medium border border-outline-variant/30 hover:bg-surface-container transition-colors text-sm">
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary py-3 px-8 rounded-full text-sm font-semibold hover:opacity-90 hover:shadow-[0_8px_24px_rgba(0,7,38,0.18)] transition-all flex items-center gap-2 group shadow-[0_4px_16px_rgba(0,7,38,0.12)] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Guardando…
                  </>
                ) : (
                  <>
                    <span>Commit Profile</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}
