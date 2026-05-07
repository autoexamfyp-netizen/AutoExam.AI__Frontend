import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowDown, ArrowUp, Copy, Eye, Plus, Trash2 } from "lucide-react"
import EmptyState from "../../components/student/EmptyState"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import { getDraftExamById } from "../../data/teacherMockData"

function resolveDraft(examId) {
  if (examId === "new") {
    return { id: "new", title: "Untitled exam", durationMinutes: 60, questions: [] }
  }
  return getDraftExamById(examId ?? "")
}

/**
 * @param {{ examId: string }} props
 */
function TeacherExamReviewInner({ examId }) {
  const draft = useMemo(() => resolveDraft(examId), [examId])

  const [title, setTitle] = useState(draft?.title ?? "Untitled exam")
  const [duration, setDuration] = useState(draft?.durationMinutes ?? 60)
  const [questions, setQuestions] = useState(() =>
    draft ? draft.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : null })) : [],
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const validationErrors = useMemo(() => {
    const e = []
    if (!duration || duration < 1) e.push("Set a valid timer (minutes).")
    questions.forEach((q, i) => {
      if (!q.prompt?.trim()) e.push(`Question ${i + 1}: text required.`)
      if (!q.modelAnswer?.trim()) e.push(`Question ${i + 1}: model answer required.`)
      if (q.type === "mcq" && (!q.options || q.options.some((o) => !o.trim()))) e.push(`Question ${i + 1}: all options required.`)
    })
    return e
  }, [questions, duration])

  const canPublish = validationErrors.length === 0

  const updateQ = (id, patch) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const move = (idx, dir) => {
    setQuestions((prev) => {
      const j = idx + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  }

  const duplicate = (idx) => {
    const q = questions[idx]
    setQuestions((prev) => {
      const copy = { ...q, id: `${q.id}-copy-${Date.now()}` }
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
    })
  }

  const remove = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const addManual = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        type: "short",
        topic: "General",
        difficulty: "medium",
        marks: 4,
        prompt: "",
        options: null,
        modelAnswer: "",
      },
    ])
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <ConfirmDialog
        open={publishOpen}
        title="Publish exam?"
        message="Students will see this assessment according to schedule you set next (mock)."
        confirmLabel="Publish"
        cancelLabel="Cancel"
        onConfirm={() => {
          setPublishOpen(false)
          alert("Demo: published — connect to API.")
        }}
        onCancel={() => setPublishOpen(false)}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Exam review & editor</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">Edit, reorder, validate before publish</p>
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
            className="inline-flex h-10 items-center rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Publish
          </button>
        </div>
      </div>

      {!canPublish ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Fix before publish:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm font-medium text-[#1f9d67]">All checks passed — ready to publish.</p>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm lg:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[#5d6580]">Title</span>
          <input
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[#5d6580]">Duration (minutes)</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addManual} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Add question
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <article key={q.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1f7] pb-3">
              <span className="text-xs font-semibold text-[#8a93ad]">#{idx + 1}</span>
              <select
                className="rounded-lg border border-[#e3e6ef] bg-[#fafbff] px-2 py-1 text-xs font-medium"
                value={q.type}
                onChange={(e) =>
                  updateQ(q.id, {
                    type: e.target.value,
                    options: e.target.value === "mcq" ? ["", "", "", ""] : null,
                  })
                }
              >
                <option value="mcq">MCQ</option>
                <option value="short">Short</option>
                <option value="essay">Essay</option>
              </select>
              <input
                type="number"
                className="w-16 rounded-lg border border-[#e3e6ef] px-2 py-1 text-xs"
                value={q.marks}
                onChange={(e) => updateQ(q.id, { marks: Number(e.target.value) })}
              />
              <span className="text-xs text-[#8a93ad]">marks</span>
              <div className="ml-auto flex gap-1">
                <button type="button" className="rounded-lg p-1.5 hover:bg-[#f6f7fc]" onClick={() => move(idx, -1)} aria-label="Up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-lg p-1.5 hover:bg-[#f6f7fc]" onClick={() => move(idx, 1)} aria-label="Down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-lg p-1.5 hover:bg-[#f6f7fc]" onClick={() => duplicate(idx)} aria-label="Duplicate">
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(q.id)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[#5d6580]">Prompt</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
                rows={3}
                value={q.prompt}
                onChange={(e) => updateQ(q.id, { prompt: e.target.value })}
              />
            </label>
            {q.type === "mcq" && q.options ? (
              <div className="mt-3 space-y-2">
                <span className="text-xs font-semibold text-[#8a93ad]">Options</span>
                {q.options.map((opt, oi) => (
                  <input
                    key={oi}
                    className="w-full rounded-lg border border-[#e3e6ef] px-3 py-2 text-sm"
                    value={opt}
                    onChange={(e) => {
                      const next = [...q.options]
                      next[oi] = e.target.value
                      updateQ(q.id, { options: next })
                    }}
                  />
                ))}
              </div>
            ) : null}
            <label className="mt-3 block text-sm">
              <span className="text-[#5d6580]">Model answer / rubric</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
                rows={2}
                value={q.modelAnswer}
                onChange={(e) => updateQ(q.id, { modelAnswer: e.target.value })}
              />
            </label>
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
            <p className="mt-2 text-xs text-[#8a93ad]">Timer: {duration} min · {questions.length} questions</p>
            <div className="mt-4 space-y-3 text-sm">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
                  <p className="font-medium text-[#151d3a]">
                    {i + 1}. {q.prompt || "(empty)"}
                  </p>
                  {q.type === "mcq" ? <p className="mt-2 text-xs text-[#7f88a6]">Multiple choice options shown in live exam…</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TeacherExamReviewPage() {
  const { examId } = useParams()
  const id = examId ?? ""
  if (!resolveDraft(id)) {
    return (
      <EmptyState
        title="Draft not found"
        description="Open generate flow or pick a draft from the dashboard."
        action={<Link to="/teacher-dashboard/generate-exam" className="text-sm font-semibold text-[#6e63f6]">Generate exam</Link>}
      />
    )
  }
  return <TeacherExamReviewInner key={id} examId={id} />
}
