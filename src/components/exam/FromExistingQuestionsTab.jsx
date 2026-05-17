import { useMemo, useState } from "react"
import {
  CheckSquare,
  Cpu,
  Folder,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
} from "lucide-react"
import ConfirmDialog from "../student/ConfirmDialog"
import QuestionList from "../questions/QuestionList"
import StatPill from "../shared/StatPill"
import RequiredMark from "../shared/RequiredMark"
import FieldError from "../shared/FieldError"
import NumericField, { inputStateClass } from "../shared/NumericField"
import { deleteQuestions } from "../../services/questionService"
import {
  bankTargetMarksBalanceMessage,
  digitsOnly,
  parseCfgPositive,
} from "../../utils/examConfig"
import { sanitizeExamTitleInput } from "../../utils/examTitle"

const ALL_ID = "__all__"

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

/** Resolve a human-readable subject label — never show raw category IDs. */
function resolveSubjectTitle(categoryId, categories, nestedCategory) {
  if (!categoryId) return "Unnamed Subject"
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

function bankTargetMarksComparison(selectedMarks, targetMarksVal) {
  const target = parseCfgPositive(targetMarksVal)
  if (!target) return null
  const selected = Number(selectedMarks) || 0
  if (selected === target) {
    return { text: "Target reached", className: "text-emerald-700" }
  }
  if (selected < target) {
    return {
      text: `${target - selected} marks short of target`,
      className: "text-amber-700",
    }
  }
  return {
    text: `${selected - target} marks over target`,
    className: "text-amber-700",
  }
}

function bankBlockingErrors(blockingErrors) {
  if (!blockingErrors?.length) return []
  return blockingErrors.filter((msg) => {
    const lower = msg.toLowerCase()
    if (lower.includes("at least one question type")) return false
    if (lower.includes("marks per")) return false
    if (lower.includes("maximum") && (lower.includes("mcq") || lower.includes("short") || lower.includes("essay"))) {
      return false
    }
    if (lower.includes("breakdown totals") || lower.includes("do not add up")) return false
    return true
  })
}

function BankExamSetupPanel({
  cfg,
  onChangeCfg,
  validation,
  configSubmitAttempted,
  canCompile,
  compileDisabledTooltip,
  selectedSummary,
  compiling,
  onCompile,
  onOpenAddManual,
}) {
  const [touched, setTouched] = useState({})
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }))
  const showErr = (key, error) => (touched[key] || configSubmitAttempted ? error : null)
  const patch = (key, val) => onChangeCfg((c) => ({ ...c, [key]: val }))

  const titleLen = cfg.title.length
  const titleFilled = validation.title.valid && titleLen >= 3
  const targetMarksInput = String(cfg.targetTotalMarks ?? "").trim()
  const targetComparison = bankTargetMarksComparison(selectedSummary.marks, cfg.targetTotalMarks)
  const marksBalanceMessage = bankTargetMarksBalanceMessage(
    selectedSummary.marks,
    cfg.targetTotalMarks,
  )
  const panelBlockingErrors = bankBlockingErrors(validation.blockingErrors)

  return (
    <section className="flex h-full max-h-[640px] flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
        <Cpu className="h-4 w-4 text-[#6562f1]" />
        Exam setup
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <label className="block text-sm">
          <span className="text-[#5d6580]">Total marks for this exam</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 50"
            className={inputStateClass({
              error: Boolean(
                targetMarksInput &&
                  showErr("targetTotalMarks", validation.target?.error),
              ),
              valid: Boolean(targetMarksInput && validation.target?.valid),
              disabled: false,
            })}
            value={cfg.targetTotalMarks}
            onChange={(e) => patch("targetTotalMarks", digitsOnly(e.target.value))}
            onBlur={() => touch("targetTotalMarks")}
          />
          <FieldError
            message={
              targetMarksInput
                ? showErr("targetTotalMarks", validation.target?.error)
                : null
            }
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-[#5d6580]">
            Exam title
            <RequiredMark />
          </span>
          <div className="relative">
            <input
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="e.g. Discrete Math Midterm"
              className={inputStateClass({
                error: Boolean(showErr("title", validation.title.error)),
                valid: titleFilled,
                disabled: false,
              })}
              value={cfg.title}
              onChange={(e) => patch("title", sanitizeExamTitleInput(e.target.value))}
              onBlur={() => touch("title")}
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[#9aa3c2]">
              {titleLen} / 80
            </span>
          </div>
          <FieldError message={showErr("title", validation.title.error)} />
        </label>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NumericField
            label="Duration (min)"
            required
            value={cfg.durationMinutes}
            placeholder="e.g. 60"
            error={showErr("durationMinutes", validation.duration.error)}
            valid={validation.duration.valid}
            onChange={(v) => patch("durationMinutes", v)}
            onBlur={() => touch("durationMinutes")}
          />
          <label className="text-sm">
            <span className="text-[#5d6580]">Difficulty level</span>
            <select
              className={inputStateClass({
                error: false,
                valid: Boolean(cfg.difficulty),
                disabled: false,
              })}
              value={cfg.difficulty}
              onChange={(e) => patch("difficulty", e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-[#e7eaf3] bg-[#fafbff] p-3 text-xs text-[#5d6580]">
          <p className="font-semibold text-[#151d3a]">Selected from bank</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="TOTAL" value={selectedSummary.total} />
            <StatPill label="MCQ" value={selectedSummary.mcq} />
            <StatPill label="SHORT" value={selectedSummary.short} />
            <StatPill label="ESSAY" value={selectedSummary.essay} />
          </div>
          <p className="mt-2 font-medium text-[#3e4768]">{selectedSummary.marks} marks total</p>
          {targetComparison ? (
            <p className={`mt-1.5 text-xs font-medium ${targetComparison.className}`}>
              {targetComparison.text}
            </p>
          ) : null}
        </div>

        {configSubmitAttempted && marksBalanceMessage ? (
          <div className="mt-3">
            <FieldError message={marksBalanceMessage} />
          </div>
        ) : null}

        {configSubmitAttempted && panelBlockingErrors.length > 0 ? (
          <div className="mt-3 space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            {panelBlockingErrors.map((msg) => (
              <p key={msg} className="text-xs text-red-700">
                {msg}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={compiling || !canCompile}
            title={compileDisabledTooltip}
            onClick={onCompile}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {compiling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {compiling ? "Compiling exam…" : "Compile exam from selected"}
          </button>
        </div>

        <div className="mt-3 border-t border-[#eef1f7] pt-3">
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
  configSubmitAttempted = false,
  canCompile = false,
  compileDisabledTooltip,
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
      if (activeSubject !== ALL_ID && item.category_id !== activeSubject) {
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

  const manualCategoryId = activeSubject !== ALL_ID ? activeSubject : ""

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
          <div className="my-2 border-t border-[#eef1f7]" />
          {subjects
            .filter((s) => s.questionCount > 0)
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
        configSubmitAttempted={configSubmitAttempted}
        canCompile={canCompile}
        compileDisabledTooltip={compileDisabledTooltip}
        selectedSummary={selectedSummary}
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
