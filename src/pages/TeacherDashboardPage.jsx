import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react"
import { useAuth } from "../hooks/useAuth"

const exams = [
  { id: 1, title: "Computer Science Mid-Term", status: "active", students: 72, completion: 84 },
  { id: 2, title: "Data Structures Quiz", status: "draft", students: 45, completion: 0 },
  { id: 3, title: "Programming Fundamentals Final", status: "completed", students: 93, completion: 100 },
  { id: 4, title: "Database Systems Mid", status: "active", students: 68, completion: 71 },
  { id: 5, title: "Operating Systems Quiz 2", status: "draft", students: 64, completion: 0 },
  { id: 6, title: "Software Engineering Assignment Test", status: "completed", students: 58, completion: 100 },
]

const aiAlerts = [
  { student: "Bilal Hassan", exam: "Computer Science Mid-Term", score: 84 },
  { student: "Ayesha Khan", exam: "Database Systems Mid", score: 79 },
  { student: "Hamza Ali", exam: "Programming Fundamentals Final", score: 72 },
]

const recentActivity = [
  { title: "AI detection alert", details: "2 submissions flagged above 70% confidence", when: "2 hours ago", exam: "Computer Science Mid-Term" },
  { title: "Exam published", details: "Database Systems Mid is now live for students", when: "5 hours ago", exam: "Database Systems Mid" },
  { title: "Draft updated", details: "Added 5 MCQs to Data Structures Quiz", when: "Yesterday", exam: "Data Structures Quiz" },
]

const navItems = [
  { key: "my-exams", label: "My Exams", icon: BookOpenCheck, active: true },
  { key: "generate-exam", label: "Generate Exam", icon: ListChecks },
  { key: "ai-detection", label: "AI Detection", icon: ShieldAlert },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "students", label: "Students", icon: Users },
]

function getStatusLabel(status) {
  if (status === "active") return "Active"
  if (status === "draft") return "Drafts"
  return "Completed"
}

export default function TeacherDashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [error, setError] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Professor"
  const userEmail = user?.email || ""

  const counts = useMemo(() => {
    const active = exams.filter((item) => item.status === "active").length
    const drafts = exams.filter((item) => item.status === "draft").length
    const completed = exams.filter((item) => item.status === "completed").length
    const totalStudents = exams.reduce((sum, item) => sum + item.students, 0)
    const avgCompletion = Math.round(exams.reduce((sum, item) => sum + item.completion, 0) / exams.length)

    return {
      totalExams: exams.length,
      active,
      drafts,
      completed,
      totalStudents,
      aiFlags: aiAlerts.length,
      avgCompletion,
      avgScore: 72,
    }
  }, [])

  const filteredExams = useMemo(() => {
    if (selectedFilter === "all") return exams
    return exams.filter((exam) => exam.status === selectedFilter)
  }, [selectedFilter])

  const handleLogout = async () => {
    setError("")
    const { error: signOutError } = await signOut()
    if (signOutError) {
      setError("Could not log out right now. Please try again.")
      return
    }
    navigate("/login", { replace: true })
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
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${
                    item.active ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#3e4768] hover:bg-[#f6f7fc]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-[#eef1f7] p-4">
            <div className="rounded-2xl border border-[#e8ebf4] p-3">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ecefff] text-sm font-semibold text-[#5a59c8]">
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
              <h1 className="text-2xl font-semibold text-[#151d3a]">Teacher Dashboard</h1>
              <p className="text-sm text-[#7d86a5]">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#e8ebf4] bg-white">
                <Clock3 className="h-4 w-4 text-[#596286]" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f25f5c]" />
              </button>
              <div className="hidden items-center gap-3 rounded-full border border-[#e8ebf4] bg-white px-3 py-2 sm:flex">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ecefff] text-xs font-semibold text-[#595bcf]">
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

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              {[
                { label: "Total Exams", value: counts.totalExams, icon: BookOpenCheck, tone: "text-[#6f63f7] bg-[#eeebff]" },
                { label: "Active", value: counts.active, icon: CheckCircle2, tone: "text-[#2ca36c] bg-[#e9f8f0]" },
                { label: "Students", value: counts.totalStudents, icon: Users, tone: "text-[#2a9bc2] bg-[#eaf7fb]" },
                { label: "AI Flags", value: counts.aiFlags, icon: ShieldAlert, tone: "text-[#d66a5b] bg-[#fff0ee]" },
                { label: "Completion", value: `${counts.avgCompletion}%`, icon: Clock3, tone: "text-[#d2a030] bg-[#fff6e3]" },
                { label: "Avg Score", value: `${counts.avgScore}%`, icon: BarChart3, tone: "text-[#8a67ff] bg-[#f1ecff]" },
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

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: `All Exams (${counts.totalExams})` },
                { key: "active", label: `Active (${counts.active})` },
                { key: "draft", label: `Drafts (${counts.drafts})` },
                { key: "completed", label: `Completed (${counts.completed})` },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`h-10 rounded-xl border px-4 text-sm font-medium ${
                    selectedFilter === filter.key
                      ? "border-[#d9ddf0] bg-white text-[#1d2544]"
                      : "border-transparent bg-[#eceff8] text-[#6c7593] hover:bg-[#e4e8f5]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#171f3c]">Recent Activity</h2>
                  <button type="button" className="text-sm font-medium text-[#6e63f6] hover:text-[#5d52e5]">
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {recentActivity.map((item) => (
                    <article key={`${item.title}-${item.when}`} className="flex items-start gap-3 rounded-xl border border-[#edf0f7] p-3">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff3f1] text-[#e56b60]">
                        {item.title.includes("alert") ? <AlertTriangle className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1a2341]">{item.title}</p>
                        <p className="text-sm text-[#65708f]">{item.exam}</p>
                        <p className="text-sm text-[#7a84a3]">{item.details}</p>
                      </div>
                      <span className="ml-auto whitespace-nowrap text-xs text-[#8f97b2]">{item.when}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#171f3c]">AI Detection Alerts</h2>
                  <span className="text-sm font-medium text-[#d7645e]">{aiAlerts.length} Active</span>
                </div>
                <div className="space-y-3">
                  {aiAlerts.map((alert) => (
                    <article key={alert.student} className="flex items-center gap-3 rounded-xl border border-[#edf0f7] p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ecefff] text-sm font-semibold text-[#6264d7]">
                        {alert.student.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#1a2341]">{alert.student}</p>
                        <p className="truncate text-sm text-[#6a7493]">{alert.exam}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#cb4f47]">{alert.score}%</span>
                        <ChevronDown className="h-4 w-4 text-[#8e97b1]" />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#171f3c]">My Exams</h2>
                <span className="text-sm text-[#7982a0]">{filteredExams.length} shown</span>
              </div>
              <div className="space-y-3">
                {filteredExams.map((exam) => (
                  <article key={exam.id} className="flex flex-col gap-3 rounded-xl border border-[#edf0f7] p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1a2341]">{exam.title}</p>
                      <p className="text-sm text-[#6e7796]">{exam.students} students enrolled</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          exam.status === "active"
                            ? "bg-[#e9f8f0] text-[#2ca36c]"
                            : exam.status === "draft"
                              ? "bg-[#eef1f9] text-[#6f7898]"
                              : "bg-[#e9f0ff] text-[#4869c4]"
                        }`}
                      >
                        {getStatusLabel(exam.status)}
                      </span>
                      <span className="text-sm text-[#617093]">{exam.completion}% completion</span>
                    </div>
                  </article>
                ))}
                {filteredExams.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#dbe0ef] px-4 py-7 text-center text-sm text-[#7e88a8]">
                    No exams available in this category.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="fixed bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-[#6562f1] text-white shadow-lg lg:hidden"
        aria-label="Log out"
      >
        <UserRound className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="fixed bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-[#dbe0ef] bg-white px-4 py-2 text-sm font-medium text-[#2f3857] shadow-sm lg:hidden"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </button>
    </main>
  )
}
