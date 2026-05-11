import { useEffect, useState } from "react"
import { ClipboardCheck, Clock, Loader2, X } from "lucide-react"
import { fetchExam } from "../../services/examService"
import QuestionList from "./QuestionList"

/**
 * Modal showing the full ordered question list for a generated paper.
 *
 * Loads from `GET /api/exams/:id` so the answer list stays in sync with any
 * edits made via the Question Bank's standalone view.
 *
 * @param {object} props
 * @param {string|null} props.examId  null when the modal is closed
 * @param {() => void} props.onClose
 * @param {(q: object) => void} [props.onEditQuestion]
 * @param {(q: object) => void} [props.onDeleteQuestion]
 * @param {(q: object) => void} [props.onToggleFavorite]
 */
export default function ExamQuestionsModal({
  examId,
  onClose,
  onEditQuestion,
  onDeleteQuestion,
  onToggleFavorite,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const out = await fetchExam(examId)
        if (!cancelled) setData(out)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load exam.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [examId])

  // Close on ESC
  useEffect(() => {
    if (!examId) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [examId, onClose])

  if (!examId) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exam questions"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0b1027]/40 p-4"
    >
      <div className="flex h-full max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1efff] text-[#5f4ce6]">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[#151d3a]">
                {data?.exam?.title || (loading ? "Loading…" : "Exam")}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#7f88a6]">
                {data?.exam ? (
                  <>
                    {data.exam.category?.title ? (
                      <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
                        {data.exam.category.title}
                      </span>
                    ) : null}
                    <span>
                      <Clock className="mr-1 inline h-3 w-3" />
                      {data.exam.duration_minutes} min
                    </span>
                    <span>{data.exam.total_marks} marks</span>
                    <span>{data.questions?.length || 0} questions</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9aa3c2] hover:bg-[#f6f7fc] hover:text-[#313a58]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#7d86a5]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
            </div>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : (
            <QuestionList
              questions={data?.questions || []}
              emptyMessage="This exam has no linked questions."
              onEdit={onEditQuestion}
              onDelete={onDeleteQuestion}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        </div>
      </div>
    </div>
  )
}
