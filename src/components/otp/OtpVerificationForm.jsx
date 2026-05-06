import { useCallback, useEffect, useRef, useState } from "react"
import { OTP_CODE_LENGTH, resendRecoveryOtp, resendSignupOtp, verifyAuthOtp } from "../../auth/otpService"
import { formatOtpError } from "../../auth/formatOtpError"
import { useOtpCooldown } from "../../hooks/useOtpCooldown"
import OtpInput from "./OtpInput"
import Spinner from "../ui/Spinner"
import { formatAuthError } from "../../auth/formatAuthError"

/**
 * Reusable OTP entry + verify + resend. Auth calls live in otpService.
 *
 * @param {object} props
 * @param {string} props.email
 * @param {'signup' | 'recovery' | 'email'} props.flow
 * @param {(result: { session: import('@supabase/supabase-js').Session | null }) => void} props.onSuccess
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {boolean} [props.autoSubmit]
 */
export default function OtpVerificationForm({
  email,
  flow,
  onSuccess,
  title = "Enter verification code",
  subtitle,
  autoSubmit = false,
}) {
  const [otp, setOtp] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  /** Distinguish verify failures (highlight OTP) from resend failures */
  const [errorSource, setErrorSource] = useState(/** @type {'verify' | 'resend' | null} */ (null))
  const verifyLock = useRef(false)
  const runVerifyRef = useRef(async () => {})

  const { remaining, canResend, start } = useOtpCooldown(60, false)

  const defaultSubtitle =
    flow === "recovery"
      ? "Enter the code from your password reset email."
      : "Enter the code from your confirmation email."

  const runVerify = useCallback(async () => {
    if (!email?.trim() || otp.length < OTP_CODE_LENGTH || verifyLock.current) return
    verifyLock.current = true
    setError("")
    setErrorSource(null)
    setVerifying(true)

    const { data, error: verifyError } = await verifyAuthOtp(email, otp, flow)

    setVerifying(false)
    verifyLock.current = false

    if (verifyError) {
      setError(formatOtpError(verifyError))
      setErrorSource("verify")
      setOtp("")
      return
    }

    setSuccess(true)
    onSuccess?.({ session: data.session })
  }, [email, otp, flow, onSuccess])

  useEffect(() => {
    runVerifyRef.current = runVerify
  }, [runVerify])

  useEffect(() => {
    if (!autoSubmit || otp.length < OTP_CODE_LENGTH || success) return
    const t = window.setTimeout(() => {
      runVerifyRef.current()
    }, 200)
    return () => window.clearTimeout(t)
  }, [autoSubmit, otp, success])

  const handleResend = async () => {
    if (!canResend || !email?.trim()) return
    setError("")
    setErrorSource(null)
    setResending(true)
    const res =
      flow === "recovery"
        ? await resendRecoveryOtp(email)
        : await resendSignupOtp(email)
    setResending(false)
    if (res.error) {
      setError(formatAuthError(res.error))
      setErrorSource("resend")
      return
    }
    start(60)
    setOtp("")
  }

  const invalid = Boolean(error && errorSource === "verify")

  return (
    <div className="w-full max-w-md">
      <h3 className="text-center text-lg font-semibold text-[#11162e]">{title}</h3>
      <p className="mt-2 text-center text-sm leading-relaxed text-[#7b809a]">{subtitle || defaultSubtitle}</p>

      <div className="mt-6">
        <OtpInput
          length={OTP_CODE_LENGTH}
          value={otp}
          onChange={setOtp}
          disabled={verifying || success}
          invalid={invalid}
          idPrefix={`otp-${flow}`}
        />
      </div>

      {success ? (
        <p className="mt-4 text-center text-sm font-medium text-green-600 transition-opacity duration-200">Verified successfully.</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-center text-sm text-red-500 transition-opacity duration-200" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={success || otp.length < OTP_CODE_LENGTH || verifying}
        onClick={runVerify}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {verifying ? <Spinner size="sm" decorative /> : null}
        {success ? "Verified" : verifying ? "Verifying…" : "Verify code"}
      </button>

      <div className="mt-4 text-center">
        <button
          type="button"
          disabled={!canResend || resending || !email?.trim() || success}
          onClick={handleResend}
          className="text-sm font-medium text-[#6e63f6] transition hover:text-[#5d52e5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? "Sending…" : canResend ? "Resend code" : `Resend code in ${remaining}s`}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-[#99a0b7]">
        Codes expire for security. If emails only contain a link, use the link or enable OTP in your Supabase email templates (
        {"{{ .Token }}"}).
      </p>
    </div>
  )
}
