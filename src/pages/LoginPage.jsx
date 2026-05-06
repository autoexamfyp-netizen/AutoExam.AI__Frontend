import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AtSign, Eye, EyeOff, GraduationCap, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { supabase } from "../lib/supabaseClient"

const roleDetails = {
  teacher: {
    subtitle: "Sign in to your teacher account",
    buttonText: "Sign In as Teacher",
    demoText: "Fill teacher sample credentials",
    demoEmail: "teacher@autoexam.com",
  },
  student: {
    subtitle: "Sign in to your student account",
    buttonText: "Sign In as Student",
    demoText: "Fill student sample credentials",
    demoEmail: "student@autoexam.com",
  },
}

function AuthShowcase() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#09173b] p-10 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#3f55ff]/20 blur-3xl" />
      <div className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-[#822eff]/20 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#6f63ff]">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-[34px] font-semibold tracking-[-0.3px]">AutoExam.ai</span>
        </div>

        <h1 className="max-w-[340px] text-5xl font-bold leading-[1.05] tracking-[-1px]">
          Smarter Exams. Fairer Feedback.
        </h1>
        <p className="mt-5 max-w-[420px] text-[33px] leading-[1.45] text-[#a9b4d4]">
          AI-powered exam generation, semantic grading, and AI cheating detection for modern educators.
        </p>

        <ul className="mt-12 space-y-5 text-[30px] text-[#e4e8f7]">
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
            Detect AI-written submissions
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
          <p className="text-xs tracking-[0.16em] text-[#bec8e6]">SAMPLE CREDENTIALS</p>
          <div className="mt-3 space-y-2 text-sm text-[#d6dcf0]">
            <p>Teacher &nbsp;&nbsp;&nbsp;&nbsp; teacher@autoexam.com &nbsp;/&nbsp; 12345678</p>
            <p>Student &nbsp;&nbsp;&nbsp;&nbsp; student@autoexam.com &nbsp;/&nbsp; 12345678</p>
          </div>
        </div>
        <p className="mt-6 text-sm text-[#9ca8cc]">© 2025 AutoExam.ai · COMSATS University Islamabad</p>
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
  const [role, setRole] = useState("teacher")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const details = useMemo(() => roleDetails[role], [role])
  const isSampleAccount = (value) => ["teacher@autoexam.com", "student@autoexam.com"].includes(value.trim().toLowerCase())

  const validate = () => {
    if (!email.trim() || !password.trim()) return "Email and password are required."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address."
    if (password.length < 8) return "Password must be at least 8 characters."
    return ""
  }

  const handleGoogleLogin = async () => {
    setError("")

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError("Google OAuth is not configured.")
      return
    }

    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    })

    if (oauthError) {
      setLoading(false)
      setError(oauthError.message)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (authError) {
      if (authError.message === "Invalid login credentials" && isSampleAccount(email)) {
        setError("Sample accounts are not provisioned in this Supabase project. Create this user from Sign up first, then log in.")
        return
      }
      setError(authError.message)
      return
    }

    const userRole = data.user?.user_metadata?.role || role
    navigate(userRole === "student" ? "/student-dashboard" : "/teacher-dashboard")
  }

  const fillDemo = () => {
    setEmail(details.demoEmail)
    setPassword("12345678")
    setError("")
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
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-5 h-12 w-full rounded-xl border border-[#e3e6ef] bg-white text-base font-medium text-[#1b1f36]"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-[#99a0b7]">
            <div className="h-px flex-1 bg-[#e3e6ef]" />
            or sign in with email
            <div className="h-px flex-1 bg-[#e3e6ef]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Email address</label>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <AtSign className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu.pk"
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1d233d]">Password</label>
                <button type="button" className="text-sm text-[#6e63f6]">
                  Forgot password?
                </button>
              </div>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <Lock className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-[#9aa1b8]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : details.buttonText}
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="h-11 w-full rounded-xl border border-[#e3e6ef] bg-white text-sm text-[#585f79]"
            >
              {details.demoText}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#6f7692]">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-[#6860f3]">
              Request early access
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
