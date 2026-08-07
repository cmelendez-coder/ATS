import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate       = useNavigate()
  const { setSession } = useAuth()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const user = await loginApi({ EMAIL: email.trim(), PASS_CLP: password })
      setSession(user)
      navigate('/', { replace: true })
    } catch {
      setError('Credenciales inválidas. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen font-sans relative selection:bg-blue-600/30"
      style={{
        color: '#f1f5f9',
        backgroundImage: 'url(/Gemini_Generated_Image_4g9xsn4g9xsn4g9x.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >

      <div className="flex flex-col items-center w-full min-h-screen">

        {/* Login card */}
        <main className="flex-1 flex flex-col items-center justify-center w-full px-4 py-12">
          <div
            className="w-full max-w-[460px] p-10 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden"
            style={{ backgroundColor: '#111827' }}
          >
            {/* Green accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: '#99ff99' }} />

            {/* Logos */}
            <div className="flex flex-col items-center gap-5 mb-10">
              <img
                src="/logo-prt.png"
                alt="PRT Logo"
                className="w-64 object-contain"
              />
              <div className="h-px w-full bg-slate-700" />
              <img
                src="/icon-prt.png"
                alt="PRT Icon"
                className="w-20 h-20 object-contain"
              />
              <div className="text-center">
                <h1 className="text-2xl font-black text-white tracking-tight">Bienvenido</h1>
                <p className="text-slate-400 text-sm mt-1">Ingrese sus credenciales para acceder al portal</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm font-semibold px-1">Correo electrónico</label>
                <div className="relative group">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-slate-500"
                    style={{ fontSize: 20 }}
                  >mail</span>
                  <input
                    className="w-full pl-10 pr-4 h-12 rounded-lg border text-slate-100 placeholder-slate-500 outline-none text-sm transition-all"
                    style={{
                      backgroundColor: '#1e293b',
                      borderColor: email ? '#0d6cf2' : '#334155',
                    }}
                    placeholder="correo@everscalegroup.com"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm font-semibold px-1">Contraseña</label>
                <div className="relative group">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-slate-500"
                    style={{ fontSize: 20 }}
                  >lock</span>
                  <input
                    className="w-full pl-10 pr-12 h-12 rounded-lg border text-slate-100 placeholder-slate-500 outline-none text-sm transition-all"
                    style={{
                      backgroundColor: '#1e293b',
                      borderColor: password ? '#0d6cf2' : '#334155',
                    }}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#0d6cf2' }}
                  />
                  <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Recordarme</span>
                </label>
                <a href="#" className="font-bold hover:underline text-sm" style={{ color: '#0d6cf2' }}>
                  ¿Olvidó su contraseña?
                </a>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg border text-sm" style={{ backgroundColor: 'rgba(127,29,29,0.3)', borderColor: '#991b1b', color: '#fca5a5' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white font-bold rounded-lg transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0d6cf2', boxShadow: '0 4px 24px rgba(13,108,242,0.3)' }}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                    Entrando…
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-800 text-center">
              <p className="text-sm text-slate-500">
                ¿Necesita ayuda?
                <a href="#" className="font-bold hover:underline ml-1" style={{ color: '#0d6cf2' }}>
                  Contactar soporte
                </a>
              </p>
            </div>
          </div>
        </main>

        <footer className="w-full py-6 text-center text-xs text-slate-600">
          <p>© {new Date().getFullYear()} EverTrack — Everscale Group. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  )
}
