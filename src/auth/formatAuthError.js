/**
 * Map Supabase Auth errors to concise, user-facing copy.
 */
export function formatAuthError(error) {
  if (!error) return "Something went wrong. Please try again."

  const msg = (error.message || "").toLowerCase()

  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password. Please check and try again."
  }
  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return "Please verify your email before signing in. Check your inbox for the confirmation link."
  }
  if (msg.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead."
  }
  if (msg.includes("password should be at least")) {
    return "Password does not meet requirements. Use at least 8 characters."
  }
  if (msg.includes("signup requires a valid password")) {
    return "Please choose a stronger password."
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again."
  }
  if (msg.includes("network")) {
    return "Network error. Check your connection and try again."
  }

  return error.message || "Something went wrong. Please try again."
}

export function formatVerificationError(errorCode, description) {
  const code = (errorCode || "").toLowerCase()
  const desc = (description || "").toLowerCase()

  if (code.includes("otp_expired") || desc.includes("expired")) {
    return {
      title: "Link expired",
      detail: "This confirmation or reset link has expired. Request a new email from the sign-in or sign-up page.",
    }
  }
  if (code.includes("access_denied") || desc.includes("invalid")) {
    return {
      title: "Invalid or used link",
      detail: "This link is invalid or has already been used. Request a new confirmation email if you still need access.",
    }
  }
  return {
    title: "Verification could not be completed",
    detail: description || "Please try again or request a new link.",
  }
}
