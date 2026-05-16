import { useMemo, useRef, useState } from "react"
import {
  CheckSquare,
  Cpu,
  Folder,
  Inbox,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
} from "lucide-react"
import ConfirmDialog from "../student/ConfirmDialog"
import QuestionList from "../questions/QuestionList"
import { deleteQuestions } from "../../services/questionService"
import {
  computeBankCompileHint,
  computeBankMarksProgress,
  digitsOnly,
  getCountValue,
} from "../../utils/examConfig"
import { sanitizeExamTitleInput } from "../../utils/examTitle"

const ALL_ID = "__all__"
const UNCAT_ID = "__uncategorized__"

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

/** Resolve a human-readable subject label — never show raw category IDs. */
function resolveSubjectTitle(categoryId, categories, nestedCategory) {
  if (!categoryId || categoryId === UNCAT_ID) return "Uncategorized"
  const match = categories.find((c) => String(c.id) === String(categoryId))
  const candidate = String(match?.title ?? nestedCategory?.title ?? "").trim()
  if (!candidate || candidate === String(categoryId)) return "Unnamed Subject"
  return candidate
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

function BankNumericField({ label, value, placeholder, disabled, onChange, onBlur, inputRef }) {
  return (
    <label className="text-xs">
      <span className="text-[#5d6580]">{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] bg-white px-2 text-sm outline-none focus:border-[#6562f1] disabled:bg-[#f6f7fc] disabled:text-[#9aa3c2]"
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        onBlur={onBlur}
      />
    </label>
  )
}

function BankExamSetupPanel({
  cfg,
  onChangeCfg,
  validation,
  selectedSummary,
  pickedCount,
  compiling,
  onCompile,
  onOpenAddManual,
}) {
  const [touched, setTouched] = useState({})
  const marksMcqRef = useRef(null)
  const marksShortRef = useRef(null)
  const marksEssayRef = useRef(null)
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }))
  const patch = (key, val) => onChangeCfg((c) => ({ ...c, [key]: val }))

  const titleLen = cfg.title.length
  const titleEmpty = !cfg.title.trim()
  const canCompile = pickedCount > 0 && !titleEmpty

  const targetMarksSet = String(cfg.targetTotalMarks ?? "").trim().length > 0
  const hasTypeTargets =
    getCountValue(cfg.targetMcq) + getCountValue(cfg.targetShort) + getCountValue(cfg.targetEssay) > 0

  const mcqN = validation.mcqCount?.value ?? 0
  const shortN = validation.shortCount?.value ?? 0
  const essayN = validation.essayCount?.value ?? 0

  const marksProgress =
    targetMarksSet && pickedCount > 0
      ? computeBankMarksProgress(selectedSummary.marks, cfg.targetTotalMarks)
      : null

  const compileHint = targetMarksSet
    ? computeBankCompileHint(selectedSummary.marks, cfg.targetTotalMarks)
    : null

  const handleCountChange = (countKey, marksKey, marksRef, raw) => {
    const prev = getCountValue(cfg[countKey])
    onChangeCfg((c) => {
      const next = { ...c, [countKey]: raw }
      if (getCountValue(raw) === 0) next[marksKey] = ""
      return next
    })
    if (prev === 0 && getCountValue(raw) > 0) {
      setTimeout(() => marksRef.current?.focus(), 0)
    }
  }

  const blurCount = (key, max) => {
    touch(key)
    let v = String(cfg[key] ?? "").trim()
    if (!v) v = "0"
    const n = Number(v)
    if (Number.isFinite(n) && n > max) v = String(max)
    else if (!Number.isFinite(n) || n < 0) v = "0"
    const marksKey = { targetMcq: "marksMcq", targetShort: "marksShort", targetEssay: "marksEssay" }[key]
    onChangeCfg((c) => {
      const next = { ...c, [key]: v }
      if (getCountValue(v) === 0) next[marksKey] = ""
      return next
    })
  }

  const typeLine = (label, selected, target) => {
    if (hasTypeTargets && target > 0) {
      return (
        <p key={label} className="text-[11px] text-[#5d6580]">
          {label}: {selected} selected <span className="text-[#9aa3c2]">(target ~{target})</span>
        </p>
      )
    }
    return (
      <p key={label} className="text-[11px] text-[#5d6580]">
        {label}: {selected} selected
      </p>
    )
  }

  const compileTitle = !canCompile
    ? titleEmpty
      ? "Enter an exam title to compile"
      : "Select at least one question to compile"
    : undefined

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <div className="shrink-0 border-b border-[#eef1f7] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <Cpu className="h-4 w-4 text-[#6562f1]" />
          Exam setup
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <label className="block text-sm">
          <span className="text-[#5d6580]">
            Total marks for this exam
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 50"
            className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
            value={cfg.targetTotalMarks}
            onChange={(e) => patch("targetTotalMarks", digitsOnly(e.target.value))}
            onBlur={() => touch("targetTotalMarks")}
          />
        </label>

        <label className="block text-sm">
          <span className="text-[#5d6580]">
            Exam title <span className="text-red-500">*</span>
          </span>
          <div className="relative mt-1">
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. Discrete Math Midterm"
              className="h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              value={cfg.title}
              onChange={(e) => patch("title", sanitizeExamTitleInput(e.target.value))}
              onBlur={() => touch("title")}
            />
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-[#9aa3c2]">
              {titleLen} / 80
            </span>
          </div>
          {touched.title && validation.title.error ? (
            <p className="mt-1 text-xs text-red-600">{validation.title.error}</p>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-[#5d6580]">
            Duration (min) <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 60"
            className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
            value={cfg.durationMinutes}
            onChange={(e) => patch("durationMinutes", digitsOnly(e.target.value))}
            onBlur={() => touch("durationMinutes")}
          />
        </label>

        <label className="block text-sm">
          <span className="text-[#5d6580]">Difficulty level</span>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
            value={cfg.difficulty}
            onChange={(e) => patch("difficulty", e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>

        <div className="space-y-2 border-t border-[#eef1f7] pt-3">
          <p className="text-xs font-semibold text-[#151d3a]">Target question breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            <BankNumericField
              label="MCQs"
              value={cfg.targetMcq}
              placeholder="e.g. 5"
              onChange={(v) => handleCountChange("targetMcq", "marksMcq", marksMcqRef, v)}
              onBlur={() => blurCount("targetMcq", 50)}
            />
            <BankNumericField
              label="Short"
              value={cfg.targetShort}
              placeholder="e.g. 3"
              onChange={(v) => handleCountChange("targetShort", "marksShort", marksShortRef, v)}
              onBlur={() => blurCount("targetShort", 30)}
            />
            <BankNumericField
              label="Essay"
              value={cfg.targetEssay}
              placeholder="e.g. 2"
              onChange={(v) => handleCountChange("targetEssay", "marksEssay", marksEssayRef, v)}
              onBlur={() => blurCount("targetEssay", 10)}
            />
          </div>

          {targetMarksSet && hasTypeTargets && validation.allocation ? (
            <p
              className={`text-xs ${
                validation.allocation.type === "over" ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {validation.allocation.type === "remaining" ? (
                <>{validation.allocation.amount} marks remaining to allocate</>
              ) : validation.allocation.type === "balanced" ? (
                <>Marks balanced perfectly</>
              ) : (
                <>
                  {validation.allocation.amount} marks over your target ({validation.allocation.target})
                </>
              )}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <BankNumericField
              label="Marks per MCQ"
              value={mcqN > 0 ? cfg.marksMcq : ""}
              placeholder={mcqN > 0 ? "e.g. 2" : "-"}
              disabled={mcqN === 0}
              inputRef={marksMcqRef}
              onChange={(v) => patch("marksMcq", v)}
              onBlur={() => touch("marksMcq")}
            />
            <BankNumericField
              label="Marks per Short"
              value={shortN > 0 ? cfg.marksShort : ""}
              placeholder={shortN > 0 ? "e.g. 4" : "-"}
              disabled={shortN === 0}
              inputRef={marksShortRef}
              onChange={(v) => patch("marksShort", v)}
              onBlur={() => touch("marksShort")}
            />
            <BankNumericField
              label="Marks per Essay"
              value={essayN > 0 ? cfg.marksEssay : ""}
              placeholder={essayN > 0 ? "e.g. 10" : "-"}
              disabled={essayN === 0}
              inputRef={marksEssayRef}
              onChange={(v) => patch("marksEssay", v)}
              onBlur={() => touch("marksEssay")}
            />
          </div>
        </div>

        <div className="border-t border-[#eef1f7] pt-3">
          <p className="text-xs font-semibold text-[#151d3a]">Selected from bank</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              ["TOTAL", selectedSummary.total],
              ["MCQ", selectedSummary.mcq],
              ["SHORT", selectedSummary.short],
              ["ESSAY", selectedSummary.essay],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-[#fafbff] px-1 py-2 ring-1 ring-[#e7eaf3]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3c2]">{label}</p>
                <p className="mt-0.5 text-sm font-bold text-[#151d3a]">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-[#3e4768]">{selectedSummary.marks} marks total</p>

          {marksProgress ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#5d6580]">Marks progress:</p>
              <p className="font-mono text-[11px] leading-tight text-[#3e4768]">
                {marksProgress.bar}{" "}
                <span className="font-sans font-semibold">
                  {marksProgress.selected} / {marksProgress.target} marks
                </span>
              </p>
              <p
                className={`text-xs font-medium ${
                  marksProgress.status === "over" ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {marksProgress.status === "over" ? (
                  <>
                    &#9888; {marksProgress.selected - marksProgress.target} marks over your target
                  </>
                ) : marksProgress.status === "exact" ? (
                  <>&#10003; Target reached perfectly</>
                ) : (
                  <>{marksProgress.diff} marks remaining to reach your target</>
                )}
              </p>
              <div className="mt-1 space-y-0.5">
                {typeLine("MCQ", selectedSummary.mcq, mcqN)}
                {typeLine("Short", selectedSummary.short, shortN)}
                {typeLine("Essay", selectedSummary.essay, essayN)}
              </div>
            </div>
          ) : null}
        </div>

        {compileHint ? (
          <p
            className={`text-xs font-medium ${
              compileHint.type === "ready"
                ? "text-emerald-700"
                : compileHint.type === "over"
                  ? "text-amber-700"
                  : "text-[#5d6580]"
            }`}
          >
            {compileHint.type === "ready" ? (
              <>&#10003; {compileHint.message}</>
            ) : compileHint.type === "over" ? (
              <>&#9888; {compileHint.message}</>
            ) : (
              compileHint.message
            )}
          </p>
        ) : null}

        <button
          type="button"
          disabled={compiling || !canCompile}
          title={compileTitle}
          onClick={onCompile}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {compiling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {compiling ? "Compiling exam…" : "Compile exam from selected"}
        </button>

        <div className="border-t border-[#eef1f7] pt-3">
          <button
            type="button"
            onClick={onOpenAddManual}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c4f5] bg-[#fafbff] text-xs font-semibold text-[#5f4ce6] hover:bg-[#f1efff]"
          >
            + Add a question manually
          </button>
        </div>
      </div>
    </section>
  )
}

export default function FromExistingQuestionsTab({
  bank,
  bankLoading,
  setBank,
  categories,
  picked,
  setPicked,
  cfg,
  setCfg,
  validation,
  compiling,
  onCompile,
  onOpenAddManual,
  onEditQuestion,
  onDeleteQuestion,
  setError,
}) {
  const [activeSubject, setActiveSubject] = useState(ALL_ID)
  const [typeFilter, setTypeFilter] = useState("all")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const subjects = useMemo(() => {
    const map = new Map()
    for (const c of categories) {
      map.set(c.id, {
        id: c.id,
        title: resolveSubjectTitle(c.id, categories, c),
        questionCount: 0,
      })
    }
    for (const q of bank) {
      const id = q.category_id
      if (!id) continue
      if (!map.has(id)) {
        map.set(id, {
          id,
          title: resolveSubjectTitle(id, categories, q.category),
          questionCount: 0,
        })
      }
      map.get(id).questionCount += 1
    }
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    )
  }, [categories, bank])

  const filteredQuestions = useMemo(() => {
    const qLower = query.trim().toLowerCase()
    return bank.filter((item) => {
      if (activeSubject === UNCAT_ID && item.category_id !== null) return false
      if (activeSubject !== ALL_ID && activeSubject !== UNCAT_ID && item.category_id !== activeSubject) {
        return false
      }
      if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter) return false
      if (typeFilter !== "all" && item.question_type !== typeFilter) return false
      if (!qLower) return true
      return (
        item.prompt?.toLowerCase().includes(qLower) ||
        item.topic?.toLowerCase().includes(qLower) ||
        item.model_answer?.toLowerCase().includes(qLower) ||
        item.category?.title?.toLowerCase().includes(qLower)
      )
    })
  }, [bank, activeSubject, difficultyFilter, typeFilter, query])

  const visibleQuestionIds = useMemo(
    () => filteredQuestions.map((q) => q.id),
    [filteredQuestions],
  )

  const selectedSummary = useMemo(() => {
    const selected = bank.filter((q) => picked.has(q.id))
    const out = { total: selected.length, mcq: 0, short: 0, essay: 0, marks: 0 }
    for (const q of selected) {
      if (q.question_type === "mcq") out.mcq += 1
      else if (q.question_type === "essay") out.essay += 1
      else out.short += 1
      out.marks += Number(q.marks) || 0
    }
    return out
  }, [bank, picked])

  const allVisibleSelected =
    visibleQuestionIds.length > 0 && visibleQuestionIds.every((id) => picked.has(id))

  const manualCategoryId =
    activeSubject !== ALL_ID && activeSubject !== UNCAT_ID ? activeSubject : ""

  const togglePick = (question) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(question.id)) next.delete(question.id)
      else next.add(question.id)
      return next
    })
  }

  const hasSelection = picked.size > 0

  const toggleSelectAllVisible = () => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleQuestionIds.forEach((id) => next.delete(id))
      } else {
        visibleQuestionIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const onConfirmBulkDelete = async () => {
    const ids = Array.from(picked)
    if (!ids.length || bulkDeleting) return
    setBulkDeleting(true)
    setError?.("")
    try {
      await deleteQuestions(ids)
      setBank((curr) => curr.filter((q) => !picked.has(q.id)))
      setPicked(new Set())
      setBulkDeleteOpen(false)
    } catch (err) {
      setError?.(err?.message || "Could not delete selected questions.")
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      <aside className="h-[640px] rounded-2xl border border-[#e7eaf3] bg-white p-3 shadow-sm">
        <h2 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">
          Subjects
        </h2>
        <nav className="mt-1 space-y-0.5">
          <SubjectItem
            icon={Layers}
            label="All subjects"
            count={bank.length}
            active={activeSubject === ALL_ID}
            onClick={() => setActiveSubject(ALL_ID)}
          />
          <SubjectItem
            icon={Inbox}
            label="Uncategorized"
            count={bank.filter((q) => !q.category_id).length}
            active={activeSubject === UNCAT_ID}
            onClick={() => setActiveSubject(UNCAT_ID)}
          />
          <div className="my-2 border-t border-[#eef1f7]" />
          {subjects
            .filter((s) => s.id !== UNCAT_ID && s.questionCount > 0)
            .map((s) => (
              <SubjectItem
                key={s.id}
                icon={Folder}
                label={s.title}
                count={s.questionCount}
                active={activeSubject === s.id}
                onClick={() => setActiveSubject(s.id)}
              />
            ))}
        </nav>
      </aside>

      <div className="relative flex h-[640px] min-w-0 flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
        <header className="shrink-0 space-y-3 border-b border-[#eef1f7] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa3c2]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-xl border border-[#e3e6ef] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-[#6562f1]"
            />
          </div>
          <p className="text-xs text-[#7f88a6]">
            Showing {filteredQuestions.length} question{filteredQuestions.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
            >
              <option value="all">All types</option>
              <option value="mcq">MCQ</option>
              <option value="short">Short</option>
              <option value="essay">Essay</option>
            </select>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
            >
              <option value="all">All difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              type="button"
              disabled={!visibleQuestionIds.length}
              onClick={toggleSelectAllVisible}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff] disabled:opacity-60"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select all
            </button>
            {hasSelection ? (
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-300 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete selected
              </button>
            ) : null}
          </div>
        </header>

        <div className={classNames("min-h-0 flex-1 overflow-y-auto p-4", hasSelection ? "pb-24" : "")}>
          {bankLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#7f88a6]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading questions…
            </div>
          ) : (
            <QuestionList
              questions={filteredQuestions}
              emptyMessage="No questions match your filters. Try another subject or search."
              selectedIds={picked}
              onToggleSelect={togglePick}
              onEdit={onEditQuestion}
              onDelete={onDeleteQuestion}
            />
          )}
        </div>

        {hasSelection ? (
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#e7eaf3] bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,48,0.06)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[#5d6580]">
                <span className="font-semibold text-[#151d3a]">
                  {selectedSummary.total} question{selectedSummary.total === 1 ? "" : "s"} selected
                </span>
                {" · "}
                <span className="font-semibold text-[#151d3a]">{selectedSummary.marks} marks total</span>
                <br />
                MCQ: {selectedSummary.mcq} · Short: {selectedSummary.short} · Essay: {selectedSummary.essay}
              </p>
              <button
                type="button"
                onClick={() => setPicked(new Set())}
                className="shrink-0 rounded-lg border border-[#e3e6ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
              >
                Clear selection
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <BankExamSetupPanel
        cfg={cfg}
        onChangeCfg={setCfg}
        validation={validation}
        selectedSummary={selectedSummary}
        pickedCount={picked.size}
        compiling={compiling}
        onCompile={onCompile}
        onOpenAddManual={() => onOpenAddManual(manualCategoryId)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected questions?"
        destructive
        busy={bulkDeleting}
        message={
          <>
            <p>
              Delete {picked.size} selected question{picked.size === 1 ? "" : "s"}? This cannot be
              undone.
            </p>
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={onConfirmBulkDelete}
        onCancel={() => !bulkDeleting && setBulkDeleteOpen(false)}
      />
    </div>
  )
}
