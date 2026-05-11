import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { AlertCircle, Eye, PenLine, RefreshCw } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchSubmissionDetail, fetchTeacherSubmissions, gradeSubmission } from "../../services/teacherSubmissionService"

function fmtWhen(iso) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

function fmtDuration(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return "—"
  const s = Math.max(0, Math.floor(Number(sec)))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${r}s`
}

function statusLabel(s) {
  const map = {
    in_progress: "In progress",
    submitted: "Submitted",
    evaluated: "Evaluated",
    late: "Late submission",
  }
  return map[s] || s
}

export default function TeacherSubmissionsPage() {
  const [searchParams] = useSearchParams()
  const publishedFilter = searchParams.get("published") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rows, setRows] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [openId, setOpenId] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [answers, setAnswers] = useState([])
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = {}
      if (publishedFilter) params.publishedExamId = publishedFilter
      const list = await fetchTeacherSubmissions(params)
      setRows(list)
    } catch (e) {
      setError(e?.message || "Could not load submissions.")
    } finally {
      setLoading(false)
    }
  }, [publishedFilter])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      setAnswers([])
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      try {
        const out = await fetchSubmissionDetail(openId)
        if (cancelled) return
        setDetail(out.submission)
        setAnswers(out.answers || [])
        setRemarks(out.submission?.teacher_remarks || "")
      } catch (e) {
        if (!cancelled) console.error("❌ Failed to load submission:", e)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [openId])

  const showToast = (text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2400)
  }

  const onSaveGrades = async () => {
    if (!openId) return
    setSaving(true)
    try {
      const payloadAnswers = answers.map((a) => ({
        questionId: a.question_id,
        marksObtained: Number(a.marks_obtained),
        evaluatorRemarks: a.evaluator_remarks || "",
      }))
      await gradeSubmission(openId, { teacherRemarks: remarks, answers: payloadAnswers })
      showToast("Grades saved")
      setRefreshKey((k) => k + 1)
      setOpenId(null)
    } catch (e) {
      console.error("❌ Grade save failed:", e)
      showToast(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const updateAnswerMark = (questionId, marks) => {
    setAnswers((prev) =>
      prev.map((a) => (a.question_id === questionId ? { ...a, marks_obtained: marks } : a)),
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Submissions</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">Review answers, adjust marks, add remarks</p>
          {publishedFilter ? (
            <p className="mt-2 text-xs text-[#8a93ad]">
              Filtered to one published exam ·{" "}
              <Link to="/teacher-dashboard/submissions" className="font-semibold text-[#6e63f6] hover:underline">
                Clear filter
              </Link>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {toast ? (
        <div className="rounded-xl border border-[#cdebd9] bg-[#e8fbf3] px-3 py-2 text-sm text-[#1f9d67]">{toast.text}</div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-[#eef1f7] bg-[#fafbff] text-xs font-semibold uppercase tracking-wide text-[#8a93ad]">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Time taken</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#7d86a5]">
                  No submissions yet for this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[#f4f6fb]">
                  <td className="px-4 py-3 font-medium text-[#151d3a]">
                    Student <span className="font-mono text-xs text-[#7f88a6]">{r.student_id?.slice(0, 8) ?? "—"}</span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[#5d6580]">{r.published_exam?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-[#7f88a6]">{fmtWhen(r.submitted_at)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#f4f6fb] px-2 py-0.5 text-xs font-semibold text-[#313a58]">
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#151d3a]">
                    {r.total_score != null ? `${r.total_score}/${r.max_score ?? "—"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#7f88a6]">{fmtDuration(r.time_taken_seconds)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={r.status === "in_progress"}
                      title={r.status === "in_progress" ? "Student still taking this exam" : undefined}
                      onClick={() => setOpenId(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] px-2 py-1.5 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openId ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0f1730]/40 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e7eaf3] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#151d3a]">Review submission</h2>
                <p className="text-xs text-[#7f88a6]">{detail?.published_exam?.title ?? "…"}</p>
              </div>
              <button type="button" className="text-sm font-semibold text-[#6e63f6]" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="mt-6 text-sm text-[#7d86a5]">Loading…</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-[#8a93ad]">
                  Status: {statusLabel(detail?.status)} · Submitted {fmtWhen(detail?.submitted_at)} · Time {fmtDuration(detail?.time_taken_seconds)}
                </p>

                <div className="mt-4 space-y-3">
                  {answers.map((a) => {
                    const q = a.question || {}
                    return (
                      <div key={a.id} className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3 text-sm">
                        <p className="font-medium text-[#151d3a]">{q.prompt || "Question"}</p>
                        <p className="mt-2 text-xs font-semibold text-[#8a93ad]">Student answer</p>
                        <p className="text-[#5d6580]">
                          {a.answer_text || a.selected_option || <span className="italic text-[#99a0b7]">No answer</span>}
                        </p>
                        {q.model_answer ? (
                          <>
                            <p className="mt-2 text-xs font-semibold text-[#8a93ad]">Model / key</p>
                            <p className="text-[#5d6580]">{q.model_answer}</p>
                          </>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-[#5d6580]">
                            Marks
                            <input
                              type="number"
                              step="0.5"
                              className="w-20 rounded-lg border border-[#e3e6ef] px-2 py-1 text-sm"
                              value={a.marks_obtained ?? ""}
                              onChange={(e) =>
                                updateAnswerMark(a.question_id, e.target.value === "" ? 0 : Number(e.target.value))
                              }
                            />
                            <span className="text-[#8a93ad]">/ {a.max_marks ?? q.marks ?? "—"}</span>
                          </label>
                          {a.is_correct === true ? (
                            <span className="rounded-full bg-[#e8fbf3] px-2 py-0.5 text-xs font-semibold text-[#1f9d67]">Correct (MCQ)</span>
                          ) : a.is_correct === false ? (
                            <span className="rounded-full bg-[#fdecec] px-2 py-0.5 text-xs font-semibold text-[#c94a4a]">Incorrect (MCQ)</span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <label className="mt-4 block text-sm">
                  <span className="text-[#5d6580]">Teacher remarks</span>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  disabled={saving || answers.length === 0}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#151d3a] px-4 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={onSaveGrades}
                >
                  {saving ? "Saving…" : (
                    <>
                      <PenLine className="h-4 w-4" />
                      Save evaluation
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
