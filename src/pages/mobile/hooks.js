import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

/** true mientras el teléfono tenga conexión a internet */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

/**
 * Detecta si hay una versión nueva desplegada: compara el archivo principal (con hash) que
 * cargó esta pestaña contra el que sirve ahora el index.html. Revisa al volver a la app y cada 10 min.
 */
export function useAppUpdate() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    const currentSrc = [...document.scripts].map(s => s.src).find(src => /\/assets\/index-[^/]+\.js/.test(src))
    if (!currentSrc) return
    const currentPath = new URL(currentSrc).pathname
    let stopped = false

    async function check() {
      try {
        const res = await fetch('/index.html', { cache: 'no-store' })
        const html = await res.text()
        const match = html.match(/\/assets\/index-[^"']+\.js/)
        if (!stopped && match && match[0] !== currentPath) setAvailable(true)
      } catch { /* sin conexión: se vuelve a intentar después */ }
    }

    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(check, 10 * 60 * 1000)
    check()
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [])

  return available
}

/**
 * Vuelve a pedir los datos cuando la app regresa a primer plano después de estar un rato en
 * segundo plano (minAgeMs), o cuando el teléfono recupera la conexión.
 */
export function useRefreshOnFocus(callback, minAgeMs = 5 * 60 * 1000) {
  const cbRef = useRef(callback)
  const lastRef = useRef(Date.now())
  cbRef.current = callback

  useEffect(() => {
    const run = () => { lastRef.current = Date.now(); cbRef.current() }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRef.current > minAgeMs) run()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', run)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', run)
    }
  }, [minAgeMs])
}

/**
 * Hoja (panel inferior) ligada al historial de navegación: al abrirla se agrega una entrada,
 * así el botón "atrás" del celular la cierra en lugar de salir de la app.
 * `sheet` es el dato con el que se abrió (o null); se conserva aunque se recargue la página.
 */
export function useRouteSheet() {
  const navigate = useNavigate()
  const location = useLocation()
  const sheet = location.state?.sheet ?? null

  const openSheet = useCallback(
    payload => navigate(location.pathname, { state: { sheet: payload } }),
    [navigate, location.pathname]
  )
  const closeSheet = useCallback(() => {
    if (location.key !== 'default') navigate(-1)
    else navigate(location.pathname, { replace: true })
  }, [navigate, location.key, location.pathname])

  return { sheet, openSheet, closeSheet }
}
