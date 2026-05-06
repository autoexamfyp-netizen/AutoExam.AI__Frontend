/**
 * Map Supabase OTP / verify errors to UI copy.
 */
export function formatOtpError(error) {
  if (!error?.message) return "Verification failed. Try again."

  const m = error.message.toLowerCase()
  if (m.includes("expired") || m.includes("otp_expired")) {
    return "This code has expired. Request a new one."
  }
  if (m.includes("invalid") || m.includes("token") || m.includes("otp")) {
    return "Invalid code. Check the number and try again."
  }
  if (m.includes("rate")) {
    return "Too many attempts. Wait a moment before retrying."
  }
  return error.message
}
