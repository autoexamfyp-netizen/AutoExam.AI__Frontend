import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { dashboardPathForRole, isEmailVerified, resolveRole } from "../../auth/roles"
import FullPageLoader from "../ui/FullPageLoader"

/**
 * Redirect authenticated users away from login/signup/forgot-password.
 */
export default function GuestRoute({ children }) {
  const { user, session, loading, initialized, loginFlowActive, recoveryFlowActive } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return <FullPageLoader title="Loading…" subtitle="Preparing your session…" />
  }

  if (session && user && !loginFlowActive && !recoveryFlowActive) {
    if (!isEmailVerified(user)) {
      return (
        <Navigate
          to="/auth/verify-required"
          replace
          state={{ email: user.email, from: location.pathname }}
        />
      )
    }

    const role = resolveRole(user)
    if (role) {
      return <Navigate to={dashboardPathForRole(role)} replace />
    }

    return <Navigate to="/signup?flash=incomplete_profile" replace />
  }

  return children
}
