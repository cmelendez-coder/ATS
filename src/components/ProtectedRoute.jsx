import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { can } from '../lib/permissions'

export default function ProtectedRoute({ children, permission }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (permission) {
    const role = String(session.user?.role ?? '').toLowerCase()
    if (!can(role, permission)) return <Navigate to="/" replace />
  }
  return children
}
