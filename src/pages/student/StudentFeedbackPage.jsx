import { useEffect, useState } from "react"
import { MessageSquareText, Sparkles, Target, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchStudentDashboard } from "../../services/dashboardService"
import { fetchSubmissionDetail } from "../../services/teacherSubmissionService"

function formatReportDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  } catch {
    return value || ""
  }
}

function shortPrompt(prompt = "") {
  const clean = String(prompt).replace(/\s+/g, " ").trim()
  return clean.length > 90 ? `${clean.slice(0, 87)}...` : clean
}

function topicLabel(answer, index) {
  return answer.question?.topic?.trim() || answer.question?.question_type || `Question ${index + 1}`
}

function buildFeedbackFromSubmission(examEntry, detail) {
  // Dashboard list omits some columns (e.g. teacher_remarks). Merge with the
  // full submission from GET /api/submissions/:id so grader notes resolve.
  const submission = { ...(examEntry.submission || {}), ...(detail?.submission || {}) }
  const answers = Array.isArray(detail?.answers) ? detail.answers : []
  const totalScore = Number(submission.total_score || 0)
  const maxScore = Number(submission.max_score || 0)
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const topicMap = new Map()
  const topicExamples = new Map()

  answers.forEach((answer, index) => {
    const name = topicLabel(answer, index)
    const marks = Number(answer.marks_obtained ?? 0)
    const maxMarks = Number(answer.max_marks ?? answer.question?.marks ?? 0)
    const current = topicMap.get(name) || { score: 0, max: 0, count: 0 }
    topicMap.set(name, {
      score: current.score + marks,
      max: current.max + maxMarks,
      count: current.count + 1,
    })
    if (!topicExamples.has(name) && answer.question?.prompt) {
      topicExamples.set(name, shortPrompt(answer.question.prompt))
    }
  })

  const topics = Array.from(topicMap.entries())
    .map(([name, value]) => ({
      name,
      scorePercent: value.max > 0 ? Math.round((value.score / value.max) * 100) : 0,
      score: value.score,
      max: value.max,
      count: value.count,
    }))
    .sort((a, b) => b.scorePercent - a.scorePercent)

  const strongest = [...topics].slice(0, 2)
  const weakest = [...topics].sort((a, b) => a.scorePercent - b.scorePercent).slice(0, 2)

  const strengths = strongest.length
    ? strongest.map((topic) => {
        const prompt = topicExamples.get(topic.name)
        return prompt
          ? `${topic.name} is your strongest area at ${topic.scorePercent}% across ${topic.count} answer${topic.count === 1 ? "" : "s"}. Key question: ${prompt}.`
          : `${topic.name} is your strongest area at ${topic.scorePercent}% across ${topic.count} answer${topic.count === 1 ? "" : "s"}.`
      })
    : [
        `You scored ${percentage}% overall on ${examEntry.published?.title || "this exam"}.`,
      ]

  const weaknesses = weakest.length
    ? weakest.map((topic) => {
        const prompt = topicExamples.get(topic.name)
        return prompt
          ? `${topic.name} needs another pass at ${topic.scorePercent}%. Revisit: ${prompt}.`
          : `${topic.name} needs another pass at ${topic.scorePercent}%.`
      })
    : ["No weak topic was identified from the available answers."]

  const recommendations = []
  weakest.forEach((topic) => {
    const prompt = topicExamples.get(topic.name)
    if (prompt) {
      recommendations.push(`Rework the question on ${topic.name}: ${prompt}`)
    } else {
      recommendations.push(`Review ${topic.name} and retake a short practice set focused on that area.`)
    }
  })

  const evaluatorRemarks = answers
    .map((answer) => String(answer.evaluator_remarks ?? "").trim())
    .filter(Boolean)
  const teacherRemarks = String(submission.teacher_remarks ?? "").trim()

  const notes =
    teacherRemarks ||
    evaluatorRemarks[0] ||
    `Scored ${totalScore}/${maxScore || 0} (${percentage}%).`

  // Extra lines: per-answer remarks when we already showed teacher (or first)
  // in the main box — avoid duplicating the same text twice.
  const notesDetails = (() => {
    if (teacherRemarks && evaluatorRemarks.length) return evaluatorRemarks
    if (!teacherRemarks && evaluatorRemarks.length > 1) return evaluatorRemarks.slice(1)
    return []
  })()

  return {
    examTitle: examEntry.published?.title || "Untitled exam",
    generatedAt: submission.submitted_at || submission.updated_at || examEntry.published?.end_time,
    topics,
    strengths,
    weaknesses,
    recommendations: recommendations.length
      ? recommendations
      : ["Keep working through the same topic mix and compare the next attempt with this report."],
    teacherRemarks,
    notes,
    notesDetails,
    summaryLabel: maxScore > 0 ? `${totalScore}/${maxScore}` : `${totalScore}`,
    percentage,
    submittedAt: submission.submitted_at || submission.updated_at,
  }
}

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
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const dashboard = await fetchStudentDashboard()
        const exams = Array.isArray(dashboard?.exams) ? dashboard.exams : []
        const graded = exams
          .filter((entry) => entry.submission && ["submitted", "evaluated", "late"].includes(entry.submission.status))
          .sort((a, b) => {
            const ta = new Date(a.submission.submitted_at || a.submission.updated_at).getTime()
            const tb = new Date(b.submission.submitted_at || b.submission.updated_at).getTime()
            return tb - ta
          })

        if (!graded.length) {
          throw new Error("No graded submission found yet.")
        }

        const latest = graded[0]
        const detail = await fetchSubmissionDetail(latest.submission.id)
        if (!cancelled) {
          setData(buildFeedbackFromSubmission(latest, detail))
          setError("")
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError?.message || "Could not load feedback.")
          setData(null)
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="min-w-0 max-w-full">
        {error ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div> : null}
        <SectionSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Feedback</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">
          Insights for <span className="font-medium text-[#313a58]">{data.examTitle}</span>
        </p>
        <p className="mt-1 break-words text-xs text-[#99a0b7]">Report generated {formatReportDate(data.generatedAt)}</p>
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
        className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#151d3a]">Grader notes</h2>
            <p className="break-words text-xs text-[#7f88a6]">Live notes pulled from the teacher review and answer remarks</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {data.teacherRemarks ? (
            <p className="text-xs font-semibold text-[#6562f1]">Instructor feedback</p>
          ) : null}
          <div className="rounded-xl border border-[#eef1f7] bg-[#f8f9fd] p-4 text-sm leading-relaxed text-[#5d6580]">
            {data.notes}
          </div>
        </div>
        {data.notesDetails.length ? (
          <>
            <p className="mt-4 text-xs font-semibold text-[#9aa3c2]">Per-question feedback</p>
            <ul className="mt-2 space-y-2 text-sm text-[#5d6580]">
              {data.notesDetails.map((note, index) => (
                <li key={index} className="flex min-w-0 gap-2 rounded-xl bg-[#f6f7fb] px-3 py-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#6562f1]" />
                  <span className="min-w-0 break-words">{note}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  )
}
