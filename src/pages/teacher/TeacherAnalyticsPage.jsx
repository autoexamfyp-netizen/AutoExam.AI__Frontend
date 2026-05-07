import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import StableChartBox from "../../components/ui/StableChartBox"
import StatCard from "../../components/student/StatCard"
import { fetchTeacherAnalyticsMock } from "../../data/teacherMockData"

const COLORS = ["#6562f1", "#2ca36c", "#c89422", "#c94a4a"]

export default function TeacherAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [a, setA] = useState(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherAnalyticsMock()
      if (!c) {
        setA(d)
        setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading || !a) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={6} />
      </div>
    )
  }

  const pieData = a.weakestTopics.map((t) => ({ name: t.topic, value: Math.round(t.failRate * 100) }))

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Analytics</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Class intelligence — scores, topics, cohorts</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average score" value={`${a.avgScore}%`} iconClassName="bg-[#eeebff] text-[#6a55f5]" />
        <StatCard label="Highest" value={`${a.highest}%`} iconClassName="bg-[#e9f8f0] text-[#2ca36c]" />
        <StatCard label="Lowest" value={`${a.lowest}%`} iconClassName="bg-[#fdecec] text-[#c94a4a]" />
        <StatCard label="Completion" value={`${Math.round(a.completionRate * 100)}%`} iconClassName="bg-[#edf3ff] text-[#3f67c8]" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Score distribution</h2>
          <div className="mt-4 w-full min-w-0">
            <StableChartBox heightPx={240}>
              {(w, h) => (
                <BarChart width={w} height={h} data={a.scoreDistribution} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6562f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </StableChartBox>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Weakest topics (fail rate %)</h2>
          <div className="mt-4 w-full min-w-0">
            <StableChartBox heightPx={240}>
              {(w, h) => {
                const r = Math.min(w, h) * 0.32
                return (
                  <PieChart width={w} height={h}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx={w / 2}
                      cy={h / 2}
                      innerRadius={0}
                      outerRadius={r}
                      paddingAngle={1}
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                )
              }}
            </StableChartBox>
          </div>
        </section>
      </div>

      <section className="min-w-0 rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#151d3a]">Performance trend</h2>
        <div className="mt-4 w-full min-w-0">
          <StableChartBox heightPx={220}>
            {(w, h) => (
              <LineChart width={w} height={h} data={a.trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a93ad" }} domain={[60, "auto"]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }} />
                <Line type="monotone" dataKey="v" name="Avg %" stroke="#6562f1" strokeWidth={2} dot={{ r: 4, fill: "#6562f1" }} />
              </LineChart>
            )}
          </StableChartBox>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Most failed concepts</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#5d6580]">
            {a.failedConcepts.map((c) => (
              <li key={c} className="rounded-lg bg-[#fafbff] px-3 py-2">
                {c}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#151d3a]">Top performers</h2>
          <ul className="mt-3 space-y-2">
            {a.topPerformers.map((p) => (
              <li key={p.name} className="flex justify-between rounded-lg bg-[#f6fdf9] px-3 py-2 text-sm">
                <span className="font-medium text-[#151d3a]">{p.name}</span>
                <span className="font-semibold text-[#1f9d67]">{p.avg}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#151d3a]">At-risk students</h2>
        <div className="mt-3 space-y-2">
          {a.atRisk.map((s) => (
            <div key={s.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm">
              <span className="font-medium text-[#151d3a]">{s.name}</span>
              <span className="text-[#5d6580]">
                Avg {s.avg}% · {s.flags} AI flags
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
