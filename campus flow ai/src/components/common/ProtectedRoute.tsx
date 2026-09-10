import type { PropsWithChildren } from 'react'
import { useAuth } from '../../hooks/useAuth'

function Redirect({ to }: { to: string }) {
  window.location.replace(to)
  return null
}

export function ProtectedRoute({ children, allowIncomplete = false }: PropsWithChildren<{ allowIncomplete?: boolean }>) {
  const { loading, profileLoading, isAuthenticated, isOnboarded } = useAuth()
  if (loading || (isAuthenticated && profileLoading)) return <main className="page-status">Loading your CampusFlow account…</main>
  if (!isAuthenticated) {
    const returnTo = `${window.location.pathname}${window.location.search}`
    return <Redirect to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  if (!allowIncomplete && !isOnboarded) return <Redirect to="/onboarding" />
  return <>{children}</>
}
