import { useEffect, useState } from "react"
import { Bot, Sparkles, Target, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchStudentFeedbackMock } from "../../data/studentMockData"

function TopicBar({ name, scorePercent }) {
  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-1 flex gap-2 text-sm">
        <span className="min-w-0 flex-1 break-words font-medium text-[#1a2341]">{name}</span>
        <span className="shrink-0 tabular-nums font-semibold text-[#6562f1]">{scorePercent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eef1f7]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6562f1] to-[#8b7cff] transition-all duration-500"
          style={{ width: `${Math.min(100, scorePercent)}%` }}
        />
      </div>
    </div>
  )
}

export default function StudentFeedbackPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const fb = await fetchStudentFeedbackMock()
      if (!cancelled) {
        setData(fb)
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
        <SectionSkeleton rows={6} />
      </div>
    )
  }

  const ai = data.aiDetection
  const probPct = Math.round(ai.probability * 100)

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Feedback</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">
          Insights for <span className="font-medium text-[#313a58]">{data.examTitle}</span>
        </p>
        <p className="mt-1 break-words text-xs text-[#99a0b7]">Report generated {new Date(data.generatedAt).toLocaleString()}</p>
      </div>

      <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[#6562f1]" />
          <h2 className="text-sm font-semibold text-[#151d3a]">Topic-wise performance</h2>
        </div>
        <div className="mt-5 space-y-4">
          {data.topics.map((t) => (
            <TopicBar key={t.name} name={t.name} scorePercent={t.scorePercent} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#1f9d67]">
            <ThumbsUp className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-[#151d3a]">Strengths</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[#5d6580]">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex min-w-0 gap-2 rounded-xl bg-[#f6fdf9] px-3 py-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#2ca36c]" />
                <span className="min-w-0 break-words">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#c89422]">
            <ThumbsDown className="h-5 w-5" />
            <h2 className="text-sm font-semibold text-[#151d3a]">Weaknesses</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[#5d6580]">
            {data.weaknesses.map((s, i) => (
              <li key={i} className="flex min-w-0 gap-2 rounded-xl bg-[#fffbf4] px-3 py-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#c89422]" />
                <span className="min-w-0 break-words">{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-[#151d3a]">Recommendations</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#5d6580]">
          {data.recommendations.map((r, i) => (
            <li key={i} className="min-w-0 break-words pl-1">
              {r}
            </li>
          ))}
        </ol>
      </section>

      <section
        className={`min-w-0 max-w-full rounded-2xl border p-5 shadow-sm sm:p-6 ${
          ai.flagged ? "border-amber-200 bg-amber-50/50" : "border-[#e7eaf3] bg-white"
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#151d3a]">AI detection report</h2>
            <p className="break-words text-xs text-[#7f88a6]">Model-estimated likelihood of AI-generated responses</p>
          </div>
          {ai.flagged ? (
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
              Flagged
            </span>
          ) : (
            <span className="ml-auto rounded-full bg-[#e8fbf3] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#1f9d67]">
              Clear
            </span>
          )}
        </div>

        <div className="mt-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#5d6580]">AI probability</span>
              <span className="font-semibold tabular-nums text-[#151d3a]">{probPct}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eef1f7]">
              <div
                className={`h-full rounded-full transition-all ${ai.flagged ? "bg-amber-500" : "bg-[#6562f1]"}`}
                style={{ width: `${probPct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 break-words text-sm leading-relaxed text-[#5d6580]">{ai.label}</p>
        <p className="mt-2 break-words text-xs text-[#8a93ad]">{ai.notes}</p>
      </section>
    </div>
  )
}
