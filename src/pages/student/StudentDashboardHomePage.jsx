import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import StableChartBox from "../../components/ui/StableChartBox"
import { AlarmClock, Bell, BookOpenCheck, ClipboardCheck, LineChart, PlayCircle, Target, TrendingUp } from "lucide-react"
import StatCard from "../../components/student/StatCard"
import StatusBadge from "../../components/student/StatusBadge"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchStudentDashboard } from "../../services/dashboardService"

function NotificationRow({ item }) {
  const tone =
    item.tone === "warning"
      ? "bg-[#fff6e3] text-[#c89422]"
      : item.tone === "success"
        ? "bg-[#eaf8f1] text-[#2f9b6d]"
        : "bg-[#eeebff] text-[#6962df]"

  return (
    <article className="flex gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(27,39,94,0.04)] transition hover:border-[#d8ddf0]">
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Bell className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-medium text-[#1a2341]">{item.title}</p>
        <p className="text-sm text-[#7f88a6]">{item.body}</p>
        <p className="mt-1 text-xs text-[#99a0b7]">{item.when}</p>
      </div>
    </article>
  )
}

export default function StudentDashboardHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bundle, setBundle] = useState({
    stats: { overallAverage: 0, examsAttempted: 0, pendingExams: 0, lastScore: 0 },
    trend: [],
    recentPerformances: [],
    notifications: [],
    activeExams: [],
  })

  const load = useCallback(async () => {
    try {
      const out = await fetchStudentDashboard()
      setBundle({
        stats: out?.stats || { overallAverage: 0, examsAttempted: 0, pendingExams: 0, lastScore: 0 },
        trend: out?.trend || [],
        recentPerformances: out?.recentPerformances || [],
        notifications: out?.notifications || [],
        activeExams: out?.activeExams || [],
      })
      setError("")
    } catch (e) {
      console.error("❌ Dashboard sync issue:", e)
      setError(e?.message || "Could not load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(() => {
      load()
    }, 30000)
    return () => {
      window.clearInterval(id)
    }
  }, [load])

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-6">
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  const { stats, trend, recentPerformances, notifications, activeExams } = bundle

  const formatDeadline = (iso) => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Dashboard</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">Overview of your exams and performance</p>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall average"
          value={`${stats.overallAverage}%`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Exams attempted"
          value={stats.examsAttempted}
          icon={<ClipboardCheck className="h-4 w-4" />}
          iconClassName="bg-[#e9f8f0] text-[#2ca36c]"
        />
        <StatCard
          label="Pending exams"
          value={stats.pendingExams}
          icon={<AlarmClock className="h-4 w-4" />}
          iconClassName="bg-[#fff6e1] text-[#c89422]"
        />
        <StatCard
          label="Last score"
          value={`${stats.lastScore}%`}
          icon={<Target className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_1px_3px_rgba(27,39,94,0.04)]">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1efff] text-[#6a55f5]">
                <LineChart className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#151d3a]">Performance snapshot</h2>
                <p className="text-xs text-[#7f88a6]">Recent trend</p>
              </div>
            </div>
          </div>
          <div className="w-full min-w-0 max-w-full">
            <StableChartBox heightPx={200}>
              {(w, h) => (
                <AreaChart width={w} height={h} data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6562f1" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#6562f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} domain={[60, "auto"]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e7eaf3",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6562f1" strokeWidth={2} fill="url(#scoreFill)" dot={{ r: 3, fill: "#6562f1" }} />
                </AreaChart>
              )}
            </StableChartBox>
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_1px_3px_rgba(27,39,94,0.04)]">
          <h2 className="text-sm font-semibold text-[#151d3a]">Last 5 exams</h2>
          <p className="text-xs text-[#7f88a6]">Scaled to percentage</p>
          <ul className="mt-4 space-y-3">
            {recentPerformances.length === 0 ? (
              <li className="rounded-xl bg-[#fafbff] px-3 py-2.5 text-sm text-[#7f88a6]">No completed exams yet.</li>
            ) : recentPerformances.map((row) => {
              const pct = Math.round((row.score / row.maxScore) * 100)
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fafbff] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1a2341]">{row.examTitle}</p>
                    <p className="text-xs text-[#99a0b7]">{row.date}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[#6562f1]">{pct}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#151d3a]">Active exams</h2>
            <p className="text-xs text-[#7f88a6]">Start or track upcoming assessments</p>
          </div>
          <Link to="/student-dashboard/exams" className="text-sm font-semibold text-[#6e63f6] transition hover:text-[#5d52e5]">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {activeExams.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e0e4ef] bg-white py-10 text-center text-sm text-[#7f88a6]">No active or upcoming exams</p>
          ) : (
            activeExams.map((row) => {
              const p = row.published
              const publishedId = p.id
              const title = p.title
              const subj = p.category?.title
              const canContinue = row.studentStatus === "in_progress" && row.windowStatus !== "expired"
              const canStart = row.studentStatus === "active" && row.windowStatus === "active"
              const isUpcoming = row.studentStatus === "upcoming" || row.windowStatus === "upcoming"

              return (
                <article
                  key={publishedId}
                  className="flex flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[#171f3c]">{title}</p>
                      <p className="text-xs text-[#7f88a6]">{subj || "Scheduled exam"}</p>
                    </div>
                    <StatusBadge
                      status={isUpcoming ? "upcoming" : canContinue || canStart ? "available" : "expired"}
                      label={canContinue ? "In progress" : undefined}
                    />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#697391] sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <BookOpenCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>{p.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlarmClock className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{formatDeadline(p.end_time)}</span>
                    </div>
                  </dl>
                  {canContinue ? (
                    <Link
                      to={`/student-dashboard/exams/${publishedId}/attempt`}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2]"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Continue exam
                    </Link>
                  ) : canStart ? (
                    <Link
                      to={`/student-dashboard/exams/${publishedId}/attempt`}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2]"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start exam
                    </Link>
                  ) : (
                    <p className="mt-4 text-center text-xs font-medium text-[#8a93ad]">
                      {isUpcoming ? "Opens at the scheduled time" : "Not available to start right now"}
                    </p>
                  )}
                </article>
              )
            })
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#151d3a]">Notifications</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(notifications.length ? notifications : [{ id: "n0", tone: "info", title: "No notifications yet", body: "New activity appears here.", when: "—" }]).map((n) => (
            <NotificationRow key={n.id} item={n} />
          ))}
        </div>
      </section>
    </div>
  )
}
