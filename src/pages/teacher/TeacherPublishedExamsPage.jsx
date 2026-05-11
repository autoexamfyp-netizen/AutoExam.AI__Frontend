import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  Calendar,
  Clock,
  Copy,
  Eye,
  Layers,
  MoreVertical,
  Power,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import PublishExamModal from "../../components/exam/PublishExamModal"
import {
  deletePublishedExam,
  fetchPublishedExams,
  fetchPublishedSubmissionCounts,
  updatePublishedExam,
} from "../../services/publishedExamService"
import { duplicateExam } from "../../services/examService"

function fmt(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

function windowBadge(now, start, end) {
  if (now < start) return { label: "Upcoming", className: "bg-[#edf3ff] text-[#3f67c8]" }
  if (now > end) return { label: "Expired", className: "bg-[#f1f3f8] text-[#5d6580]" }
  return { label: "Active", className: "bg-[#e8fbf3] text-[#1f9d67]" }
}

export default function TeacherPublishedExamsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [publishFor, setPublishFor] = useState(null)
  const [editingPublished, setEditingPublished] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [list, c] = await Promise.all([fetchPublishedExams(), fetchPublishedSubmissionCounts()])
      setRows(list)
      setCounts(c)
    } catch (e) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Backend not running — start /Backend on port 4000."
          : e?.message || "Could not load published exams.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const now = useMemo(() => Date.now(), [rows, refreshKey])

  const onUnpublish = async (p) => {
    setMenuId(null)
    try {
      await updatePublishedExam(p.id, { is_active: false })
      showToast("Exam unpublished")
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e?.message || "Failed")
    }
  }

  const onRepublish = async (p) => {
    setMenuId(null)
    try {
      await updatePublishedExam(p.id, { is_active: true })
      showToast("Exam is live again")
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e?.message || "Failed")
    }
  }

  const onDuplicateTemplate = async (p) => {
    setMenuId(null)
    try {
      const ex = p.exam || {}
      const copy = await duplicateExam(p.generated_exam_id, `${ex.title || p.title} (copy)`)
      setPublishFor({
        id: copy.id,
        title: copy.title,
        category_id: copy.category_id ?? p.category_id,
        duration_minutes: p.duration_minutes,
        total_questions: copy.total_questions ?? p.total_questions,
        total_marks: copy.total_marks ?? p.total_marks,
      })
    } catch (e) {
      showToast(e?.message || "Duplicate failed")
    }
  }

  const onConfirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    try {
      await deletePublishedExam(id)
      showToast("Removed")
      setRefreshKey((k) => k + 1)
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
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
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Published exams</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">Schedule, availability, and submission overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link
            to="/teacher-dashboard/generate-exam"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white"
          >
            <Send className="h-4 w-4" /> New exam
          </Link>
        </div>
      </div>

      {toast ? (
        <div key={toast.key} className="rounded-xl border border-[#cdebd9] bg-[#e8fbf3] px-3 py-2 text-sm text-[#1f9d67]">
          {toast.text}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center text-sm text-[#7d86a5]">
            No published exams yet. Open an exam in the editor and click <span className="font-semibold">Publish</span>.
          </div>
        ) : (
          rows.map((p) => {
            const start = new Date(p.start_time).getTime()
            const end = new Date(p.end_time).getTime()
            const badge = windowBadge(now, start, end)
            const c = counts[p.id] || { total: 0, submitted: 0 }
            const subj = p.category?.title || "Uncategorized"
            const active = p.is_active
            return (
              <article key={p.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[#151d3a]">{p.title}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      {!active ? (
                        <span className="rounded-full bg-[#fff6e1] px-2.5 py-0.5 text-xs font-semibold text-[#c89422]">
                          Unpublished
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#7f88a6]">{subj}</p>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                      className="rounded-lg p-2 text-[#9aa3c2] hover:bg-[#f6f7fc]"
                      aria-label="Menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === p.id ? (
                      <>
                        <button type="button" className="fixed inset-0 z-10" onClick={() => setMenuId(null)} aria-label="Close menu" />
                        <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-[#e7eaf3] bg-white py-1 text-sm shadow-lg">
                          {active ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff]"
                              onClick={() => onUnpublish(p)}
                            >
                              <Power className="h-3.5 w-3.5" /> Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff]"
                              onClick={() => onRepublish(p)}
                            >
                              <Power className="h-3.5 w-3.5" /> Publish again
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff]"
                            onClick={() => {
                              setMenuId(null)
                              setEditingPublished(p)
                            }}
                          >
                            <Calendar className="h-3.5 w-3.5" /> Edit schedule
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff]"
                            onClick={() => onDuplicateTemplate(p)}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate template
                          </button>
                          <Link
                            to={`/teacher-dashboard/submissions?published=${p.id}`}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fafbff]"
                            onClick={() => setMenuId(null)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Submissions
                          </Link>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setMenuId(null)
                              setPendingDelete(p)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-[#5d6580] sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#8a93ad]" />
                    {p.total_questions ?? 0} questions · {p.total_marks ?? 0} marks
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#8a93ad]" />
                    {p.duration_minutes} min allowed
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#8a93ad]" />
                    {c.submitted}/{c.total || 0} submitted
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Calendar className="h-4 w-4 shrink-0 text-[#8a93ad]" />
                    <span>
                      {fmt(p.start_time)} → {fmt(p.end_time)}
                    </span>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/teacher-dashboard/exams/${p.generated_exam_id}/review`}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
                  >
                    Open template
                  </Link>
                  <Link
                    to={`/teacher-dashboard/submissions?published=${p.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#151d3a] px-3 text-xs font-semibold text-white"
                  >
                    View submissions
                  </Link>
                </div>
              </article>
            )
          })
        )}
      </div>

      <PublishExamModal
        open={Boolean(publishFor)}
        examTemplate={publishFor || {}}
        onClose={() => setPublishFor(null)}
        onPublished={() => {
          showToast("Scheduled")
          setRefreshKey((k) => k + 1)
        }}
      />

      <PublishExamModal
        mode="edit"
        existingPublished={
          editingPublished
            ? {
                id: editingPublished.id,
                start_time: editingPublished.start_time,
                end_time: editingPublished.end_time,
                duration_minutes: editingPublished.duration_minutes,
                allow_one_attempt: editingPublished.allow_one_attempt,
                shuffle_questions: editingPublished.shuffle_questions,
                auto_submit_on_timeout: editingPublished.auto_submit_on_timeout,
                show_results_immediately: editingPublished.show_results_immediately,
              }
            : null
        }
        open={Boolean(editingPublished)}
        examTemplate={{
          id: editingPublished?.generated_exam_id,
          title: editingPublished?.title,
          category_id: editingPublished?.category_id,
          duration_minutes: editingPublished?.duration_minutes,
          total_questions: editingPublished?.total_questions,
          total_marks: editingPublished?.total_marks,
        }}
        onClose={() => setEditingPublished(null)}
        onPublished={() => {
          showToast("Schedule updated")
          setRefreshKey((k) => k + 1)
          setEditingPublished(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete published exam?"
        message="Students will no longer see this schedule. Submissions already stored stay in the database."
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
