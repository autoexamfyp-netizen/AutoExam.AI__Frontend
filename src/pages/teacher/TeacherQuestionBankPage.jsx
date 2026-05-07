import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Link2, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import QuestionList from "../../components/questions/QuestionList"
import { fetchCategories } from "../../services/categoryService"
import { deleteQuestion, fetchQuestionBank, updateQuestion } from "../../services/questionService"

export default function TeacherQuestionBankPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])

  const [filterCategory, setFilterCategory] = useState("all")
  const [filterDifficulty, setFilterDifficulty] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [query, setQuery] = useState("")

  const [pendingDelete, setPendingDelete] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError("")
      setLoading(true)
      try {
        const [q, c] = await Promise.all([fetchQuestionBank(), fetchCategories()])
        if (cancelled) return
        setQuestions(q)
        setCategories(c)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load question bank.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return questions.filter((item) => {
      if (filterCategory !== "all" && item.category_id !== filterCategory) return false
      if (filterDifficulty !== "all" && item.difficulty !== filterDifficulty) return false
      if (filterType !== "all" && item.question_type !== filterType) return false
      if (!q) return true
      return (
        item.prompt?.toLowerCase().includes(q) ||
        item.topic?.toLowerCase().includes(q) ||
        item.model_answer?.toLowerCase().includes(q)
      )
    })
  }, [questions, filterCategory, filterDifficulty, filterType, query])

  const onToggleFavorite = async (question) => {
    try {
      const updated = await updateQuestion(question.id, { favorite: !question.favorite })
      setQuestions((curr) => curr.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      showToast(e?.message || "Update failed")
    }
  }

  const onEdit = (question) => {
    const nextPrompt = window.prompt("Question text", question.prompt)
    if (nextPrompt === null || nextPrompt === question.prompt) return
    const nextAnswer = window.prompt("Model answer / key", question.model_answer ?? "")
    if (nextAnswer === null) return
    ;(async () => {
      try {
        const updated = await updateQuestion(question.id, {
          prompt: nextPrompt,
          model_answer: nextAnswer,
        })
        setQuestions((curr) => curr.map((x) => (x.id === updated.id ? updated : x)))
        showToast("Saved changes")
      } catch (e) {
        showToast(e?.message || "Save failed")
      }
    })()
  }

  const onConfirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    try {
      await deleteQuestion(id)
      setQuestions((curr) => curr.filter((x) => x.id !== id))
      showToast("Question removed")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Question bank</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            Reusable items generated from pasted text in Materials → Text studio.
          </p>
        </div>
        <Link
          to="/teacher-dashboard/materials"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#e7eaf3] bg-white px-4 text-sm font-semibold text-[#6562f1] shadow-sm hover:bg-[#fafbff]"
        >
          <Sparkles className="h-4 w-4" />
          Text studio
        </Link>
      </div>

      {toast ? (
        <div
          key={toast.key}
          className="rounded-xl border border-[#cdebd9] bg-[#e8fbf3] px-3 py-2 text-sm font-medium text-[#1f9d67]"
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#e7eaf3] bg-gradient-to-br from-[#f8f7ff] to-white p-4 sm:grid-cols-2">
        <div className="flex items-start gap-2 text-sm text-[#5d6580]">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6562f1]" />
          Tip: generate questions from saved notes first — they appear here automatically with topic and difficulty tags.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          className="min-w-[140px] flex-1 rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
          placeholder="Search question text…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm"
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
        >
          <option value="all">Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          className="rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Type</option>
          <option value="mcq">MCQ</option>
          <option value="short">Short</option>
          <option value="essay">Essay</option>
        </select>
        <button
          type="button"
          onClick={async () => {
            setError("")
            setLoading(true)
            try {
              const [q, c] = await Promise.all([fetchQuestionBank(), fetchCategories()])
              setQuestions(q)
              setCategories(c)
            } catch (e) {
              setError(e?.message || "Could not load question bank.")
            } finally {
              setLoading(false)
            }
          }}
          className="rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm font-semibold text-[#313a58]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      ) : null}

      {loading ? (
        <SectionSkeleton rows={4} />
      ) : (
        <QuestionList
          questions={filtered}
          emptyMessage="No questions yet. Open Materials → Text studio, save notes, then Generate Question Bank."
          onToggleFavorite={onToggleFavorite}
          onEdit={onEdit}
          onDelete={setPendingDelete}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete question?"
        message={pendingDelete ? "This removes the item from your bank. Exams that already copied it are unaffected." : ""}
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
