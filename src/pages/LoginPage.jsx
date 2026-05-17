import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AtSign, GraduationCap, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { dashboardPathForRole, isEmailVerified, resolveRole, ROLES } from "../auth/roles"
import { formatAuthError, formatRoleMismatchError } from "../auth/formatAuthError"
import PasswordInput from "../components/ui/PasswordInput"
import { useAuth } from "../hooks/useAuth"
import { useLoading } from "../hooks/useLoading"

const roleDetails = {
  teacher: {
    subtitle: "Sign in to your account",
    buttonText: "Sign In",
  },
  student: {
    subtitle: "Sign in to your account",
    buttonText: "Sign In",
  },
}

function AuthShowcase() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#09173b] p-10 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#3f55ff]/20 blur-3xl" />
      <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-[#822eff]/20 blur-3xl" />

      <div className="relative z-10">
        <Link to="/" className="mb-10 inline-flex items-center gap-3 rounded-xl transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6f63ff]">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-[34px] font-semibold tracking-[-0.3px] cursor-pointer">AutoExam.ai</span>
        </Link>

        <h1 className="max-w-[340px] text-5xl font-bold leading-[1.05] tracking-[-1px]">
          Smarter Exams. Fairer Feedback.
        </h1>
        <p className="mt-5 max-w-[420px] text-lg leading-[1.45] text-[#a9b4d4] sm:text-xl">
          AI powered exam generation, semantic grading, and AI cheating detection for modern educators.
        </p>

        <ul className="mt-12 space-y-5 text-base text-[#e4e8f7] sm:text-lg">
          <li className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Zap className="h-5 w-5 text-[#8492ff]" />
            </span>
            Generate full exams in minutes
          </li>
          <li className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <ShieldCheck className="h-5 w-5 text-[#8492ff]" />
            </span>
            Detect AI written submissions
          </li>
          <li className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Sparkles className="h-5 w-5 text-[#8492ff]" />
            </span>
            Deep analytics on every attempt
          </li>
        </ul>
      </div>

      <div className="relative z-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-relaxed text-[#d6dcf0]">
            Use the email and password you registered with. Need an account? Request access from the sign up page.
          </p>
        </div>
        <p className="mt-6 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </div>
    </aside>
  )
}

function RoleToggle({ role, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-[#eff1f7] p-1">
      {["teacher", "student"].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`h-11 rounded-lg text-sm font-medium capitalize transition ${
            role === item ? "bg-white text-[#121735] shadow-sm" : "text-[#6d7390]"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setLoginFlowActive } = useAuth()
  const [role, setRole] = useState("teacher")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { run } = useLoading()

  const [flashCode] = useState(() => new URLSearchParams(window.location.search).get("flash"))

  useEffect(() => {
    if (!flashCode) return
    navigate("/login", { replace: true })
  }, [flashCode, navigate])

  useEffect(() => {
    const message = location.state?.authError
    if (!message) return
    setError(message)
    navigate("/login", { replace: true, state: {} })
  }, [location.state?.authError, navigate])

  useEffect(() => {
    if (flashCode === "role_mismatch") {
      setError(
        "The role you selected does not match this account. Switch Teacher or Student at the top, then try again.",
      )
    }
  }, [flashCode])

  const details = useMemo(() => roleDetails[role], [role])
  const isSampleAccount = (value) => ["teacher@autoexam.com", "student@autoexam.com"].includes(value.trim().toLowerCase())

  const validate = () => {
    if (!email.trim() || !password.trim()) return "Email and password are required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address."
    if (password.length < 8) return "Password must be at least 8 characters."
    return ""
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoginFlowActive(true)
    setLoading(true)

    try {
      await run(async () => {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (authError) {
          if (authError.message === "Invalid login credentials" && isSampleAccount(email)) {
            throw new Error(
              "Sample accounts are not provisioned in this Supabase project. Create this user from Sign up first, then log in.",
            )
          }
          throw authError
        }

        const signedInUser = data?.user
        if (!signedInUser) {
          throw new Error("Sign-in completed but no user was returned. Please try again.")
        }

        if (!isEmailVerified(signedInUser)) {
          await supabase.auth.signOut()
          throw new Error(
            "Please verify your email before signing in. Enter the verification code we sent to your inbox.",
          )
        }

        const accountRole = resolveRole(signedInUser)
        if (!accountRole) {
          await supabase.auth.signOut()
          throw new Error(
            "Your account is missing a role. Please sign up again or contact support.",
          )
        }

        if (accountRole !== role) {
          await supabase.auth.signOut()
          throw new Error(formatRoleMismatchError(accountRole, role))
        }

        const target = dashboardPathForRole(accountRole)
        const from = location.state?.from
        if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
          const fromRole =
            from.startsWith("/student-dashboard") ? ROLES.STUDENT : from.startsWith("/teacher-dashboard") ? ROLES.TEACHER : null
          if (!fromRole || fromRole === accountRole) {
            navigate(from, { replace: true })
            return
          }
        }
        navigate(target, { replace: true })
      }, "Signing in…")
    } catch (err) {
      const isSupabaseAuthError = Boolean(err?.status || err?.code || err?.name === "AuthApiError")
      setError(isSupabaseAuthError ? formatAuthError(err) : err?.message || formatAuthError(err))
    } finally {
      setLoading(false)
      setLoginFlowActive(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <AuthShowcase />

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <h2 className="text-4xl font-bold tracking-[-0.6px] text-[#11162e] sm:text-5xl">Welcome back</h2>
          <p className="mt-2 text-base text-[#7b809a]">{details.subtitle}</p>

          <div className="mt-7">
            <RoleToggle role={role} onChange={setRole} />
            <p className="mt-2 text-xs text-[#99a0b7]">
              Use the same role you selected when you created this account (Teacher vs Student).
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {flashCode === "password_reset" ? (
              <p className="text-sm text-green-600">Your password was updated. Sign in with your new password.</p>
            ) : null}
            {flashCode === "missing_role" ? (
              <p className="text-sm text-red-500">
                Your account is missing a role. Please sign up again or contact support.
              </p>
            ) : null}

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

            <PasswordInput
              label="Password"
              labelEnd={
                <Link to="/forgot-password" className="text-sm text-[#6e63f6]">
                  Forgot password?
                </Link>
              }
              leftIcon={<Lock />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />

            {error ? (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : details.buttonText}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#6f7692]">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-[#6860f3]">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
