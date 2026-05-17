/** Shared exam configuration validation helpers (Generate Exam page). */

export function digitsOnly(raw) {
  return String(raw ?? "").replace(/\D/g, "")
}

export function parseCfgCount(val) {
  if (val === "" || val === null || val === undefined) return null
  const n = Number(String(val).trim())
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

export function parseCfgMarks(val) {
  if (val === "" || val === null || val === undefined) return null
  const n = Number(String(val).trim())
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null
  return n
}

export function parseCfgPositive(val) {
  if (val === "" || val === null || val === undefined) return null
  const n = Number(String(val).trim())
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null
  return n
}

export function getCountValue(val) {
  const trimmed = String(val ?? "").trim()
  if (!trimmed) return 0
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return 0
  return n
}

export function validateTargetTotalMarks(val) {
  const trimmed = String(val ?? "").trim()
  if (!trimmed || Number(trimmed) === 0) {
    return { valid: false, error: "Total marks must be at least 10", value: null }
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 10) {
    return { valid: false, error: "Total marks must be at least 10", value: null }
  }
  if (n > 300) return { valid: false, error: "Total marks cannot exceed 300", value: null }
  return { valid: true, value: n, error: null }
}

export function validateTitle(val) {
  const t = String(val ?? "")
  const trimmed = t.trim()
  if (!trimmed) return { valid: false, error: "Please give this exam a title." }
  if (trimmed.length < 3) return { valid: false, error: "Title must be at least 3 characters" }
  if (t.length > 80) return { valid: false, error: "Title cannot exceed 80 characters" }
  return { valid: true, error: null }
}

export function validateDuration(val) {
  const trimmed = String(val ?? "").trim()
  if (!trimmed) return { valid: false, error: "Please set a duration for this exam" }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 10) {
    return { valid: false, error: "Exam duration must be at least 10 minutes." }
  }
  if (n > 180) return { valid: false, error: "Duration cannot exceed 3 hours (180 min)" }
  return { valid: true, value: n, error: null }
}

export function validateQuestionCount(val, max, maxMessage) {
  const trimmed = String(val ?? "").trim()
  const n = trimmed === "" ? 0 : Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { valid: false, error: null, value: 0 }
  }
  if (n > max) return { valid: false, error: maxMessage, value: n }
  return { valid: true, error: null, value: n }
}

export function marksEmptyErrorForType(type) {
  if (type === "mcq") return "Marks per MCQ cannot be empty when you have questions of that type."
  if (type === "essay") return "Marks per Essay cannot be empty when you have questions of that type."
  return "Marks per Short cannot be empty when you have questions of that type."
}

export function validateMarksForCount(val, count, maxMarks, typeLabel) {
  if (count === 0) return { valid: true, error: null, disabled: true }
  const zeroMessage = marksEmptyErrorForType(typeLabel)
  const trimmed = String(val ?? "").trim()
  if (!trimmed || Number(trimmed) === 0) {
    return { valid: false, error: zeroMessage, disabled: false }
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 1) {
    return { valid: false, error: zeroMessage, disabled: false }
  }
  if (n > maxMarks) {
    return { valid: false, error: `Maximum ${maxMarks} marks allowed`, disabled: false }
  }
  return { valid: true, error: null, disabled: false }
}

export function computeExamTotals(cfg) {
  const mcq = getCountValue(cfg.targetMcq)
  const short = getCountValue(cfg.targetShort)
  const essay = getCountValue(cfg.targetEssay)

  let totalMarks = 0
  let ready = true

  if (mcq > 0) {
    const m = parseCfgMarks(cfg.marksMcq)
    if (m === null) ready = false
    else totalMarks += mcq * m
  }
  if (short > 0) {
    const m = parseCfgMarks(cfg.marksShort)
    if (m === null) ready = false
    else totalMarks += short * m
  }
  if (essay > 0) {
    const m = parseCfgMarks(cfg.marksEssay)
    if (m === null) ready = false
    else totalMarks += essay * m
  }

  const totalQuestions = mcq + short + essay
  if (totalQuestions === 0) ready = false

  return { ready, totalQuestions, totalMarks, mcq, short, essay }
}

export function computePartialMarks(cfg) {
  const mcq = getCountValue(cfg.targetMcq)
  const short = getCountValue(cfg.targetShort)
  const essay = getCountValue(cfg.targetEssay)
  let total = 0
  if (mcq > 0) total += mcq * (Number(cfg.marksMcq) || 0)
  if (short > 0) total += short * (Number(cfg.marksShort) || 0)
  if (essay > 0) total += essay * (Number(cfg.marksEssay) || 0)
  return total
}

export function validateExamConfig(cfg) {
  const target = validateTargetTotalMarks(cfg.targetTotalMarks)
  const title = validateTitle(cfg.title)
  const duration = validateDuration(cfg.durationMinutes)
  const mcqCount = validateQuestionCount(cfg.targetMcq, 50, "Maximum 50 MCQs allowed")
  const shortCount = validateQuestionCount(cfg.targetShort, 30, "Maximum 30 short answer questions allowed")
  const essayCount = validateQuestionCount(cfg.targetEssay, 10, "Maximum 10 essay questions allowed")
  const mcqN = mcqCount.value ?? 0
  const shortN = shortCount.value ?? 0
  const essayN = essayCount.value ?? 0
  const hasAnyQuestion = mcqN + shortN + essayN > 0
  const marksMcq = validateMarksForCount(cfg.marksMcq, mcqN, 20, "mcq")
  const marksShort = validateMarksForCount(cfg.marksShort, shortN, 20, "short")
  const marksEssay = validateMarksForCount(cfg.marksEssay, essayN, 50, "essay")
  const totals = computeExamTotals(cfg)

  let allocation = null
  if (target.valid && hasAnyQuestion) {
    const current = computePartialMarks(cfg)
    const diff = target.value - current
    if (diff > 0) {
      allocation = {
        type: "remaining",
        amount: diff,
        current,
        target: target.value,
        message: `Your current breakdown totals ${current} marks. You still have ${diff} marks left to allocate.`,
      }
    } else if (diff === 0) {
      allocation = { type: "balanced", current, target: target.value }
    } else {
      allocation = {
        type: "over",
        amount: -diff,
        current,
        target: target.value,
        message: `Your current breakdown totals ${current} marks which is over your target of ${target.value} marks.`,
      }
    }
  }

  const marksBalanced = !target.valid || !hasAnyQuestion || allocation?.type === "balanced"

  const blockingErrors = []
  if (!title.valid && title.error) blockingErrors.push(title.error)
  if (!duration.valid && duration.error) blockingErrors.push(duration.error)
  if (!hasAnyQuestion) {
    blockingErrors.push("Add at least one question type before generating.")
  }
  if (!marksMcq.valid && marksMcq.error) blockingErrors.push(marksMcq.error)
  if (!marksShort.valid && marksShort.error) blockingErrors.push(marksShort.error)
  if (!marksEssay.valid && marksEssay.error) blockingErrors.push(marksEssay.error)
  if (target.valid && hasAnyQuestion && totals.ready && !marksBalanced && allocation) {
    if (allocation.type === "over") blockingErrors.push(allocation.message)
    else if (allocation.type === "remaining") blockingErrors.push(allocation.message)
    else {
      blockingErrors.push(
        "Your question marks do not add up to your total. Adjust your question counts or marks per question to match.",
      )
    }
  }
  if (!target.valid && target.error) blockingErrors.push(target.error)
  if (!mcqCount.valid && mcqCount.error) blockingErrors.push(mcqCount.error)
  if (!shortCount.valid && shortCount.error) blockingErrors.push(shortCount.error)
  if (!essayCount.valid && essayCount.error) blockingErrors.push(essayCount.error)

  const allValid =
    target.valid &&
    title.valid &&
    duration.valid &&
    mcqCount.valid &&
    shortCount.valid &&
    essayCount.valid &&
    marksMcq.valid &&
    marksShort.valid &&
    marksEssay.valid &&
    hasAnyQuestion &&
    totals.ready &&
    marksBalanced

  return {
    target,
    title,
    duration,
    mcqCount,
    shortCount,
    essayCount,
    marksMcq,
    marksShort,
    marksEssay,
    hasAnyQuestion,
    allValid,
    marksBalanced,
    allocation,
    totals,
    blockingErrors,
    globalError: hasAnyQuestion ? null : "Add at least one question type before generating.",
  }
}

/** Breakdown for post-generation summary from teacher config (not AI output). */
export function computeBreakdownFromConfig(cfg) {
  const mcq = getCountValue(cfg.targetMcq)
  const short = getCountValue(cfg.targetShort)
  const essay = getCountValue(cfg.targetEssay)
  const marksMcq = parseCfgMarks(cfg.marksMcq) ?? 0
  const marksShort = parseCfgMarks(cfg.marksShort) ?? 0
  const marksEssay = parseCfgMarks(cfg.marksEssay) ?? 0
  return {
    mcq: { count: mcq, marksEach: marksMcq, subtotal: mcq * marksMcq },
    short: { count: short, marksEach: marksShort, subtotal: short * marksShort },
    essay: { count: essay, marksEach: marksEssay, subtotal: essay * marksEssay },
    totalQuestions: mcq + short + essay,
    totalMarks: mcq * marksMcq + short * marksShort + essay * marksEssay,
  }
}

export function difficultyLabelFromCfg(cfg) {
  const d = cfg?.difficulty || "mixed"
  if (d === "mixed") return "Mixed"
  return d.charAt(0).toUpperCase() + d.slice(1)
}

/** Snapshot cfg fields used for generation display. */
export function snapshotGenerationConfig(cfg) {
  const duration = validateDuration(cfg.durationMinutes)
  return {
    title: cfg.title.trim(),
    durationMinutes: duration.valid ? duration.value : parseCfgCount(cfg.durationMinutes) || 60,
    difficulty: cfg.difficulty || "mixed",
    targetMcq: String(cfg.targetMcq ?? ""),
    targetShort: String(cfg.targetShort ?? ""),
    targetEssay: String(cfg.targetEssay ?? ""),
    marksMcq: String(cfg.marksMcq ?? ""),
    marksShort: String(cfg.marksShort ?? ""),
    marksEssay: String(cfg.marksEssay ?? ""),
    targetTotalMarks: String(cfg.targetTotalMarks ?? ""),
  }
}

/** Bank tab: progress of selected question marks vs target total. */
export function computeBankMarksProgress(selectedMarks, targetMarksVal) {
  const target = parseCfgPositive(targetMarksVal)
  if (!target) return null
  const selected = Number(selectedMarks) || 0
  const diff = target - selected
  const ratio = target > 0 ? Math.min(1.15, selected / target) : 0
  const filled = Math.min(16, Math.max(0, Math.round(ratio * 16)))
  const bar = `${"█".repeat(filled)}${"░".repeat(16 - filled)}`
  let status = "under"
  if (selected > target) status = "over"
  else if (selected === target) status = "exact"
  else if (Math.abs(diff) <= 2) status = "ready"
  return { target, selected, diff, bar, status }
}

export function computeBankCompileHint(selectedMarks, targetMarksVal) {
  const target = parseCfgPositive(targetMarksVal)
  if (!target) return null
  const selected = Number(selectedMarks) || 0
  const diff = target - selected
  if (selected > target) {
    return { type: "over", message: `Selected marks (${selected}) exceed your target (${target})` }
  }
  if (diff > 5) {
    return {
      type: "under",
      message: `You're ${diff} marks short of your target. Keep selecting questions.`,
    }
  }
  if (Math.abs(diff) <= 2) {
    return { type: "ready", message: "Ready to compile — target reached" }
  }
  return null
}
