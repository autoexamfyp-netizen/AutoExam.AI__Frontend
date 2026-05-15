import { useState } from "react"
import { Link } from "react-router-dom"
import { AtSign, GraduationCap, LockKeyhole } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { getPasswordResetRedirectUrl } from "../auth/authPaths"
import { formatAuthError } from "../auth/formatAuthError"
import { useLoading } from "../hooks/useLoading"
import Spinner from "../components/ui/Spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const { run } = useLoading()

  const validate = () => {
    if (!email.trim()) return "Email is required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address."
    return ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    await run(async () => {
      setLoading(true)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl(),
      })
      setLoading(false)
      if (resetError) {
        setError(formatAuthError(resetError))
        return
      }
      setSent(true)
    }, "Sending reset email…")
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
            We will email you a secure link to choose a new password.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="text-4xl font-bold tracking-[-0.6px] text-[#11162e] sm:text-5xl">Forgot password</h2>
          <p className="mt-2 text-base text-[#7b809a]">Enter your account email and we will send reset instructions.</p>

          {sent ? (
            <div className="mt-8 rounded-2xl border border-[#e3e6ef] bg-white p-6">
              <p className="text-sm font-medium text-[#1d233d]">Check your inbox</p>
              <p className="mt-2 text-sm leading-relaxed text-[#6d7491]">
                If an account exists for <span className="font-medium text-[#1b1f36]">{email}</span>, you will receive an
                email with a link to reset your password. The link expires after a short time for security.
              </p>
              <Link
                to={`/auth/verify-otp?flow=recovery&email=${encodeURIComponent(email.trim())}`}
                className="mt-4 block text-center text-sm font-medium text-[#6860f3]"
              >
                Enter one-time code instead
              </Link>
              <Link to="/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#6562f1] text-sm font-semibold text-white">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Spinner size="sm" decorative /> : null}
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="mt-4 text-center text-sm text-[#6f7692]">
                {/* <Link
                  to={`/auth/verify-otp?flow=recovery&email=${encodeURIComponent(email.trim() || "")}`}
                  className="font-medium text-[#6860f3]"
                >
                  Already have a reset code?
                </Link> */}
              </p>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-[#6f7692]">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-[#6860f3]">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
