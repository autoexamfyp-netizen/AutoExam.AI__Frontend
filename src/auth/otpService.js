import { supabase } from "../lib/supabaseClient"
import { getEmailConfirmRedirectUrl, getPasswordResetRedirectUrl } from "./authPaths"

/**
 * Digits expected in the segmented OTP UI. Supabase email `{{ .Token }}` is often **8 digits**
 * (e.g. recovery/signup); some projects use 6. Override with `VITE_OTP_CODE_LENGTH` in `.env`.
 */
const fromEnv = Number.parseInt(import.meta.env.VITE_OTP_CODE_LENGTH ?? "", 10)
export const OTP_CODE_LENGTH =
  Number.isFinite(fromEnv) && fromEnv >= 4 && fromEnv <= 12 ? fromEnv : 8

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

/**
 * Returns whether a Supabase Auth account exists for this email (password recovery).
 * Requires `email_exists_for_password_recovery` RPC in Supabase (see Backend/sql/010_*).
 */
export async function checkAccountExistsForRecovery(email) {
  const normalized = email.trim()
  if (!normalized) return { exists: false, error: null }

  const { data, error } = await supabase.rpc("email_exists_for_password_recovery", {
    check_email: normalized,
  })

  if (error) return { exists: null, error }
  return { exists: Boolean(data), error: null }
}

/** Re-triggers recovery email (link or OTP per your Supabase template). */
export async function resendRecoveryOtp(email) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  })
}
