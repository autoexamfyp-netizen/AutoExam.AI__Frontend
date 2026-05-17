import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { GraduationCap, Mail } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { useAuth } from "../hooks/useAuth"
import { dashboardPathForRole, isEmailVerified, resolveRole } from "../auth/roles"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import FullPageLoader from "../components/ui/FullPageLoader"

export default function VerifyEmailRequiredPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, session, loading, initialized, signOut, refreshSession } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const email = useMemo(() => user?.email || location.state?.email || "", [user, location.state])

  if (!initialized || loading) {
    return <FullPageLoader title="Loading…" subtitle="Checking verification status…" />
  }

  if (!session || !user) {
    navigate("/login", { replace: true })
    return null
  }

  if (isEmailVerified(user)) {
    const role = resolveRole(user)
    navigate(role ? dashboardPathForRole(role) : "/login", { replace: true })
    return null
  }

  const handleSignOut = async () => {
    setBusy(true)
    const { error: signOutError } = await signOut()
    setBusy(false)
    if (signOutError) {
      setError("Could not sign out. Try again.")
      return
    }
    navigate("/login", { replace: true })
  }

  const handleOtpSuccess = async () => {
    await refreshSession()
    const {
      data: { session: next },
    } = await supabase.auth.getSession()
    const u = next?.user
    if (u && isEmailVerified(u)) {
      const role = resolveRole(u)
      navigate(role ? dashboardPathForRole(role) : "/login", { replace: true })
    }
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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Verify to continue</h1>
          <p className="mt-5 max-w-[420px] text-lg text-[#a9b4d4]">
            Enter the verification code from your email to access your dashboard.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#fff6e3] text-[#c89422]">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-center text-2xl font-bold text-[#11162e]">Email not verified</h2>
            <p className="mt-3 text-center text-sm text-[#7b809a]">
              Enter the verification code we sent to{" "}
              <span className="font-medium text-[#1b1f36]">{email}</span> to unlock your dashboard.
            </p>

            <p className="mt-4 text-center text-xs text-[#99a0b7]">
              You are signed in, but your email must be verified before you can continue.
            </p>

            {error ? <p className="mt-4 text-center text-sm text-red-500">{error}</p> : null}

            {email ? (
              <div className="mt-8">
                <OtpVerificationForm
                  email={email}
                  flow="signup"
                  onSuccess={handleOtpSuccess}
                  embedded
                  autoSubmit
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="mt-6 h-12 w-full rounded-xl border border-[#e3e6ef] bg-white text-sm font-semibold text-[#313a58] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out
            </button>

            <p className="mt-6 text-center text-sm text-[#6f7692]">
              <Link to="/login" className="font-medium text-[#6860f3]">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
