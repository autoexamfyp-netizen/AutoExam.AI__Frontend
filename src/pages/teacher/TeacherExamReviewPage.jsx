import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, Eye, Send } from "lucide-react"
import EmptyState from "../../components/student/EmptyState"
import PublishExamModal from "../../components/exam/PublishExamModal"
import { fetchExam } from "../../services/examService"

export default function TeacherExamReviewPage() {
  const { examId } = useParams()
  const id = examId ?? ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const data = await fetchExam(id)
        if (cancelled) return
        setExam(data.exam)
        setQuestions(data.questions || [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load exam.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const validationErrors = useMemo(() => {
    const e = []
    if (!exam) return e
    if (!exam.duration_minutes || exam.duration_minutes < 1) e.push("Set a valid duration on the exam template.")
    questions.forEach((q, i) => {
      if (!q.prompt?.trim()) e.push(`Question ${i + 1}: text required.`)
    })
    return e
  }, [exam, questions])

  const canPublish = validationErrors.length === 0 && questions.length > 0

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-[#7d86a5]">
        Loading exam…
      </div>
    )
  }

  if (error || !exam) {
    return (
      <EmptyState
        title="Exam not found"
        description={error || "This exam may have been deleted or you may not have access."}
        action={
          <Link to="/teacher-dashboard/generate-exam" className="text-sm font-semibold text-[#6e63f6]">
            Generate exam
          </Link>
        }
      />
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PublishExamModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        examTemplate={{
          id: exam.id,
          title: exam.title,
          category_id: exam.category_id,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.total_questions ?? questions.length,
          total_marks: exam.total_marks,
        }}
        onPublished={() => setPublishOpen(false)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/teacher-dashboard/generate-exam"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6e63f6] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Exam review</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">{exam.title}</p>
          <p className="mt-1 text-xs text-[#8a93ad]">
            {questions.length} questions · {exam.total_marks ?? "—"} marks · {exam.duration_minutes} min
            {exam.category?.title ? ` · ${exam.category.title}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58]"
          >
            <Eye className="h-4 w-4" />
            Student preview
          </button>
          <button
            type="button"
            disabled={!canPublish}
            onClick={() => setPublishOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send className="h-4 w-4" />
            Publish exam
          </button>
        </div>
      </div>

      {!canPublish ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Before publishing</p>
              <ul className="mt-1 list-disc pl-5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {questions.length === 0 ? <li>Add questions to this exam template first.</li> : null}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-[#1f9d67]">Ready to publish — set the schedule in the next step.</p>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <article key={q.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#8a93ad]">#{idx + 1}</span>
              <span className="rounded-lg bg-[#f1efff] px-2 py-0.5 font-semibold text-[#5f4ce6]">
                {q.question_type?.toUpperCase?.() || "—"}
              </span>
              <span className="text-[#7f88a6]">{q.marks} marks</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-[#1a2341]">{q.prompt}</p>
            {q.question_type === "mcq" && Array.isArray(q.options) ? (
              <ul className="mt-2 space-y-1 text-sm text-[#5d6580]">
                {q.options.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0f1730]/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e7eaf3] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#151d3a]">Student preview</h2>
              <button type="button" className="text-sm font-medium text-[#6e63f6]" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-[#8a93ad]">
              Timer: {exam.duration_minutes} min · {questions.length} questions
            </p>
            <div className="mt-4 space-y-3 text-sm">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
                  <p className="font-medium text-[#151d3a]">
                    {i + 1}. {q.prompt || "(empty)"}
                  </p>
                  {q.question_type === "mcq" ? (
                    <p className="mt-2 text-xs text-[#7f88a6]">Multiple choice — options shown in live attempt…</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
