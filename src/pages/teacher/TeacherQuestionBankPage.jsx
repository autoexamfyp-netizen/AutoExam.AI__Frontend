import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  Folder,
  Inbox,
  Layers,
  ListChecks,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import QuestionList from "../../components/questions/QuestionList"
import GeneratedPaperCard from "../../components/questions/GeneratedPaperCard"
import ExamQuestionsModal from "../../components/questions/ExamQuestionsModal"
import { fetchCategories } from "../../services/categoryService"
import {
  deleteQuestion,
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
  const [tab, setTab] = useState(TAB.PAPERS)
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
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null)
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
        console.log("📂 Loading subject-wise question bank...")
        const [g, q, c] = await Promise.all([
          fetchExamsGrouped().catch((e) => {
            console.warn("⚠️ Grouped exams failed:", e?.message)
            return []
          }),
          fetchQuestionBank().catch((e) => {
            console.warn("⚠️ Question bank failed:", e?.message)
            return []
          }),
          fetchCategories().catch(() => []),
        ])
        if (cancelled) return
        setGroups(g)
        setQuestions(q)
        setCategories(c)
        console.log("✅ Question bank loaded successfully")
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load question bank.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

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

  // ---------- ACTIONS ----------

  const onToggleFavorite = async (question) => {
    try {
      const updated = await updateQuestion(question.id, { favorite: !question.favorite })
      setQuestions((curr) => curr.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      showToast(e?.message || "Update failed")
    }
  }

  const onEditQuestion = (question) => {
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

  const onConfirmDeleteQuestion = async () => {
    if (!pendingDeleteQ) return
    const id = pendingDeleteQ.id
    setPendingDeleteQ(null)
    try {
      await deleteQuestion(id)
      setQuestions((curr) => curr.filter((x) => x.id !== id))
      showToast("Question removed")
    } catch (e) {
      showToast(e?.message || "Delete failed")
    }
  }

  const onRenameExam = async (exam) => {
    const next = window.prompt("Rename paper", exam.title)
    if (!next || next === exam.title) return
    try {
      const updated = await renameExam(exam.id, next.trim())
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          exams: g.exams.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
        })),
      )
      showToast("Renamed")
    } catch (e) {
      showToast(e?.message || "Rename failed")
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
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Question bank</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            Subject-wise generated papers and reusable questions.
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
              count={totalPapers + questions.length}
              active={activeSubject === ALL_ID}
              onClick={() => setActiveSubject(ALL_ID)}
            />
            <SubjectItem
              icon={Inbox}
              label="Uncategorized"
              count={uncategorizedPapers + questions.filter((q) => !q.category_id).length}
              active={activeSubject === UNCAT_ID}
              onClick={() => setActiveSubject(UNCAT_ID)}
            />
            <div className="my-2 border-t border-[#eef1f7]" />
            {subjects
              .filter((s) => s.id !== UNCAT_ID)
              .map((s) => (
                <SubjectItem
                  key={s.id}
                  icon={Folder}
                  label={s.title}
                  count={s.paperCount + s.questionCount}
                  active={activeSubject === s.id}
                  onClick={() => setActiveSubject(s.id)}
                />
              ))}
            {subjects.length === 0 && !loading ? (
              <p className="rounded-lg bg-[#fafbff] px-3 py-3 text-center text-xs text-[#7f88a6]">
                Generate a paper to see subjects appear here.
              </p>
            ) : null}
          </nav>
        </aside>

        {/* MAIN AREA */}
        <section className="min-w-0 space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#e3e6ef] bg-white p-0.5">
              <TabBtn active={tab === TAB.PAPERS} onClick={() => setTab(TAB.PAPERS)}>
                Generated papers
              </TabBtn>
              <TabBtn active={tab === TAB.QUESTIONS} onClick={() => setTab(TAB.QUESTIONS)}>
                All questions
              </TabBtn>
            </div>
            <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa3c2]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === TAB.PAPERS ? "Search papers…" : "Search questions…"}
                className="w-full rounded-xl border border-[#e3e6ef] bg-white py-2 pl-8 pr-3 text-sm focus:border-[#6562f1] focus:outline-none"
              />
            </div>
            {tab === TAB.QUESTIONS ? (
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
              </>
            ) : null}
          </div>

          {loading ? (
            <SectionSkeleton rows={4} />
          ) : tab === TAB.PAPERS ? (
            <PapersView
              groups={filteredGroups}
              activeSubject={activeSubject}
              onView={(exam) => {
                console.log("📄 Opening generated paper:", exam.title)
                setOpenExamId(exam.id)
              }}
              onRename={onRenameExam}
              onDuplicate={onDuplicateExam}
              onDelete={(exam) => setPendingDeleteExam(exam)}
            />
          ) : (
            <QuestionList
              questions={filteredQuestions}
              emptyMessage="No questions match your filters. Try a different subject or generate new ones."
              onToggleFavorite={onToggleFavorite}
              onEdit={onEditQuestion}
              onDelete={setPendingDeleteQ}
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
        onToggleFavorite={onToggleFavorite}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteQ)}
        title="Delete question?"
        message={pendingDeleteQ ? "This removes the item from your bank. Exams that already linked it stay intact." : ""}
        confirmLabel="Delete"
        onConfirm={onConfirmDeleteQuestion}
        onCancel={() => setPendingDeleteQ(null)}
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteExam)}
        title="Delete paper?"
        message={
          pendingDeleteExam
            ? `“${pendingDeleteExam.title}” will be removed permanently. The underlying questions stay in your bank.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={onConfirmDeleteExam}
        onCancel={() => setPendingDeleteExam(null)}
      />
    </div>
  )
}

// =============================================================================
// Subcomponents
// =============================================================================

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

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
        active ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#5d6580] hover:bg-[#f6f7fc]",
      )}
    >
      {children}
    </button>
  )
}

function PapersView({ groups, activeSubject, onView, onRename, onDuplicate, onDelete }) {
  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-10 text-center">
        <ListChecks className="mx-auto h-7 w-7 text-[#bcc2d8]" />
        <p className="mt-2 text-sm font-semibold text-[#1a2341]">No papers yet</p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          Head to <span className="font-semibold">Generate exam</span> and let AI build your first paper.
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
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
