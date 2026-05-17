/**
 * Map Supabase OTP / verify errors to UI copy.
 *
 * Supabase frequently returns "Token has expired or is invalid" for a wrong code
 * as well as a genuinely expired OTP — treat combined messages as incorrect code.
 */

function isExplicitExpiry(error) {
  const code = String(error?.code ?? "").toLowerCase()
  const m = String(error?.message ?? "").toLowerCase()

  // Supabase often says "expired or is invalid" for a wrong code — not a real expiry.
  if (m.includes("invalid") || m.includes("incorrect") || m.includes("or is invalid")) {
    return false
  }

  return code === "otp_expired" || m.includes("expired") || m.includes("otp_expired")
}

function isWrongCode(error) {
  const code = String(error?.code ?? "").toLowerCase()
  const m = String(error?.message ?? "").toLowerCase()

  if (isExplicitExpiry(error)) return false

  return (
    code === "invalid_grant" ||
    m.includes("invalid") ||
    m.includes("incorrect") ||
    m.includes("wrong") ||
    m.includes("does not match") ||
    m.includes("not match") ||
    m.includes("token") ||
    m.includes("otp")
  )
}

export function formatOtpError(error) {
  if (!error) return "Verification failed. Please try again."

  const m = String(error.message ?? "").toLowerCase()

  if (isWrongCode(error)) {
    return "Incorrect verification code. Check the digits in your email and try again."
  }

  if (isExplicitExpiry(error)) {
    return "This code has expired. Use Resend code to get a new one."
  }

  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Wait a moment, then try again."
  }

  return error.message || "Verification failed. Please try again."
}
