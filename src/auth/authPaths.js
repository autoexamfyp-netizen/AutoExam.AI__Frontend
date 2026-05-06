export const AUTH_CALLBACK_PATH = "/auth/callback"
export const AUTH_CHECK_EMAIL_PATH = "/auth/check-email"
export const AUTH_VERIFY_REQUIRED_PATH = "/auth/verify-required"
export const AUTH_VERIFICATION_FAILED_PATH = "/auth/verification-failed"
export const AUTH_RESET_PASSWORD_PATH = "/auth/reset-password"

export function getAppOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}

export function getEmailConfirmRedirectUrl() {
  return `${getAppOrigin()}${AUTH_CALLBACK_PATH}`
}

export function getPasswordResetRedirectUrl() {
  return `${getAppOrigin()}${AUTH_RESET_PASSWORD_PATH}`
}
