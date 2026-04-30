import { useAuth } from '../contexts/AuthContext'
import { can as checkPermission } from '../lib/permissions'

export function usePermissions() {
  const { session } = useAuth()
  const role = String(session?.user?.role ?? '').toLowerCase()
  return {
    role,
    can: (permission) => checkPermission(role, permission),
  }
}
