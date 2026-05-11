import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Library,
  ListChecks,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react"
import { fetchCategories } from "../../services/categoryService"
import {
  fetchQuestionCountsByText,
  fetchTextMaterials,
} from "../../services/contentService"
import { fetchQuestionBank, generateQuestionsFromText } from "../../services/questionService"
import { generateExam } from "../../services/examService"
import ContentPicker from "../../components/exam/ContentPicker"

const DEFAULTS = {
  title: "",
  description: "",
  durationMinutes: 60,
  difficulty: "mixed",
  targetMcq: 5,
  targetShort: 3,
  targetEssay: 1,
}

// Three modes: pick a saved note, paste fresh content, or compose from the bank.
const MODE = {
  SAVED: "saved",
  NEW: "new",
  BANK: "bank",
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

export default function TeacherGenerateExamPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(MODE.SAVED)
  const [cfg, setCfg] = useState(() => ({ ...DEFAULTS }))

  // Saved-content sidebar state
  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(ContentPicker.ALL_ID)
  const [activeMaterial, setActiveMaterial] = useState(null)
  const [questionCounts, setQuestionCounts] = useState(() => new Map())
  const [contentLoading, setContentLoading] = useState(false)

  // Paste-new state
  const [pastedTitle, setPastedTitle] = useState("")
  const [pastedContent, setPastedContent] = useState("")
  const [pastedCategoryId, setPastedCategoryId] = useState("")

  // Bank picker state
  const [bank, setBank] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [picked, setPicked] = useState(() => new Set())

  // Action state
  const [generating, setGenerating] = useState(false)
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [error, setError] = useState("")
  const [last, setLast] = useState(null) // { exam, questions }

  // ---------- LOAD: categories + content list ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log("📚 Loading existing educational content...")
        const cats = await fetchCategories()
        if (!cancelled) setCategories(cats)
      } catch (e) {
        console.warn("⚠️ Categories fetch failed:", e?.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setContentLoading(true)
      try {
        const opts = {}
        if (activeCategoryId === ContentPicker.UNCAT_ID) opts.uncategorizedOnly = true
        else if (activeCategoryId !== ContentPicker.ALL_ID) opts.categoryId = activeCategoryId
        const list = await fetchTextMaterials(opts)
        if (cancelled) return
        setMaterials(list)
        const counts = await fetchQuestionCountsByText(list.map((m) => m.id))
        if (!cancelled) setQuestionCounts(counts)
        console.log("✅ Content loaded successfully", { count: list.length })
      } catch (e) {
        if (!cancelled) {
          console.warn("⚠️ Content fetch failed:", e?.message)
          setMaterials([])
        }
      } finally {
        if (!cancelled) setContentLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeCategoryId])

  // ---------- LOAD: question bank when mode === bank ----------
  useEffect(() => {
    if (mode !== MODE.BANK) return
    let cancelled = false
    ;(async () => {
      setBankLoading(true)
      try {
        const list = await fetchQuestionBank()
        if (!cancelled) setBank(list)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load question bank.")
      } finally {
        if (!cancelled) setBankLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode])

  const totals = useMemo(() => {
    const total = (cfg.targetMcq || 0) + (cfg.targetShort || 0) + (cfg.targetEssay || 0)
    return { total }
  }, [cfg.targetMcq, cfg.targetShort, cfg.targetEssay])

  const onSelectMaterial = (m) => {
    setActiveMaterial(m)
    console.log("📄 Selected source content:", m.title)
    if (!cfg.title) {
      setCfg((c) => ({ ...c, title: `${m.title} — Exam` }))
    }
  }

  const togglePick = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---------- ACTIONS ----------

  const onGenerateQuestionsOnly = async () => {
    setError("")
    if (mode === MODE.BANK) {
      setError("Question generation requires source content. Switch to “Saved content” or “Paste new”.")
      return
    }
    if (mode === MODE.SAVED && !activeMaterial) {
      setError("Pick a saved content item from the left first.")
      return
    }
    if (mode === MODE.NEW && pastedContent.trim().length < 30) {
      setError("Paste at least 30 characters of content to generate questions.")
      return
    }

    setSavingQuestions(true)
    try {
      const sourceTitle =
        mode === MODE.SAVED ? activeMaterial.title : pastedTitle || "Pasted content"
      const sourceCategoryId =
        mode === MODE.SAVED ? activeMaterial.category_id || null : pastedCategoryId || null
      const sourceCategoryTitle =
        mode === MODE.SAVED
          ? activeMaterial.category?.title
          : categories.find((c) => c.id === pastedCategoryId)?.title

      console.log("🤖 Generating questions...", { mode, sourceTitle })
      const saved = await generateQuestionsFromText({
        content: mode === MODE.SAVED ? activeMaterial.content : pastedContent,
        title: sourceTitle,
        categoryTitle: sourceCategoryTitle,
        categoryId: sourceCategoryId,
        textMaterialId: mode === MODE.SAVED ? activeMaterial.id : null,
        config: {
          mcq: Number(cfg.targetMcq) || 0,
          short: Number(cfg.targetShort) || 0,
          essay: Number(cfg.targetEssay) || 0,
          difficulty: cfg.difficulty === "mixed" ? "medium" : cfg.difficulty,
        },
      })
      console.log("💾 Saving questions to Question Bank...", { count: saved.length })
      // Show them in the right pane without persisting an exam.
      setLast({ exam: null, questions: saved })
      // Refresh per-material question count badge.
      if (mode === MODE.SAVED) {
        setQuestionCounts((m) => {
          const next = new Map(m)
          next.set(activeMaterial.id, (next.get(activeMaterial.id) || 0) + saved.length)
          return next
        })
      }
    } catch (e) {
      console.error("❌ Failed to generate questions:", e)
      setError(e?.message || "Failed to generate questions.")
    } finally {
      setSavingQuestions(false)
    }
  }

  const onGenerateExam = async () => {
    setError("")
    if (!cfg.title.trim()) {
      setError("Give the exam a title first.")
      return
    }
    if (totals.total <= 0) {
      setError("Set at least one question target.")
      return
    }
    if (mode === MODE.NEW && pastedContent.trim().length < 30) {
      setError("Paste at least 30 characters of content.")
      return
    }
    if (mode === MODE.SAVED && !activeMaterial) {
      setError("Pick a saved content item from the left first.")
      return
    }

    const apiMode =
      mode === MODE.BANK ? "from-bank" : mode === MODE.SAVED ? "from-material" : "from-content"

    setGenerating(true)
    try {
      console.log("🤖 Generating exam from selected content...", { apiMode })
      const out = await generateExam({
        title: cfg.title.trim(),
        description: cfg.description.trim() || null,
        durationMinutes: Number(cfg.durationMinutes) || 60,
        categoryId:
          mode === MODE.SAVED
            ? activeMaterial?.category_id || null
            : mode === MODE.NEW
              ? pastedCategoryId || null
              : null,
        sourceMaterialId: mode === MODE.SAVED ? activeMaterial?.id : null,
        mode: apiMode,
        content: mode === MODE.NEW ? pastedContent : undefined,
        examConfig: {
          targetMcq: Number(cfg.targetMcq) || 0,
          targetShort: Number(cfg.targetShort) || 0,
          targetEssay: Number(cfg.targetEssay) || 0,
          difficulty: cfg.difficulty,
          title: cfg.title.trim(),
          categoryTitle:
            mode === MODE.SAVED
              ? activeMaterial?.category?.title
              : categories.find((c) => c.id === pastedCategoryId)?.title,
        },
        sourceQuestionIds: picked.size > 0 ? Array.from(picked) : undefined,
      })
      console.log("✅ Generated paper saved:", out?.exam?.id)
      setLast(out)
    } catch (e) {
      console.error("❌ Failed to generate exam:", e)
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Backend unreachable. Make sure /Backend is running on port 4000."
          : e?.message || "Failed to compose exam.",
      )
    } finally {
      setGenerating(false)
    }
  }

  // ---------- RENDER ----------

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Generate exam</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">
            Reuse saved content, paste fresh notes, or compose from the question bank — Gemini does the rest.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex flex-wrap gap-2">
        <ModeTab
          active={mode === MODE.SAVED}
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => setMode(MODE.SAVED)}
        >
          Saved content
        </ModeTab>
        <ModeTab
          active={mode === MODE.NEW}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => setMode(MODE.NEW)}
        >
          Paste new content
        </ModeTab>
        <ModeTab
          active={mode === MODE.BANK}
          icon={<Library className="h-3.5 w-3.5" />}
          onClick={() => setMode(MODE.BANK)}
        >
          From question bank
        </ModeTab>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      ) : null}

      <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT: content picker */}
        <div className="xl:col-span-3">
          {mode === MODE.SAVED ? (
            <div className="h-[640px]">
              <ContentPicker
                categories={categories}
                materials={materials}
                activeCategoryId={activeCategoryId}
                onChangeCategory={setActiveCategoryId}
                activeMaterialId={activeMaterial?.id ?? null}
                onSelectMaterial={onSelectMaterial}
                questionCounts={questionCounts}
                loading={contentLoading}
              />
            </div>
          ) : mode === MODE.NEW ? (
            <SidePanel title="Why paste new content?">
              <p>
                Paste lecture notes, slide text, or chapter summaries you haven't saved yet. After
                generation, the questions land in your Question Bank automatically.
              </p>
              <p className="mt-2">
                Want to reuse this content later? Save it from <span className="font-semibold">Materials → Text studio</span>{" "}
                first, then come back and pick it from the Saved tab.
              </p>
            </SidePanel>
          ) : (
            <SidePanel title="Compose from your bank">
              <p>Tick questions to constrain Gemini's selection, or leave blank to let it choose for you.</p>
              <p className="mt-2 text-[#8a93ad]">
                Bank composition does not generate new questions — it only assembles them into a new paper.
              </p>
            </SidePanel>
          )}
        </div>

        {/* CENTER: preview / paste textarea / bank list */}
        <div className="min-h-[640px] xl:col-span-5">
          {mode === MODE.SAVED ? (
            <SavedContentPreview
              material={activeMaterial}
              questionCount={activeMaterial ? questionCounts.get(activeMaterial.id) || 0 : 0}
            />
          ) : mode === MODE.NEW ? (
            <PasteContentEditor
              title={pastedTitle}
              content={pastedContent}
              categoryId={pastedCategoryId}
              categories={categories}
              onChangeTitle={setPastedTitle}
              onChangeContent={setPastedContent}
              onChangeCategory={setPastedCategoryId}
            />
          ) : (
            <BankPicker
              bank={bank}
              loading={bankLoading}
              picked={picked}
              onTogglePick={togglePick}
            />
          )}
        </div>

        {/* RIGHT: AI config + buttons + generated summary */}
        <div className="space-y-4 xl:col-span-4">
          <ConfigPanel
            cfg={cfg}
            onChange={setCfg}
            totals={totals}
            generating={generating}
            savingQuestions={savingQuestions}
            mode={mode}
            onGenerateExam={onGenerateExam}
            onGenerateQuestionsOnly={onGenerateQuestionsOnly}
            picked={picked}
          />
          {last ? (
            <GeneratedSummary
              data={last}
              onOpenReview={() => last.exam && navigate(`/teacher-dashboard/exams/${last.exam.id}/review`)}
              onOpenBank={() => navigate("/teacher-dashboard/question-bank")}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Subcomponents
// =============================================================================

function ModeTab({ children, active, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-[#6562f1] bg-[#f1efff] text-[#5f4ce6]"
          : "border-[#e3e6ef] bg-white text-[#5d6580] hover:bg-[#fafbff]",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function SidePanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 text-xs text-[#5d6580] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa3c2]">{title}</p>
      <div className="mt-2 space-y-1 leading-relaxed">{children}</div>
    </div>
  )
}

function SavedContentPreview({ material, questionCount }) {
  if (!material) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-8 text-center text-sm text-[#7d86a5]">
        <div>
          <FileText className="mx-auto h-7 w-7 text-[#bcc2d8]" />
          <p className="mt-2 font-medium">Select content to preview</p>
          <p className="mt-1 text-xs text-[#8a93ad]">Pick any saved note from the left rail to see its content.</p>
        </div>
      </div>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#151d3a]">{material.title || "Untitled"}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#7f88a6]">
            {material.category?.title ? (
              <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
                {material.category.title}
              </span>
            ) : (
              <span className="rounded-full bg-[#fff6e1] px-2 py-0.5 font-medium text-[#c89422]">
                Uncategorized
              </span>
            )}
            {questionCount > 0 ? (
              <span className="rounded-full bg-[#e9f8f0] px-2 py-0.5 font-medium text-[#1f9d67]">
                {questionCount} questions in bank
              </span>
            ) : null}
            <span>{(material.content || "").length.toLocaleString()} chars</span>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-[#1a2341] whitespace-pre-wrap">
        {material.content || "(empty)"}
      </div>
    </article>
  )
}

function PasteContentEditor({
  title,
  content,
  categoryId,
  categories,
  onChangeTitle,
  onChangeContent,
  onChangeCategory,
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <span className="text-[#5d6580]">Title (optional)</span>
          <input
            type="text"
            placeholder="e.g. Cellular Respiration overview"
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[#5d6580]">Subject</span>
          <select
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
            value={categoryId}
            onChange={(e) => onChangeCategory(e.target.value)}
          >
            <option value="">No subject</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 flex min-h-0 flex-1 flex-col text-sm">
        <span className="text-[#5d6580]">Educational content</span>
        <textarea
          className="mt-1 min-h-[280px] flex-1 resize-none rounded-xl border border-[#e3e6ef] px-3 py-2 font-mono text-xs leading-relaxed focus:border-[#6562f1] focus:outline-none"
          placeholder="Paste lecture notes, slide text, or a chapter excerpt here…"
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
        />
      </label>
      <p className="mt-2 text-xs text-[#8a93ad]">
        {content.length.toLocaleString()} chars · {content.trim() ? content.trim().split(/\s+/).length : 0} words
      </p>
    </div>
  )
}

function BankPicker({ bank, loading, picked, onTogglePick }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="border-b border-[#eef1f7] p-4">
        <h2 className="text-sm font-semibold text-[#151d3a]">Question bank candidates</h2>
        <p className="mt-1 text-xs text-[#7f88a6]">
          {loading ? "Loading…" : `${bank.length} questions available`} · {picked.size} selected
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!loading && bank.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dfe3ee] p-6 text-center text-xs text-[#8a93ad]">
            No questions yet. Generate some from the Saved or Paste tab first.
          </div>
        ) : null}
        <div className="space-y-2">
          {bank.map((q) => {
            const checked = picked.has(q.id)
            return (
              <label
                key={q.id}
                className={classNames(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm",
                  checked ? "border-[#6562f1] bg-[#f1efff]/40" : "border-[#e7eaf3] bg-white",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={checked}
                  onChange={() => onTogglePick(q.id)}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide">
                    <span className="rounded-md bg-[#eef1f7] px-2 py-0.5 text-[#3e4768]">{q.question_type}</span>
                    <span className="text-[#8a93ad]">{q.difficulty}</span>
                    <span className="text-[#8a93ad]">{q.marks} pts</span>
                    {q.category?.title ? (
                      <span className="rounded-full bg-[#fff6e1] px-2 py-0.5 text-[#c89422]">
                        {q.category.title}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[#1a2341]">{q.prompt}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ConfigPanel({
  cfg,
  onChange,
  totals,
  generating,
  savingQuestions,
  mode,
  onGenerateExam,
  onGenerateQuestionsOnly,
  picked,
}) {
  const isBank = mode === "bank"
  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
        <Cpu className="h-4 w-4 text-[#6562f1]" /> AI configuration
      </div>

      <label className="mt-3 block text-sm">
        <span className="text-[#5d6580]">Exam title</span>
        <input
          type="text"
          placeholder="e.g. React Midterm — Week 4"
          className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
          value={cfg.title}
          onChange={(e) => onChange((c) => ({ ...c, title: e.target.value }))}
        />
      </label>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="text-[#5d6580]">Duration (min)</span>
          <input
            type="number"
            min={5}
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
            value={cfg.durationMinutes}
            onChange={(e) => onChange((c) => ({ ...c, durationMinutes: Number(e.target.value) }))}
          />
        </label>
        <label className="text-sm">
          <span className="text-[#5d6580]">Difficulty</span>
          <select
            className="mt-1 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
            value={cfg.difficulty}
            onChange={(e) => onChange((c) => ({ ...c, difficulty: e.target.value }))}
          >
            <option value="mixed">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          ["MCQ", "targetMcq"],
          ["Short", "targetShort"],
          ["Essay", "targetEssay"],
        ].map(([label, key]) => (
          <label key={key} className="text-sm">
            <span className="text-[#5d6580]">{label}</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm focus:border-[#6562f1] focus:outline-none"
              value={cfg[key]}
              onChange={(e) => onChange((c) => ({ ...c, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>

      <p className="mt-2 text-xs text-[#8a93ad]">
        Target: <span className="font-semibold text-[#3e4768]">{totals.total} questions</span>
        {isBank ? (
          <span> · {picked.size} hand-picked from bank</span>
        ) : null}
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={generating || savingQuestions}
          onClick={onGenerateExam}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:opacity-60"
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generating ? "Composing exam…" : "Generate exam"}
        </button>
        {!isBank ? (
          <button
            type="button"
            disabled={generating || savingQuestions}
            onClick={onGenerateQuestionsOnly}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-xs font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60"
          >
            {savingQuestions ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
            {savingQuestions ? "Generating questions…" : "Add to question bank only"}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function GeneratedSummary({ data, onOpenReview, onOpenBank }) {
  const isExam = !!data?.exam
  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        {isExam ? "Generated paper saved" : "Questions added to bank"}
      </div>
      {isExam ? (
        <div className="mt-2 text-sm text-[#1a2341]">
          <p className="font-semibold">{data.exam.title}</p>
          <p className="mt-1 text-xs text-[#7f88a6]">
            <Clock className="mr-1 inline h-3 w-3" />
            {data.exam.duration_minutes} min · {data.exam.total_marks} marks ·{" "}
            {data.questions?.length || data.exam.total_questions || 0} questions
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#7f88a6]">
          {data.questions?.length || 0} new question{data.questions?.length === 1 ? "" : "s"} ready in your bank.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {isExam ? (
          <button
            type="button"
            onClick={onOpenReview}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#151d3a] px-3 text-xs font-semibold text-white"
          >
            Open exam editor
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenBank}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
        >
          View question bank
        </button>
      </div>

      {data.questions?.length ? (
        <ol className="mt-4 space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {data.questions.slice(0, 6).map((q, i) => (
            <li key={q.id} className="rounded-lg border border-[#e7eaf3] bg-[#fafbff] p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#8a93ad]">
                <span className="rounded bg-[#f1efff] px-1.5 py-0.5 font-semibold text-[#5f4ce6]">
                  Q{i + 1} · {q.question_type}
                </span>
                <span>{q.difficulty}</span>
                <span>{q.marks} pts</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[#1a2341]">{q.prompt}</p>
            </li>
          ))}
          {data.questions.length > 6 ? (
            <li className="text-center text-[11px] text-[#8a93ad]">
              + {data.questions.length - 6} more in your {isExam ? "paper" : "bank"}
            </li>
          ) : null}
        </ol>
      ) : null}
    </section>
  )
}
