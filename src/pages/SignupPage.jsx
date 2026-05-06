import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AtSign, GraduationCap, Lock, Sparkles, User, Zap } from "lucide-react"
import { supabase } from "../lib/supabaseClient"

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
          Create your account and start generating AI-powered assessments in minutes.
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

export default function SignupPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  const validate = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      return "All fields are required."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address."
    }
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters."
    }
    return ""
  }

  const handleGoogleSignup = async () => {
    setError("")
    setSuccess("")

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError("Google OAuth is not configured.")
      return
    }

    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${formData.role}`,
      },
    })

    if (oauthError) {
      setLoading(false)
      setError(oauthError.message)
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { data, error: signupError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
          role: formData.role,
        },
      },
    })
    setLoading(false)

    if (signupError) {
      setError(signupError.message)
      return
    }

    const userRole = data.user?.user_metadata?.role || formData.role
    setSuccess("Account created successfully.")
    navigate(userRole === "student" ? "/student-dashboard" : "/teacher-dashboard")
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
      <AuthShowcase />

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <h2 className="text-4xl font-bold tracking-[-0.6px] text-[#11162e] sm:text-5xl">Create account</h2>
          <p className="mt-2 text-base text-[#7b809a]">Sign up as teacher or student</p>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="mt-7 h-12 w-full rounded-xl border border-[#e3e6ef] bg-white text-base font-medium text-[#1b1f36] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-[#99a0b7]">
            <div className="h-px flex-1 bg-[#e3e6ef]" />
            or sign up with email
            <div className="h-px flex-1 bg-[#e3e6ef]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Full name</label>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <User className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Your full name"
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
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#1d233d]">Password</label>
              <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3">
                <Lock className="h-4 w-4 text-[#a2a8bd]" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-full w-full border-none bg-transparent text-sm text-[#1b1f36] outline-none"
                />
              </div>
            </div>

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
            {success ? <p className="text-sm text-green-600">{success}</p> : null}

            <button
              type="submit"
              disabled={loading}
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
