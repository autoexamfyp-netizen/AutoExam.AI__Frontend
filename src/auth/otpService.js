import { supabase } from "../lib/supabaseClient"
import { getEmailConfirmRedirectUrl, getPasswordResetRedirectUrl } from "./authPaths"

export const OTP_CODE_LENGTH = 6

/** @typedef {'signup' | 'recovery' | 'email'} OtpFlow */

/**
 * Verify email OTP / code from Supabase (configure templates to send {{ .Token }} for OTP).
 * @param {string} email
 * @param {string} token - digits only
 * @param {OtpFlow} flow
 */
export async function verifyAuthOtp(email, token, flow) {
  const normalized = token.replace(/\s/g, "")
  const type = flow === "recovery" ? "recovery" : flow === "signup" ? "signup" : "email"
  return supabase.auth.verifyOtp({
    email: email.trim(),
    token: normalized,
    type,
  })
}

export async function resendSignupOtp(email) {
  return supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
    },
  })
}

/** Re-triggers recovery email (link or OTP per your Supabase template). */
export async function resendRecoveryOtp(email) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  })
}
