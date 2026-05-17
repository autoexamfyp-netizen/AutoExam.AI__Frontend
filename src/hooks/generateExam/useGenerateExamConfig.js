import { useMemo, useState } from "react"
import {
  bankTargetMarksBalanced,
  computeExamTotals,
  validateDuration,
  validateExamConfig,
  validateTitle,
} from "../../utils/examConfig"
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

export function useCfgMode(MODE) {
  const [cfg, setCfg] = useState(() => ({ ...DEFAULTS }))
  const [mode, setMode] = useState(MODE.SAVED)
  return { cfg, setCfg, mode, setMode }
}

export function useGenerateExamConfigDerived({
  cfg,
  mode,
  activeMaterial,
  picked,
  bankSelectedMarks = 0,
  MODE,
  needsWeightageValidation,
  weightageValidation,
}) {
  const totals = useMemo(() => computeExamTotals(cfg), [cfg])
  const configValidation = useMemo(() => validateExamConfig(cfg), [cfg])

  const canGenerateExam = useMemo(() => {
    if (mode === MODE.BANK) {
      return (
        picked.size > 0 &&
        validateTitle(cfg.title).valid &&
        validateDuration(cfg.durationMinutes).valid &&
        bankTargetMarksBalanced(bankSelectedMarks, cfg.targetTotalMarks)
      )
    }
    if (mode === MODE.SAVED) {
      if (!activeMaterial) return false
      if (needsWeightageValidation && !weightageValidation.valid) return false
      if (!configValidation.allValid) return false
      return true
    }
    return false
  }, [
    mode,
    configValidation.allValid,
    activeMaterial,
    picked.size,
    cfg.title,
    cfg.durationMinutes,
    cfg.targetTotalMarks,
    bankSelectedMarks,
    needsWeightageValidation,
    weightageValidation.valid,
    MODE,
  ])

  return {
    totals,
    configValidation,
    canGenerateExam,
  }
}

export default function useGenerateExamConfig(params) {
  const { cfg, setCfg, mode, setMode } = useCfgMode(params.MODE)
  const derived = useGenerateExamConfigDerived({ ...params, cfg, mode })
  return {
    cfg,
    setCfg,
    mode,
    setMode,
    ...derived,
  }
}
