import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Copy,
  Edit3,
  Eye,
  Loader2,
  RefreshCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react"
import EmptyState from "../../components/student/EmptyState"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import PublishExamModal from "../../components/exam/PublishExamModal"
import PostGenQuestionCard from "../../components/exam/postGen/PostGenQuestionCard"
import {
  buildQuestionPayloadFromManualForm,
  emptyManualQuestionForm,
} from "../../components/questions/ManualQuestionModal"
import { deleteExam, duplicateExam, fetchExam, unlinkQuestionFromExam, updateExam } from "../../services/examService"
import { deleteQuestion, updateQuestion } from "../../services/questionService"
import { API_BASE } from "../../services/apiClient"
import { displayExamTitle } from "../../utils/examTitle"
import { mcqFieldsFromQuestion } from "../../utils/mcqOptions"

function buildExamPatchFromQuestions(questions) {
  const total_marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const diffs = new Set(questions.map((q) => (q.difficulty || "medium").toLowerCase()))
  let difficulty = "mixed"
  if (diffs.size === 1) difficulty = [...diffs][0]
  return { total_marks, difficulty }
}

function manualFormFromQuestion(q) {
  return {
    ...emptyManualQuestionForm(q.category_id || ""),
    prompt: q.prompt || "",
    model_answer: q.model_answer || "",
    question_type: q.question_type || "short",
    difficulty: q.difficulty || "medium",
    marks: Number(q.marks) || 2,
    topic: q.topic || "",
    category_id: q.category_id || "",
    ...(q.question_type === "mcq" ? mcqFieldsFromQuestion(q) : {}),
  }
}

export default function TeacherExamReviewPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const id = examId ?? ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineEditForm, setInlineEditForm] = useState(null)
  const [inlineEditSaving, setInlineEditSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
  })

  const [reloadKey, setReloadKey] = useState(0)
  const [errorStatus, setErrorStatus] = useState(null)

  const loadExam = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      setErrorStatus(null)
      try {
        const data = await fetchExam(id)
        if (cancelled) return
        setExam(data.exam)
        setQuestions(data.questions || [])
        setForm({
          title: data.exam?.title || "",
          description: data.exam?.description || "",
          duration_minutes: data.exam?.duration_minutes || 60,
        })
      } catch (e) {
        if (!cancelled) {
          console.error("❌ fetchExam failed:", e)
          setError(e?.message || "Could not load exam.")
          setErrorStatus(e?.status ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

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

  const questionStats = useMemo(() => {
    const stats = { mcq: 0, short: 0, essay: 0, marks: 0 }
    for (const q of questions) {
      if (q.question_type === "mcq") stats.mcq += 1
      else if (q.question_type === "essay") stats.essay += 1
      else stats.short += 1
      stats.marks += Number(q.marks) || 0
    }
    return stats
  }, [questions])

  const onSaveDetails = async () => {
    if (!exam || saving) return
    if (!form.title.trim()) {
      setError("Exam title is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const updated = await updateExam(exam.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        duration_minutes: Number(form.duration_minutes) || 60,
      })
      setExam((curr) => ({ ...curr, ...updated }))
      setForm({
        title: updated.title || "",
        description: updated.description || "",
        duration_minutes: updated.duration_minutes || 60,
      })
      setEditing(false)
    } catch (e) {
      setError(e?.message || "Could not save exam details.")
    } finally {
      setSaving(false)
    }
  }

  const onDuplicate = async () => {
    if (!exam || duplicating) return
    setDuplicating(true)
    setError("")
    try {
      const copy = await duplicateExam(exam.id, `${displayExamTitle(exam.title)} (copy)`)
      navigate(`/teacher-dashboard/exams/${copy.id}/review`)
    } catch (e) {
      setError(e?.message || "Could not duplicate exam.")
    } finally {
      setDuplicating(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!exam || deleting) return
    setDeleting(true)
    setError("")
    try {
      await deleteExam(exam.id)
      navigate("/teacher-dashboard/exams", { replace: true })
    } catch (e) {
      setError(e?.message || "Could not delete exam.")
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const startInlineEdit = (q) => {
    setError("")
    setInlineEditId(q.id)
    setInlineEditForm(manualFormFromQuestion(q))
  }

  const cancelInlineEdit = () => {
    if (inlineEditSaving) return
    setInlineEditId(null)
    setInlineEditForm(null)
  }

  const saveInlineEdit = async () => {
    if (!inlineEditForm || !inlineEditId || inlineEditSaving || !exam) return
    if (!inlineEditForm.prompt.trim()) {
      setError("Question text is required.")
      return
    }
    let payload
    try {
      payload = buildQuestionPayloadFromManualForm(inlineEditForm)
    } catch (err) {
      setError(err?.message || "Invalid question.")
      return
    }
    setInlineEditSaving(true)
    setError("")
    try {
      const row = await updateQuestion(inlineEditId, payload)
      const nextQuestions = questions.map((x) => (x.id === row.id ? row : x))
      const patch = buildExamPatchFromQuestions(nextQuestions)
      const updatedExam = await updateExam(exam.id, patch)
      setQuestions(nextQuestions)
      setExam((curr) => ({
        ...curr,
        ...updatedExam,
        ...patch,
        total_questions: nextQuestions.length,
      }))
      setInlineEditId(null)
      setInlineEditForm(null)
    } catch (e) {
      setError(e?.message || "Could not save question.")
    } finally {
      setInlineEditSaving(false)
    }
  }

  const onConfirmDeleteQuestion = async () => {
    if (!deleteQuestionTarget || deletingQuestion || !exam) return
    const { question } = deleteQuestionTarget
    setDeletingQuestion(true)
    setError("")
    try {
      await unlinkQuestionFromExam(exam.id, question.id)
      await deleteQuestion(question.id)
      const nextQuestions = questions.filter((q) => q.id !== question.id)
      const patch = buildExamPatchFromQuestions(nextQuestions)
      const updatedExam = await updateExam(exam.id, patch)
      setQuestions(nextQuestions)
      setExam((curr) => ({
        ...curr,
        ...updatedExam,
        ...patch,
        total_questions: nextQuestions.length,
      }))
      if (inlineEditId === question.id) {
        setInlineEditId(null)
        setInlineEditForm(null)
      }
    } catch (e) {
      setError(e?.message || "Could not remove question.")
    } finally {
      setDeletingQuestion(false)
      setDeleteQuestionTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-[#7d86a5]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading exam review…
      </div>
    )
  }

  if (error || !exam) {
    const apiUrl = `${API_BASE}/api/exams/${id}`
    const is404 = errorStatus === 404
    const isCacheFailure =
      typeof error === "string" &&
      /empty cached response|ERR_CACHE_READ_FAILURE|non-JSON response/i.test(error)
    let title = "Could not load exam"
    let description = error || "Something went wrong while loading this exam."
    if (is404) {
      title = "Exam not found"
      description =
        "This exam may have been deleted, or your current account doesn't own it. Pick a paper from Generated Exams to try again."
    } else if (isCacheFailure) {
      title = "Browser cache issue"
      description =
        "Chromium tried to serve this request from its disk cache and the cached entry was corrupt. Hard-reload the page (Ctrl+F5) to force a fresh request."
    }

    return (
      <div className="space-y-4">
        <EmptyState
          title={title}
          description={description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={loadExam}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] hover:border-[#cbd0df]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Retry
              </button>
              <Link
                to="/teacher-dashboard/exams"
                className="inline-flex h-9 items-center rounded-xl bg-[#6562f1] px-3 text-sm font-semibold text-white"
              >
                View generated exams
              </Link>
              <Link
                to="/teacher-dashboard/generate-exam"
                className="inline-flex h-9 items-center rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#6e63f6]"
              >
                Generate exam
              </Link>
            </div>
          }
        />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Debug details</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 break-words">
            <li>
              Exam ID:{" "}
              <code className="rounded bg-white/70 px-1 py-0.5 text-[12px]">{id}</code>
            </li>
            <li>
              API endpoint:{" "}
              <a
                href={apiUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-amber-700/40 hover:decoration-amber-700"
              >
                {apiUrl}
              </a>
            </li>
            {errorStatus ? <li>HTTP status: {errorStatus}</li> : null}
            <li>
              Confirm the backend is running on <code>VITE_API_BASE_URL</code> and that you are signed
              in as the teacher who created the exam.
            </li>
            <li>
              If you recently ran new SQL migrations (e.g. <code>006_exams_metadata.sql</code>),
              restart the backend so it picks up the schema.
            </li>
            {isCacheFailure ? (
              <li>
                <strong>Cache fix:</strong> open DevTools → Network → tick{" "}
                <em>Disable cache</em>, then reload — or clear site data for{" "}
                <code>localhost</code>.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
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
      <ConfirmDialog
        open={deleteOpen}
        title="Delete generated exam?"
        destructive
        busy={deleting}
        message={
          <>
            <p>
              <strong className="text-[#151d3a]">{displayExamTitle(exam.title)}</strong> will be removed permanently.
            </p>
            <p className="mt-2 text-xs text-[#7f88a6]">
              The underlying question bank questions will stay available.
            </p>
          </>
        }
        confirmLabel="Delete exam"
        cancelLabel="Keep"
        onConfirm={onConfirmDelete}
        onCancel={() => !deleting && setDeleteOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteQuestionTarget)}
        title="Remove this question?"
        destructive
        busy={deletingQuestion}
        message={
          deleteQuestionTarget ? (
            <p>
              <strong className="text-[#151d3a]">
                Q{questions.findIndex((q) => q.id === deleteQuestionTarget.question.id) + 1}
              </strong>{" "}
              will be removed from this exam and deleted from your question bank.
            </p>
          ) : null
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteQuestion}
        onCancel={() => !deletingQuestion && setDeleteQuestionTarget(null)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/teacher-dashboard/exams"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6e63f6] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to generated exams
          </Link>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Exam review</h1>
          <p className="mt-1 break-words text-sm text-[#7d86a5]">{displayExamTitle(exam.title)}</p>
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
            onClick={() => setEditing((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58]"
          >
            {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {editing ? "Cancel edit" : "Edit details"}
          </button>
          <button
            type="button"
            disabled={duplicating}
            onClick={onDuplicate}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] disabled:opacity-60"
          >
            {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Duplicate
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
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#fbd8d8] bg-white px-3 text-sm font-semibold text-[#c94a4a] hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1">{error}</p>
        </div>
      ) : null}

      {editing ? (
        <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <Edit3 className="h-4 w-4 text-[#6562f1]" /> Edit exam details
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
            <label className="text-sm">
              <span className="text-[#5d6580]">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="text-[#5d6580]">Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full resize-none rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              placeholder="Optional exam instructions or notes for the teacher."
            />
          </label>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setForm({
                  title: exam.title || "",
                  description: exam.description || "",
                  duration_minutes: exam.duration_minutes || 60,
                })
                setEditing(false)
              }}
              disabled={saving}
              className="h-10 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveDetails}
              disabled={saving || !form.title.trim()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save details
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Questions" value={questions.length} />
        <Metric label="MCQ" value={questionStats.mcq} />
        <Metric label="Short" value={questionStats.short} />
        <Metric label="Essay" value={questionStats.essay} />
      </section>

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
      ) : null}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <PostGenQuestionCard
            key={q.id}
            index={idx}
            question={q}
            editing={inlineEditId === q.id}
            form={inlineEditId === q.id ? inlineEditForm : null}
            saving={inlineEditSaving}
            onEdit={() => startInlineEdit(q)}
            onDelete={() => setDeleteQuestionTarget({ question: q })}
            onCancelEdit={cancelInlineEdit}
            onChangeForm={setInlineEditForm}
            onSaveEdit={saveInlineEdit}
          />
        ))}
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain bg-[#0f1730]/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#e7eaf3] bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[#151d3a]">Student preview</h2>
                <p className="mt-1 text-xs text-[#8a93ad]">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {exam.duration_minutes} min · {questions.length} questions · {questionStats.marks} marks
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
                  <p className="font-medium text-[#151d3a]">
                    {i + 1}. {q.prompt || "(empty)"}
                  </p>
                  {q.question_type === "mcq" && Array.isArray(q.options) ? (
                    <ul className="mt-2 space-y-1 text-xs text-[#5d6580]">
                      {q.options.map((opt, optIdx) => (
                        <li key={opt} className="rounded-lg bg-white px-3 py-2">
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </li>
                      ))}
                    </ul>
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

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#151d3a]">{value}</p>
    </div>
  )
}
