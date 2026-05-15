import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { GraduationCap, Lock } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { formatAuthError } from "../auth/formatAuthError"
import { waitForAuthSession } from "../auth/waitForSession"
import PasswordInput from "../components/ui/PasswordInput"
import FullPageLoader from "../components/ui/FullPageLoader"
import { useLoading } from "../hooks/useLoading"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [sessionValid, setSessionValid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const { run } = useLoading()

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { session } = await waitForAuthSession(18, 70)
      if (cancelled) return
      setReady(true)
      setSessionValid(Boolean(session?.user))
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const validate = () => {
    if (password.length < 8) return "Password must be at least 8 characters."
    if (password !== confirm) return "Passwords do not match."
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
      const { error: updateError } = await supabase.auth.updateUser({ password })
      setLoading(false)
      if (updateError) {
        setError(formatAuthError(updateError))
        return
      }
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate("/login?flash=password_reset", { replace: true }), 1600)
    }, "Updating password…")
  }

  if (!ready) {
    return <FullPageLoader title="Preparing secure reset…" subtitle="Validating your recovery session…" />
  }

  if (!sessionValid) {
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
            <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Invalid or expired link</h1>
            <p className="mt-5 max-w-[420px] text-lg text-[#a9b4d4]">Request a new reset email from the forgot password page.</p>
          </div>
          <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai</p>
        </aside>
        <section className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-[480px] rounded-2xl border border-[#e3e6ef] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#6d7491]">
              This reset link is invalid or has expired. Password reset links are single-use and time-limited.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#6562f1] text-sm font-semibold text-white"
            >
              Request new link
            </Link>
            <Link to="/login" className="mt-3 block text-sm font-medium text-[#6860f3]">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    )
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
          <h1 className="max-w-[340px] text-5xl font-bold leading-[1.05] tracking-[-1px]">Choose a new password</h1>
          <p className="mt-5 max-w-[420px] text-lg text-[#a9b4d4]">Use at least 8 characters for a strong password.</p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <h2 className="text-4xl font-bold tracking-[-0.6px] text-[#11162e] sm:text-5xl">Reset password</h2>
          <p className="mt-2 text-base text-[#7b809a]">Enter and confirm your new password below.</p>

          {done ? (
            <p className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <PasswordInput
                label="New password"
                leftIcon={<Lock />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={loading || done}
              />
              <PasswordInput
                label="Confirm password"
                leftIcon={<Lock />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={loading || done}
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-[#6f7692]">
            <Link to="/login" className="font-medium text-[#6860f3]">
              Cancel and return to login
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
