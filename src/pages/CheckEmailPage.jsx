import { useMemo, useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { GraduationCap, Mail } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { getEmailConfirmRedirectUrl } from "../auth/authPaths"
import { formatAuthError } from "../auth/formatAuthError"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import { dashboardPathForRole, resolveRole } from "../auth/roles"
import { useLoading } from "../hooks/useLoading"
import Spinner from "../components/ui/Spinner"

export default function CheckEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resent, setResent] = useState(false)
  const { run } = useLoading()

  const handleResend = async () => {
    setError("")
    setResent(false)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Add a valid email to the address bar (?email=) or sign up again.")
      return
    }
    await run(async () => {
      setLoading(true)
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getEmailConfirmRedirectUrl(),
        },
      })
      setLoading(false)
      if (resendError) {
        setError(formatAuthError(resendError))
        return
      }
      setResent(true)
    }, "Sending email…")
  }

  const handleOtpSuccess = ({ session }) => {
    const user = session?.user
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    const role = resolveRole(user) || "teacher"
    navigate(dashboardPathForRole(role), { replace: true })
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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Check your email</h1>
          <p className="mt-5 max-w-[420px] text-lg leading-relaxed text-[#a9b4d4]">
            Confirm your account using the link or the one-time code from your email (when OTP is enabled in Supabase
            templates).
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px] space-y-8">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm transition-shadow duration-200">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-center text-2xl font-bold text-[#11162e]">Verify your email</h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
              {email ? (
                <>
                  We sent a message to <span className="font-medium text-[#1b1f36]">{email}</span>. Open the link or enter
                  the code below.
                </>
              ) : (
                "Your account was created. If email confirmation is enabled for this project, check your inbox."
              )}
            </p>

            <div className="mt-6 rounded-xl border border-[#eef1f7] bg-[#f9fafc] px-4 py-3 text-sm text-[#5a627e]">
              <p className="font-medium text-[#1d233d]">Pending verification</p>
              <p className="mt-1">
                After you verify, you will be redirected to your dashboard. You can close this tab once you are done.
              </p>
            </div>

            {error ? <p className="mt-4 text-center text-sm text-red-500">{error}</p> : null}
            {resent ? (
              <p className="mt-4 text-center text-sm text-green-600">Confirmation email sent again. Check your inbox.</p>
            ) : null}

            <button
              type="button"
              onClick={handleResend}
              disabled={loading || !email}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-sm font-semibold text-[#1b1f36] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" decorative /> : null}
              {loading ? "Sending…" : "Resend confirmation email"}
            </button>

            <p className="mt-6 text-center text-sm text-[#6f7692]">
              Wrong address?{" "}
              <Link to="/signup" className="font-medium text-[#6860f3]">
                Sign up again
              </Link>
              {" · "}
              <Link to="/login" className="font-medium text-[#6860f3]">
                Back to login
              </Link>
            </p>
          </div>

          {email ? (
            <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm transition-shadow duration-200">
              <OtpVerificationForm
                email={email}
                flow="signup"
                onSuccess={handleOtpSuccess}
                title="Have a code?"
                subtitle="Enter the one-time code from your email (Supabase {{ .Token }}; this app expects 8 digits by default — set VITE_OTP_CODE_LENGTH if yours differs)."
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
