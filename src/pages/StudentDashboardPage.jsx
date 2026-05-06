import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Clock3,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Trophy,
} from "lucide-react"
import { supabase } from "../lib/supabaseClient"

const studentExams = [
  { id: 1, title: "Computer Science Mid-Term", code: "CS-301", questions: 35, duration: 90, marks: 100, dueDate: "2025-05-15", status: "upcoming" },
  { id: 2, title: "Data Structures Final", code: "CS-220", questions: 40, duration: 120, marks: 100, dueDate: "2025-05-18", status: "available" },
  { id: 3, title: "AI Lab Exam", code: "CS-412", questions: 20, duration: 60, marks: 50, dueDate: "2025-05-10", status: "completed" },
  { id: 4, title: "Database Quiz 2", code: "CS-330", questions: 25, duration: 45, marks: 50, dueDate: "2025-05-07", status: "completed" },
  { id: 5, title: "Software Engineering Viva", code: "CS-410", questions: 15, duration: 30, marks: 30, dueDate: "2025-05-06", status: "completed" },
]

const notifications = [
  { id: 1, title: "Computer Science Mid-Term starts in 2 days", when: "Just now", tone: "warning" },
  { id: 2, title: "Your AI Lab Exam results are now available", when: "2 hours ago", tone: "success" },
  { id: 3, title: "New exam generated: Data Structures Final", when: "1 day ago", tone: "info" },
]

const sidebarItems = [
  { key: "my-exams", label: "My Exams", icon: ClipboardList },
  { key: "results", label: "Results & Feedback", icon: Trophy },
  { key: "notifications", label: "Notifications", icon: Bell, badge: notifications.length },
]

function examBadge(status) {
  if (status === "available") return "bg-[#e8fbf3] text-[#1f9d67]"
  if (status === "completed") return "bg-[#edf3ff] text-[#3f67c8]"
  return "bg-[#fff7e8] text-[#bc8a30]"
}

function examAction(status) {
  if (status === "available") return { label: "Start Exam", style: "bg-[#6562f1] text-white hover:bg-[#5a56e2]" }
  if (status === "completed") return { label: "View Result", style: "bg-[#ecf2ff] text-[#4b65be] hover:bg-[#e2ebff]" }
  return { label: "Not Yet Available", style: "bg-[#f1f3f8] text-[#8a93ad]" }
}

export default function StudentDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userName, setUserName] = useState("Student")
  const [userEmail, setUserEmail] = useState("")
  const [activeView, setActiveView] = useState("my-exams")

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        navigate("/login", { replace: true })
        return
      }

      const role = user.user_metadata?.role
      if (role && role !== "student") {
        navigate("/teacher-dashboard", { replace: true })
        return
      }

      const nameFromMeta = user.user_metadata?.full_name
      setUserName(nameFromMeta || user.email?.split("@")[0] || "Student")
      setUserEmail(user.email || "")
      setLoading(false)
    }

    loadSession()
  }, [navigate])

  const stats = useMemo(() => {
    const enrolled = studentExams.length
    const completed = studentExams.filter((exam) => exam.status === "completed").length
    return { enrolled, completed, avgScore: 77 }
  }, [])

  const upcomingCount = useMemo(() => studentExams.filter((exam) => exam.status === "upcoming").length, [])
  const completedCount = useMemo(() => studentExams.filter((exam) => exam.status === "completed").length, [])

  const handleLogout = async () => {
    setError("")
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError("Could not log out right now. Please try again.")
      return
    }
    navigate("/login", { replace: true })
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f5fb] px-6">
        <div className="rounded-2xl border border-[#e3e6ef] bg-white px-8 py-6 text-center">
          <h1 className="text-xl font-semibold text-[#141a32]">Loading student portal...</h1>
          <p className="mt-2 text-sm text-[#6d7491]">Please wait while we fetch your session.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f5fb] text-[#121938]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] flex-col border-r border-[#e7eaf3] bg-white lg:flex">
          <div className="flex h-[78px] items-center gap-3 border-b border-[#eef1f7] px-6">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ede9ff] text-[#6a55f5]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">AutoExam.ai</span>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveView(item.key)}
                  className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${
                    isActive ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#3e4768] hover:bg-[#f6f7fc]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#6a5df6] px-1 text-xs text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-[#eef1f7] p-4">
            <div className="rounded-2xl border border-[#e8ebf4] p-3">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf7f2] text-sm font-semibold text-[#2e8f66]">
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
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-sm font-medium text-[#313a58] hover:bg-[#fafbff]"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <header className="flex h-[78px] items-center justify-between border-b border-[#e7eaf3] bg-white px-5 sm:px-8">
            <div>
              <h1 className="text-2xl font-semibold text-[#151d3a]">Student Portal</h1>
              <p className="text-sm text-[#7d86a5]">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e8ebf4] bg-white">
                <Bell className="h-4 w-4 text-[#596286]" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6a5df6]" />
              </button>
              <div className="hidden items-center gap-3 rounded-full border border-[#e8ebf4] bg-white px-3 py-2 sm:flex">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf7f2] text-xs font-semibold text-[#2e8f66]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#21294a]">{userName}</span>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-5 sm:p-8">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { label: "Enrolled", value: stats.enrolled, icon: BookOpenCheck, tone: "text-[#6f63f7] bg-[#eeebff]" },
                { label: "Completed", value: stats.completed, icon: CheckCheck, tone: "text-[#2ca36c] bg-[#e9f8f0]" },
                { label: "Avg Score", value: `${stats.avgScore}%`, icon: Trophy, tone: "text-[#d19a26] bg-[#fff6e1]" },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <article key={card.label} className="rounded-2xl border border-[#e7eaf3] bg-white p-4">
                    <div className="flex items-center gap-3 text-sm text-[#687191]">
                      <span className={`grid h-7 w-7 place-items-center rounded-lg ${card.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {card.label}
                    </div>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.5px] text-[#141c37]">{card.value}</p>
                  </article>
                )
              })}
            </div>

            {activeView === "notifications" ? (
              <section>
                <h2 className="mb-3 text-3xl font-semibold tracking-[-0.4px] text-[#171f3c]">Notifications</h2>
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <article key={item.id} className="flex items-start gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4">
                      <span
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          item.tone === "warning"
                            ? "bg-[#fff6e3] text-[#c89422]"
                            : item.tone === "success"
                              ? "bg-[#eaf8f1] text-[#2f9b6d]"
                              : "bg-[#eeebff] text-[#6962df]"
                        }`}
                      >
                        {item.tone === "warning" ? <Clock3 className="h-4 w-4" /> : item.tone === "success" ? <ShieldCheck className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="font-medium text-[#1a2341]">{item.title}</p>
                        <p className="text-sm text-[#7f88a6]">{item.when}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold tracking-[-0.4px] text-[#171f3c]">All Exams ({stats.enrolled})</h2>
                  <p className="text-sm text-[#76809f]">
                    {upcomingCount} upcoming &nbsp;·&nbsp; {completedCount} completed
                  </p>
                </div>
                <div className="space-y-3">
                  {studentExams.map((exam) => {
                    const action = examAction(exam.status)
                    return (
                      <article key={exam.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[27px] font-semibold text-[#171f3c]">{exam.title}</p>
                            <p className="text-sm text-[#7d86a5]">{exam.code}</p>
                          </div>
                          <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold capitalize ${examBadge(exam.status)}`}>
                            {exam.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#697391]">
                          <span className="inline-flex items-center gap-1.5">
                            <ClipboardList className="h-4 w-4" />
                            {exam.questions} Qs
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" />
                            {exam.duration} min
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Trophy className="h-4 w-4" />
                            {exam.marks} marks
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            Due {exam.dueDate}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium ${action.style}`}
                        >
                          {exam.status === "available" ? <BookOpenCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          {action.label}
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
