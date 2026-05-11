import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Check, ChevronLeft, ChevronRight, Cloud, Loader2, Save, Send } from "lucide-react"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import EmptyState from "../../components/student/EmptyState"
import { saveExamDraft, startOrResumeExam, submitExam } from "../../services/studentExamService"

const AUTO_SAVE_MS = 25000

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

function isAnswered(q, val) {
  if (!val) return false
  if (q.question_type === "mcq") return val.selected != null && String(val.selected).length > 0
  return String(val.text || "").trim().length > 0
}

function draftToAnswersMap(raw) {
  const out = {}
  if (!raw || typeof raw !== "object") return out
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("__")) continue
    if (!v || typeof v !== "object") continue
    out[k] = { text: v.text ?? "", selected: v.selected ?? null }
  }
  return out
}

function answersToPayload(map) {
  const payload = {}
  for (const [qid, v] of Object.entries(map)) {
    const text = typeof v.text === "string" ? v.text.trim() : ""
    const sel = v.selected != null && v.selected !== "" ? String(v.selected).trim() : ""
    if (!text && !sel) continue
    payload[qid] = {}
    if (text) payload[qid].text = text
    if (sel) payload[qid].selected = sel
  }
  return payload
}

function StudentExamAttemptContent({ publishedId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [submission, setSubmission] = useState(null)
  const [published, setPublished] = useState(null)
  const [questions, setQuestions] = useState([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [saveState, setSaveState] = useState("idle")
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const submissionIdRef = useRef("")
  const answersRef = useRef({})
  const secondsRef = useRef(0)
  const autoSubmitRef = useRef(true)
  const autoSubmitFiredRef = useRef(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])
  useEffect(() => {
    secondsRef.current = secondsLeft
  }, [secondsLeft])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError("")
      try {
        const out = await startOrResumeExam(publishedId)
        if (cancelled) return
        const sub = out.submission
        const pub = out.published
        const qs = out.questions || []
        setSubmission(sub)
        setPublished(pub)
        setQuestions(qs)
        submissionIdRef.current = sub.id
        autoSubmitRef.current = pub.auto_submit_on_timeout !== false

        const meta = sub.answers_data?.__meta || {}
        const total = Number(meta.totalSeconds) || (Number(pub.duration_minutes) || 60) * 60
        const rem =
          typeof meta.secondsRemaining === "number" && meta.secondsRemaining >= 0
            ? Math.floor(meta.secondsRemaining)
            : total
        setSecondsLeft(rem)

        setAnswers(draftToAnswersMap(sub.answers_data))
      } catch (e) {
        if (!cancelled) {
          console.error("❌ Timer sync issue:", e)
          setLoadError(e?.message || "Could not open this exam.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [publishedId])

  const flushSave = useCallback(async () => {
    const sid = submissionIdRef.current
    if (!sid || submitted) return
    setSaveState("saving")
    try {
      await saveExamDraft(sid, {
        answers: answersToPayload(answersRef.current),
        secondsRemaining: secondsRef.current,
      })
      setSaveState("saved")
      setLastSavedAt(new Date())
      window.setTimeout(() => setSaveState("idle"), 2000)
    } catch (e) {
      console.error("❌ Submission save failed:", e)
      setSaveState("idle")
    }
  }, [submitted])

  useEffect(() => {
    if (loading || !submission || submitted) return

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 0) return 0
        return s - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [loading, submission, submitted])

  useEffect(() => {
    if (loading || !submission || submitted || secondsLeft > 0) return
    if (!autoSubmitRef.current) return
    if (autoSubmitFiredRef.current) return
    autoSubmitFiredRef.current = true
    let cancelled = false
    ;(async () => {
      setSubmitting(true)
      try {
        await submitExam(submissionIdRef.current, { secondsRemaining: 0 })
        if (cancelled) return
        setSubmitted(true)
        navigate("/student-dashboard/results", { replace: true, state: { flash: "Time is up — exam submitted." } })
      } catch (e) {
        console.error("❌ Submission save failed:", e)
        autoSubmitFiredRef.current = false
        if (!cancelled) setSubmitting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loading, submission, submitted, secondsLeft, navigate])

  useEffect(() => {
    if (loading || !submission || submitted) return
    autoSaveRef.current = window.setInterval(() => {
      flushSave()
    }, AUTO_SAVE_MS)
    return () => {
      if (autoSaveRef.current) window.clearInterval(autoSaveRef.current)
    }
  }, [loading, submission, submitted, flushSave])

  useEffect(() => {
    const handler = (e) => {
      if (submitted) return
      e.preventDefault()
      e.returnValue = "Your progress is being saved."
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [submitted])

  const prevIndexRef = useRef(null)
  useEffect(() => {
    if (loading || submitted) return
    if (prevIndexRef.current !== null && prevIndexRef.current !== currentIndex) {
      flushSave()
    }
    prevIndexRef.current = currentIndex
  }, [currentIndex, loading, submitted, flushSave])

  const setAnswerField = (qid, partial) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { text: "", selected: null, ...(prev[qid] || {}), ...partial },
    }))
  }

  const current = questions[currentIndex]

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1))
  const goNext = () => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))

  const handleSubmit = async () => {
    setConfirmSubmitOpen(false)
    setSubmitting(true)
    try {
      await flushSave()
      await submitExam(submissionIdRef.current, { secondsRemaining: secondsRef.current })
      setSubmitted(true)
      navigate("/student-dashboard/results", { replace: true, state: { flash: "Exam submitted successfully." } })
    } catch (e) {
      console.error("❌ Submission save failed:", e)
      setSubmitting(false)
    }
  }

  const durationLabel = useMemo(() => published?.duration_minutes ?? "—", [published])

  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-sm text-[#7d86a5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6562f1]" />
        Loading attempt…
      </div>
    )
  }

  if (loadError || !submission || !questions.length) {
    return (
      <EmptyState
        title="Cannot open exam"
        description={loadError || "This exam is not available."}
        action={
          <Link to="/student-dashboard/exams" className="text-sm font-semibold text-[#6e63f6]">
            Back to exams
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
      <span className="text-[#8a93ad]">Auto-save every {AUTO_SAVE_MS / 1000}s</span>
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
              onClick={() => flushSave()}
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
          {published?.title} · {durationLabel} min allowed · Closing {published?.end_time ? new Date(published.end_time).toLocaleString() : ""}
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
                <span className="rounded-lg bg-[#f1efff] px-2 py-0.5 font-medium text-[#5f4ce6]">
                  {(current.question_type || "").toUpperCase()}
                </span>
                <span>{current.marks} marks</span>
              </div>
              <h2 className="text-base font-semibold leading-snug text-[#151d3a] sm:text-lg">{current.prompt}</h2>

              {current.question_type === "mcq" && Array.isArray(current.options) ? (
                <ul className="mt-5 space-y-2">
                  {current.options.map((opt) => {
                    const val = answers[current.id]?.selected
                    const selected = val === opt
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
                            onChange={() => setAnswerField(current.id, { selected: opt })}
                          />
                          <span className="text-[#1a2341]">{opt}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {current.question_type === "short" ? (
                <textarea
                  className="mt-5 min-h-[100px] w-full resize-y rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 text-sm text-[#1b1f36] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/20"
                  placeholder="Type your answer…"
                  value={answers[current.id]?.text ?? ""}
                  onChange={(e) => setAnswerField(current.id, { text: e.target.value })}
                  rows={4}
                />
              ) : null}

              {current.question_type === "essay" ? (
                <textarea
                  className="mt-5 min-h-[180px] w-full resize-y rounded-xl border border-[#e3e6ef] bg-[#fafbff] px-3 py-2.5 text-sm text-[#1b1f36] outline-none transition focus:border-[#6562f1] focus:ring-2 focus:ring-[#6562f1]/20"
                  placeholder="Write a structured response…"
                  value={answers[current.id]?.text ?? ""}
                  onChange={(e) => setAnswerField(current.id, { text: e.target.value })}
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
            <p className="mt-4 text-xs text-[#8a93ad]">Green = answered · Purple = current. Progress syncs automatically.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function StudentExamAttemptPage() {
  const { publishedId } = useParams()
  const id = publishedId ?? ""
  return <StudentExamAttemptContent key={id} publishedId={id} />
}
