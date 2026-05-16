import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { dashboardPathForRole, isEmailVerified, resolveRole } from "../../auth/roles"
import FullPageLoader from "../ui/FullPageLoader"

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {('teacher'|'student')[]} props.allowedRoles
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, session, loading, initialized } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return <FullPageLoader title="Checking your session…"  />
  }

  if (!session || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isEmailVerified(user)) {
    return (
      <Navigate
        to="/auth/verify-required"
        replace
        state={{ email: user.email }}
      />
    )
  }

  const role = resolveRole(user)
  if (!role) {
    return <Navigate to="/login?flash=missing_role" replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={dashboardPathForRole(role)} replace />
  }

  return children
}
