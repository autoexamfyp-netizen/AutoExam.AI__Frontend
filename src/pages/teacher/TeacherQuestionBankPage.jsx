import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  CheckSquare,
  Folder,
  Inbox,
  Layers,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import RenameDialog from "../../components/ui/RenameDialog"
import QuestionList from "../../components/questions/QuestionList"
import GeneratedPaperCard from "../../components/questions/GeneratedPaperCard"
import ExamQuestionsModal from "../../components/questions/ExamQuestionsModal"
import { fetchCategories } from "../../services/categoryService"
import {
  deleteQuestion,
  deleteQuestions,
  fetchQuestionBank,
  updateQuestion,
} from "../../services/questionService"
import {
  deleteExam,
  duplicateExam,
  fetchExamsGrouped,
  renameExam,
} from "../../services/examService"

const ALL_ID = "__all__"
const UNCAT_ID = "__uncategorized__"

const TAB = {
  PAPERS: "papers",
  QUESTIONS: "questions",
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

export default function TeacherQuestionBankPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isGeneratedExamsRoute = location.pathname.endsWith("/exams")
  // The Question Bank route is a single focused list of saved questions —
  // grouped papers are only relevant on the "Generated Exams" route.
  const [activeSubject, setActiveSubject] = useState(ALL_ID)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [groups, setGroups] = useState([])
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])

  const [filterDifficulty, setFilterDifficulty] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [query, setQuery] = useState("")

  const [openExamId, setOpenExamId] = useState(null)
  const [pendingDeleteQ, setPendingDeleteQ] = useState(null)
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null)
  const [pendingRenameExam, setPendingRenameExam] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [renameBusy, setRenameBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  // Load all data on mount + on demand.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        console.log("📂 Loading", isGeneratedExamsRoute ? "generated papers" : "question bank")
        const [g, q, c] = await Promise.all([
          // Only the Generated Exams view needs the grouped papers list.
          isGeneratedExamsRoute
            ? fetchExamsGrouped().catch((e) => {
                console.warn("⚠️ Grouped exams failed:", e?.message)
                return []
              })
            : Promise.resolve([]),
          // Only the Question Bank view needs the standalone questions.
          isGeneratedExamsRoute
            ? Promise.resolve([])
            : fetchQuestionBank().catch((e) => {
                console.warn("⚠️ Question bank failed:", e?.message)
                return []
              }),
          fetchCategories().catch(() => []),
        ])
        if (cancelled) return
        setGroups(g)
        setQuestions(q)
        setCategories(c)
        console.log("✅ Data loaded")
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load question bank.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey, isGeneratedExamsRoute])

  // Subject rail derived from categories + groups (so we always show subjects
  // that have papers even if `categories` lookup is empty).
  const subjects = useMemo(() => {
    const map = new Map()
    for (const c of categories) {
      map.set(c.id, { id: c.id, title: c.title, paperCount: 0, questionCount: 0 })
    }
    for (const g of groups) {
      const id = g.id || UNCAT_ID
      if (!map.has(id)) {
        map.set(id, { id, title: g.title, paperCount: 0, questionCount: 0 })
      }
      map.get(id).paperCount = g.exams.length
    }
    for (const q of questions) {
      const id = q.category_id || UNCAT_ID
      if (!map.has(id)) {
        map.set(id, { id, title: q.category?.title || "Uncategorized", paperCount: 0, questionCount: 0 })
      }
      map.get(id).questionCount += 1
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" }),
    )
  }, [categories, groups, questions])

  const totalPapers = useMemo(() => groups.reduce((n, g) => n + g.exams.length, 0), [groups])
  const uncategorizedPapers = useMemo(
    () => groups.find((g) => g.id === null)?.exams.length || 0,
    [groups],
  )

  // Filter generated papers by active subject + search.
  const filteredGroups = useMemo(() => {
    let g = groups
    if (activeSubject === UNCAT_ID) g = g.filter((x) => x.id === null)
    else if (activeSubject !== ALL_ID) g = g.filter((x) => x.id === activeSubject)

    const qLower = query.trim().toLowerCase()
    if (!qLower) return g
    return g
      .map((grp) => ({
        ...grp,
        exams: grp.exams.filter((e) =>
          (e.title || "").toLowerCase().includes(qLower) ||
          (e.source?.title || "").toLowerCase().includes(qLower),
        ),
      }))
      .filter((grp) => grp.exams.length > 0)
  }, [groups, activeSubject, query])

  // Filter standalone questions by subject + filters.
  const filteredQuestions = useMemo(() => {
    const qLower = query.trim().toLowerCase()
    return questions.filter((item) => {
      if (activeSubject === UNCAT_ID && item.category_id !== null) return false
      if (activeSubject !== ALL_ID && activeSubject !== UNCAT_ID && item.category_id !== activeSubject) {
        return false
      }
      if (filterDifficulty !== "all" && item.difficulty !== filterDifficulty) return false
      if (filterType !== "all" && item.question_type !== filterType) return false
      if (!qLower) return true
      return (
        item.prompt?.toLowerCase().includes(qLower) ||
        item.topic?.toLowerCase().includes(qLower) ||
        item.model_answer?.toLowerCase().includes(qLower)
      )
    })
  }, [questions, activeSubject, filterDifficulty, filterType, query])

  const visibleQuestionIds = useMemo(
    () => filteredQuestions.map((q) => q.id),
    [filteredQuestions],
  )

  const selectedVisibleCount = useMemo(
    () => visibleQuestionIds.filter((id) => selectedQuestionIds.has(id)).length,
    [selectedQuestionIds, visibleQuestionIds],
  )

  // Each route owns one focused view — no in-page tab switching.
  const activeTab = isGeneratedExamsRoute ? TAB.PAPERS : TAB.QUESTIONS

  // ---------- ACTIONS ----------

  const toggleQuestionSelect = (question) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev)
      if (next.has(question.id)) next.delete(question.id)
      else next.add(question.id)
      return next
    })
  }

  const onEditQuestion = (question) => {
    setEditingQuestion(question)
    setEditForm({
      prompt: question.prompt || "",
      model_answer: question.model_answer || "",
      question_type: question.question_type || "short",
      difficulty: question.difficulty || "medium",
      marks: Number(question.marks) || 2,
      topic: question.topic || "",
      category_id: question.category_id || "",
      optionsText: Array.isArray(question.options) ? question.options.join("\n") : "",
    })
  }

  const onSaveQuestionEdit = async (e) => {
    e.preventDefault()
    if (!editingQuestion || !editForm || editSaving) return
    if (!editForm.prompt.trim()) {
      showToast("Question text is required")
      return
    }
    setEditSaving(true)
    try {
      const updated = await updateQuestion(editingQuestion.id, {
        prompt: editForm.prompt.trim(),
        model_answer: editForm.model_answer.trim() || null,
        question_type: editForm.question_type,
        difficulty: editForm.difficulty,
        marks: Number(editForm.marks) || 1,
        topic: editForm.topic.trim() || null,
        category_id: editForm.category_id || null,
        options:
          editForm.question_type === "mcq"
            ? editForm.optionsText
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean)
            : null,
      })
      setQuestions((curr) => curr.map((x) => (x.id === updated.id ? updated : x)))
      setEditingQuestion(null)
      setEditForm(null)
      showToast("Question updated")
    } catch (err) {
      showToast(err?.message || "Save failed")
    } finally {
      setEditSaving(false)
    }
  }

  const onConfirmDeleteQuestion = async () => {
    if (!pendingDeleteQ) return
    const id = pendingDeleteQ.id
    setPendingDeleteQ(null)
    try {
      await deleteQuestion(id)
      setQuestions((curr) => curr.filter((x) => x.id !== id))
      setSelectedQuestionIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToast("Question removed")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
  }

  const onConfirmBulkDelete = async () => {
    const ids = Array.from(selectedQuestionIds)
    if (!ids.length || bulkDeleting) return
    setBulkDeleting(true)
    try {
      await deleteQuestions(ids)
      setQuestions((curr) => curr.filter((x) => !selectedQuestionIds.has(x.id)))
      setSelectedQuestionIds(new Set())
      setPendingBulkDelete(false)
      showToast(`${ids.length} question${ids.length === 1 ? "" : "s"} deleted`)
    } catch (e) {
      showToast(e?.message || "Bulk delete failed")
    } finally {
      setBulkDeleting(false)
    }
  }

  const onRenameExam = async (exam) => {
    setPendingRenameExam(exam)
  }

  const onConfirmRenameExam = async (nextTitle) => {
    if (!pendingRenameExam || renameBusy) return
    setRenameBusy(true)
    try {
      const updated = await renameExam(pendingRenameExam.id, nextTitle)
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          exams: g.exams.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
        })),
      )
      setPendingRenameExam(null)
      showToast("Renamed")
    } catch (e) {
      showToast(e?.message || "Rename failed")
      throw e
    } finally {
      setRenameBusy(false)
    }
  }

  const onDuplicateExam = async (exam) => {
    try {
      const copy = await duplicateExam(exam.id)
      // Inject the duplicate into its group at the top.
      setGroups((prev) => {
        const key = exam.category_id || UNCAT_ID
        const next = prev.map((g) => ({ ...g, exams: g.exams.slice() }))
        let target = next.find((g) => (g.id || UNCAT_ID) === key)
        if (!target) {
          target = { id: copy.category_id, title: copy.category?.title || "Uncategorized", exams: [] }
          next.push(target)
        }
        target.exams.unshift(copy)
        return next
      })
      showToast("Duplicated")
    } catch (e) {
      showToast(e?.message || "Duplicate failed")
    }
  }

  const onConfirmDeleteExam = async () => {
    if (!pendingDeleteExam) return
    const id = pendingDeleteExam.id
    setPendingDeleteExam(null)
    try {
      await deleteExam(id)
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, exams: g.exams.filter((e) => e.id !== id) }))
          .filter((g) => g.exams.length > 0 || g.id === null),
      )
      showToast("Paper deleted")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
  }

  // ---------- RENDER ----------

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">
            {isGeneratedExamsRoute ? "Previously generated" : "Question bank"}
          </h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            {isGeneratedExamsRoute
              ? "Open older papers for review or use them as inspiration."
              : "All saved questions — filter by subject to focus on one topic."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            to="/teacher-dashboard/generate-exam"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#6562f1] px-3 text-xs font-semibold text-white hover:bg-[#5a56e2]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate exam
          </Link>
        </div>
      </div>

      {toast ? (
        <div
          key={toast.key}
          role="status"
          className="rounded-xl border border-[#cdebd9] bg-[#e8fbf3] px-3 py-2 text-sm font-medium text-[#1f9d67]"
        >
          {toast.text}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      ) : null}

      {isGeneratedExamsRoute ? (
        <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#151d3a]">Previously generated papers</p>
              <p className="mt-1 text-xs text-[#7f88a6]">
                Review, rename, duplicate, or delete saved exam drafts from one focused list.
              </p>
            </div>
            <div className="rounded-xl bg-[#f1efff] px-3 py-2 text-xs font-semibold text-[#5f4ce6]">
              {totalPapers} paper{totalPapers === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* SUBJECT SIDEBAR */}
        <aside className="rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm lg:col-span-3">
          <h2 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
            Subjects
          </h2>
          <nav className="mt-1 space-y-0.5">
            <SubjectItem
              icon={Layers}
              label="All subjects"
              count={isGeneratedExamsRoute ? totalPapers : questions.length}
              active={activeSubject === ALL_ID}
              onClick={() => setActiveSubject(ALL_ID)}
            />
            <SubjectItem
              icon={Inbox}
              label="Uncategorized"
              count={
                isGeneratedExamsRoute
                  ? uncategorizedPapers
                  : questions.filter((q) => !q.category_id).length
              }
              active={activeSubject === UNCAT_ID}
              onClick={() => setActiveSubject(UNCAT_ID)}
            />
            <div className="my-2 border-t border-[#eef1f7]" />
            {subjects
              .filter((s) => {
                if (s.id === UNCAT_ID) return false
                return isGeneratedExamsRoute ? s.paperCount > 0 : s.questionCount > 0
              })
              .map((s) => (
                <SubjectItem
                  key={s.id}
                  icon={Folder}
                  label={s.title}
                  count={isGeneratedExamsRoute ? s.paperCount : s.questionCount}
                  active={activeSubject === s.id}
                  onClick={() => setActiveSubject(s.id)}
                />
              ))}
            {!loading && (
              isGeneratedExamsRoute
                ? totalPapers === 0
                : questions.length === 0
            ) ? (
              <p className="rounded-lg bg-[#fafbff] px-3 py-3 text-center text-xs text-[#7f88a6]">
                {isGeneratedExamsRoute
                  ? "Generate a paper to see subjects appear here."
                  : "Save questions from a generated exam to fill your bank."}
              </p>
            ) : null}
          </nav>
        </aside>

        {/* MAIN AREA */}
        <section className="min-w-0 space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center gap-2">
            {!isGeneratedExamsRoute ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-xs font-semibold text-[#151d3a]">
                <ListChecks className="h-3.5 w-3.5 text-[#6e63f6]" />
                {activeSubject === ALL_ID
                  ? `All questions · ${filteredQuestions.length}`
                  : `${subjects.find((s) => s.id === activeSubject)?.title || "Subject"} · ${filteredQuestions.length}`}
              </div>
            ) : null}
            <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa3c2]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === TAB.PAPERS ? "Search generated exams..." : "Search questions..."}
                className="w-full rounded-xl border border-[#e3e6ef] bg-white py-2 pl-8 pr-3 text-sm focus:border-[#6562f1] focus:outline-none"
              />
            </div>
            {activeTab === TAB.QUESTIONS ? (
              <>
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
                  onClick={() => {
                    setSelectedQuestionIds((prev) => {
                      const next = new Set(prev)
                      visibleQuestionIds.forEach((id) => next.add(id))
                      return next
                    })
                  }}
                  disabled={!visibleQuestionIds.length}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff] disabled:opacity-60"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select visible
                </button>
                {selectedQuestionIds.size > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedQuestionIds(new Set())}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear ({selectedQuestionIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingBulkDelete(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#fbd8d8] bg-white px-3 text-xs font-semibold text-[#c94a4a] hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete selected
                    </button>
                  </>
                ) : null}
              </>
            ) : null}
          </div>

          {activeTab === TAB.QUESTIONS && selectedQuestionIds.size > 0 ? (
            <div className="rounded-xl border border-[#e7eaf3] bg-white px-3 py-2 text-xs text-[#5d6580] shadow-sm">
              <span className="font-semibold text-[#151d3a]">{selectedQuestionIds.size}</span> selected
              {visibleQuestionIds.length ? (
                <span> · {selectedVisibleCount} selected in the current filtered view</span>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <SectionSkeleton rows={4} />
          ) : activeTab === TAB.PAPERS ? (
            <PapersView
              groups={filteredGroups}
              activeSubject={activeSubject}
              reviewMode={isGeneratedExamsRoute}
              onView={(exam) => {
                console.log("📄 Opening generated paper:", exam.title)
                if (isGeneratedExamsRoute) navigate(`/teacher-dashboard/exams/${exam.id}/review`)
                else setOpenExamId(exam.id)
              }}
              onRename={onRenameExam}
              onDuplicate={onDuplicateExam}
              onDelete={(exam) => setPendingDeleteExam(exam)}
            />
          ) : (
            <QuestionList
              questions={filteredQuestions}
              emptyMessage="No questions match your filters. Try a different subject or generate new ones."
              onEdit={onEditQuestion}
              onDelete={setPendingDeleteQ}
              selectedIds={selectedQuestionIds}
              onToggleSelect={toggleQuestionSelect}
            />
          )}
        </section>
      </div>

      {/* "View Questions" modal */}
      <ExamQuestionsModal
        examId={openExamId}
        onClose={() => setOpenExamId(null)}
        onEditQuestion={onEditQuestion}
        onDeleteQuestion={setPendingDeleteQ}
      />

      <QuestionEditDialog
        open={Boolean(editingQuestion && editForm)}
        form={editForm}
        categories={categories}
        saving={editSaving}
        onChange={setEditForm}
        onSubmit={onSaveQuestionEdit}
        onClose={() => {
          if (editSaving) return
          setEditingQuestion(null)
          setEditForm(null)
        }}
      />
      <RenameDialog
        open={Boolean(pendingRenameExam)}
        title="Rename generated exam"
        label="Exam title"
        helper="Use a clear title so this paper is easy to find later."
        initialValue={pendingRenameExam?.title || ""}
        confirmLabel="Save title"
        onConfirm={onConfirmRenameExam}
        onCancel={() => !renameBusy && setPendingRenameExam(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteQ)}
        title="Delete question?"
        message={pendingDeleteQ ? "This removes the item from your bank. Exams that already linked it stay intact." : ""}
        destructive
        confirmLabel="Delete question"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteQuestion}
        onCancel={() => setPendingDeleteQ(null)}
      />
      <ConfirmDialog
        open={pendingBulkDelete}
        title="Delete selected questions?"
        destructive
        busy={bulkDeleting}
        message={`${selectedQuestionIds.size} selected question${
          selectedQuestionIds.size === 1 ? "" : "s"
        } will be removed from your question bank. Existing exam papers may lose links if they referenced these rows.`}
        confirmLabel="Delete selected"
        cancelLabel="Keep"
        onConfirm={onConfirmBulkDelete}
        onCancel={() => !bulkDeleting && setPendingBulkDelete(false)}
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteExam)}
        title="Delete paper?"
        message={
          pendingDeleteExam
            ? `“${pendingDeleteExam.title}” will be removed permanently. The underlying questions stay in your bank.`
            : ""
        }
        destructive
        confirmLabel="Delete paper"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteExam}
        onCancel={() => setPendingDeleteExam(null)}
      />
    </div>
  )
}

// =============================================================================
// Subcomponents
// =============================================================================

function QuestionEditDialog({ open, form, categories, saving, onChange, onSubmit, onClose }) {
  if (!open || !form) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto overscroll-contain sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close edit question"
        onClick={saving ? undefined : onClose}
        className="fixed inset-0 bg-[#0f1730]/40 backdrop-blur-[2px]"
      />
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-edit-title"
        className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#e7eaf3] bg-white shadow-[0_-8px_40px_rgba(15,23,48,0.12)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-5">
          <div>
            <h2 id="question-edit-title" className="text-lg font-semibold text-[#151d3a]">
              Edit question
            </h2>
            <p className="mt-1 text-xs text-[#7f88a6]">
              Update question text, answer key, metadata, and MCQ options in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="text-[#5d6580]">Type</span>
              <select
                value={form.question_type}
                onChange={(e) => onChange((f) => ({ ...f, question_type: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
              >
                <option value="mcq">MCQ</option>
                <option value="short">Short</option>
                <option value="essay">Essay</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(e) => onChange((f) => ({ ...f, difficulty: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Marks</span>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => onChange((f) => ({ ...f, marks: Number(e.target.value) }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Subject</span>
              <select
                value={form.category_id}
                onChange={(e) => onChange((f) => ({ ...f, category_id: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-[#5d6580]">Topic</span>
            <input
              value={form.topic}
              onChange={(e) => onChange((f) => ({ ...f, topic: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              placeholder="Optional topic label"
            />
          </label>

          <label className="block text-sm">
            <span className="text-[#5d6580]">Question text</span>
            <textarea
              rows={4}
              value={form.prompt}
              onChange={(e) => onChange((f) => ({ ...f, prompt: e.target.value }))}
              className="mt-1 w-full resize-y rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              required
            />
          </label>

          {form.question_type === "mcq" ? (
            <label className="block text-sm">
              <span className="text-[#5d6580]">MCQ options</span>
              <textarea
                rows={5}
                value={form.optionsText}
                onChange={(e) => onChange((f) => ({ ...f, optionsText: e.target.value }))}
                className="mt-1 w-full resize-y rounded-xl border border-[#e3e6ef] px-3 py-2 font-mono text-xs outline-none focus:border-[#6562f1]"
                placeholder={"One option per line\nOption A\nOption B\nOption C"}
              />
              <span className="mt-1 block text-xs text-[#8a93ad]">Each line becomes one numbered option.</span>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-[#5d6580]">Model answer / key</span>
            <textarea
              rows={4}
              value={form.model_answer}
              onChange={(e) => onChange((f) => ({ ...f, model_answer: e.target.value }))}
              className="mt-1 w-full resize-y rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              placeholder="Expected answer, correct option, rubric, or marking guide."
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#eef1f7] p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.prompt.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  )
}

function SubjectItem({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
        active ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#313a58] hover:bg-[#f6f7fc]",
      )}
    >
      <Icon className={classNames("h-4 w-4 shrink-0", active ? "text-[#5f4ce6]" : "text-[#7d86a5]")} />
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={classNames(
          "shrink-0 rounded-full px-2 text-[11px] font-semibold",
          active ? "bg-white/70 text-[#5f4ce6]" : "bg-[#f1f3f8] text-[#5d6580]",
        )}
      >
        {count}
      </span>
    </button>
  )
}

function PapersView({ groups, activeSubject, reviewMode, onView, onRename, onDuplicate, onDelete }) {
  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center">
        <ListChecks className="mx-auto h-7 w-7 text-[#bcc2d8]" />
        <p className="mt-2 text-sm font-semibold text-[#1a2341]">
          {reviewMode ? "No previously generated exams yet" : "No papers yet"}
        </p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          Head to <span className="font-semibold">Generate exam</span> to create your first paper.
        </p>
      </div>
    )
  }

  // When a single subject is selected, hide the subject heading (looks redundant).
  const showSubjectTitle = activeSubject === ALL_ID

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.id || "uncategorized"}>
          {showSubjectTitle ? (
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
              <Folder className="h-4 w-4 text-[#7d86a5]" /> {g.title}
              <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[11px] font-semibold text-[#5d6580]">
                {g.exams.length}
              </span>
            </h3>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.exams.map((exam) => (
              <GeneratedPaperCard
                key={exam.id}
                exam={exam}
                onView={() => onView(exam)}
                onRename={() => onRename(exam)}
                onDuplicate={() => onDuplicate(exam)}
                onDelete={() => onDelete(exam)}
                viewLabel={reviewMode ? "Open review" : "View questions"}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
