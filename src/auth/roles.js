export const ROLES = {
  TEACHER: "teacher",
  STUDENT: "student",
}

/**
 * Role is stored in Supabase Auth user_metadata.role (teacher | student).
 * public.users.role is kept in sync via DB triggers when migrations are applied.
 *
 * We use user_metadata as the source of truth in the client because it travels
 * with the JWT and does not require an extra round-trip on every load.
 */
export function resolveRole(user) {
  const raw = user?.user_metadata?.role
  if (raw === ROLES.TEACHER || raw === ROLES.STUDENT) return raw
  return null
}

export function isEmailVerified(user) {
  if (!user) return false
  return Boolean(user.email_confirmed_at)
}

export function dashboardPathForRole(role) {
  if (role === ROLES.STUDENT) return "/student-dashboard"
  return "/teacher-dashboard"
}
