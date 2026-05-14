import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Settings,
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
  { to: "/teacher-dashboard/exams", label: "Generated Exams", icon: ClipboardCheck },
  { to: "/teacher-dashboard/question-bank", label: "Question Bank", icon: Library },
  { to: "/teacher-dashboard/published-exams", label: "Published Exams", icon: Send },
  { to: "/teacher-dashboard/submissions", label: "Submissions", icon: Inbox },
  { to: "/teacher-dashboard/ai-detection", label: "AI Detection", icon: Bot },
  { to: "/teacher-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/teacher-dashboard/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/teacher-dashboard/settings", label: "Settings", icon: Settings },
]

export default function TeacherLayout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [error, setError] = useState("")

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Teacher"
  const userEmail = user?.email || ""
  const closeMobile = () => setMobileOpen(false)

  const handleLogout = async () => {
    setError("")
    const { error: signOutError } = await signOut()
    if (signOutError) {
      setError("Could not log out right now. Please try again.")
      return
    }
    navigate("/login", { replace: true })
  }

  const sidebar = (
    <>
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#eef1f7] px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6562f1] to-[#8b7cff] text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-[-0.2px] text-[#121938]">AutoExam.ai</span>
        <button type="button" className="ml-auto rounded-lg p-2 text-[#596286] lg:hidden" onClick={closeMobile} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={closeMobile}>
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[#eef1f7] p-4">
        <div className="rounded-2xl border border-[#e8ebf4] bg-[#fafbff] p-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ede9ff] text-sm font-semibold text-[#5f4ce6]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#161d39]">{userName}</p>
              <p className="truncate text-xs text-[#7f88a6]">{userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-sm font-medium text-[#313a58] transition hover:bg-[#f6f7fc]"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </>
  )

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
          className={`fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen min-h-0 w-[min(280px,88vw)] flex-col border-r border-[#e7eaf3] bg-white transition-transform duration-200 ease-out lg:w-[248px] ${
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {sidebar}
        </aside>

        <div className="box-border flex min-h-screen w-full min-w-0 max-w-full flex-col lg:pl-[248px]">
          <header className="fixed inset-x-0 top-0 z-30 box-border flex h-16 w-full min-w-0 items-center justify-between gap-3 border-b border-[#e7eaf3] bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6 lg:left-[248px] lg:w-[calc(100%-248px)] lg:max-w-[calc(100%-248px)]">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#e8ebf4] bg-white p-2 text-[#596286] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wider text-[#9aa3c2]">Teacher</p>
                <p className="truncate text-sm font-semibold text-[#151d3a]">Control center</p>
              </div>
            </div>
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <span className="rounded-full border border-[#e8ebf4] bg-white px-3 py-1 text-xs font-medium text-[#5d6580]">
                <GraduationCap className="mr-1 inline h-3.5 w-3.5 text-[#6562f1]" />
                AI workspace
              </span>
              <div className="flex items-center gap-2 rounded-full border border-[#e8ebf4] bg-white px-2 py-1">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ede9ff] text-xs font-semibold text-[#5f4ce6]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate pr-2 text-sm font-medium text-[#21294a]">{userName}</span>
              </div>
            </div>
          </header>

          <main className="box-border min-w-0 w-full max-w-full flex-1 overflow-x-hidden px-4 pb-4 pt-16 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
