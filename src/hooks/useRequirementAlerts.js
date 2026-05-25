import { useEffect, useState } from 'react'
import { getPendingRequirementAlertCount } from '../api/requirements'
import { usePermissions } from './usePermissions'

export function useRequirementAlerts() {
  const { role } = usePermissions()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(role === 'gerente' || role === 'administrador')

  useEffect(() => {
    const shouldLoad = role === 'gerente' || role === 'administrador'
    if (!shouldLoad) {
      setPendingCount(0)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    getPendingRequirementAlertCount()
      .then(count => {
        if (active) setPendingCount(count)
      })
      .catch(() => {
        if (active) setPendingCount(0)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [role])

  return {
    pendingCount,
    loading,
    hasAlerts: pendingCount > 0,
    showAlerts: role === 'gerente' || role === 'administrador',
  }
}
