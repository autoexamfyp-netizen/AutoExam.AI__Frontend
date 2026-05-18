import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts"
import StableChartBox from "../../components/ui/StableChartBox"
import { Award, CheckCircle2, XCircle } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchStudentDashboard } from "../../services/dashboardService"
import { fetchStudentSubmissionDetail } from "../../services/studentExamService"
import { displayExamTitle } from "../../utils/examTitle"

function formatAttemptedAt(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  } catch {
    return value || ""
  }
}

function toResultCard(examEntry, detail) {
  const submission = { ...(examEntry.submission || {}), ...(detail?.submission || {}) }
  const answers = Array.isArray(detail?.answers) ? detail.answers : []
  const totalScore = Number(submission.total_score || 0)
  const maxScore = Number(submission.max_score || 0)
  const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const buckets = answers.reduce(
    (acc, answer) => {
      const type = answer.question?.question_type
      const marks = Number(answer.marks_obtained ?? 0)
      const maxMarks = Number(answer.max_marks ?? answer.question?.marks ?? 0)
      if (type === "mcq") {
        acc.mcqScore += marks
        acc.mcqMax += maxMarks
      } else {
        acc.writtenScore += marks
        acc.writtenMax += maxMarks
      }
      return acc
    },
    { mcqScore: 0, mcqMax: 0, writtenScore: 0, writtenMax: 0 },
  )

  if (answers.length === 0 && maxScore > 0) {
    const fallbackMcqMax = Math.round(maxScore * 0.4)
    buckets.mcqMax = fallbackMcqMax
    buckets.writtenMax = maxScore - fallbackMcqMax
    const totalKnown = Number(submission.total_score || 0)
    buckets.mcqScore = Math.min(fallbackMcqMax, totalKnown)
    buckets.writtenScore = Math.max(0, totalKnown - buckets.mcqScore)
  }

  return {
    id: submission.id || examEntry.published?.id,
    examTitle: displayExamTitle(examEntry.published?.title),
    attemptedAt: submission.submitted_at || submission.updated_at || examEntry.published?.end_time,
    totalScore,
    maxScore,
    percentage: scorePct,
    passed: maxScore > 0 ? scorePct >= 50 : totalScore > 0,
    mcqScore: buckets.mcqScore,
    mcqMax: buckets.mcqMax,
    writtenScore: buckets.writtenScore,
    writtenMax: buckets.writtenMax,
    summary:
      (typeof submission.teacher_remarks === "string" && submission.teacher_remarks.trim()) ||
      detail?.answers?.find((a) => typeof a.evaluator_remarks === "string" && a.evaluator_remarks.trim())?.evaluator_remarks ||
      (submission.status === "evaluated" ? "Your attempt has been graded." : "Your attempt was submitted and scored.") ,
  }
}

export default function StudentResultsPage() {
  const location = useLocation()
  const flash = location.state?.flash

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const out = await fetchStudentDashboard()
        const exams = Array.isArray(out?.exams) ? out.exams : []
        const completed = exams.filter((entry) => entry.submission && ["submitted", "evaluated", "late"].includes(entry.submission.status))

        const details = await Promise.all(
          completed.map(async (entry) => {
            const submissionId = entry.submission?.id
            if (!submissionId) return null
            try {
              return await fetchStudentSubmissionDetail(submissionId)
            } catch (detailError) {
              console.warn("[warning] Could not load submission detail:", detailError?.message)
              return null
            }
          }),
        )

        if (!cancelled) {
          const cards = completed
            .map((entry, index) => toResultCard(entry, details[index]))
            .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())
          setRows(cards)
          setError("")
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error("❌ Failed to load student results:", loadError)
          setError(loadError?.message || "Could not load results.")
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      {flash ? (
        <div className="rounded-xl border border-[#c9e8d8] bg-[#ecf9f2] px-4 py-3 text-sm font-medium text-[#1f6b47]">{flash}</div>
      ) : null}

      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Results</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">Graded attempts and score breakdowns</p>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((r) => {
          const chartData = [
            { name: "MCQ", score: r.mcqScore, fill: "#6562f1" },
            { name: "Written", score: r.writtenScore, fill: "#2ca36c" },
          ]
          const attempted = (() => {
            try {
              return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(r.attemptedAt))
            } catch {
              return r.attemptedAt
            }
          })()

          return (
            <article
              key={r.id}
              className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-full">
                  <h2 className="break-words text-base font-semibold text-[#171f3c]">{r.examTitle}</h2>
                  <p className="break-words text-xs text-[#7f88a6]">{attempted}</p>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.passed ? "bg-[#e8fbf3] text-[#1f9d67]" : "bg-[#fdecec] text-[#c94a4a]"
                  }`}
                >
                  {r.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {r.passed ? "Pass" : "Fail"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#9aa3c2]">Total</p>
                  <p className="text-3xl font-semibold tabular-nums text-[#151d3a]">
                    {r.totalScore}
                    <span className="text-lg font-medium text-[#8a93ad]">/{r.maxScore}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[#f4f6fb] px-3 py-2">
                  <Award className="h-4 w-4 text-[#6562f1]" />
                  <span className="text-sm font-semibold tabular-nums text-[#313a58]">{r.percentage}%</span>
                </div>
              </div>

              <div className="mt-4 w-full min-w-0 max-w-full">
                <StableChartBox heightPx={160}>
                  {(w, h) => (
                    <BarChart width={w} height={h} data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef1f7" horizontal={false} />
                      <XAxis type="number" domain={[0, Math.max(r.mcqMax + r.writtenMax, 1)]} tick={{ fontSize: 11, fill: "#8a93ad" }} />
                      <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11, fill: "#8a93ad" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name, props) => [`${v} / ${props.payload.name === "MCQ" ? r.mcqMax : r.writtenMax}`, "Score"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e7eaf3", fontSize: 12 }}
                      />
                      <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </StableChartBox>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#eef1f7] pt-4 text-sm">
                <div>
                  <p className="text-xs text-[#8a93ad]">MCQ</p>
                  <p className="font-semibold tabular-nums text-[#151d3a]">
                    {r.mcqScore}/{r.mcqMax}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#8a93ad]">Written</p>
                  <p className="font-semibold tabular-nums text-[#151d3a]">
                    {r.writtenScore}/{r.writtenMax}
                  </p>
                </div>
              </div>

              <p className="mt-3 break-words text-sm leading-relaxed text-[#5d6580]">{r.summary}</p>

              <Link
                to="/student-dashboard/feedback"
                className="mt-4 inline-flex text-sm font-semibold text-[#6e63f6] transition hover:text-[#5d52e5]"
              >
                View detailed feedback →
              </Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}
