import { Link, useLocation } from "react-router-dom"
import { GraduationCap, ShieldAlert } from "lucide-react"
import { formatVerificationError } from "../auth/formatAuthError"

export default function VerificationFailedPage() {
  const location = useLocation()
  const state = location.state || {}
  const errorCode = state.errorCode || ""
  const description = state.description || ""

  const { title, detail } = formatVerificationError(errorCode, description)

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
          <h1 className="max-w-[340px] text-4xl font-bold leading-tight tracking-[-1px]">Link issue</h1>
          <p className="mt-5 max-w-[420px] text-lg text-[#a9b4d4]">This confirmation or recovery link could not be used.</p>
        </div>
        <p className="relative z-10 text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[560px] rounded-2xl border border-[#fde2e0] bg-white p-8 shadow-sm">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0ee] text-[#d7645e]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-center text-2xl font-bold text-[#11162e]">{title}</h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-[#7b809a]">{detail}</p>
          {description ? (
            <p className="mt-4 rounded-xl bg-[#f9fafc] px-3 py-2 text-center text-xs text-[#6d7491]">{description}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#6562f1] px-6 text-sm font-semibold text-white"
            >
              Back to login
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#e3e6ef] bg-white px-6 text-sm font-semibold text-[#1b1f36]"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
