import { createElement, useEffect, useRef, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Wand2,
  X,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"

const navLinkClass = ({ isActive }) =>
  `flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#3e4768] hover:bg-[#f6f7fc]"
  }`

const NAV = [
  { to: "/teacher-dashboard", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher-dashboard/materials", label: "Materials", icon: FolderOpen },
  { to: "/teacher-dashboard/generate-exam", label: "Generate Exam", icon: Wand2 },
  { to: "/teacher-dashboard/exams", label: "My Exams", icon: ClipboardCheck },
  { to: "/teacher-dashboard/published-exams", label: "Published Exams", icon: Send },
  { to: "/teacher-dashboard/submissions", label: "Submissions", icon: Inbox },
  { to: "/teacher-dashboard/ai-detection", label: "AI Detection", icon: Bot },
  { to: "/teacher-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/teacher-dashboard/feedback", label: "Feedback", icon: MessageSquare },
]

const EXTRA_ROUTES = [
  { to: "/teacher-dashboard/settings", label: "Settings", icon: SettingsIcon },
]

function normalizePathname(pathname) {
  const trimmed = (pathname || "").replace(/\/+$/, "")
  return trimmed || "/teacher-dashboard"
}

/** Longest-prefix match for header breadcrumb (label + icon). */
function pageMetaFromPath(pathname) {
  const path = normalizePathname(pathname)
  const routes = [...NAV, ...EXTRA_ROUTES]
  const match = routes
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`),
    )
  const icon = match?.icon ?? LayoutDashboard
  return {
    label: match?.label ?? "Dashboard",
    icon: typeof icon === "object" && icon !== null ? icon : LayoutDashboard,
    isDashboard: path === "/teacher-dashboard",
  }
}

function renderNavIcon(Icon, className) {
  const Resolved = Icon ?? LayoutDashboard
  if (typeof Resolved !== "object" && typeof Resolved !== "function") {
    return createElement(LayoutDashboard, { className })
  }
  return createElement(Resolved, { className })
}

export default function TeacherLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [error, setError] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Teacher"
  const userEmail = user?.email || ""
  const pageMeta = pageMetaFromPath(pathname)

  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    if (!profileOpen) return
    const onPointerDown = (e) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (profileRef.current?.contains(t)) return
      setProfileOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [profileOpen])

  const handleLogout = async () => {
    setProfileOpen(false)
    setError("")
    const { error: signOutError } = await signOut()
    if (signOutError) {
      setError("Could not log out right now. Please try again.")
      return
    }
    navigate("/login", { replace: true })
  }

  const openSettings = () => {
    setProfileOpen(false)
    navigate("/teacher-dashboard/settings")
    closeMobile()
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f5fb] text-[#121938]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0f1730]/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu overlay"
          onClick={closeMobile}
        />
      ) : null}

      <div className="min-h-screen min-w-0 max-w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(280px,88vw)] flex-col overflow-hidden border-r border-[#e7eaf3] bg-white transition-transform duration-200 ease-out lg:w-[248px] ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#eef1f7] px-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6562f1] to-[#8b7cff] text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-[-0.2px] text-[#121938]">AutoExam.ai</span>
            <button
              type="button"
              className="ml-auto rounded-lg p-2 text-[#596286] lg:hidden"
              onClick={closeMobile}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={closeMobile}>
                {renderNavIcon(Icon, "h-4 w-4 shrink-0 opacity-90")}
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="relative shrink-0 border-t border-[#eef1f7] bg-white p-4" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              title={userEmail || userName}
              className="flex w-full items-start gap-3 rounded-2xl border border-[#e8ebf4] bg-[#fafbff] p-3 text-left transition hover:border-[#d8ddf0] hover:bg-[#f6f7fc]"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ede9ff] text-sm font-semibold text-[#5f4ce6]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-[#161d39]">{userName}</p>
                {userEmail ? (
                  <p className="mt-1 break-all text-[11px] leading-snug text-[#7f88a6]">{userEmail}</p>
                ) : null}
              </div>
            </button>

            {profileOpen ? (
              <div
                role="menu"
                className="absolute bottom-full left-4 right-4 z-[60] mb-2 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 shadow-[0_8px_30px_rgba(15,23,48,0.12)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openSettings}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-[#313a58] hover:bg-[#fafbff]"
                >
                  <SettingsIcon className="h-4 w-4 shrink-0 text-[#596286]" />
                  Settings
                </button>
                <div className="mx-2 border-t border-[#eef1f7]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-[#313a58] hover:bg-[#fafbff]"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-[#596286]" />
                  Log Out
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="box-border flex min-h-screen w-full min-w-0 max-w-full flex-col lg:pl-[248px]">
          <header className="fixed inset-x-0 top-0 z-30 box-border flex h-16 w-full min-w-0 items-center justify-between gap-3 border-b border-[#e7eaf3] bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6 lg:left-[248px] lg:w-[calc(100%-248px)] lg:max-w-[calc(100%-248px)]">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="rounded-xl border border-[#e8ebf4] bg-white p-2 text-[#596286] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
                  {renderNavIcon(pageMeta.icon, "h-4 w-4")}
                </span>
                <div className="min-w-0">
                  {pageMeta.isDashboard ? (
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[#151d3a] sm:text-sm">
                      {pageMeta.label}
                    </p>
                  ) : (
                    <>
                      
                      <p className="truncate text-sm font-semibold leading-tight text-[#151d3a] sm:text-base">
                        {pageMeta.label}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <NavLink
              to="/teacher-dashboard/generate-exam"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#6562f1] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5a56e2] sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create New Exam</span>
              <span className="sm:hidden">New Exam</span>
            </NavLink>
          </header>

          <main className="box-border min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-4 pb-4 pt-16 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}
            <Outlet key={user?.id ?? "signed-out"} />
          </main>
        </div>
      </div>
    </div>
  )
}
