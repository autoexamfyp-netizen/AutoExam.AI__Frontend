import { useEffect, useMemo, useRef, useState } from "react"
import { displayNoteTitle } from "../../components/materials/noteUtils"
import {
  computeBreakdownFromConfig,
  difficultyLabelFromCfg,
  parseCfgCount,
  validateDuration,
} from "../../utils/examConfig"
import { fetchQuestionCountsByText } from "../../services/contentService"
import {
  deleteQuestion,
  saveQuestionsToBank,
  updateQuestion,
} from "../../services/questionService"
import { unlinkQuestionFromExam, updateExam } from "../../services/examService"
import {
  buildMultiSourceReviewData,
  isMultiSourceExam,
} from "../../utils/postGenMultiSource"
import { buildQuestionPayloadFromManualForm } from "../../components/questions/ManualQuestionModal"

function cfgDurationMinutes(cfg) {
  const d = validateDuration(cfg.durationMinutes)
  return d.valid ? d.value : 60
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

function isQuestionInBank(q) {
  return q?.in_bank === true
}

export default function useGenerateExamPostGen({
  cfg,
  setCfg,
  mode,
  activeMaterial,
  MODE,
  generationCfgSnapshot,
  setGenerationCfgSnapshot,
  setError,
  setBank,
  setPicked,
  manualModal,
  resetManualModal,
  manualFormFromQuestion,
  setQuestionCounts,
  showToast,
}) {
  const [last, setLast] = useState(null) // { exam, questions }
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

  const postGenIsMultiSource = useMemo(
    () => isMultiSourceExam(postGenQuestions),
    [postGenQuestions],
  )

  const postGenMultiSource = useMemo(() => {
    if (!postGenIsMultiSource) return null
    return buildMultiSourceReviewData(postGenQuestions, last?.multiSourceCatalog || [])
  }, [postGenIsMultiSource, postGenQuestions, last?.multiSourceCatalog])

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

  const onChangePostGenContent = () => {
    setLast(null)
    setGenerationCfgSnapshot(null)
    setSettingsOpen(false)
    setInlineEditId(null)
    setInlineEditForm(null)
    setDeleteQuestionTarget(null)
    lastGeneratedExamIdRef.current = null
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
          ...prev,
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
      const nextQuestions = postGenQuestions.map((x) =>
        x.id === row.id ? { ...row, source_note_title: x.source_note_title } : x,
      )
      const patch = buildExamPatchFromQuestions(nextQuestions)
      const updatedExam = await updateExam(last.exam.id, patch)
      setLast((prev) => ({
        ...prev,
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

  return {
    last,
    setLast,
    centerFadeIn,
    settingsOpen,
    setSettingsOpen,
    examSettingsForm,
    setExamSettingsForm,
    examSettingsSaving,
    publishOpen,
    setPublishOpen,
    draftSaving,
    setDraftSaving,
    deleteQuestionTarget,
    setDeleteQuestionTarget,
    deletingQuestion,
    inlineEditId,
    setInlineEditId,
    inlineEditForm,
    setInlineEditForm,
    inlineEditSaving,
    lastGeneratedExamIdRef,
    inPostGeneration,
    postGenQuestions,
    postGenBreakdown,
    postGenDifficultyLabel,
    sourceSummary,
    postGenIsMultiSource,
    postGenMultiSource,
    postGenMarksStatus,
    postGenDisplayTitle,
    postGenDurationMinutes,
    onChangePostGenContent,
    onSaveExamSettings,
    onSaveDraft,
    onConfirmDeleteQuestion,
    startInlineEdit,
    cancelInlineEdit,
    saveInlineEdit,
    ensureExamQuestionsInBank,
    applyBankSaveToState,
    refreshMaterialQuestionCounts,
  }
}
