import { useEffect, useState } from "react"
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"
import StableChartBox from "../../components/ui/StableChartBox"
import { TrendingUp } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import StatCard from "../../components/student/StatCard"
import { fetchStudentAnalyticsMock, STUDENT_FEEDBACK } from "../../data/studentMockData"

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const a = await fetchStudentAnalyticsMock()
      if (!cancelled) {
        setData(a)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={5} />
      </div>
    )
  }

  const weakTopic =
    STUDENT_FEEDBACK.topics.length > 0
      ? STUDENT_FEEDBACK.topics.reduce((a, t) => (t.scorePercent < a.scorePercent ? t : a))
      : { name: "—", scorePercent: 0 }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Progress</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">Analytics and improvement over time</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Improvement (avg score)"
          value={`+${data.improvementPercent}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="bg-[#e9f8f0] text-[#2ca36c]"
        />
        <StatCard
          label="Weakest focus area"
          value={weakTopic.name}
          icon={<span className="text-xs font-bold text-[#c89422]">!</span>}
          iconClassName="bg-[#fff6e1] text-[#c89422]"
        />
        <StatCard
          label="Recent stretch"
          value={
            data.performanceOverTime.length > 0
              ? `${data.performanceOverTime[data.performanceOverTime.length - 1].avg}% avg`
              : "—"
          }
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-[#151d3a]">Performance over time</h2>
        <p className="text-xs text-[#7f88a6]">Rolling average score by period (mock)</p>
        <div className="mt-4 w-full min-w-0 max-w-full">
          <StableChartBox heightPx={260}>
            {(w, h) => (
              <LineChart width={w} height={h} data={data.performanceOverTime} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} domain={[60, "auto"]} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Avg score"]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" name="Avg score" stroke="#6562f1" strokeWidth={2} dot={{ r: 4, fill: "#6562f1" }} />
              </LineChart>
            )}
          </StableChartBox>
        </div>
      </section>

      <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-[#151d3a]">Weak topic trend</h2>
        <p className="text-xs text-[#7f88a6]">
          Example: <span className="font-medium text-[#313a58]">{weakTopic.name}</span> — mock series
        </p>
        <div className="mt-4 w-full min-w-0 max-w-full">
          <StableChartBox heightPx={220}>
            {(w, h) => (
              <LineChart width={w} height={h} data={data.weakTopicsTrend.map((p, i) => ({ attempt: `A${i + 1}`, avg: p.avg }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} domain={[50, "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" stroke="#c89422" strokeWidth={2} dot={{ r: 3, fill: "#c89422" }} name="Topic avg" />
              </LineChart>
            )}
          </StableChartBox>
        </div>
      </section>

      <section className="min-w-0 max-w-full">
        <h2 className="mb-3 text-sm font-semibold text-[#151d3a]">Recent metrics</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.recentMetrics.map((m) => (
            <div key={m.label} className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-[#8a93ad]">{m.label}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-[#151d3a]">{m.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
