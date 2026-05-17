import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { GraduationCap, Lock, LockKeyhole } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { formatAuthError } from "../auth/formatAuthError"
import { waitForAuthSession } from "../auth/waitForSession"
import {
  getPasswordValidationError,
  isPasswordStrong,
} from "../auth/passwordPolicy"
import PasswordInput from "../components/ui/PasswordInput"
import PasswordStrengthChecklist from "../components/auth/PasswordStrengthChecklist"
import FullPageLoader from "../components/ui/FullPageLoader"
import Spinner from "../components/ui/Spinner"
import { useAuth } from "../hooks/useAuth"
import { useLoading } from "../hooks/useLoading"

function AuthAside({ title, description }) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#09173b] p-10 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#3f55ff]/20 blur-3xl" />
      <AsideContent title={title} description={description} />
      <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
    </aside>
  )
}

function AsideContent({ title, description }) {
  return (
    <div className="relative z-10">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6f63ff]">
          <GraduationCap className="h-4 w-4" />
        </div>
        <span className="text-[34px] font-semibold tracking-[-0.3px]">AutoExam.ai</span>
      </div>
      <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px] sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-[420px] text-lg leading-relaxed text-[#a9b4d4]">{description}</p>
    </div>
  )
}

function SessionExpiredView() {
  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <AuthAside
        title="Session expired"
        description="Verify your reset code on the forgot password page, then choose a new password."
      />
      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px] rounded-2xl border border-[#e3e6ef] bg-white p-8 text-center shadow-sm">
          <p className="text-sm leading-relaxed text-[#6d7491]">
            Your verification session has expired or was not completed. Request a new code from forgot password and
            enter it before setting a new password.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#6562f1] text-sm font-semibold text-white"
          >
            Get a new reset code
          </Link>
          <Link to="/login" className="mt-3 block text-sm font-medium text-[#6860f3]">
            Back to login
          </Link>
        </div>
      </section>
    </div>
  )
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { setRecoveryFlowActive } = useAuth()
  const [ready, setReady] = useState(false)
  const [sessionValid, setSessionValid] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const { run } = useLoading()

  useEffect(() => {
    setRecoveryFlowActive(true)
    return () => setRecoveryFlowActive(false)
  }, [setRecoveryFlowActive])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { session } = await waitForAuthSession(25, 100)
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
    if (!password.trim() || !confirm.trim()) {
      return "Enter and confirm your new password."
    }
    const passwordError = getPasswordValidationError(password)
    if (passwordError) return passwordError
    if (password !== confirm) return "Passwords do not match."
    return ""
  }

  const canSubmit = useMemo(() => {
    if (loading || done || !sessionValid) return false
    if (!isPasswordStrong(password)) return false
    if (password !== confirm) return false
    return true
  }, [password, confirm, loading, done, sessionValid])

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
      setRecoveryFlowActive(false)
      await supabase.auth.signOut()
      setTimeout(() => navigate("/login?flash=password_reset", { replace: true }), 1600)
    }, "Updating password…")
  }

  if (!ready) {
    return <FullPageLoader title="Preparing secure reset…" subtitle="Confirming your verification code…" />
  }

  if (!sessionValid) {
    return <SessionExpiredView />
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <AuthAside
        title="Choose a new password"
        description="Use uppercase, lowercase, a number, and a special character — same rules as when you signed up."
      />

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <ResetPasswordCard
            password={password}
            setPassword={(value) => {
              setPassword(value)
              setError("")
            }}
            confirm={confirm}
            setConfirm={(value) => {
              setConfirm(value)
              setError("")
            }}
            error={error}
            done={done}
            loading={loading}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </div>
  )
}

function ResetPasswordCard({
  password,
  setPassword,
  confirm,
  setConfirm,
  error,
  done,
  loading,
  canSubmit,
  onSubmit,
}) {
  return (
    <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
        <LockKeyhole className="h-7 w-7" />
      </div>
      <h2 className="text-center text-2xl font-bold text-[#11162e]">Set a new password</h2>
      <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
        Your code was verified. Choose a strong password that meets all requirements below.
      </p>

      {done ? (
        <p className="mt-8 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Password updated. Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <PasswordInput
            label="New password"
            leftIcon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a secure password"
            autoComplete="new-password"
            disabled={loading}
            invalid={password.length > 0 && !isPasswordStrong(password)}
          />

          <div className="rounded-xl border border-[#e7eaf3] bg-[#fafbff] px-3 py-3">
            <PasswordStrengthChecklist password={password} confirmPassword={confirm} showMatch={false} />
          </div>

          <PasswordInput
            label="Confirm password"
            leftIcon={<Lock />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            disabled={loading}
            invalid={confirm.length > 0 && password !== confirm}
          />

          {confirm.length > 0 ? (
            <PasswordStrengthChecklist password={password} confirmPassword={confirm} matchOnly />
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" decorative /> : null}
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-[#6f7692]">
        <Link to="/login" className="font-medium text-[#6860f3]">
          Cancel and return to login
        </Link>
      </p>
    </div>
  )
}
