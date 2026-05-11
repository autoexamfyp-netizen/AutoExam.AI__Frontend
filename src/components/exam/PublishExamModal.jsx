import { useEffect, useState } from "react"
import { AlertCircle, Clock, Send, X } from "lucide-react"
import { publishExam, updatePublishedExam } from "../../services/publishedExamService"

function toIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const d = new Date(`${dateStr}T${timeStr}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function isoToDateTime(iso) {
  if (!iso) return { date: "", time: "" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  const pad = (n) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{ id: string, title?: string, category_id?: string|null, duration_minutes?: number, total_questions?: number, total_marks?: number }} props.examTemplate
 * @param {() => void} [props.onPublished]
 * @param {'create'|'edit'} [props.mode]
 * @param {{
 *   id: string,
 *   start_time: string,
 *   end_time: string,
 *   duration_minutes?: number,
 *   allow_one_attempt?: boolean,
 *   shuffle_questions?: boolean,
 *   auto_submit_on_timeout?: boolean,
 *   show_results_immediately?: boolean,
 * } | null} [props.existingPublished]
 */
export default function PublishExamModal({ open, onClose, examTemplate, onPublished, mode = "create", existingPublished = null }) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState("09:00")
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10))
  const [endTime, setEndTime] = useState("23:59")
  const [duration, setDuration] = useState(examTemplate?.duration_minutes ?? 60)
  const [oneAttempt, setOneAttempt] = useState(true)
  const [shuffle, setShuffle] = useState(false)
  const [autoSubmit, setAutoSubmit] = useState(true)
  const [showResults, setShowResults] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setError("")
    if (mode === "edit" && existingPublished) {
      const s = isoToDateTime(existingPublished.start_time)
      const e = isoToDateTime(existingPublished.end_time)
      setStartDate(s.date)
      setStartTime(s.time)
      setEndDate(e.date)
      setEndTime(e.time)
      setDuration(Number(existingPublished.duration_minutes) || 60)
      setOneAttempt(existingPublished.allow_one_attempt !== false)
      setShuffle(!!existingPublished.shuffle_questions)
      setAutoSubmit(existingPublished.auto_submit_on_timeout !== false)
      setShowResults(!!existingPublished.show_results_immediately)
    } else {
      setStartDate(new Date().toISOString().slice(0, 10))
      setStartTime("09:00")
      setEndDate(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10))
      setEndTime("23:59")
      setDuration(Number(examTemplate?.duration_minutes) || 60)
      setOneAttempt(true)
      setShuffle(false)
      setAutoSubmit(true)
      setShowResults(false)
    }
  }, [open, mode, existingPublished?.id, examTemplate?.duration_minutes])

  if (!open) return null

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const startTimeIso = toIso(startDate, startTime)
    const endTimeIso = toIso(endDate, endTime)
    if (!startTimeIso || !endTimeIso) {
      setError("Pick a valid start and end date/time.")
      return
    }
    if (new Date(endTimeIso) <= new Date(startTimeIso)) {
      setError("End must be after start.")
      return
    }
    setBusy(true)
    try {
      console.log("⏰ Setting exam schedule", { start: startTimeIso, end: endTimeIso })
      if (mode === "edit" && existingPublished?.id) {
        await updatePublishedExam(existingPublished.id, {
          start_time: startTimeIso,
          end_time: endTimeIso,
          duration_minutes: Number(duration) || 60,
          allow_one_attempt: oneAttempt,
          shuffle_questions: shuffle,
          auto_submit_on_timeout: autoSubmit,
          show_results_immediately: showResults,
        })
        console.log("✅ Exam schedule updated")
      } else {
        await publishExam({
          examId: examTemplate.id,
          title: examTemplate.title,
          categoryId: examTemplate.category_id ?? null,
          startTime: startTimeIso,
          endTime: endTimeIso,
          durationMinutes: Number(duration) || 60,
          allowOneAttempt: oneAttempt,
          shuffleQuestions: shuffle,
          autoSubmitOnTimeout: autoSubmit,
          showResultsImmediately: showResults,
        })
        console.log("✅ Exam published successfully")
      }
      onPublished?.()
      onClose?.()
    } catch (err) {
      console.error("❌ Failed to publish exam:", err)
      setError(err?.message || "Publish failed")
    } finally {
      setBusy(false)
    }
  }

  const title = mode === "edit" ? "Edit schedule" : "Publish exam"

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0f1730]/45 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e7eaf3] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-4">
          <div>
            <h2 className="text-base font-semibold text-[#151d3a]">{title}</h2>
            <p className="mt-1 text-xs text-[#7f88a6]">
              {examTemplate?.title} · {examTemplate?.total_questions ?? 0} questions · {examTemplate?.total_marks ?? 0} marks
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#9aa3c2] hover:bg-[#f6f7fc]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-4">
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-[#5d6580]">
              Start date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-2 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-medium text-[#5d6580]">
              Start time
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-2 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-medium text-[#5d6580]">
              End date
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-2 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-medium text-[#5d6580]">
              End time
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-2 py-2 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-[#5d6580]">
            Duration (minutes)
            <input
              type="number"
              min={5}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>

          <fieldset className="space-y-2 rounded-xl border border-[#e3e6ef] p-3">
            <legend className="px-1 text-[11px] font-semibold text-[#9aa3c2]">Access</legend>
            <label className="flex items-center gap-2 text-sm text-[#313a58]">
              <input type="checkbox" checked={oneAttempt} onChange={(e) => setOneAttempt(e.target.checked)} />
              One attempt only
            </label>
            <label className="flex items-center gap-2 text-sm text-[#313a58]">
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm text-[#313a58]">
              <input type="checkbox" checked={autoSubmit} onChange={(e) => setAutoSubmit(e.target.checked)} />
              Auto-submit when timer hits zero
            </label>
            <label className="flex items-center gap-2 text-sm text-[#313a58]">
              <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
              Show results immediately (when graded)
            </label>
          </fieldset>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-[#e3e6ef] bg-white text-sm font-semibold text-[#313a58]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white disabled:opacity-60"
            >
              <Clock className="h-4 w-4" />
              {busy ? "Saving…" : (
                <>
                  <Send className="h-4 w-4" /> {mode === "edit" ? "Save" : "Publish"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
