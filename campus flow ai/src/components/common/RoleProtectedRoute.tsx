import type { PropsWithChildren } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { AppRole } from '../../types/auth'
import { ProtectedRoute } from './ProtectedRoute'

function AccessCheck({ allowedRoles, children }: PropsWithChildren<{ allowedRoles: AppRole[] }>) {
  const { role } = useAuth()
  if (!role || !allowedRoles.includes(role)) {
    window.location.replace('/access-denied')
    return null
  }
  return <>{children}</>
}

export function RoleProtectedRoute({ allowedRoles, children }: PropsWithChildren<{ allowedRoles: AppRole[] }>) {
  return <ProtectedRoute><AccessCheck allowedRoles={allowedRoles}>{children}</AccessCheck></ProtectedRoute>
}
