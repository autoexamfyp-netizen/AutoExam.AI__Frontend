import { useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { GraduationCap, Shield } from "lucide-react"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import { dashboardPathForRole, resolveRole } from "../auth/roles"

export default function OtpVerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams])
  const flow = useMemo(() => {
    const f = (searchParams.get("flow") || "signup").toLowerCase()
    if (f === "recovery" || f === "signup" || f === "email") return f
    return "signup"
  }, [searchParams])

  if (!email) {
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
            <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Verification</h1>
          </div>
          <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai</p>
        </aside>
        <section className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-md rounded-2xl border border-[#e3e6ef] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#6d7491]">Add your email to the URL to verify a code, for example:</p>
            <code className="mt-3 block break-all rounded-lg bg-[#f4f6fb] px-3 py-2 text-xs text-[#1b1f36]">
              /auth/verify-otp?flow=signup&email=you@school.edu
            </code>
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-[#6860f3]">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const handleSuccess = ({ session }) => {
    if (flow === "recovery") {
      navigate("/auth/reset-password", { replace: true })
      return
    }
    const user = session?.user
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    const role = resolveRole(user)
    navigate(role ? dashboardPathForRole(role) : "/login", { replace: true })
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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Enter your code</h1>
          <p className="mt-5 max-w-[420px] text-lg text-[#a9b4d4]">
            Use the one-time code from your email to continue securely.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px] rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm transition-all duration-200">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
            <Shield className="h-6 w-6" />
          </div>
          <OtpVerificationForm
            email={email}
            flow={flow}
            onSuccess={handleSuccess}
            autoSubmit
            title={flow === "recovery" ? "Reset code" : "Email verification"}
            subtitle={
              flow === "recovery"
                ? `We sent a code to ${email}. Enter it below, then set a new password.`
                : `We sent a code to ${email}. Enter it to activate your account.`
            }
          />
          <p className="mt-8 text-center text-sm text-[#6f7692]">
            <Link to="/login" className="font-medium text-[#6860f3]">
              Back to login
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
