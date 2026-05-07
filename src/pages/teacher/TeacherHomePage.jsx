import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import StableChartBox from "../../components/ui/StableChartBox"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  FilePlus,
  Inbox,
  Layers,
  Sparkles,
  Upload,
  Users,
} from "lucide-react"
import StatCard from "../../components/student/StatCard"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherDashboardMock } from "../../data/teacherMockData"

const toneIcon = {
  info: "bg-[#eeebff] text-[#6962df]",
  success: "bg-[#eaf8f1] text-[#2f9b6d]",
  warning: "bg-[#fff6e3] text-[#c89422]",
}

export default function TeacherHomePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherDashboardMock()
      if (!c) {
        setData(d)
        setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="min-w-0 max-w-full space-y-6">
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  const { stats, trend, weakest, activity } = data

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Dashboard</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">Overview, analytics preview, and quick actions</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total exams" value={stats.totalExams} icon={<Layers className="h-4 w-4" />} />
        <StatCard
          label="Students"
          value={stats.totalStudents}
          icon={<Users className="h-4 w-4" />}
          iconClassName="bg-[#e9f8f0] text-[#2ca36c]"
        />
        <StatCard
          label="Active exams"
          value={stats.activeExams}
          icon={<Activity className="h-4 w-4" />}
          iconClassName="bg-[#edf3ff] text-[#3f67c8]"
        />
        <StatCard
          label="Pending evaluations"
          value={stats.pendingEvaluations}
          icon={<BarChart3 className="h-4 w-4" />}
          iconClassName="bg-[#fff6e1] text-[#c89422]"
        />
        <StatCard
          label="AI flags"
          value={stats.aiFlags}
          icon={<Bot className="h-4 w-4" />}
          iconClassName="bg-[#fdecec] text-[#c94a4a]"
        />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Class performance trend</h2>
          <p className="text-xs text-[#7f88a6]">Recent average scores (mock)</p>
          <div className="mt-4 w-full min-w-0 max-w-full">
            <StableChartBox heightPx={200}>
              {(w, h) => (
                <AreaChart width={w} height={h} data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6562f1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6562f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} domain={[60, "auto"]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                  <Area type="monotone" dataKey="avg" stroke="#6562f1" fill="url(#tFill)" strokeWidth={2} dot={{ r: 3, fill: "#6562f1" }} />
                </AreaChart>
              )}
            </StableChartBox>
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Weakest topic</h2>
          <p className="text-xs text-[#7f88a6]">Where to focus instruction next</p>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-base font-semibold text-[#151d3a]">{weakest.name}</p>
            <p className="mt-1 text-sm text-[#5d6580]">
              Avg score <span className="font-semibold text-amber-800">{weakest.avgScore}%</span> across {weakest.attempts} attempts
            </p>
          </div>
          <Link
            to="/teacher-dashboard/analytics"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#6e63f6] hover:text-[#5d52e5]"
          >
            Open analytics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#151d3a]">Recent activity</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {activity.map((item) => (
            <article key={item.id} className="flex gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneIcon[item.tone] ?? toneIcon.info}`}>
                {item.type === "ai" ? <AlertTriangle className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-[#1a2341]">{item.title}</p>
                <p className="text-sm text-[#7f88a6]">{item.detail}</p>
                <p className="mt-1 text-xs text-[#99a0b7]">{item.when}</p>
              </div>
            </article>
          ))}
        </div>
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
              <p className="text-sm font-semibold text-[#151d3a]">Create exam</p>
              <p className="text-xs text-[#7f88a6]">AI generation</p>
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
              <p className="text-sm font-semibold text-[#151d3a]">Upload material</p>
              <p className="text-xs text-[#7f88a6]">PDF, text, URL</p>
            </div>
          </Link>
          <Link
            to="/teacher-dashboard/submissions"
            className="flex items-center gap-3 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm transition hover:border-[#6562f1]/40 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3ff] text-[#3f67c8]">
              <Inbox className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151d3a]">View results</p>
              <p className="text-xs text-[#7f88a6]">Submissions</p>
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
            to="/teacher-dashboard/exams/exam-draft-1/review"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff]"
          >
            <FilePlus className="h-4 w-4" />
            Open exam editor
          </Link>
        </div>
      </section>
    </div>
  )
}
