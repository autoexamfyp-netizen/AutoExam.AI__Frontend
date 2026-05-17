import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AtSign, GraduationCap, LockKeyhole } from "lucide-react"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import { checkAccountExistsForRecovery, OTP_CODE_LENGTH, resendRecoveryOtp } from "../auth/otpService"
import { waitForAuthSession } from "../auth/waitForSession"
import { formatAuthError } from "../auth/formatAuthError"
import { useAuth } from "../hooks/useAuth"
import { useLoading } from "../hooks/useLoading"
import Spinner from "../components/ui/Spinner"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { setRecoveryFlowActive } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const { run } = useLoading()

  useEffect(() => {
    setRecoveryFlowActive(codeSent)
    return () => setRecoveryFlowActive(false)
  }, [codeSent, setRecoveryFlowActive])

  const validate = () => {
    if (!email.trim()) return "Email is required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address."
    return ""
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError("")
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    await run(async () => {
      setLoading(true)

      const { exists, error: lookupError } = await checkAccountExistsForRecovery(email.trim())
      if (lookupError) {
        setLoading(false)
        setError(formatAuthError(lookupError))
        return
      }
      if (!exists) {
        setLoading(false)
        setError(formatAuthError({ message: "no account found with this email" }))
        return
      }

      const { error: sendError } = await resendRecoveryOtp(email.trim())
      setLoading(false)
      if (sendError) {
        setError(formatAuthError(sendError))
        return
      }
      setCodeSent(true)
    }, "Sending reset code…")
  }

  const handleOtpSuccess = async () => {
    const { session } = await waitForAuthSession(25, 100)
    if (!session?.user) {
      setError("Verification succeeded but we could not start your reset session. Try again or request a new code.")
      setCodeSent(false)
      return
    }
    navigate("/auth/reset-password", { replace: true })
  }

  const handleChangeEmail = () => {
    setCodeSent(false)
    setError("")
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#09173b] p-10 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#3f55ff]/20 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6f63ff]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-[34px] font-semibold tracking-[-0.3px]">AutoExam.ai</span>
          </div>
          <h1 className="max-w-[340px] text-5xl font-bold leading-[1.05] tracking-[-1px]">Reset your password</h1>
          <p className="mt-5 max-w-[420px] text-lg leading-[1.45] text-[#a9b4d4] sm:text-xl">
            We will email you a one-time code to verify your identity, then you can choose a new password.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
              <LockKeyhole className="h-7 w-7" />
            </div>

            {!codeSent ? (
              <>
                <h2 className="text-center text-2xl font-bold text-[#11162e]">Forgot password</h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
                  Enter your account email and we will send a {OTP_CODE_LENGTH}-digit verification code.
                </p>

                <form onSubmit={handleSendCode} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#1d233d]">Email address</label>
                    <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                      <AtSign className="h-4 w-4 text-[#a2a8bd]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@institution.edu.pk"
                        autoComplete="email"
                        className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                      />
                    </div>
                  </div>
                  {error ? <p className="text-sm text-red-600">{error}</p> : null}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? <Spinner size="sm" decorative /> : null}
                    {loading ? "Sending…" : "Send reset code"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-center text-2xl font-bold text-[#11162e]">Enter reset code</h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
                  We sent a <span className="font-medium text-[#1b1f36]">{OTP_CODE_LENGTH}-digit code</span> to{" "}
                  <span className="font-medium text-[#1b1f36]">{email.trim()}</span>. Enter it below to continue.
                </p>

                <div className="mt-8">
                  <OtpVerificationForm
                    email={email.trim()}
                    flow="recovery"
                    onSuccess={handleOtpSuccess}
                    embedded
                    autoSubmit
                  />
                </div>

                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="mt-4 w-full text-center text-sm font-medium text-[#6e63f6] hover:text-[#5d52e5]"
                >
                  Use a different email
                </button>
              </>
            )}

            <p className="mt-8 text-center text-sm text-[#6f7692]">
              Remember your password?{" "}
              <Link to="/login" className="font-medium text-[#6860f3]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
