import { useMemo } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { GraduationCap, Mail } from "lucide-react"
import OtpVerificationForm from "../components/otp/OtpVerificationForm"
import { OTP_CODE_LENGTH } from "../auth/otpService"
import { dashboardPathForRole, resolveRole } from "../auth/roles"

export default function CheckEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = useMemo(() => searchParams.get("email")?.trim() || "", [searchParams])

  const handleOtpSuccess = ({ session }) => {
    const user = session?.user
    if (!user) {
      navigate("/login", { replace: true })
      return
    }
    const role = resolveRole(user) || "teacher"
    navigate(dashboardPathForRole(role), { replace: true })
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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Check your email</h1>
          <p className="mt-5 max-w-[420px] text-lg leading-relaxed text-[#a9b4d4]">
            Enter the verification code we sent to your inbox to finish creating your account.
          </p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px]">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm transition-shadow duration-200">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#eeebff] text-[#6a55f5]">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-center text-2xl font-bold text-[#11162e]">Verify your email</h2>

            {email ? (
              <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
                We sent a <span className="font-medium text-[#1b1f36]">{OTP_CODE_LENGTH}-digit code</span> to{" "}
                <span className="font-medium text-[#1b1f36]">{email}</span>. Enter it below to activate your account.
              </p>
            ) : (
              <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">
                Your account was created. Open the sign-up link again with your email address, or sign in if you already
                verified.
              </p>
            )}

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
            ) : (
              <p className="mt-8 text-center text-sm text-[#6f7692]">
                <Link to="/signup" className="font-medium text-[#6860f3]">
                  Back to sign up
                </Link>
              </p>
            )}

            <p className="mt-8 text-center text-sm text-[#6f7692]">
              Wrong address?{" "}
              <Link to="/signup" className="font-medium text-[#6860f3]">
                Sign up again
              </Link>
              {" · "}
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
