import { useAuth } from '../contexts/AuthContext'

export default function UserAvatar() {
  const { session } = useAuth()
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? '?'
  return (
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary border border-outline-variant/30 cursor-pointer ml-1">
      {initial}
    </div>
  )
}
