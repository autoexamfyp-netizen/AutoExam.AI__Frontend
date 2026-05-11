/**
 * Exam CRUD + AI exam composition.
 *
 * The "compose" operation calls the backend, which uses Gemini to pick the
 * best questions out of the user's existing question bank (or, optionally,
 * regenerate fresh from pasted content) and writes the exam + exam_questions.
 *
 * Schema: `Backend/sql/005_exams.sql`.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient"

export async function fetchExams(opts = {}) {
  console.log("📂 Fetching exams...", opts)
  const out = await apiGet("/api/exams", opts)
  console.log("✅ Exams loaded:", out?.exams?.length ?? 0)
  return out?.exams ?? []
}

/**
 * Subject-grouped exams for the Question Bank's "generated papers" view.
 * @returns {Promise<Array<{id: string|null, title: string, exams: object[]}>>}
 */
export async function fetchExamsGrouped() {
  console.log("📂 Loading subject-wise question bank...")
  const out = await apiGet("/api/exams/grouped")
  console.log("✅ Generated papers loaded:", out?.groups?.length ?? 0, "subjects")
  return out?.groups ?? []
}

export async function fetchExam(id) {
  console.log("📄 Opening generated paper:", id)
  const out = await apiGet(`/api/exams/${id}`)
  console.log("✅ Questions loaded successfully")
  return out
}

export async function createExam({ title, description, durationMinutes, categoryId, questionIds }) {
  console.log("💾 Creating exam manually:", { title, count: questionIds?.length })
  const out = await apiPost("/api/exams", {
    title,
    description,
    durationMinutes,
    categoryId: categoryId ?? null,
    questionIds: questionIds || [],
  })
  return out?.exam
}

/**
 * AI-compose an exam.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} [args.description]
 * @param {number} [args.durationMinutes]
 * @param {string|null} [args.categoryId]
 * @param {'from-bank'|'from-content'} [args.mode]
 * @param {string} [args.content]   required if mode === 'from-content'
 * @param {{ targetMcq:number, targetShort:number, targetEssay:number, difficulty?:string }} args.examConfig
 * @param {string[]} [args.sourceQuestionIds]  restrict bank candidates
 */
export async function generateExam(args) {
  console.log("🪄 Composing exam with AI...", args)
  const out = await apiPost("/api/ai/generate-exam", args)
  console.log("✅ Exam created:", out?.exam?.id, "questions:", out?.questions?.length)
  return out
}

export async function updateExam(id, patch) {
  const out = await apiPatch(`/api/exams/${id}`, patch)
  return out?.exam
}

export async function renameExam(id, title) {
  console.log("✏️ Renaming exam:", id)
  return updateExam(id, { title })
}

export async function duplicateExam(id, title) {
  console.log("📑 Duplicating exam:", id)
  const out = await apiPost(`/api/exams/${id}/duplicate`, { title })
  console.log("✅ Exam duplicated:", out?.exam?.id)
  return out?.exam
}

export async function deleteExam(id) {
  console.log("🗑️ Deleting exam:", id)
  await apiDelete(`/api/exams/${id}`)
  console.log("✅ Exam deleted")
  return true
}
