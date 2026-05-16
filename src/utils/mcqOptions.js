/** MCQ helpers — four options (A–D) with one correct answer. */

export function mcqLetterFromAnswer(options, modelAnswer) {
  if (!Array.isArray(options) || !options.length) return "A"
  const answer = String(modelAnswer || "").trim().toLowerCase()
  if (!answer) return "A"
  const idx = options.findIndex((o) => String(o).trim().toLowerCase() === answer)
  return idx >= 0 ? String.fromCharCode(65 + idx) : "A"
}

export function mcqFieldsFromQuestion(q) {
  const opts = Array.isArray(q?.options) ? q.options : []
  return {
    optionA: opts[0] || "",
    optionB: opts[1] || "",
    optionC: opts[2] || "",
    optionD: opts[3] || "",
    correctLetter: mcqLetterFromAnswer(opts, q?.model_answer),
  }
}

export function mcqFieldsFromOptionsText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((x) => x.trim())
  return {
    optionA: lines[0] || "",
    optionB: lines[1] || "",
    optionC: lines[2] || "",
    optionD: lines[3] || "",
    correctLetter: "A",
  }
}

/** @returns {{ valid: boolean, error?: string, options?: string[], model_answer?: string }} */
export function validateMcqFields(form) {
  const options = [form.optionA, form.optionB, form.optionC, form.optionD].map((s) =>
    String(s ?? "").trim(),
  )
  if (options.some((o) => !o)) {
    return { valid: false, error: "All four MCQ options (A–D) are required." }
  }
  const seen = new Set()
  for (const o of options) {
    const key = o.toLowerCase()
    if (seen.has(key)) {
      return { valid: false, error: "Each MCQ option must be unique." }
    }
    seen.add(key)
  }
  const letter = String(form.correctLetter || "A").toUpperCase()
  const idx = "ABCD".indexOf(letter)
  if (idx < 0) {
    return { valid: false, error: "Select the correct option (A, B, C, or D)." }
  }
  return { valid: true, options, model_answer: options[idx] }
}

/** @returns {{ valid: boolean, error?: string, options?: string[], model_answer?: string }} */
export function validateMcqOptionsText(text, modelAnswer) {
  const fields = mcqFieldsFromOptionsText(text)
  fields.correctLetter = mcqLetterFromAnswer(
    [fields.optionA, fields.optionB, fields.optionC, fields.optionD],
    modelAnswer,
  )
  return validateMcqFields(fields)
}
