import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AtSign, GraduationCap, Lock, Sparkles, User, Zap } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import { getEmailConfirmRedirectUrl } from "../auth/authPaths"
import { dashboardPathForRole, isEmailVerified, resolveRole } from "../auth/roles"
import { formatAuthError } from "../auth/formatAuthError"
import PasswordInput from "../components/ui/PasswordInput"
import PasswordStrengthChecklist from "../components/auth/PasswordStrengthChecklist"
import { getPasswordValidationError, isPasswordStrong } from "../auth/passwordPolicy"
import { useLoading } from "../hooks/useLoading"

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
        <p className="mt-5 max-w-[420px] text-lg leading-[1.45] text-[#a9b4d4] sm:text-xl">
          Create your account and start generating AI powered assessments in minutes.
        </p>

        <ul className="mt-12 space-y-5 text-base text-[#e4e8f7] sm:text-lg">
          <li className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Zap className="h-5 w-5 text-[#8492ff]" />
            </span>
            Teacher and student role access
          </li>
          <li className="flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Sparkles className="h-5 w-5 text-[#8492ff]" />
            </span>
            Personalized exam and feedback workflows
          </li>
        </ul>
      </div>

      <div className="relative z-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm leading-relaxed text-[#d6dcf0]">
            Choose teacher or student when you register. You will confirm your email before your first sign in.
          </p>
        </div>
        <p className="mt-6 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </div>
    </aside>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { run } = useLoading()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "teacher",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [flashCode] = useState(() => new URLSearchParams(window.location.search).get("flash"))

  useEffect(() => {
    if (!flashCode) return
    navigate("/signup", { replace: true })
  }, [flashCode, navigate])

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const validate = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      return "All fields are required."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address."
    }
    const passwordError = getPasswordValidationError(formData.password)
    if (passwordError) return passwordError
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match."
    }
    return ""
  }

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (!formData.name.trim() || !formData.email.trim()) return false
    if (!isPasswordStrong(formData.password)) return false
    if (formData.password !== formData.confirmPassword) return false
    return true
  }, [formData, loading])

  const handleSignup = async (event) => {
    event.preventDefault()
    setError("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    await run(async () => {
      setLoading(true)
      const { data, error: signupError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: getEmailConfirmRedirectUrl(),
          data: {
            full_name: formData.name.trim(),
            role: formData.role,
          },
        },
      })
      setLoading(false)

      if (signupError) {
        setError(formatAuthError(signupError))
        return
      }

      const newUser = data.user
      const session = data.session

      if (session && newUser && isEmailVerified(newUser)) {
        const userRole = resolveRole(newUser) || formData.role
        navigate(dashboardPathForRole(userRole), { replace: true })
        return
      }

      navigate(`/auth/check-email?email=${encodeURIComponent(formData.email.trim())}`, { replace: true })
    }, "Creating your account…")
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <AuthShowcase />

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <h2 className="text-4xl font-bold tracking-[-0.6px] text-[#11162e] sm:text-5xl">Create account</h2>
          <p className="mt-2 text-base text-[#7b809a]">Sign up as teacher or student</p>

          {flashCode === "incomplete_profile" ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your profile needs a role. Create an account below with teacher or student selected, or sign in from the
              login page if you already registered.
            </p>
          ) : null}

          <form onSubmit={handleSignup} className="mt-7 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Full name</label>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <User className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Email address</label>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <AtSign className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="name@institution.edu.pk"
                  autoComplete="email"
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
              </div>
            </div>

            <PasswordInput
              label="Password"
              leftIcon={<Lock />}
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Create a secure password"
              autoComplete="new-password"
              disabled={loading}
              invalid={formData.password.length > 0 && !isPasswordStrong(formData.password)}
            />

            <div className="rounded-xl border border-[#e7eaf3] bg-[#fafbff] px-3 py-3">
              <PasswordStrengthChecklist
                password={formData.password}
                confirmPassword={formData.confirmPassword}
                showMatch={false}
              />
            </div>

            <PasswordInput
              label="Confirm password"
              leftIcon={<Lock />}
              value={formData.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              disabled={loading}
              invalid={
                formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
              }
            />

            {formData.confirmPassword.length > 0 ? (
              <PasswordStrengthChecklist
                password={formData.password}
                confirmPassword={formData.confirmPassword}
                matchOnly
              />
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Role</label>
              <select
                value={formData.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="h-12 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm text-[#1b1f36] outline-none"
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-12 w-full rounded-xl bg-[#6562f1] text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#6f7692]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[#6860f3]">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
