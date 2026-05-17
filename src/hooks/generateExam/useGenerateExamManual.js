import { useMemo, useState } from "react"
import {
  buildQuestionPayloadFromManualForm,
  emptyManualQuestionForm,
} from "../../components/questions/ManualQuestionModal"
import { mcqFieldsFromQuestion } from "../../utils/mcqOptions"
import {
  createQuestion,
  updateQuestion,
} from "../../services/questionService"
import {
  linkQuestionToExam,
  updateExam,
} from "../../services/examService"

function buildExamPatchFromQuestions(questions) {
  const total_marks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const diffs = new Set(questions.map((q) => (q.difficulty || "medium").toLowerCase()))
  let difficulty = "mixed"
  if (diffs.size === 1) difficulty = [...diffs][0]
  return { total_marks, difficulty }
}

export default function useGenerateExamManual({
  mode,
  activeMaterial,
  categories,
  last,
  setLast,
  bank,
  setBank,
  picked,
  setPicked,
  postGenQuestions,
  setError,
  setDeleteQuestionTarget,
  MODE,
  postGenMultiSource,
}) {
  const [manualModal, setManualModal] = useState(null)
  const [manualForm, setManualForm] = useState(null)
  const [manualSaving, setManualSaving] = useState(false)

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
          const sourceTitle = String(manualForm.source_note_title || "").trim()
          const catalogEntry = postGenMultiSource?.sources?.find((s) => s.title === sourceTitle)
          const taggedRow = {
            ...row,
            ...(sourceTitle ? { source_note_title: sourceTitle } : {}),
            ...(catalogEntry?.materialId ? { text_material_id: catalogEntry.materialId } : {}),
          }
          const nextQuestions = [...(last.questions || []), taggedRow]
          const patch = buildExamPatchFromQuestions(nextQuestions)
          const updatedExam = await updateExam(last.exam.id, patch)
          setLast((prev) => ({
            ...prev,
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
            questions: prev.questions.map((x) =>
              x.id === row.id ? { ...row, source_note_title: x.source_note_title } : x,
            ),
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

  return {
    manualModal,
    manualForm,
    manualSaving,
    openAddManualQuestion,
    openEditGeneratedQuestion,
    requestDeleteQuestion,
    closeManualModal,
    submitManualQuestion,
    resetManualModal,
    manualFormFromQuestion,
    defaultManualCategoryId,
    setManualModal,
    setManualForm,
    setManualSaving,
  }
}
