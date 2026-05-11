import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  ClipboardCheck,
  FileText,
  Layers,
  ListChecks,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import StatCard from "../../components/student/StatCard"
import StableChartBox from "../../components/ui/StableChartBox"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherDashboard } from "../../services/dashboardService"

const TYPE_COLORS = ["#6562f1", "#2ca36c", "#c89422"]
const TOPIC_COLORS = ["#6562f1", "#3f67c8", "#2ca36c", "#c89422", "#c94a4a", "#7e57c2"]

function relative(when) {
  if (!when) return ""
  const diff = (Date.now() - new Date(when).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`
  return new Date(when).toLocaleDateString()
}

const ACTIVITY_ICON = {
  material: { icon: <Upload className="h-4 w-4" />, klass: "bg-[#e9f8f0] text-[#2ca36c]" },
  text: { icon: <FileText className="h-4 w-4" />, klass: "bg-[#edf3ff] text-[#3f67c8]" },
  question: { icon: <Sparkles className="h-4 w-4" />, klass: "bg-[#f1efff] text-[#5f4ce6]" },
  exam: { icon: <ClipboardCheck className="h-4 w-4" />, klass: "bg-[#fff6e1] text-[#c89422]" },
  publish: { icon: <Send className="h-4 w-4" />, klass: "bg-[#e8fbf3] text-[#1f9d67]" },
  submission: { icon: <Activity className="h-4 w-4" />, klass: "bg-[#eeebff] text-[#6962df]" },
}

export default function TeacherHomePage() {
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
              ? "Backend is not running. Start it with `npm run dev` inside /Backend."
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
  const byTopic = useMemo(() => data?.analytics?.byTopic ?? [], [data])
  const examsTrend = useMemo(() => data?.analytics?.examsTrend ?? [], [data])

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
  const activity = data?.activity ?? []

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Dashboard</h1>
          <p className="mt-1 break-words text-sm text-[#7d86a5]">Live overview of your AI question bank, exams, and content</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] transition hover:bg-[#fafbff]"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Total materials" value={stats.totalMaterials ?? 0} icon={<Layers className="h-4 w-4" />} />
        <StatCard
          label="Total questions"
          value={stats.totalQuestions ?? 0}
          icon={<ListChecks className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
        <StatCard
          label="AI generated"
          value={stats.totalAiQuestions ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          iconClassName="bg-[#f1efff] text-[#5f4ce6]"
        />
        <StatCard
          label="Exam templates"
          value={stats.totalExams ?? 0}
          icon={<ClipboardCheck className="h-4 w-4" />}
          iconClassName="bg-[#e9f8f0] text-[#2ca36c]"
        />
        <StatCard
          label="Published exams"
          value={stats.totalPublishedExams ?? 0}
          icon={<Send className="h-4 w-4" />}
          iconClassName="bg-[#eeebff] text-[#6962df]"
        />
        <StatCard
          label="Active exams"
          value={stats.activePublishedExams ?? 0}
          icon={<Activity className="h-4 w-4" />}
          iconClassName="bg-[#e8fbf3] text-[#1f9d67]"
        />
        <StatCard
          label="Total submissions"
          value={stats.totalExamSubmissions ?? 0}
          icon={<FileText className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
        <StatCard
          label="Pending evaluations"
          value={stats.pendingEvaluations ?? 0}
          icon={<Activity className="h-4 w-4" />}
          iconClassName="bg-[#fff6e1] text-[#c89422]"
        />
        <StatCard
          label="Students attempted"
          value={stats.studentsAttempted ?? 0}
          icon={<Users className="h-4 w-4" />}
          iconClassName="bg-[#fdecec] text-[#c94a4a]"
        />
        <StatCard
          label="Roster (students)"
          value={stats.totalStudents ?? 0}
          icon={<Users className="h-4 w-4" />}
          iconClassName="bg-[#f1f3f8] text-[#5a6178]"
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Questions by type</h2>
          <p className="text-xs text-[#7f88a6]">Live mix across your question bank</p>
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Topic distribution</h2>
          <p className="text-xs text-[#7f88a6]">Top topics across your bank</p>
          <div className="mt-4 w-full min-w-0 max-w-full">
            {byTopic.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#8a93ad]">No topics yet — generate some questions.</p>
            ) : (
              <StableChartBox heightPx={220}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={byTopic} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {byTopic.map((_, i) => (
                        <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </StableChartBox>
            )}
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Exam creation trend</h2>
          <p className="text-xs text-[#7f88a6]">Exams created per week</p>
          <div className="mt-4 w-full min-w-0 max-w-full">
            {examsTrend.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#8a93ad]">No exams yet — head to “Generate exam”.</p>
            ) : (
              <StableChartBox heightPx={220}>
                {(w, h) => (
                  <LineChart width={w} height={h} data={examsTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#6562f1" strokeWidth={2} dot={{ r: 3, fill: "#6562f1" }} />
                  </LineChart>
                )}
              </StableChartBox>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#151d3a]">Recent activity</h2>
          <Link to="/teacher-dashboard/materials" className="text-xs font-semibold text-[#6e63f6] hover:underline">
            View materials
          </Link>
        </div>
        {activity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dfe3ee] bg-white p-8 text-center text-sm text-[#7d86a5]">
            Nothing yet. Upload a material or paste content into the Text studio to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activity.map((item) => {
              const meta = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.material
              return (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.klass}`}>{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1a2341]">{item.title}</p>
                    <p className="truncate text-sm text-[#7f88a6]">{item.detail}</p>
                    <p className="mt-1 text-xs text-[#99a0b7]">{relative(item.when)}</p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#151d3a]">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/teacher-dashboard/generate-exam"
            className="flex items-center gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/40 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151d3a]">Generate exam</p>
              <p className="text-xs text-[#7f88a6]">Compose with AI</p>
            </div>
          </Link>
          <Link
            to="/teacher-dashboard/materials"
            className="flex items-center gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/40 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f8f0] text-[#2ca36c]">
              <Upload className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151d3a]">Add content</p>
              <p className="text-xs text-[#7f88a6]">Upload or paste text</p>
            </div>
          </Link>
          <Link
            to="/teacher-dashboard/question-bank"
            className="flex items-center gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/40 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3ff] text-[#3f67c8]">
              <ListChecks className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151d3a]">Question bank</p>
              <p className="text-xs text-[#7f88a6]">Edit & organize</p>
            </div>
          </Link>
          <Link
            to="/teacher-dashboard/ai-detection"
            className="flex items-center gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/40 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fdecec] text-[#c94a4a]">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151d3a]">AI detection</p>
              <p className="text-xs text-[#7f88a6]">Review flags</p>
            </div>
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/teacher-dashboard/published-exams"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff]"
          >
            <ArrowRight className="h-4 w-4" />
            Open published exams
          </Link>
        </div>
      </section>
    </div>
  )
}
