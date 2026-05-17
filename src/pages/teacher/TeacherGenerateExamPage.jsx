import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Cpu,
  FileText,
  Library,
  Loader2,
  Pencil,
  Plus,
  Save,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import ConfirmDialog from "../../components/student/ConfirmDialog"
import { useTeacherHeader } from "../../components/teacher/TeacherLayout"
import PublishExamModal from "../../components/exam/PublishExamModal"
import { fetchCategories } from "../../services/categoryService"
import { fetchQuestionCountsByText, fetchTextMaterials } from "../../services/contentService"
import {
  createQuestion,
  deleteQuestion,
  fetchQuestionBank,
  saveQuestionsToBank,
  updateQuestion,
} from "../../services/questionService"
import {
  createExam,
  deleteExam,
  generateExam,
  linkQuestionToExam,
  unlinkQuestionFromExam,
  updateExam,
} from "../../services/examService"
import ContentPicker from "../../components/exam/ContentPicker"
import FromExistingQuestionsTab from "../../components/exam/FromExistingQuestionsTab"
import ManualQuestionModal, {
  buildQuestionPayloadFromManualForm,
  emptyManualQuestionForm,
} from "../../components/questions/ManualQuestionModal"
import { displayNoteTitle } from "../../components/materials/noteUtils"
import {
  computeBreakdownFromConfig,
  computeExamTotals,
  difficultyLabelFromCfg,
  digitsOnly,
  getCountValue,
  parseCfgCount,
  parseCfgMarks,
  snapshotGenerationConfig,
  validateDuration,
  validateExamConfig,
  validateTitle,
} from "../../utils/examConfig"
import { buildExamTitleFromNote, displayExamTitle, sanitizeExamTitleInput } from "../../utils/examTitle"
import { mcqFieldsFromQuestion } from "../../utils/mcqOptions"

const DEFAULTS = {
  title: "",
  description: "",
  durationMinutes: "",
  difficulty: "mixed",
  targetTotalMarks: "",
  targetMcq: "",
  targetShort: "",
  targetEssay: "",
  marksMcq: "",
  marksShort: "",
  marksEssay: "",
}

function cfgDurationMinutes(cfg) {
  const d = validateDuration(cfg.durationMinutes)
  return d.valid ? d.value : 60
}

// Two modes: pick a saved note or compose from the question bank.
const MODE = {
  SAVED: "saved",
  BANK: "bank",
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

function capitalize(s) {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildExamPatchFromQuestions(questions) {
  const total_marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const diffs = new Set(questions.map((q) => (q.difficulty || "medium").toLowerCase()))
  let difficulty = "mixed"
  if (diffs.size === 1) difficulty = [...diffs][0]
  return { total_marks, difficulty }
}

function computeQuestionBreakdown(questions) {
  const out = {
    mcq: { count: 0, marksEach: 0, subtotal: 0 },
    short: { count: 0, marksEach: 0, subtotal: 0 },
    essay: { count: 0, marksEach: 0, subtotal: 0 },
    totalQuestions: 0,
    totalMarks: 0,
  }
  for (const q of questions) {
    const marks = Number(q.marks) || 0
    const type = q.question_type === "mcq" ? "mcq" : q.question_type === "essay" ? "essay" : "short"
    out[type].count += 1
    out[type].subtotal += marks
    out.totalMarks += marks
    out.totalQuestions += 1
  }
  for (const type of ["mcq", "short", "essay"]) {
    if (out[type].count > 0) out[type].marksEach = Math.round((out[type].subtotal / out[type].count) * 10) / 10
  }
  return out
}

/** Only explicit true counts as saved to the reusable bank (undefined/null = exam-only). */
function isQuestionInBank(q) {
  return q?.in_bank === true
}

function mcqCorrectLetter(options, modelAnswer) {
  if (!Array.isArray(options) || !options.length || !modelAnswer) return null
  const idx = options.findIndex((o) => o.trim().toLowerCase() === String(modelAnswer).trim().toLowerCase())
  if (idx < 0) return null
  return String.fromCharCode(65 + idx)
}

const TOAST_DURATION_MS = 4000

function SuccessToast({ text, onDone, durationMs = TOAST_DURATION_MS }) {
  const [entered, setEntered] = useState(false)
  const [barWidth, setBarWidth] = useState(100)

  useEffect(() => {
    const enterId = requestAnimationFrame(() => setEntered(true))
    const shrinkId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarWidth(0))
    })
    const doneId = window.setTimeout(() => onDone?.(), durationMs)
    return () => {
      cancelAnimationFrame(enterId)
      cancelAnimationFrame(shrinkId)
      window.clearTimeout(doneId)
    }
  }, [durationMs, onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className={classNames(
        "fixed left-4 right-4 top-20 z-[130] overflow-hidden rounded-xl border border-[#cdebd9] bg-[#e8fbf3] shadow-lg transition-all duration-300 ease-out sm:left-auto sm:right-6 sm:max-w-md",
        entered ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <p className="px-4 py-3 text-sm font-medium text-[#1f9d67]">{text}</p>
      <div className="h-1 bg-[#cdebd9]">
        <div
          className="h-full bg-[#1f9d67] transition-[width] ease-linear"
          style={{ width: `${barWidth}%`, transitionDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  )
}

export default function TeacherGenerateExamPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const noteIdParam = searchParams.get("noteId")
  const tabParam = searchParams.get("tab")
  const appliedNoteIdRef = useRef(null)
  const appliedBankTabRef = useRef(false)

  useEffect(() => {
    if (tabParam !== "bank" || appliedBankTabRef.current) return
    appliedBankTabRef.current = true
    setMode(MODE.BANK)
    setCfg((c) => ({ ...c, title: "" }))
  }, [tabParam])
  const [prefillFromTitle, setPrefillFromTitle] = useState("")
  const [mode, setMode] = useState(MODE.SAVED)
  const [cfg, setCfg] = useState(() => ({ ...DEFAULTS }))
  const [generationCfgSnapshot, setGenerationCfgSnapshot] = useState(null)
  const [configSubmitAttempted, setConfigSubmitAttempted] = useState(false)

  // Saved-content sidebar state
  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(ContentPicker.ALL_ID)
  const [activeMaterial, setActiveMaterial] = useState(null)
  const [questionCounts, setQuestionCounts] = useState(() => new Map())
  const [contentLoading, setContentLoading] = useState(false)

  // Bank picker state
  const [bank, setBank] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [picked, setPicked] = useState(() => new Set())

  // Action state
  const [generating, setGenerating] = useState(false)
  const [savingToBank, setSavingToBank] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState(null)
  const [last, setLast] = useState(null) // { exam, questions }
  const [manualModal, setManualModal] = useState(null)
  const [manualForm, setManualForm] = useState(null)
  const [manualSaving, setManualSaving] = useState(false)
  const [centerFadeIn, setCenterFadeIn] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [examSettingsForm, setExamSettingsForm] = useState({ title: "", duration_minutes: 60, description: "" })
  const [examSettingsSaving, setExamSettingsSaving] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [publishPreparing, setPublishPreparing] = useState(false)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const [backActionBusy, setBackActionBusy] = useState(false)
  const { setHeaderBreadcrumb } = useTeacherHeader() || {}
  const [draftSaving, setDraftSaving] = useState(false)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineEditForm, setInlineEditForm] = useState(null)
  const [inlineEditSaving, setInlineEditSaving] = useState(false)
  const lastGeneratedExamIdRef = useRef(null)

  const inPostGeneration = Boolean(last?.exam)

  const showToast = useCallback((text) => {
    setToast({ key: Date.now(), text })
  }, [])

  useEffect(() => {
    if (!setHeaderBreadcrumb) return undefined
    if (inPostGeneration) {
      setHeaderBreadcrumb(["Generate Exam", "Review Exam"])
    } else {
      setHeaderBreadcrumb(null)
    }
    return () => setHeaderBreadcrumb(null)
  }, [inPostGeneration, setHeaderBreadcrumb])

  // ---------- LOAD: categories + content list ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log("[loading] Loading existing educational content...")
        const cats = await fetchCategories()
        if (!cancelled) setCategories(cats)
      } catch (e) {
        console.warn("[warning] Categories fetch failed:", e?.message)
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
        if (activeCategoryId !== ContentPicker.ALL_ID) opts.categoryId = activeCategoryId
        const list = await fetchTextMaterials(opts)
        if (cancelled) return
        setMaterials(list)
        const counts = await fetchQuestionCountsByText(list.map((m) => m.id))
        if (!cancelled) setQuestionCounts(counts)
        console.log("[success] Content loaded successfully", { count: list.length })
      } catch (e) {
        if (!cancelled) {
          console.warn("[warning] Content fetch failed:", e?.message)
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

  const totals = useMemo(() => computeExamTotals(cfg), [cfg])
  const configValidation = useMemo(() => validateExamConfig(cfg), [cfg])

  const canGenerateExam = useMemo(() => {
    if (mode === MODE.BANK) {
      return picked.size > 0 && validateTitle(cfg.title).valid
    }
    if (!configValidation.allValid) return false
    if (mode === MODE.SAVED) return Boolean(activeMaterial)
    return false
  }, [mode, configValidation.allValid, cfg.title, activeMaterial, picked.size])

  const postGenQuestions = last?.questions ?? []
  const postGenBreakdown = useMemo(
    () => (generationCfgSnapshot ? computeBreakdownFromConfig(generationCfgSnapshot) : computeQuestionBreakdown(postGenQuestions)),
    [generationCfgSnapshot, postGenQuestions],
  )
  const postGenDifficultyLabel = useMemo(
    () => (generationCfgSnapshot ? difficultyLabelFromCfg(generationCfgSnapshot) : capitalize(last?.exam?.difficulty || "mixed")),
    [generationCfgSnapshot, last?.exam?.difficulty],
  )
  const postGenDisplayTitle = generationCfgSnapshot?.title || last?.exam?.title
  const postGenDurationMinutes = generationCfgSnapshot?.durationMinutes ?? last?.exam?.duration_minutes ?? 60

  const postGenMarksStatus = useMemo(() => {
    if (!last?.exam) return null
    const targetMarks = parseCfgCount(generationCfgSnapshot?.targetTotalMarks)
    if (targetMarks == null || targetMarks <= 0) return null
    const currentMarks = postGenQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
    const diff = currentMarks - targetMarks
    if (diff === 0) {
      return {
        target: targetMarks,
        current: currentMarks,
        message: "Paper is balanced",
        tone: "balanced",
      }
    }
    if (diff < 0) {
      return {
        target: targetMarks,
        current: currentMarks,
        message: `${Math.abs(diff)} marks short of target`,
        tone: "warn",
      }
    }
    return {
      target: targetMarks,
      current: currentMarks,
      message: `${diff} marks over target`,
      tone: "warn",
    }
  }, [last?.exam, generationCfgSnapshot?.targetTotalMarks, postGenQuestions])

  const sourceSummary = useMemo(() => {
    if (mode === MODE.BANK) {
      return {
        title: last?.exam?.title || cfg.title || "Question bank exam",
        chars: null,
        subtitle: `${postGenQuestions.length} questions from bank`,
      }
    }
    if (mode === MODE.SAVED && activeMaterial) {
      const label = displayNoteTitle(activeMaterial) || activeMaterial.title || "Untitled note"
      return {
        title: label,
        chars: (activeMaterial.content || "").length,
        subtitle: null,
      }
    }
    return { title: cfg.title || "Exam content", chars: null, subtitle: null }
  }, [mode, activeMaterial, cfg.title, last?.exam?.title, postGenQuestions.length])

  useEffect(() => {
    if (!last?.exam) {
      lastGeneratedExamIdRef.current = null
      setCenterFadeIn(false)
      return
    }
    if (last.exam.id === lastGeneratedExamIdRef.current) return
    lastGeneratedExamIdRef.current = last.exam.id
    setExamSettingsForm({
      title: last.exam.title || "",
      duration_minutes: last.exam.duration_minutes || cfgDurationMinutes(cfg),
      description: last.exam.description || "",
    })
    setSettingsOpen(false)
    setInlineEditId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [last?.exam?.id])

  useEffect(() => {
    if (!inPostGeneration) {
      setCenterFadeIn(false)
      return
    }
    setCenterFadeIn(false)
    const id = requestAnimationFrame(() => setCenterFadeIn(true))
    return () => cancelAnimationFrame(id)
  }, [inPostGeneration, last?.exam?.id])

  const selectedBankQuestions = useMemo(
    () => bank.filter((q) => picked.has(q.id)),
    [bank, picked],
  )

  const selectedBankSummary = useMemo(() => {
    const out = { total: selectedBankQuestions.length, mcq: 0, short: 0, essay: 0, marks: 0 }
    for (const q of selectedBankQuestions) {
      if (q.question_type === "mcq") out.mcq += 1
      else if (q.question_type === "essay") out.essay += 1
      else out.short += 1
      out.marks += Number(q.marks) || 0
    }
    return out
  }, [selectedBankQuestions])

  const onSelectMaterial = (m) => {
    setActiveMaterial(m)
    const label = displayNoteTitle(m) || m.title?.trim() || "Untitled note"
    console.log("Selected source content:", label)
    setCfg((c) => ({ ...c, title: buildExamTitleFromNote(label) }))
  }

  useEffect(() => {
    if (!noteIdParam || contentLoading) return
    if (appliedNoteIdRef.current === noteIdParam) return
    const note = materials.find((m) => m.id === noteIdParam)
    if (!note) return
    appliedNoteIdRef.current = noteIdParam
    setMode(MODE.SAVED)
    setActiveCategoryId(note.category_id || ContentPicker.ALL_ID)
    setActiveMaterial(note)
    const label = displayNoteTitle(note) || note.title?.trim() || "Untitled note"
    setCfg((c) => ({ ...c, title: buildExamTitleFromNote(label) }))
    setPrefillFromTitle(label)
  }, [noteIdParam, materials, contentLoading])

  const togglePick = (id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const defaultManualCategoryId = useMemo(() => {
    if (mode === MODE.SAVED && activeMaterial?.category_id) return activeMaterial.category_id
    return categories[0]?.id ?? ""
  }, [mode, activeMaterial?.category_id, categories])

  const resetManualModal = () => {
    setManualModal(null)
    setManualForm(null)
  }

  const manualFormFromQuestion = (q, categoryId = "") => ({
    ...emptyManualQuestionForm(q.category_id || categoryId),
    prompt: q.prompt || "",
    model_answer: q.model_answer || "",
    question_type: q.question_type || "short",
    difficulty: q.difficulty || "medium",
    marks: Number(q.marks) || 2,
    topic: q.topic || "",
    category_id: q.category_id || "",
    ...(q.question_type === "mcq" ? mcqFieldsFromQuestion(q) : {}),
  })

  const openAddManualQuestion = (categoryId = "") => {
    setError("")
    setManualModal({ mode: "add", linkToExam: Boolean(last?.exam) })
    setManualForm(emptyManualQuestionForm(categoryId || defaultManualCategoryId))
  }

  const openEditGeneratedQuestion = (q) => {
    setError("")
    setManualModal({ mode: "edit", question: q })
    setManualForm(manualFormFromQuestion(q))
  }

  const requestDeleteQuestion = (question, scope = "exam") => {
    setDeleteQuestionTarget({ question, scope })
  }

  const closeManualModal = () => {
    if (manualSaving) return
    resetManualModal()
  }

  const submitManualQuestion = async (e) => {
    e.preventDefault()
    if (!manualForm || !manualModal || manualSaving) return
    if (!manualForm.prompt.trim()) {
      setError("Question text is required.")
      return
    }
    let payload
    try {
      payload = buildQuestionPayloadFromManualForm(manualForm)
    } catch (err) {
      setError(err?.message || "Invalid question.")
      return
    }
    setManualSaving(true)
    setError("")
    try {
      if (manualModal.mode === "add") {
        const row = await createQuestion({
          ...payload,
          ai_generated: false,
          in_bank: !last?.exam,
          text_material_id:
            mode === MODE.SAVED && activeMaterial?.id ? activeMaterial.id : null,
        })
        if (last?.exam) {
          const position = (last.questions?.length || 0) + 1
          await linkQuestionToExam(last.exam.id, row.id, position)
          const nextQuestions = [...(last.questions || []), row]
          const patch = buildExamPatchFromQuestions(nextQuestions)
          const updatedExam = await updateExam(last.exam.id, patch)
          setLast((prev) => ({
            exam: { ...prev.exam, ...updatedExam, ...patch },
            questions: nextQuestions,
          }))
        } else if (mode === MODE.BANK) {
          setBank((curr) => [row, ...curr])
          setPicked((prev) => new Set([...prev, row.id]))
        }
        resetManualModal()
      } else {
        const row = await updateQuestion(manualModal.question.id, payload)
        setLast((prev) => {
          if (!prev?.questions?.length) return prev
          return {
            ...prev,
            questions: prev.questions.map((x) => (x.id === row.id ? row : x)),
          }
        })
        if (mode === MODE.BANK) {
          setBank((curr) => curr.map((x) => (x.id === row.id ? row : x)))
        }
        resetManualModal()
      }
    } catch (err) {
      setError(err?.message || "Could not save question.")
    } finally {
      setManualSaving(false)
    }
  }

  const onChangePostGenContent = () => {
    setLast(null)
    setGenerationCfgSnapshot(null)
    setSettingsOpen(false)
    setInlineEditId(null)
    setInlineEditForm(null)
    setDeleteQuestionTarget(null)
    lastGeneratedExamIdRef.current = null
  }

  const onDiscardExamAndLeaveReview = async () => {
    if (!last?.exam?.id || backActionBusy) return
    setBackActionBusy(true)
    setError("")
    try {
      await deleteExam(last.exam.id)
      setBackConfirmOpen(false)
      onChangePostGenContent()
    } catch (e) {
      setError(e?.message || "Could not discard this exam.")
    } finally {
      setBackActionBusy(false)
    }
  }

  const onSaveExamSettings = async () => {
    if (!last?.exam || examSettingsSaving) return
    if (!examSettingsForm.title.trim()) {
      setError("Exam title is required.")
      return
    }
    setExamSettingsSaving(true)
    setError("")
    try {
      const updated = await updateExam(last.exam.id, {
        title: examSettingsForm.title.trim(),
        description: examSettingsForm.description.trim() || null,
        duration_minutes: Number(examSettingsForm.duration_minutes) || 60,
      })
      setLast((prev) => ({ ...prev, exam: { ...prev.exam, ...updated } }))
      setCfg((c) => ({
        ...c,
        title: updated.title || c.title,
        durationMinutes: String(updated.duration_minutes ?? c.durationMinutes),
      }))
      setSettingsOpen(false)
    } catch (e) {
      setError(e?.message || "Could not save exam settings.")
    } finally {
      setExamSettingsSaving(false)
    }
  }

  const applyBankSaveToState = (saved) => {
    if (!saved?.length) return
    const savedIds = new Set(saved.map((q) => q.id))
    setLast((prev) => {
      if (!prev?.questions?.length) return prev
      return {
        ...prev,
        questions: prev.questions.map((q) =>
          savedIds.has(q.id) ? { ...q, in_bank: true } : q,
        ),
      }
    })
  }

  const refreshMaterialQuestionCounts = async () => {
    const materialId = last?.exam?.source_material_id || activeMaterial?.id
    if (!materialId) return
    const counts = await fetchQuestionCountsByText([materialId])
    setQuestionCounts((m) => {
      const next = new Map(m)
      for (const [id, n] of counts) next.set(id, n)
      return next
    })
  }

  const ensureExamQuestionsInBank = async () => {
    const pendingIds = postGenQuestions.filter((q) => !isQuestionInBank(q)).map((q) => q.id)
    if (!pendingIds.length) return []
    const saved = await saveQuestionsToBank(pendingIds)
    applyBankSaveToState(saved)
    await refreshMaterialQuestionCounts()
    return saved
  }

  const onSaveDraft = async () => {
    if (!last?.exam || draftSaving) return
    setDraftSaving(true)
    setError("")
    try {
      await ensureExamQuestionsInBank()
      await updateExam(last.exam.id, { status: "draft" })
      showToast("Exam saved as draft. All questions saved to your question bank.")
    } catch (e) {
      setError(e?.message || "Could not save draft.")
    } finally {
      setDraftSaving(false)
    }
  }

  const onPublishClick = async () => {
    if (!postGenQuestions.length || publishPreparing) return
    setPublishPreparing(true)
    setError("")
    try {
      await ensureExamQuestionsInBank()
      setPublishConfirmOpen(true)
    } catch (e) {
      setError(e?.message || "Could not save questions to the bank.")
    } finally {
      setPublishPreparing(false)
    }
  }

  const onConfirmDeleteQuestion = async () => {
    if (!deleteQuestionTarget || deletingQuestion) return
    const { question, scope } = deleteQuestionTarget
    setDeletingQuestion(true)
    setError("")
    try {
      if (scope === "exam" && last?.exam) {
        await unlinkQuestionFromExam(last.exam.id, question.id)
        await deleteQuestion(question.id)
        const nextQuestions = postGenQuestions.filter((q) => q.id !== question.id)
        const patch = buildExamPatchFromQuestions(nextQuestions)
        const updatedExam = await updateExam(last.exam.id, patch)
        setLast((prev) => ({
          exam: { ...prev.exam, ...updatedExam, ...patch, total_questions: nextQuestions.length },
          questions: nextQuestions,
        }))
        if (inlineEditId === question.id) {
          setInlineEditId(null)
          setInlineEditForm(null)
        }
      } else {
        await deleteQuestion(question.id)
        setBank((curr) => curr.filter((q) => q.id !== question.id))
        setPicked((prev) => {
          if (!prev.has(question.id)) return prev
          const next = new Set(prev)
          next.delete(question.id)
          return next
        })
        if (manualModal?.mode === "edit" && manualModal.question?.id === question.id) {
          resetManualModal()
        }
      }
    } catch (e) {
      setError(e?.message || "Could not remove question.")
    } finally {
      setDeletingQuestion(false)
      setDeleteQuestionTarget(null)
    }
  }

  const startInlineEdit = (q) => {
    setInlineEditId(q.id)
    setInlineEditForm(manualFormFromQuestion(q))
  }

  const cancelInlineEdit = () => {
    if (inlineEditSaving) return
    setInlineEditId(null)
    setInlineEditForm(null)
  }

  const saveInlineEdit = async () => {
    if (!inlineEditForm || !inlineEditId || inlineEditSaving || !last?.exam) return
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
      const nextQuestions = postGenQuestions.map((x) => (x.id === row.id ? row : x))
      const patch = buildExamPatchFromQuestions(nextQuestions)
      const updatedExam = await updateExam(last.exam.id, patch)
      setLast((prev) => ({
        exam: { ...prev.exam, ...updatedExam, ...patch },
        questions: nextQuestions,
      }))
      setInlineEditId(null)
      setInlineEditForm(null)
    } catch (e) {
      setError(e?.message || "Could not save question.")
    } finally {
      setInlineEditSaving(false)
    }
  }

  // ---------- ACTIONS ----------

  const onSaveExamQuestionsToBank = async () => {
    if (savingToBank || !postGenQuestions.length) return
    const ids = postGenQuestions.map((q) => q.id).filter(Boolean)
    if (!ids.length) return
    setSavingToBank(true)
    setError("")
    try {
      const saved = await saveQuestionsToBank(ids)
      if (saved.length) {
        applyBankSaveToState(saved)
      } else {
        setLast((prev) => {
          if (!prev?.questions?.length) return prev
          const idSet = new Set(ids)
          return {
            ...prev,
            questions: prev.questions.map((q) =>
              idSet.has(q.id) ? { ...q, in_bank: true } : q,
            ),
          }
        })
      }
      await refreshMaterialQuestionCounts()
      showToast("All questions saved to your question bank.")
    } catch (e) {
      setError(e?.message || "Could not save questions to the bank.")
    } finally {
      setSavingToBank(false)
    }
  }

  const onExamPublished = () => {
    setPublishOpen(false)
    showToast("Exam published successfully. Students can now attempt it.")
  }

  const onGenerateExam = async () => {
    setError("")
    setConfigSubmitAttempted(true)
    if (!cfg.title.trim()) {
      setError("Please give this exam a title.")
      return
    }
    if (mode !== MODE.BANK && !configValidation.hasAnyQuestion) {
      setError("Add at least one question type before generating.")
      return
    }
    if (mode !== MODE.BANK && !configValidation.allValid) {
      setError(configValidation.blockingErrors[0] || "Fill in all required fields correctly before generating.")
      return
    }
    if (mode === MODE.BANK && picked.size === 0) {
      setError("Select at least one question to compile.")
      return
    }
    if (mode === MODE.SAVED && !activeMaterial) {
      setError("Pick a saved content item from the left first.")
      return
    }

    const apiMode = mode === MODE.BANK ? "from-bank" : "from-material"

    setGenerating(true)
    try {
      if (mode === MODE.BANK) {
        console.log("[loading] Creating exam directly from selected question bank rows...", {
          selected: picked.size,
        })
        const categoryIds = new Set(
          selectedBankQuestions.map((q) => q.category_id).filter(Boolean),
        )
        const exam = await createExam({
          title: cfg.title.trim(),
          description: cfg.description.trim() || null,
          durationMinutes: cfgDurationMinutes(cfg),
          categoryId: categoryIds.size === 1 ? Array.from(categoryIds)[0] : null,
          questionIds: selectedBankQuestions.map((q) => q.id),
        })
        console.log("[success] Exam compiled from question bank:", exam?.id)
        navigate("/teacher-dashboard/exams")
        return
      }

      console.log("[loading] Generating exam from selected content...", { apiMode })
      const out = await generateExam({
        title: cfg.title.trim(),
        description: cfg.description.trim() || null,
        durationMinutes: cfgDurationMinutes(cfg),
        categoryId: mode === MODE.SAVED ? activeMaterial?.category_id || null : null,
        sourceMaterialId: mode === MODE.SAVED ? activeMaterial?.id : null,
        mode: apiMode,
        examConfig: {
          targetMcq: parseCfgCount(cfg.targetMcq) ?? 0,
          targetShort: parseCfgCount(cfg.targetShort) ?? 0,
          targetEssay: parseCfgCount(cfg.targetEssay) ?? 0,
          marksMcq: parseCfgMarks(cfg.marksMcq) ?? 2,
          marksShort: parseCfgMarks(cfg.marksShort) ?? 4,
          marksEssay: parseCfgMarks(cfg.marksEssay) ?? 10,
          difficulty: cfg.difficulty,
          title: cfg.title.trim(),
          categoryTitle: mode === MODE.SAVED ? activeMaterial?.category?.title : null,
        },
        sourceQuestionIds: picked.size > 0 ? Array.from(picked) : undefined,
      })
      console.log("[success] Generated paper saved:", out?.exam?.id)
      const snap = snapshotGenerationConfig(cfg)
      setGenerationCfgSnapshot(snap)
      setLast({
        ...out,
        exam: out?.exam
          ? {
              ...out.exam,
              title: snap.title,
              duration_minutes: snap.durationMinutes,
              difficulty: snap.difficulty,
              total_marks: computeBreakdownFromConfig(snap).totalMarks,
            }
          : out.exam,
        questions: (out?.questions ?? []).map((q) => ({
          ...q,
          in_bank: q.in_bank === true,
        })),
      })
    } catch (e) {
      console.error("[error] Failed to generate exam:", e)
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Unable to connect. Please try again."
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
            Pick your course material, set your question breakdown, and let the AI build the exam.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <ModeTab
          active={mode === MODE.SAVED}
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode(MODE.SAVED)
            setCfg((c) => ({ ...c, title: "" }))
          }}
        >
          Saved content
        </ModeTab>
        <ModeTab
          active={mode === MODE.BANK}
          icon={<Library className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode(MODE.BANK)
            setCfg((c) => ({ ...c, title: "" }))
          }}
        >
          From existing questions
        </ModeTab>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      ) : null}

      {toast ? (
        <SuccessToast key={toast.key} text={toast.text} onDone={() => setToast(null)} />
      ) : null}

      {inPostGeneration ? (
        <>
        <button
          type="button"
          onClick={() => setBackConfirmOpen(true)}
          className="text-left text-sm font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
        >
          {"<- Back to Generate Exam"}
        </button>
        <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
          <PostGenSourcePanel summary={sourceSummary} onChangeContent={onChangePostGenContent} />
          <div
            className={classNames(
              "min-h-[640px] transition-opacity duration-300",
              centerFadeIn ? "opacity-100" : "opacity-0",
            )}
          >
            <PostGenExamEditor
              exam={last.exam}
              questions={postGenQuestions}
              displayTitle={postGenDisplayTitle}
              durationMinutes={postGenDurationMinutes}
              difficultyLabel={postGenDifficultyLabel}
              configBreakdown={postGenBreakdown}
              inlineEditId={inlineEditId}
              inlineEditForm={inlineEditForm}
              inlineEditSaving={inlineEditSaving}
              onStartInlineEdit={startInlineEdit}
              onCancelInlineEdit={cancelInlineEdit}
              onChangeInlineEdit={setInlineEditForm}
              onSaveInlineEdit={saveInlineEdit}
              onDeleteQuestion={(q) => requestDeleteQuestion(q, "exam")}
              onAddQuestion={() => openAddManualQuestion()}
            />
          </div>
          <PostGenActionsPanel
            exam={last.exam}
            questions={postGenQuestions}
            breakdown={postGenBreakdown}
            displayTitle={postGenDisplayTitle}
            durationMinutes={postGenDurationMinutes}
            difficultyLabel={postGenDifficultyLabel}
            draftSaving={draftSaving}
            settingsOpen={settingsOpen}
            settingsForm={examSettingsForm}
            settingsSaving={examSettingsSaving}
            onToggleSettings={() => {
              setSettingsOpen((v) => !v)
              if (!settingsOpen && last?.exam) {
                setExamSettingsForm({
                  title: last.exam.title || "",
                  duration_minutes: last.exam.duration_minutes || 60,
                  description: last.exam.description || "",
                })
              }
            }}
            onChangeSettings={setExamSettingsForm}
            onSaveSettings={onSaveExamSettings}
            onCancelSettings={() => setSettingsOpen(false)}
            onPublish={onPublishClick}
            publishPreparing={publishPreparing}
            onSaveDraft={onSaveDraft}
            onSaveToBank={onSaveExamQuestionsToBank}
            savingToBank={savingToBank}
            allInBank={
              postGenQuestions.length > 0 && postGenQuestions.every(isQuestionInBank)
            }
            marksStatus={postGenMarksStatus}
          />
        </div>
        </>
      ) : mode === MODE.BANK ? (
        <FromExistingQuestionsTab
          bank={bank}
          bankLoading={bankLoading}
          setBank={setBank}
          categories={categories}
          picked={picked}
          setPicked={setPicked}
          cfg={cfg}
          setCfg={setCfg}
          validation={configValidation}
          compiling={generating}
          onCompile={onGenerateExam}
          onOpenAddManual={openAddManualQuestion}
          onEditQuestion={openEditGeneratedQuestion}
          onDeleteQuestion={(q) => requestDeleteQuestion(q, "bank")}
          setError={setError}
        />
      ) : (
      <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3">
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
              prefillFromTitle={prefillFromTitle}
            />
          </div>
        </div>

        <div className="min-h-[640px] xl:col-span-5">
          <SavedContentPreview
            material={activeMaterial}
            questionCount={activeMaterial ? questionCounts.get(activeMaterial.id) || 0 : 0}
          />
        </div>

        {/* RIGHT: AI config + buttons + generated summary */}
        <div className="space-y-4 xl:col-span-4">
          <ConfigPanel
            cfg={cfg}
            onChange={setCfg}
            totals={totals}
            validation={configValidation}
            canGenerateExam={canGenerateExam}
            generating={generating}
            mode={mode}
            configSubmitAttempted={configSubmitAttempted}
            onGenerateExam={onGenerateExam}
            picked={picked}
            selectedBankSummary={selectedBankSummary}
          />
        </div>
      </div>
      )}

      <ConfirmDialog
        open={backConfirmOpen}
        title="Discard this exam?"
        destructive
        busy={backActionBusy}
        message={
          <p>
            This will delete the exam and return you to setup. Questions already saved to your
            question bank will stay there.
          </p>
        }
        cancelLabel="Stay on this page"
        confirmLabel="Discard exam"
        onConfirm={onDiscardExamAndLeaveReview}
        onCancel={() => setBackConfirmOpen(false)}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        title="Publish this exam?"
        message={
          <p>
            Once published, students assigned to this exam will be able to see and attempt it. You
            can unpublish it later from My Exams.
          </p>
        }
        confirmLabel="Publish now"
        cancelLabel="Cancel"
        onConfirm={() => {
          setPublishConfirmOpen(false)
          setPublishOpen(true)
        }}
        onCancel={() => setPublishConfirmOpen(false)}
      />

      {last?.exam ? (
        <PublishExamModal
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          examTemplate={{
            id: last.exam.id,
            title: last.exam.title,
            category_id: last.exam.category_id,
            duration_minutes: last.exam.duration_minutes,
            total_questions: last.exam.total_questions ?? postGenQuestions.length,
            total_marks: last.exam.total_marks,
          }}
          onPublished={onExamPublished}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteQuestionTarget)}
        title="Remove this question?"
        destructive
        busy={deletingQuestion}
        message={
          deleteQuestionTarget ? (
            <p>
              {deleteQuestionTarget.scope === "exam" ? (
                <>
                  <strong className="text-[#151d3a]">
                    Q
                    {postGenQuestions.findIndex((q) => q.id === deleteQuestionTarget.question.id) + 1}
                  </strong>{" "}
                  will be removed from this exam and deleted from your question bank.
                </>
              ) : (
                <>
                  This question will be permanently deleted from your question bank
                  {picked.has(deleteQuestionTarget.question.id)
                    ? " and removed from your current selection."
                    : "."}
                </>
              )}
            </p>
          ) : null
        }
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={onConfirmDeleteQuestion}
        onCancel={() => !deletingQuestion && setDeleteQuestionTarget(null)}
      />

      <ManualQuestionModal
        open={Boolean(manualModal && manualForm)}
        isEdit={manualModal?.mode === "edit"}
        form={manualForm}
        categories={categories}
        saving={manualSaving}
        onChange={setManualForm}
        onSubmit={submitManualQuestion}
        onClose={closeManualModal}
      />
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
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
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
          <p className="mt-2 font-medium">Select a note to preview its content</p>
          <p className="mt-1 text-xs text-[#8a93ad]">
            Choose any saved course note from the left to review it before generating your exam.
          </p>
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
            ) : null}
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

function StatPill({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-[#e7eaf3]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3c2]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[#151d3a]">{value}</p>
    </div>
  )
}

function RequiredMark() {
  return <span className="text-red-500"> *</span>
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="mt-1 text-xs text-red-600">{message}</p>
  )
}

function inputStateClass({ error, valid, disabled }) {
  const base = "mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none [appearance:textfield]"
  if (disabled) return `${base} cursor-not-allowed border-[#e3e6ef] bg-[#f6f7fc] text-[#9aa3c2]`
  if (error) return `${base} border-red-400 focus:border-red-500`
  if (valid) return `${base} border-emerald-400 focus:border-emerald-500`
  return `${base} border-[#e3e6ef] focus:border-[#6562f1]`
}

function NumericField({
  label,
  required,
  value,
  placeholder,
  error,
  valid,
  disabled,
  inputRef,
  onChange,
  onBlur,
}) {
  return (
    <label className="text-sm">
      <span className="text-[#5d6580]">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={inputStateClass({ error: Boolean(error), valid, disabled })}
        value={value}
        onChange={(e) => onChange(digitsOnly(e.target.value))}
        onBlur={onBlur}
      />
      <FieldError message={error} />
    </label>
  )
}

function ConfigPanel({
  cfg,
  onChange,
  totals,
  validation,
  canGenerateExam,
  generating,
  mode,
  configSubmitAttempted,
  onGenerateExam,
  picked,
  selectedBankSummary,
}) {
  const isBank = mode === "bank"
  const [touched, setTouched] = useState({})
  const marksMcqRef = useRef(null)
  const marksShortRef = useRef(null)
  const marksEssayRef = useRef(null)

  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }))
  const showErr = (key, error) => (touched[key] || configSubmitAttempted ? error : null)
  const patch = (key, val) => onChange((c) => ({ ...c, [key]: val }))

  const mcqN = validation.mcqCount.value ?? 0
  const shortN = validation.shortCount.value ?? 0
  const essayN = validation.essayCount.value ?? 0

  const handleCountChange = (countKey, marksKey, raw) => {
    onChange((c) => {
      const nextCfg = { ...c, [countKey]: raw }
      if (getCountValue(raw) === 0) nextCfg[marksKey] = ""
      return nextCfg
    })
  }

  const blurCount = (key, max) => {
    touch(key)
    let v = String(cfg[key] ?? "").trim()
    if (!v) v = "0"
    const n = Number(v)
    if (Number.isFinite(n) && n > max) v = String(max)
    else if (!Number.isFinite(n) || n < 0) v = "0"
    const marksKey = { targetMcq: "marksMcq", targetShort: "marksShort", targetEssay: "marksEssay" }[key]
    onChange((c) => {
      const next = { ...c, [key]: v }
      if (getCountValue(v) === 0) next[marksKey] = ""
      return next
    })
  }

  const titleLen = cfg.title.length
  const titleFilled = validation.title.valid && titleLen >= 3
  const showGlobalError =
    !isBank &&
    validation.globalError &&
    (touched.targetMcq || touched.targetShort || touched.targetEssay)

  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
        <Cpu className="h-4 w-4 text-[#6562f1]" /> {isBank ? "Exam setup" : "AI configuration"}
      </div>

      {!isBank ? (
        <label className="mt-3 block text-sm">
          <span className="text-[#5d6580]">
            Total marks for this exam
            <RequiredMark />
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 50"
            className={inputStateClass({
              error: Boolean(showErr("targetTotalMarks", validation.target.error)),
              valid: validation.target.valid,
              disabled: false,
            })}
            value={cfg.targetTotalMarks}
            onChange={(e) => patch("targetTotalMarks", digitsOnly(e.target.value))}
            onBlur={() => touch("targetTotalMarks")}
          />
          <FieldError message={showErr("targetTotalMarks", validation.target.error)} />
        </label>
      ) : null}

      <label className="mt-3 block text-sm">
        <span className="text-[#5d6580]">
          Exam title
          <RequiredMark />
        </span>
        <div className="relative">
          <input
            type="text"
            maxLength={80}
            placeholder="e.g. Discrete Math Midterm"
            className={inputStateClass({
              error: Boolean(showErr("title", validation.title.error)),
              valid: titleFilled,
              disabled: false,
            })}
            value={cfg.title}
            onChange={(e) => onChange((c) => ({ ...c, title: sanitizeExamTitleInput(e.target.value) }))}
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
          <span className="text-[#5d6580]">
            Difficulty level
            {!isBank ? <RequiredMark /> : null}
          </span>
          <select
            className={inputStateClass({
              error: false,
              valid: Boolean(cfg.difficulty),
              disabled: false,
            })}
            value={cfg.difficulty}
            onChange={(e) => onChange((c) => ({ ...c, difficulty: e.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>

      {!isBank ? (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumericField
              label="Number of MCQs"
              value={cfg.targetMcq}
              placeholder="e.g. 5"
              error={showErr("targetMcq", validation.mcqCount.error)}
              valid={validation.mcqCount.valid && String(cfg.targetMcq).trim() !== ""}
              onChange={(v) => handleCountChange("targetMcq", "marksMcq", v)}
              onBlur={() => blurCount("targetMcq", 50)}
            />
            <NumericField
              label="Short answer questions"
              value={cfg.targetShort}
              placeholder="e.g. 3"
              error={showErr("targetShort", validation.shortCount.error)}
              valid={validation.shortCount.valid && String(cfg.targetShort).trim() !== ""}
              onChange={(v) => handleCountChange("targetShort", "marksShort", v)}
              onBlur={() => blurCount("targetShort", 30)}
            />
            <NumericField
              label="Essay / Subjective questions"
              value={cfg.targetEssay}
              placeholder="e.g. 2"
              error={showErr("targetEssay", validation.essayCount.error)}
              valid={validation.essayCount.valid && String(cfg.targetEssay).trim() !== ""}
              onChange={(v) => handleCountChange("targetEssay", "marksEssay", v)}
              onBlur={() => blurCount("targetEssay", 10)}
            />
          </div>

          {validation.allocation ? (
            <p
              className={`mt-2 text-xs ${
                validation.allocation.type === "balanced" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {validation.allocation.type === "balanced"
                ? "Marks balanced perfectly"
                : validation.allocation.message}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumericField
              label="Marks per MCQ"
              value={mcqN > 0 ? cfg.marksMcq : ""}
              placeholder={mcqN > 0 ? "e.g. 2" : "-"}
              disabled={mcqN === 0}
              inputRef={marksMcqRef}
              error={showErr("marksMcq", validation.marksMcq.error)}
              valid={mcqN > 0 && validation.marksMcq.valid && String(cfg.marksMcq).trim() !== ""}
              onChange={(v) => patch("marksMcq", v)}
              onBlur={() => touch("marksMcq")}
            />
            <NumericField
              label="Marks per Short"
              value={shortN > 0 ? cfg.marksShort : ""}
              placeholder={shortN > 0 ? "e.g. 4" : "-"}
              disabled={shortN === 0}
              inputRef={marksShortRef}
              error={showErr("marksShort", validation.marksShort.error)}
              valid={shortN > 0 && validation.marksShort.valid && String(cfg.marksShort).trim() !== ""}
              onChange={(v) => patch("marksShort", v)}
              onBlur={() => touch("marksShort")}
            />
            <NumericField
              label="Marks per Essay"
              value={essayN > 0 ? cfg.marksEssay : ""}
              placeholder={essayN > 0 ? "e.g. 10" : "-"}
              disabled={essayN === 0}
              inputRef={marksEssayRef}
              error={showErr("marksEssay", validation.marksEssay.error)}
              valid={essayN > 0 && validation.marksEssay.valid && String(cfg.marksEssay).trim() !== ""}
              onChange={(v) => patch("marksEssay", v)}
              onBlur={() => touch("marksEssay")}
            />
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-[#e7eaf3] bg-[#fafbff] p-3 text-xs text-[#5d6580]">
          <p className="font-semibold text-[#151d3a]">Selected from bank</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="TOTAL" value={selectedBankSummary.total} />
            <StatPill label="MCQ" value={selectedBankSummary.mcq} />
            <StatPill label="SHORT" value={selectedBankSummary.short} />
            <StatPill label="ESSAY" value={selectedBankSummary.essay} />
          </div>
          <p className="mt-2 font-medium text-[#3e4768]">{selectedBankSummary.marks} marks total</p>
        </div>
      )}

      <p className="mt-2 text-xs text-[#8a93ad]">
        {!isBank && totals.ready ? (
          <>
            Total: <span className="font-semibold text-[#3e4768]">{totals.totalQuestions} questions</span>
            {" - "}
            <span className="font-semibold text-[#3e4768]">{totals.totalMarks} marks</span>
          </>
        ) : null}
      </p>

      {showGlobalError ? <FieldError message={validation.globalError} /> : null}

      {configSubmitAttempted && validation.blockingErrors?.length > 0 ? (
        <div className="mt-3 space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          {validation.blockingErrors.map((msg) => (
            <p key={msg} className="text-xs text-red-700">
              {msg}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={generating || !canGenerateExam}
          title={
            !canGenerateExam && !generating
              ? isBank
                ? "Select at least one question to compile"
                : "Fill in all required fields to generate"
              : undefined
          }
          onClick={onGenerateExam}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generating
            ? isBank
              ? "Compiling exam..."
              : "Composing exam..."
            : isBank
              ? "Compile exam from selected"
              : "Generate exam with AI"}
        </button>
      </div>
    </section>
  )
}

function PostGenSourcePanel({ summary, onChangeContent }) {
  return (
    <aside className="flex h-[640px] flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-[#151d3a]">{summary.title}</p>
        {summary.chars != null ? (
          <p className="mt-2 text-xs text-[#7f88a6]">{summary.chars.toLocaleString()} chars used</p>
        ) : summary.subtitle ? (
          <p className="mt-2 text-xs text-[#7f88a6]">{summary.subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onChangeContent}
        className="mt-auto text-left text-xs font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
      >
        {"<- Change content"}
      </button>
    </aside>
  )
}

function PostGenExamEditor({
  exam,
  questions,
  displayTitle,
  durationMinutes,
  difficultyLabel,
  configBreakdown,
  inlineEditId,
  inlineEditForm,
  inlineEditSaving,
  onStartInlineEdit,
  onCancelInlineEdit,
  onChangeInlineEdit,
  onSaveInlineEdit,
  onDeleteQuestion,
  onAddQuestion,
}) {
  const headerQuestions = configBreakdown?.totalQuestions ?? questions.length
  const headerMarks = configBreakdown?.totalMarks ?? questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const duration = durationMinutes ?? exam.duration_minutes ?? 60

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="shrink-0 border-b border-[#eef1f7] p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#151d3a]">{displayExamTitle(displayTitle || exam.title)}</h2>
          <p className="mt-1 text-xs text-[#7f88a6]">
            {headerQuestions} questions - {headerMarks} marks - {duration} min - {difficultyLabel}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {questions.map((q, idx) => (
          <PostGenQuestionCard
            key={q.id}
            index={idx}
            question={q}
            editing={inlineEditId === q.id}
            form={inlineEditId === q.id ? inlineEditForm : null}
            saving={inlineEditSaving && inlineEditId === q.id}
            onEdit={() => onStartInlineEdit(q)}
            onDelete={() => onDeleteQuestion(q)}
            onCancelEdit={onCancelInlineEdit}
            onChangeForm={onChangeInlineEdit}
            onSaveEdit={onSaveInlineEdit}
          />
        ))}
        <button
          type="button"
          onClick={onAddQuestion}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c4f5] bg-[#fafbff] text-xs font-semibold text-[#5f4ce6] transition hover:bg-[#f1efff]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a question manually
        </button>
      </div>
    </div>
  )
}

function PostGenQuestionCard({
  index,
  question: q,
  editing,
  form,
  saving,
  onEdit,
  onDelete,
  onCancelEdit,
  onChangeForm,
  onSaveEdit,
}) {
  if (editing && form) {
    return (
      <article className="rounded-2xl border border-[#cfc8ff] bg-[#fafbff] p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5f4ce6]">Editing Q{index + 1}</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">
              <span className="text-[#5d6580]">Type</span>
              <div
                className="mt-1 flex h-9 items-center rounded-lg border border-[#e3e6ef] bg-[#f6f7fc] px-2 text-xs font-medium capitalize text-[#313a58]"
                title="Question type cannot be changed"
              >
                {form.question_type === "mcq"
                  ? "MCQ"
                  : form.question_type === "essay"
                    ? "Essay"
                    : "Short"}
              </div>
            </label>
            <label className="text-xs">
              <span className="text-[#5d6580]">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(e) => onChangeForm((f) => ({ ...f, difficulty: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-xs"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-[#5d6580]">Marks</span>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => onChangeForm((f) => ({ ...f, marks: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-xs"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-[#5d6580]">Question</span>
            <textarea
              rows={3}
              value={form.prompt}
              onChange={(e) => onChangeForm((f) => ({ ...f, prompt: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
            />
          </label>
          {form.question_type === "mcq" ? (
            <div className="space-y-2 rounded-xl border border-[#eef1f7] bg-white p-3">
              <p className="text-[11px] font-semibold text-[#151d3a]">Four answer options</p>
              {["A", "B", "C", "D"].map((letter) => (
                <label key={letter} className="block text-xs">
                  <span className="text-[#5d6580]">Option {letter}</span>
                  <input
                    value={form[`option${letter}`]}
                    onChange={(e) =>
                      onChangeForm((f) => ({ ...f, [`option${letter}`]: e.target.value }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] px-2 text-sm"
                  />
                </label>
              ))}
              <label className="block text-xs">
                <span className="text-[#5d6580]">Correct answer</span>
                <select
                  value={form.correctLetter}
                  onChange={(e) => onChangeForm((f) => ({ ...f, correctLetter: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#e3e6ef] bg-white px-2 text-sm"
                >
                  {["A", "B", "C", "D"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="block text-xs">
              <span className="text-[#5d6580]">Expected answer</span>
              <textarea
                rows={2}
                value={form.model_answer}
                onChange={(e) => onChangeForm((f) => ({ ...f, model_answer: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="h-9 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6562f1] px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </article>
    )
  }

  const typeLabel = (q.question_type || "short").toUpperCase()
  const diffLabel = capitalize(q.difficulty || "medium")
  const correctLetter =
    q.question_type === "mcq" ? mcqCorrectLetter(q.options, q.model_answer) : null

  return (
    <article className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#7f88a6]">
          <span className="text-[#151d3a]">Q{index + 1}</span>
          {" - "}
          <span className="rounded bg-[#f1efff] px-1.5 py-0.5 text-[#5f4ce6]">{typeLabel}</span>
          {" - "}
          {diffLabel}
          {" - "}
          {q.marks} pt{Number(q.marks) === 1 ? "" : "s"}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#313a58] hover:bg-[#fafbff]"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Remove question from exam"
            className="inline-flex items-center justify-center rounded-lg border border-[#fbd8d8] bg-white px-2 py-1 text-[11px] font-semibold text-[#c94a4a] hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#1a2341]">{q.prompt}</p>
      {q.question_type === "mcq" && Array.isArray(q.options) ? (
        <ul className="mt-3 space-y-1.5 text-sm text-[#5d6580]">
          {q.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx)
            const isCorrect = correctLetter === letter
            return (
              <li
                key={`${letter}-${opt}`}
                className={`flex gap-2 rounded-lg px-3 py-2 ${
                  isCorrect ? "border border-emerald-100 bg-emerald-50" : "bg-[#fafbff]"
                }`}
              >
                {isCorrect ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className={isCorrect ? "text-[#1a2341]" : "text-[#5d6580]"}>
                  {letter}. {opt}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {q.question_type === "mcq" && correctLetter ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Correct: {correctLetter}</p>
      ) : null}
      {q.question_type !== "mcq" && q.model_answer ? (
        <details className="mt-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-3 py-2 text-xs font-semibold text-[#6562f1]">
            Expected answer
            <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 text-[#8a93ad]">{q.model_answer}</p>
        </details>
      ) : null}
    </article>
  )
}

function PostGenActionsPanel({
  exam,
  questions,
  breakdown,
  displayTitle,
  durationMinutes,
  difficultyLabel,
  draftSaving,
  publishPreparing = false,
  savingToBank = false,
  allInBank = false,
  settingsOpen,
  settingsForm,
  settingsSaving,
  onToggleSettings,
  onChangeSettings,
  onSaveSettings,
  onCancelSettings,
  onPublish,
  onSaveDraft,
  onSaveToBank,
  marksStatus,
}) {
  const liveBreakdown = useMemo(() => computeQuestionBreakdown(questions), [questions])
  const summaryQuestions = liveBreakdown.totalQuestions
  const summaryMarks = liveBreakdown.totalMarks

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 text-xs text-[#5d6580] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#151d3a]">Exam summary</p>
          <button
            type="button"
            onClick={onToggleSettings}
            className="shrink-0 text-xs font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
          >
            Edit settings
          </button>
        </div>
        {settingsOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
            <label className="block text-xs">
              <span className="text-[#5d6580]">Title</span>
              <input
                value={settingsForm.title}
                onChange={(e) => onChangeSettings((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[#5d6580]">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                value={settingsForm.duration_minutes}
                onChange={(e) =>
                  onChangeSettings((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[#5d6580]">Description (optional)</span>
              <textarea
                rows={2}
                value={settingsForm.description}
                onChange={(e) => onChangeSettings((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full resize-none rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCancelSettings}
                disabled={settingsSaving}
                className="h-9 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveSettings}
                disabled={settingsSaving || !settingsForm.title.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6562f1] px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {settingsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : null}
        <dl className="mt-3 space-y-1.5">
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Title</dt>
            <dd className="max-w-[58%] truncate text-right font-medium text-[#151d3a]">
              {displayExamTitle(displayTitle || exam.title)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Duration</dt>
            <dd className="font-medium text-[#151d3a]">{durationMinutes ?? exam.duration_minutes ?? 60} min</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Difficulty</dt>
            <dd className="font-medium text-[#151d3a]">{difficultyLabel}</dd>
          </div>
        </dl>
        {marksStatus ? (
          <div className="mt-3 border-t border-[#eef1f7] pt-3">
            <p className="text-[#7f88a6]">Target: {marksStatus.target} marks</p>
            <p className="mt-1 text-[#7f88a6]">Current: {marksStatus.current} marks</p>
            <p
              className={classNames(
                "mt-1.5 font-medium",
                marksStatus.tone === "balanced" ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {marksStatus.message}
            </p>
          </div>
        ) : null}
        <p className="mt-3 border-t border-[#eef1f7] pt-3 font-semibold text-[#151d3a]">
          Total: {liveBreakdown.totalQuestions} questions - {liveBreakdown.totalMarks} pts
        </p>
      </section>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#151d3a]">Exam ready</p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          {summaryQuestions} questions - {summaryMarks} marks
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <button
              type="button"
              onClick={onPublish}
              disabled={!questions.length || publishPreparing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#5a56e2] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:bg-[#6562f1] disabled:active:scale-100"
            >
              {publishPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {publishPreparing ? "Preparing..." : "Publish Exam"}
            </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              Publishes exam and saves all questions to your bank
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={draftSaving}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-xs font-semibold text-[#313a58] shadow-sm transition-all duration-200 ease-out hover:border-[#c9c4f5] hover:bg-[#fafbff] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:border-[#e3e6ef] disabled:hover:bg-white disabled:active:scale-100"
            >
              {draftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save as Draft
            </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              Keeps exam hidden and saves all questions to your bank
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onSaveToBank}
              disabled={savingToBank || !questions.length}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-[#fafbff] text-xs font-semibold text-[#5d6580] shadow-sm transition-all duration-200 ease-out hover:border-[#c9c4f5] hover:bg-white hover:text-[#4a46d4] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:border-[#e3e6ef] disabled:hover:bg-[#fafbff] disabled:hover:text-[#5d6580] disabled:active:scale-100"
            >
              {savingToBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {savingToBank ? "Saving..." : allInBank ? "Saved to Question Bank" : "Save to Question Bank"}
              </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              {allInBank
                ? "All questions are in your bank for reuse"
                : "Saves questions only, exam stays as draft"}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
