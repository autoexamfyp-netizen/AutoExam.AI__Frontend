import { useEffect, useMemo } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { GraduationCap, LockKeyhole } from "lucide-react"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import { OTP_CODE_LENGTH } from "../auth/otpService"
import { waitForAuthSession } from "../auth/waitForSession"
import { dashboardPathForRole, resolveRole } from "../auth/roles"
import { useAuth } from "../hooks/useAuth"

export default function OtpVerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setRecoveryFlowActive } = useAuth()

  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams])
  const flow = useMemo(() => {
    const f = (searchParams.get("flow") || "signup").toLowerCase()
    if (f === "recovery" || f === "signup" || f === "email") return f
    return "signup"
  }, [searchParams])

  const isRecovery = flow === "recovery"

  useEffect(() => {
    if (isRecovery && email) setRecoveryFlowActive(true)
    return () => setRecoveryFlowActive(false)
  }, [isRecovery, email, setRecoveryFlowActive])

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
            <p className="text-sm text-[#6d7491]">
              {isRecovery
                ? "Start from forgot password and enter your email to receive a code."
                : "Open the sign-up or check-email page with your email address."}
            </p>
            <Link
              to={isRecovery ? "/forgot-password" : "/signup"}
              className="mt-6 inline-block text-sm font-medium text-[#6860f3]"
            >
              {isRecovery ? "Go to forgot password" : "Back to sign up"}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const handleSuccess = async ({ session }) => {
    if (isRecovery) {
      const active = session ?? (await waitForAuthSession(25, 100)).session
      if (!active?.user) {
        navigate("/forgot-password", { replace: true })
        return
      }
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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">
            {isRecovery ? "Reset your password" : "Verify your email"}
          </h1>
          <p className="mt-5 max-w-[420px] text-lg leading-relaxed text-[#a9b4d4]">
            {isRecovery
              ? "Enter the one-time code from your email, then choose a new password."
              : "Enter the verification code we sent to your inbox."}
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h2 className="text-center text-2xl font-bold text-[#11162e]">
              {isRecovery ? "Enter reset code" : "Verify your email"}
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
              We sent a <span className="font-medium text-[#1b1f36]">{OTP_CODE_LENGTH}-digit code</span> to{" "}
              <span className="font-medium text-[#1b1f36]">{email}</span>
              {isRecovery ? ". Enter it below to continue." : ". Enter it to activate your account."}
            </p>

            <div className="mt-8">
              <OtpVerificationForm
                email={email}
                flow={flow}
                onSuccess={handleSuccess}
                embedded
                autoSubmit
              />
            </div>

            <p className="mt-8 text-center text-sm text-[#6f7692]">
              <Link to={isRecovery ? "/forgot-password" : "/login"} className="font-medium text-[#6860f3]">
                {isRecovery ? "Back to forgot password" : "Back to login"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
