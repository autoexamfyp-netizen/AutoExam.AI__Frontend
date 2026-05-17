import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { displayNoteTitle } from "../../components/materials/noteUtils"
import {
  bankTargetMarksBalanced,
  bankTargetMarksBalanceMessage,
  computeBreakdownFromConfig,
  parseCfgCount,
  parseCfgMarks,
  snapshotGenerationConfig,
} from "../../utils/examConfig"
import { validateWeightage } from "../../utils/weightageValidation"
import {
  buildSourceGenerationPlans,
  planHasQuestions,
} from "../../utils/multiSourceGeneration"
import { createExam, generateExam, updateExam } from "../../services/examService"
import { validateDuration } from "../../utils/examConfig"

function cfgDurationMinutes(cfg) {
  const d = validateDuration(cfg.durationMinutes)
  return d.valid ? d.value : 60
}

export default function useGenerateExamGeneration({
  cfg,
  mode,
  activeMaterial,
  picked,
  selectedBankQuestions,
  configValidation,
  selectedMaterials,
  weightagePercentages,
  weightageTouchedPct,
  setWeightageSubmitAttempted,
  setConfigSubmitAttempted,
  setGenerationCfgSnapshot,
  setLast,
  setError,
  MODE,
}) {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [generateProgressLabel, setGenerateProgressLabel] = useState(null)
  const [generationWarning, setGenerationWarning] = useState(null)

  const runMultiSourceGeneration = useCallback(async () => {
    const marksMcq = parseCfgMarks(cfg.marksMcq) ?? 2
    const marksShort = parseCfgMarks(cfg.marksShort) ?? 4
    const marksEssay = parseCfgMarks(cfg.marksEssay) ?? 10

    const totals = {
      targetMcq: parseCfgCount(cfg.targetMcq) ?? 0,
      targetShort: parseCfgCount(cfg.targetShort) ?? 0,
      targetEssay: parseCfgCount(cfg.targetEssay) ?? 0,
    }

    const plans = buildSourceGenerationPlans({
      materials: selectedMaterials,
      percentages: weightagePercentages,
      totals,
    }).filter(planHasQuestions)

    const mergedQuestions = []
    const failedTitles = []
    const total = plans.length

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i]
      const noteTitle = displayNoteTitle(plan.material) || plan.material.title || "Untitled"
      setGenerateProgressLabel(`Building from ${noteTitle}... (${i + 1} of ${total})`)

      try {
        const out = await generateExam({
          title: noteTitle,
          description: cfg.description.trim() || null,
          durationMinutes: cfgDurationMinutes(cfg),
          categoryId: plan.material.category_id || null,
          sourceMaterialId: plan.material.id,
          mode: "from-material",
          questionsOnly: true,
          examConfig: {
            targetMcq: plan.targetMcq,
            targetShort: plan.targetShort,
            targetEssay: plan.targetEssay,
            marksMcq,
            marksShort,
            marksEssay,
            difficulty: cfg.difficulty,
            title: cfg.title.trim(),
            categoryTitle: plan.material.category?.title || null,
          },
        })
        const batch = out?.questions ?? []
        if (!batch.length) {
          failedTitles.push(noteTitle)
          continue
        }
        const tagged = batch.map((q) => ({
          ...q,
          source_note_title: noteTitle,
          in_bank: q.in_bank === true,
        }))
        mergedQuestions.push(...tagged)
      } catch (e) {
        console.error("[error] Multi-source generation failed for:", noteTitle, e)
        failedTitles.push(noteTitle)
      }
    }

    if (!mergedQuestions.length) {
      setError(
        "Could not generate questions. Please check your content and try again.",
      )
      return
    }

    setGenerateProgressLabel("Combining all sources...")

    const categoryIds = new Set(selectedMaterials.map((m) => m.category_id).filter(Boolean))
    let exam = await createExam({
      title: cfg.title.trim(),
      description: cfg.description.trim() || null,
      durationMinutes: cfgDurationMinutes(cfg),
      categoryId: categoryIds.size === 1 ? Array.from(categoryIds)[0] : null,
      sourceMaterialId: null,
      questionIds: mergedQuestions.map((q) => q.id),
    })

    const totalMarks = mergedQuestions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
    exam = await updateExam(exam.id, {
      difficulty: cfg.difficulty,
      total_marks: totalMarks,
    })

    const snap = snapshotGenerationConfig(cfg)
    setGenerationCfgSnapshot(snap)
    setLast({
      exam: exam
        ? {
            ...exam,
            title: snap.title,
            duration_minutes: snap.durationMinutes,
            difficulty: snap.difficulty,
            total_marks: totalMarks,
          }
        : exam,
      questions: mergedQuestions,
      multiSourceCatalog: selectedMaterials.map((m) => ({
        key: displayNoteTitle(m) || m.title || "Untitled",
        title: displayNoteTitle(m) || m.title || "Untitled",
        materialId: m.id,
        chars: (m.content || "").length,
      })),
    })

    if (failedTitles.length) {
      const names =
        failedTitles.length === 1
          ? failedTitles[0]
          : failedTitles.join(", ")
      setGenerationWarning(
        `Questions from ${names} could not be generated. Your exam was built from the remaining sources.`,
      )
    }
  }, [
    cfg,
    selectedMaterials,
    weightagePercentages,
    setGenerationCfgSnapshot,
    setLast,
    setError,
  ])

  const onGenerateExam = async () => {
    setError("")
    setGenerationWarning(null)
    setConfigSubmitAttempted(true)
    const isMultiSource = mode === MODE.SAVED && selectedMaterials.length >= 2

    if (isMultiSource) {
      setWeightageSubmitAttempted(true)
      const weightageResult = validateWeightage({
        materials: selectedMaterials,
        percentages: weightagePercentages,
        submitAttempted: true,
        touchedPctIds: weightageTouchedPct,
      })
      if (!weightageResult.valid) return
    }
    if (!cfg.title.trim()) {
      setError("Please give this exam a title.")
      return
    }
    if (mode !== MODE.BANK && !isMultiSource && !configValidation.hasAnyQuestion) {
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
    if (mode === MODE.BANK) {
      const bankMarks = selectedBankQuestions.reduce(
        (sum, q) => sum + (Number(q.marks) || 0),
        0,
      )
      if (!bankTargetMarksBalanced(bankMarks, cfg.targetTotalMarks)) {
        setError(
          bankTargetMarksBalanceMessage(bankMarks, cfg.targetTotalMarks) ||
            "Selected marks must match your target total before compiling.",
        )
        return
      }
    }
    if (mode === MODE.SAVED && !activeMaterial) {
      setError("Pick a saved content item from the left first.")
      return
    }

    const apiMode = mode === MODE.BANK ? "from-bank" : "from-material"

    setGenerating(true)
    setGenerateProgressLabel(null)
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

      if (isMultiSource) {
        await runMultiSourceGeneration()
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
      setGenerateProgressLabel(null)
    }
  }

  return {
    generating,
    generateProgressLabel,
    generationWarning,
    setGenerationWarning,
    onGenerateExam,
  }
}
