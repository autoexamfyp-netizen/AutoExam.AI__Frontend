import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  AlertCircle,
  ClipboardCheck,
  FileText,
  Layers,
  ListChecks,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react"
import StatCard from "../../components/student/StatCard"
import StableChartBox from "../../components/ui/StableChartBox"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { useAuth } from "../../hooks/useAuth"
import { fetchTeacherDashboard } from "../../services/dashboardService"

function greetingForHour(hour) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function firstNameFromUser(user) {
  const full = user?.user_metadata?.full_name?.trim()
  if (full) return full.split(/\s+/)[0]
  const email = user?.email?.split("@")[0]
  if (!email) return "there"
  return email.charAt(0).toUpperCase() + email.slice(1)
}

const TYPE_COLORS = ["#6562f1", "#2ca36c", "#c89422"]
export default function TeacherHomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const out = await fetchTeacherDashboard()
        if (!cancelled) {
          setData(out)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.message?.includes("Failed to fetch")
              ? "Unable to connect. Please try again."
              : e?.message || "Could not load dashboard.",
          )
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const byType = useMemo(() => data?.analytics?.byType ?? [], [data])
  const byDifficulty = useMemo(() => data?.analytics?.byDifficulty ?? [], [data])

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-6">
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Dashboard unavailable</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stats = data?.stats ?? {}
  const greeting = greetingForHour(new Date().getHours())
  const firstName = firstNameFromUser(user)

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-medium text-[#313a58] sm:text-lg">
          {greeting}, {firstName}. Here&apos;s what&apos;s happening today.
        </p>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] transition hover:bg-[#fafbff]"
          title="Refresh dashboard"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 lg:gap-3">
        <StatCard
          compact
          label="Course materials uploaded"
          value={stats.totalMaterials ?? 0}
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          compact
          label="Total questions"
          value={stats.totalQuestions ?? 0}
          icon={<ListChecks className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
        <StatCard
          compact
          label="Questions from AI"
          value={stats.totalAiQuestions ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          iconClassName="bg-[#f1efff] text-[#5f4ce6]"
        />
        <StatCard
          compact
          label="Saved exam templates"
          value={stats.totalExams ?? 0}
          icon={<ClipboardCheck className="h-4 w-4" />}
          iconClassName="bg-[#e9f8f0] text-[#2ca36c]"
        />
        <StatCard
          compact
          label="Published exams"
          value={stats.totalPublishedExams ?? 0}
          icon={<Send className="h-4 w-4" />}
          iconClassName="bg-[#eeebff] text-[#6962df]"
        />
        <StatCard
          compact
          label="Active exams"
          value={stats.activePublishedExams ?? 0}
          icon={<Activity className="h-4 w-4" />}
          iconClassName="bg-[#e8fbf3] text-[#1f9d67]"
        />
        <StatCard
          compact
          label="Submissions"
          value={stats.totalExamSubmissions ?? 0}
          icon={<FileText className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
        <StatCard
          compact
          label="Awaiting your review"
          value={stats.pendingEvaluations ?? 0}
          icon={<Activity className="h-4 w-4" />}
          iconClassName="bg-[#fff6e1] text-[#c89422]"
        />
        <StatCard
          compact
          label="Students who attempted"
          value={stats.studentsAttempted ?? 0}
          icon={<Users className="h-4 w-4" />}
          iconClassName="bg-[#fdecec] text-[#c94a4a]"
        />
        <StatCard
          compact
          label="Enrolled students"
          value={stats.totalStudents ?? 0}
          icon={<Users className="h-4 w-4" />}
          iconClassName="bg-[#f1f3f8] text-[#5a6178]"
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Questions by type</h2>
          <p className="text-xs text-[#7f88a6]">Breakdown of question types you've created so far</p>
          <div className="mt-4 w-full min-w-0 max-w-full">
            <StableChartBox heightPx={220}>
              {(w, h) => (
                <PieChart width={w} height={h}>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              )}
            </StableChartBox>
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Difficulty distribution</h2>
          <p className="text-xs text-[#7f88a6]">Easy / Medium / Hard balance</p>
          <div className="mt-4 w-full min-w-0 max-w-full">
            <StableChartBox heightPx={220}>
              {(w, h) => (
                <BarChart width={w} height={h} data={byDifficulty} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#6562f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </StableChartBox>
          </div>
        </div>
      </section>

    </div>
  )
}
