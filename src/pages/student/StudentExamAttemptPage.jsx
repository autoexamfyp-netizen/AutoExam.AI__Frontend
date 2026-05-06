import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Check, ChevronLeft, ChevronRight, Cloud, Loader2, Save, Send } from "lucide-react"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import EmptyState from "../../components/student/EmptyState"
import { getExamQuestionsForAttempt, getStudentExamById } from "../../data/studentMockData"

const AUTO_SAVE_MS = 25000

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function isAnswered(question, value) {
  if (value == null || value === "") return false
  if (question.type === "mcq") return typeof value === "number"
  return String(value).trim().length > 0
}

/**
 * @param {{ examId: string }} props
 */
function StudentExamAttemptContent({ examId }) {
  const navigate = useNavigate()

  const exam = useMemo(() => getStudentExamById(examId), [examId])
  const questions = useMemo(() => getExamQuestionsForAttempt(examId), [examId])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const e = getStudentExamById(examId)
    return e ? e.durationMinutes * 60 : 0
  })
  const [saveState, setSaveState] = useState("idle")
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)

  const current = questions[currentIndex]

  const simulateSave = useCallback(async () => {
    setSaveState("saving")
    await new Promise((r) => setTimeout(r, 600))
    setSaveState("saved")
    setLastSavedAt(new Date())
    window.setTimeout(() => setSaveState("idle"), 2000)
  }, [])

  useEffect(() => {
    if (!exam || submitted) return

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [exam, submitted])

  useEffect(() => {
    if (!exam || submitted || secondsLeft !== 0) return
    let cancelled = false
    ;(async () => {
      setSubmitting(true)
      await new Promise((r) => setTimeout(r, 800))
      if (cancelled) return
      setSubmitting(false)
      setSubmitted(true)
      navigate("/student-dashboard/results", { replace: true, state: { flash: "Time is up — exam auto-submitted (demo)." } })
    })()
    return () => {
      cancelled = true
    }
  }, [exam, submitted, secondsLeft, navigate])

  useEffect(() => {
    if (!exam || submitted) return
    autoSaveRef.current = window.setInterval(() => {
      simulateSave()
    }, AUTO_SAVE_MS)
    return () => {
      if (autoSaveRef.current) window.clearInterval(autoSaveRef.current)
    }
  }, [exam, submitted, simulateSave])

  useEffect(() => {
    const handler = (e) => {
      if (submitted) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [submitted])

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1))
  const goNext = () => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))

  const handleSubmit = async () => {
    setConfirmSubmitOpen(false)
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 900))
    setSubmitting(false)
    setSubmitted(true)
    navigate("/student-dashboard/results", { replace: true, state: { flash: "Exam submitted successfully (demo)." } })
  }

  if (!exam) {
    return (
      <EmptyState
        title="Exam not found"
        description="This attempt link is invalid or the exam was removed."
        action={
          <Link to="/student-dashboard/exams" className="text-sm font-semibold text-[#6e63f6]">
            Back to exams
          </Link>
        }
      />
    )
  }

  if (exam.status !== "available") {
    return (
      <EmptyState
        title="Exam not available"
        description="This assessment is not open for attempts right now."
        action={
          <Link
            to="/student-dashboard/exams"
            className="inline-flex h-10 items-center rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white"
          >
            Go to exams
          </Link>
        }
      />
    )
  }

  const saveLabel =
    saveState === "saving" ? (
      <span className="inline-flex items-center gap-1.5 text-[#6e63f6]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    ) : saveState === "saved" ? (
      <span className="inline-flex items-center gap-1.5 text-[#1f9d67]">
        <Check className="h-3.5 w-3.5" aria-hidden />
        Saved
      </span>
    ) : lastSavedAt ? (
      <span className="text-[#8a93ad]">Last saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    ) : (
      <span className="text-[#8a93ad]">Draft sync · auto every {AUTO_SAVE_MS / 1000}s</span>
    )

  return (
    <div className="pb-24 lg:pb-8">
      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Submit exam?"
        message="You will not be able to change answers after submission. Make sure you have reviewed all questions."
        confirmLabel="Submit exam"
        cancelLabel="Keep working"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      <header className="sticky top-[64px] z-20 -mx-4 mb-6 border-b border-[#e7eaf3] bg-[#f3f5fb]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex min-w-0 max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-semibold tabular-nums ${
                secondsLeft < 300 ? "border-red-200 bg-red-50 text-red-700" : "border-[#e3e6ef] bg-white text-[#151d3a]"
              }`}
              aria-live="polite"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-[#8a93ad]">Time</span>
              {formatDuration(secondsLeft)}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm" aria-live="polite">
              <Cloud className="h-4 w-4 text-[#8a93ad]" aria-hidden />
              {saveLabel}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => simulateSave()}
              disabled={submitting || submitted}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save now
            </button>
            <button
              type="button"
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={submitting || submitted}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 min-w-0 max-w-[1200px] break-words text-xs text-[#99a0b7]">
          Demo attempt · Timer starts at {exam.durationMinutes} min · Do not refresh the page during the exam
        </p>
      </header>

      <div className="mx-auto flex min-w-0 max-w-[1200px] flex-col gap-6 lg:flex-row lg:items-start">
        <section className="min-w-0 max-w-full flex-1 rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm transition-all duration-200 sm:p-6">
          {current ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#697391]">
                <span className="rounded-lg bg-[#f4f6fb] px-2 py-0.5 font-medium text-[#313a58]">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="rounded-lg bg-[#f1efff] px-2 py-0.5 font-medium text-[#5f4ce6]">{current.type.toUpperCase()}</span>
                <span>{current.marks} marks</span>
              </div>
              <h2 className="text-base font-semibold leading-snug text-[#151d3a] sm:text-lg">{current.prompt}</h2>

              {current.type === "mcq" ? (
                <ul className="mt-5 space-y-2">
                  {current.options.map((opt, idx) => {
                    const selected = answers[current.id] === idx
                    return (
                      <li key={opt}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                            selected ? "border-[#6562f1] bg-[#f7f6ff]" : "border-[#e7eaf3] hover:border-[#d8ddf0]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${current.id}`}
                            className="h-4 w-4 accent-[#6562f1]"
                            checked={selected}
                            onChange={() => setAnswer(current.id, idx)}
                          />
                          <span className="text-[#1a2341]">{opt}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {current.type === "short" ? (
                <textarea
                  className="mt-5 min-h-[100px] w-full resize-y rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 text-sm text-[#1b1f36] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/20"
                  placeholder="Type your answer…"
                  value={answers[current.id] ?? ""}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  rows={4}
                />
              ) : null}

              {current.type === "essay" ? (
                <textarea
                  className="mt-5 min-h-[180px] w-full resize-y rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 text-sm text-[#1b1f36] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/20"
                  placeholder="Write a structured response…"
                  value={answers[current.id] ?? ""}
                  onChange={(e) => setAnswer(current.id, e.target.value)}
                  rows={10}
                />
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f7] pt-4">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="inline-flex h-10 items-center gap-1 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentIndex >= questions.length - 1}
                  className="inline-flex h-10 items-center gap-1 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
        </section>

        <aside className="w-full min-w-0 max-w-full shrink-0 lg:sticky lg:top-[140px] lg:w-[220px]">
          <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">Questions</p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-3">
              {questions.map((q, idx) => {
                const answered = isAnswered(q, answers[q.id])
                const active = idx === currentIndex
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                      active
                        ? "bg-[#6562f1] text-white shadow-md"
                        : answered
                          ? "bg-[#e8fbf3] text-[#1f9d67] hover:opacity-90"
                          : "bg-[#f4f6fb] text-[#5d6580] hover:bg-[#eef1f7]"
                    }`}
                    aria-current={active ? "true" : undefined}
                  >
                    {idx + 1}
                    {answered && !active ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#1f9d67]" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-[#8a93ad]">
              Green = answered · Purple = current. Your progress is saved automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function StudentExamAttemptPage() {
  const { examId } = useParams()
  const id = examId ?? ""
  return <StudentExamAttemptContent key={id} examId={id} />
}
