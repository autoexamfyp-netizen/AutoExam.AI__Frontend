import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  FileText,
  Library,
  ListChecks,
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
import PublishExamModal from "../../components/exam/PublishExamModal"
import { fetchCategories } from "../../services/categoryService"
import { fetchQuestionCountsByText, fetchTextMaterials } from "../../services/contentService"
import {
  createQuestion,
  deleteQuestion,
  fetchQuestionBank,
  generateQuestionsFromText,
  updateQuestion,
} from "../../services/questionService"
import {
  createExam,
  fetchExams,
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
import { displayNoteTitle, isBrokenExamTitle } from "../../components/materials/noteUtils"
import {
  computeExamTotals,
  digitsOnly,
  getCountValue,
  parseCfgCount,
  parseCfgMarks,
  validateDuration,
  validateExamConfig,
  validateTitle,
} from "../../utils/examConfig"
import { buildExamTitleFromNote, sanitizeExamTitleInput } from "../../utils/examTitle"
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

function mcqCorrectLetter(options, modelAnswer) {
  if (!Array.isArray(options) || !options.length || !modelAnswer) return null
  const idx = options.findIndex((o) => o.trim().toLowerCase() === String(modelAnswer).trim().toLowerCase())
  if (idx < 0) return null
  return String.fromCharCode(65 + idx)
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
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [error, setError] = useState("")
  const [infoNotice, setInfoNotice] = useState("")
  const [last, setLast] = useState(null) // { exam, questions }
  const [manualModal, setManualModal] = useState(null)
  const [manualForm, setManualForm] = useState(null)
  const [manualSaving, setManualSaving] = useState(false)
  const [previousExams, setPreviousExams] = useState([])
  const [previousLoading, setPreviousLoading] = useState(false)
  const [genSuccessBanner, setGenSuccessBanner] = useState("")
  const [centerFadeIn, setCenterFadeIn] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [examSettingsForm, setExamSettingsForm] = useState({ title: "", duration_minutes: 60, description: "" })
  const [examSettingsSaving, setExamSettingsSaving] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState(null)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [inlineEditId, setInlineEditId] = useState(null)
  const [inlineEditForm, setInlineEditForm] = useState(null)
  const [inlineEditSaving, setInlineEditSaving] = useState(false)
  const lastGeneratedExamIdRef = useRef(null)

  const inPostGeneration = Boolean(last?.exam)

  // ---------- LOAD: categories + content list ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡ Loading existing educational content...")
        const cats = await fetchCategories()
        if (!cancelled) setCategories(cats)
      } catch (e) {
        console.warn("ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Categories fetch failed:", e?.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPreviousLoading(true)
      try {
        console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Å¾ Loading previously generated exams...")
        const rows = await fetchExams({ limit: 8 })
        if (!cancelled) setPreviousExams(rows)
      } catch (e) {
        console.warn("ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Previous exams fetch failed:", e?.message)
      } finally {
        if (!cancelled) setPreviousLoading(false)
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
        console.log("Ã¢Å“â€¦ Content loaded successfully", { count: list.length })
      } catch (e) {
        if (!cancelled) {
          console.warn("ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â Content fetch failed:", e?.message)
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

  const visiblePreviousExams = useMemo(
    () => previousExams.filter((e) => !isBrokenExamTitle(e.title)),
    [previousExams],
  )

  const postGenQuestions = last?.questions ?? []
  const postGenBreakdown = useMemo(() => computeQuestionBreakdown(postGenQuestions), [postGenQuestions])
  const postGenDifficultyLabel = useMemo(() => {
    const d = last?.exam?.difficulty || "mixed"
    return d === "mixed" ? "Mixed" : capitalize(d)
  }, [last?.exam?.difficulty])

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
    const n = last.questions?.length || last.exam.total_questions || 0
    setGenSuccessBanner(
      `Ã¢Å“â€œ Exam generated Ã¢â‚¬â€ ${n} question${n === 1 ? "" : "s"} ready for review`,
    )
    setExamSettingsForm({
      title: last.exam.title || "",
      duration_minutes: last.exam.duration_minutes || cfgDurationMinutes(cfg),
      description: last.exam.description || "",
    })
    setSettingsOpen(false)
    setInlineEditId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
    const dismiss = setTimeout(() => setGenSuccessBanner(""), 3000)
    return () => clearTimeout(dismiss)
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
    if (!cfg.title.trim()) {
      setCfg((c) => ({ ...c, title: buildExamTitleFromNote(label) }))
    }
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
    setInfoNotice("")
    setManualModal({ mode: "add", linkToExam: Boolean(last?.exam) })
    setManualForm(emptyManualQuestionForm(categoryId || defaultManualCategoryId))
  }

  const openEditGeneratedQuestion = (q) => {
    setError("")
    setInfoNotice("")
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
          setInfoNotice("Question added to this exam.")
        } else if (mode === MODE.BANK) {
          setBank((curr) => [row, ...curr])
          setPicked((prev) => new Set([...prev, row.id]))
          setInfoNotice("Ã¢Å“â€œ Question added and selected")
        } else {
          setInfoNotice(
            'Saved to your question bank. Open Generate Exam → "From existing questions" to include them in a paper.',
          )
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
        setInfoNotice("Question updated.")
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
    setSettingsOpen(false)
    setInlineEditId(null)
    setInlineEditForm(null)
    setDeleteQuestionTarget(null)
    setGenSuccessBanner("")
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
      setInfoNotice("Exam settings updated.")
    } catch (e) {
      setError(e?.message || "Could not save exam settings.")
    } finally {
      setExamSettingsSaving(false)
    }
  }

  const onSaveDraft = async () => {
    if (!last?.exam || draftSaving) return
    setDraftSaving(true)
    setError("")
    try {
      await updateExam(last.exam.id, { status: "draft" })
      setInfoNotice("Exam saved as draft.")
    } catch (e) {
      setError(e?.message || "Could not save draft.")
    } finally {
      setDraftSaving(false)
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
        setInfoNotice("Question removed from bank.")
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

  const onGenerateQuestionsOnly = async () => {
    setError("")
    setInfoNotice("")
    if (mode === MODE.BANK) {
      setError('Question generation requires source content. Switch to "Saved content" and pick a note.')
      return
    }
    if (mode === MODE.SAVED && !activeMaterial) {
      setError("Pick a saved content item from the left first.")
      return
    }
    setSavingQuestions(true)
    try {
      const sourceTitle = activeMaterial.title
      const sourceCategoryId = activeMaterial.category_id || null
      const sourceCategoryTitle = activeMaterial.category?.title ?? null

      console.log("ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ Generating questions...", { mode, sourceTitle })
      const saved = await generateQuestionsFromText({
        content: activeMaterial.content,
        title: sourceTitle,
        categoryTitle: sourceCategoryTitle,
        categoryId: sourceCategoryId,
        textMaterialId: activeMaterial.id,
        config: {
          mcq: parseCfgCount(cfg.targetMcq) ?? 0,
          short: parseCfgCount(cfg.targetShort) ?? 0,
          essay: parseCfgCount(cfg.targetEssay) ?? 0,
          difficulty: cfg.difficulty === "mixed" ? "medium" : cfg.difficulty,
          marksMcq: parseCfgMarks(cfg.marksMcq) ?? 2,
          marksShort: parseCfgMarks(cfg.marksShort) ?? 4,
          marksEssay: parseCfgMarks(cfg.marksEssay) ?? 10,
        },
      })
      console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â¾ Saving questions to Question Bank...", { count: saved.length })
      // Show them in the right pane without persisting an exam.
      setLast({ exam: null, questions: saved })
      setQuestionCounts((m) => {
        const next = new Map(m)
        next.set(activeMaterial.id, (next.get(activeMaterial.id) || 0) + saved.length)
        return next
      })
    } catch (e) {
      console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ Failed to generate questions:", e)
      setError(e?.message || "Failed to generate questions.")
    } finally {
      setSavingQuestions(false)
    }
  }

  const onGenerateExam = async () => {
    setError("")
    setInfoNotice("")
    if (!cfg.title.trim()) {
      setError("Give the exam a title first.")
      return
    }
    if (mode !== MODE.BANK && !configValidation.hasAnyQuestion) {
      setError("Add at least one question type to generate an exam.")
      return
    }
    if (mode !== MODE.BANK && !configValidation.allValid) {
      setError("Fill in all required fields correctly before generating.")
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
        console.log("ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡ Creating exam directly from selected question bank rows...", {
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
        console.log("Ã¢Å“â€¦ Exam compiled from question bank:", exam?.id)
        setPreviousExams((curr) => [exam, ...curr.filter((e) => e.id !== exam.id)].slice(0, 8))
        navigate("/teacher-dashboard/exams")
        return
      }

      console.log("ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬â€œ Generating exam from selected content...", { apiMode })
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
          difficulty: cfg.difficulty,
          title: cfg.title.trim(),
          categoryTitle: mode === MODE.SAVED ? activeMaterial?.category?.title : null,
        },
        sourceQuestionIds: picked.size > 0 ? Array.from(picked) : undefined,
      })
      console.log("Ã¢Å“â€¦ Generated paper saved:", out?.exam?.id)
      setLast(out)
      if (out?.exam) {
        setPreviousExams((curr) => [out.exam, ...curr.filter((e) => e.id !== out.exam.id)].slice(0, 8))
      }
    } catch (e) {
      console.error("ÃƒÂ¢Ã‚ÂÃ…â€™ Failed to generate exam:", e)
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
      {infoNotice ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{infoNotice}</p>
        </div>
      ) : null}

      {genSuccessBanner ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 transition-opacity duration-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          {genSuccessBanner}
        </div>
      ) : null}

      {inPostGeneration ? (
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
              difficultyLabel={postGenDifficultyLabel}
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
            difficultyLabel={postGenDifficultyLabel}
            draftSaving={draftSaving}
            onPublish={() => setPublishOpen(true)}
            onSaveDraft={onSaveDraft}
            onSaveToBank={() => {
              setInfoNotice(
                "All exam questions are already saved. Use Generate Exam → From existing questions to include them in a paper.",
              )
            }}
            previousExams={visiblePreviousExams}
            previousLoading={previousLoading}
            onOpenPrevious={(id) => navigate(`/teacher-dashboard/exams/${id}/review`)}
          />
        </div>
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
            savingQuestions={savingQuestions}
            mode={mode}
            onGenerateExam={onGenerateExam}
            onGenerateQuestionsOnly={onGenerateQuestionsOnly}
            onAddManualQuestion={openAddManualQuestion}
            picked={picked}
            selectedBankSummary={selectedBankSummary}
          />
          {last && !last.exam ? (
            <GeneratedSummary
              data={last}
              onOpenBank={() => navigate("/teacher-dashboard/generate-exam?tab=bank")}
              onEditQuestion={openEditGeneratedQuestion}
            />
          ) : null}
          <PreviousExamsPanel
            exams={visiblePreviousExams}
            loading={previousLoading}
            onOpen={(id) => navigate(`/teacher-dashboard/exams/${id}/review`)}
          />
        </div>
      </div>
      )}

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
          onPublished={() => setPublishOpen(false)}
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
    <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
      <span className="shrink-0" aria-hidden>
        Ã¢Å¡Â 
      </span>
      <span>{message}</span>
    </p>
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
  savingQuestions,
  mode,
  onGenerateExam,
  onGenerateQuestionsOnly,
  onAddManualQuestion,
  picked,
  selectedBankSummary,
}) {
  const isBank = mode === "bank"
  const [touched, setTouched] = useState({})
  const marksMcqRef = useRef(null)
  const marksShortRef = useRef(null)
  const marksEssayRef = useRef(null)

  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }))
  const showErr = (key, error) => (touched[key] ? error : null)
  const patch = (key, val) => onChange((c) => ({ ...c, [key]: val }))

  const mcqN = validation.mcqCount.value ?? 0
  const shortN = validation.shortCount.value ?? 0
  const essayN = validation.essayCount.value ?? 0

  const handleCountChange = (countKey, marksKey, marksRef, raw) => {
    const prev = getCountValue(cfg[countKey])
    onChange((c) => {
      const nextCfg = { ...c, [countKey]: raw }
      if (getCountValue(raw) === 0) nextCfg[marksKey] = ""
      return nextCfg
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
              onChange={(v) => handleCountChange("targetMcq", "marksMcq", marksMcqRef, v)}
              onBlur={() => blurCount("targetMcq", 50)}
            />
            <NumericField
              label="Short answer questions"
              value={cfg.targetShort}
              placeholder="e.g. 3"
              error={showErr("targetShort", validation.shortCount.error)}
              valid={validation.shortCount.valid && String(cfg.targetShort).trim() !== ""}
              onChange={(v) => handleCountChange("targetShort", "marksShort", marksShortRef, v)}
              onBlur={() => blurCount("targetShort", 30)}
            />
            <NumericField
              label="Essay / Subjective questions"
              value={cfg.targetEssay}
              placeholder="e.g. 2"
              error={showErr("targetEssay", validation.essayCount.error)}
              valid={validation.essayCount.valid && String(cfg.targetEssay).trim() !== ""}
              onChange={(v) => handleCountChange("targetEssay", "marksEssay", marksEssayRef, v)}
              onBlur={() => blurCount("targetEssay", 10)}
            />
          </div>

          {validation.allocation ? (
            <p
              className={`mt-2 text-xs ${
                validation.allocation.type === "over" ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {validation.allocation.type === "remaining" ? (
                <>Ã¢Å“â€œ {validation.allocation.amount} marks remaining to allocate</>
              ) : validation.allocation.type === "balanced" ? (
                <>Ã¢Å“â€œ Marks balanced perfectly</>
              ) : (
                <>
                  Ã¢Å¡Â  {validation.allocation.amount} marks over your target ({validation.allocation.target})
                </>
              )}
            </p>
          ) : null}

          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumericField
              label="Marks per MCQ"
              value={mcqN > 0 ? cfg.marksMcq : ""}
              placeholder={mcqN > 0 ? "e.g. 2" : "Ã¢â‚¬â€"}
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
              placeholder={shortN > 0 ? "e.g. 4" : "Ã¢â‚¬â€"}
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
              placeholder={essayN > 0 ? "e.g. 10" : "Ã¢â‚¬â€"}
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
            {" Ã‚Â· "}
            <span className="font-semibold text-[#3e4768]">{totals.totalMarks} marks</span>
          </>
        ) : null}
      </p>

      {showGlobalError ? <FieldError message={validation.globalError} /> : null}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={generating || savingQuestions || !canGenerateExam}
          title={
            !canGenerateExam && !generating && !savingQuestions
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
              ? "Compiling examÃ¢â‚¬Â¦"
              : "Composing examÃ¢â‚¬Â¦"
            : isBank
              ? "Compile exam from selected"
              : "Generate exam with AI"}
        </button>
        {!isBank ? (
          <button
            type="button"
            disabled={generating || savingQuestions}
            onClick={onGenerateQuestionsOnly}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-xs font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60"
          >
            {savingQuestions ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
            {savingQuestions ? "Generating questionsÃ¢â‚¬Â¦" : "Save to Question Bank"}
          </button>
        ) : null}
        {onAddManualQuestion && !isBank ? (
          <button
            type="button"
            disabled={generating || savingQuestions}
            onClick={onAddManualQuestion}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c4f5] bg-[#fafbff] text-xs font-semibold text-[#5f4ce6] transition hover:bg-[#f1efff] disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a Question Manually
          </button>
        ) : null}
      </div>
    </section>
  )
}

function PostGenSourcePanel({ summary, onChangeContent }) {
  return (
    <aside className="flex h-[640px] flex-col rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#151d3a]">
          <span className="mr-1" aria-hidden>
            ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Å¾
          </span>
          <span className="break-words">{summary.title}</span>
        </p>
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
        Ã¢â€ Â Change content
      </button>
    </aside>
  )
}

function PostGenExamEditor({
  exam,
  questions,
  difficultyLabel,
  settingsOpen,
  settingsForm,
  settingsSaving,
  onToggleSettings,
  onChangeSettings,
  onSaveSettings,
  onCancelSettings,
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
  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const duration = exam.duration_minutes || 60

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="shrink-0 border-b border-[#eef1f7] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#151d3a]">{exam.title || "Untitled exam"}</h2>
            <p className="mt-1 text-xs text-[#7f88a6]">
              {questions.length} questions Ãƒâ€šÃ‚Â· {totalMarks} marks Ãƒâ€šÃ‚Â· {duration} min Ãƒâ€šÃ‚Â· {difficultyLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleSettings}
            className="shrink-0 rounded-xl border border-[#e3e6ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
          >
            Edit settings
          </button>
        </div>
        {settingsOpen ? (
          <div className="mt-4 space-y-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
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
          {" Ãƒâ€šÃ‚Â· "}
          <span className="rounded bg-[#f1efff] px-1.5 py-0.5 text-[#5f4ce6]">{typeLabel}</span>
          {" Ãƒâ€šÃ‚Â· "}
          {diffLabel}
          {" Ãƒâ€šÃ‚Â· "}
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
              <li key={`${letter}-${opt}`} className="flex gap-2 rounded-lg bg-[#fafbff] px-3 py-2">
                <span className="text-[#8a93ad]">{isCorrect ? "Ã¢Å“â€œ" : "Ã¢â€”â€¹"}</span>
                <span>
                  {letter}. {opt}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {q.question_type === "mcq" && correctLetter ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">Ã¢Å“â€œ Correct: {correctLetter}</p>
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
  difficultyLabel,
  draftSaving,
  onPublish,
  onSaveDraft,
  onSaveToBank,
  previousExams,
  previousLoading,
  onOpenPrevious,
}) {
  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#151d3a]">Exam ready</p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          {questions.length} questions Ãƒâ€šÃ‚Â· {totalMarks} marks
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onPublish}
            disabled={!questions.length}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Publish Exam
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={draftSaving}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-xs font-semibold text-[#313a58] transition hover:bg-[#fafbff] disabled:opacity-60"
          >
            {draftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onSaveToBank}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-[#fafbff] text-xs font-semibold text-[#5d6580] transition hover:bg-white"
          >
            Save to Question Bank
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 text-xs text-[#5d6580] shadow-sm">
        <p className="text-sm font-semibold text-[#151d3a]">Exam summary</p>
        <dl className="mt-3 space-y-1.5">
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Title</dt>
            <dd className="max-w-[58%] truncate text-right font-medium text-[#151d3a]">{exam.title}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Duration</dt>
            <dd className="font-medium text-[#151d3a]">{exam.duration_minutes || 60} min</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Difficulty</dt>
            <dd className="font-medium text-[#151d3a]">{difficultyLabel}</dd>
          </div>
          {breakdown.mcq.count > 0 ? (
            <div>
              MCQs: {breakdown.mcq.count} ÃƒÆ’Ã¢â‚¬â€ {breakdown.mcq.marksEach} pt = {breakdown.mcq.subtotal}
            </div>
          ) : null}
          {breakdown.short.count > 0 ? (
            <div>
              Short: {breakdown.short.count} ÃƒÆ’Ã¢â‚¬â€ {breakdown.short.marksEach} pt = {breakdown.short.subtotal}
            </div>
          ) : null}
          {breakdown.essay.count > 0 ? (
            <div>
              Essay: {breakdown.essay.count} ÃƒÆ’Ã¢â‚¬â€ {breakdown.essay.marksEach} pt = {breakdown.essay.subtotal}
            </div>
          ) : null}
        </dl>
        <p className="mt-3 border-t border-[#eef1f7] pt-3 font-semibold text-[#151d3a]">
          Total: {breakdown.totalQuestions} questions Ãƒâ€šÃ‚Â· {breakdown.totalMarks} pts
        </p>
      </section>

      <PreviousExamsPanel exams={previousExams} loading={previousLoading} onOpen={onOpenPrevious} />
    </div>
  )
}

function GeneratedSummary({ data, onOpenBank, onEditQuestion }) {
  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Questions added to bank
      </div>
      <p className="mt-2 text-xs text-[#7f88a6]">
        {data.questions?.length || 0} new question{data.questions?.length === 1 ? "" : "s"} ready in your bank. Edit
        any item below before compiling an exam.
      </p>

      <p className="mt-3 text-xs">
        <button
          type="button"
          onClick={onOpenBank}
          className="font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
        >
          Open in Generate Exam (from existing questions)
        </button>
      </p>

      {data.questions?.length ? (
        <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {data.questions.map((q, i) => (
            <li
              key={q.id}
              className="flex flex-col gap-2 rounded-lg border border-[#e7eaf3] bg-[#fafbff] p-2.5 text-xs sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#8a93ad]">
                  <span className="rounded bg-[#f1efff] px-1.5 py-0.5 font-semibold text-[#5f4ce6]">
                    Q{i + 1} Ãƒâ€šÃ‚Â· {q.question_type}
                  </span>
                  <span>{q.difficulty}</span>
                  <span>{q.marks} pts</span>
                </div>
                <p className="mt-1 text-[#1a2341]">{q.prompt}</p>
              </div>
              {onEditQuestion ? (
                <button
                  type="button"
                  onClick={() => onEditQuestion(q)}
                  className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-[#e3e6ef] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#313a58] hover:bg-white"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

function formatExamDate(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function PreviousExamsPanel({ exams, loading, onOpen }) {
  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <Library className="h-4 w-4 text-[#6562f1]" />
          Previously generated
        </div>
        {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#9aa3c2]" /> : null}
      </div>
      <p className="mt-1 text-xs text-[#7f88a6]">
        Open older papers for review or use them as inspiration before creating a new one.
      </p>

      <div className="mt-3 space-y-2">
        {!loading && exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dfe3ee] p-4 text-center text-xs text-[#8a93ad]">
            No exams generated yet. Your recent exams will appear here.
          </div>
        ) : null}
        {exams.map((exam, index) => {
          const title = isBrokenExamTitle(exam.title) ? "Untitled exam" : exam.title || "Untitled exam"
          const generated = formatExamDate(exam.created_at)
          return (
            <button
              key={exam.id}
              type="button"
              onClick={() => onOpen(exam.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-[#e7eaf3] bg-white p-3 text-left transition hover:border-[#cfc8ff] hover:bg-[#fafbff]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f1efff] text-xs font-bold text-[#5f4ce6]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#151d3a]">{title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#7f88a6]">
                  {exam.category?.title ? (
                    <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[#5d6580]">
                      {exam.category.title}
                    </span>
                  ) : null}
                  {generated ? <span>{generated}</span> : null}
                  <span>{exam.duration_minutes || 60} min</span>
                  <span>{exam.total_marks || 0} marks</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
