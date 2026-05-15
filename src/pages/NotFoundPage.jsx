import { useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Compass, GraduationCap, Home, ShieldAlert, SearchX } from "lucide-react"
import { useAuth } from "../hooks/useAuth"
import { dashboardPathForRole, resolveRole } from "../auth/roles"

function ActionLink({ to, icon: Icon, children, primary = false }) {
  const base =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6e5cf7] focus-visible:ring-offset-2"
  const variant = primary
    ? "bg-[#6562f1] text-white hover:bg-[#5755e0]"
    : "border border-[#e3e6ef] bg-white text-[#1b1f36] hover:bg-[#f6f7fc]"

  return (
    <Link to={to} className={`${base} ${variant}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

export default function NotFoundPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const attemptedPath = useMemo(() => {
    const path = `${location.pathname}${location.search}${location.hash}`
    return path === "/" ? "/" : path
  }, [location.hash, location.pathname, location.search])

  const role = resolveRole(user)
  const dashboardPath = role ? dashboardPathForRole(role) : null

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:flex">
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

          <div className="max-w-[380px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs tracking-[0.18em] text-[#c9d2f2] uppercase">
              <Compass className="h-3.5 w-3.5" />
              Page not found
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-[-1px]">You took a wrong turn</h1>
            <p className="mt-5 text-lg leading-[1.45] text-[#a9b4d4] sm:text-xl">
              The page you requested does not exist, was moved, or the link is no longer valid.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-[#9ca8cc]">© 2026 AutoExam.ai (COMSATS University Islamabad, Lahore)</p>
        </div>
      </aside>

      <section className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-8 lg:w-[58%]">
        <div className="w-full max-w-[640px]">
          <div className="rounded-2xl border border-[#e3e6ef] bg-white p-8 shadow-sm sm:p-10">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff0ee] text-[#d7645e]">
                <SearchX className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9aa3c2]">404</p>
                <h2 className="mt-1 text-3xl font-bold tracking-[-0.5px] text-[#11162e]">We couldn’t find that page</h2>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#eef1f7] bg-[#f9fafc] p-4 text-sm leading-7 text-[#5a627e]">
              <p>
                Requested address: <span className="font-medium text-[#1b1f36]">{attemptedPath}</span>
              </p>
              <p className="mt-2">
                Check the URL for typos, refresh the page, or use one of the safe navigation options below.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-5 text-sm font-semibold text-[#1b1f36] transition hover:bg-[#f6f7fc]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go back
              </button>
              <ActionLink to="/" icon={Home} primary>
                Home
              </ActionLink>
              <ActionLink to="/login" icon={ShieldAlert}>
                Login
              </ActionLink>
              {dashboardPath ? (
                <ActionLink to={dashboardPath} icon={Compass}>
                  My dashboard
                </ActionLink>
              ) : (
                <ActionLink to="/signup" icon={Compass}>
                  Create account
                </ActionLink>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-[#e7eaf3] bg-[#fafbff] p-5">
              <p className="text-sm font-semibold text-[#151d3a]">Helpful places</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionLink to="/" icon={Home}>
                  Home
                </ActionLink>
                <ActionLink to="/login" icon={ShieldAlert}>
                  Login
                </ActionLink>
                <ActionLink to="/signup" icon={Compass}>
                  Sign up
                </ActionLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}