/**
 * Question bank (`question_bank`) + AI generation.
 *
 * - **AI generation goes through the backend** (`POST /api/ai/generate-questions`),
 *   which talks to Gemini 1.5 Flash and inserts validated questions into Supabase.
 * - Reads/edits/deletes still go straight to Supabase (RLS scopes them to the user)
 *   so the UI stays snappy.
 *
 * Schema: `Backend/sql/004_text_materials_question_bank.sql` and
 * `Backend/sql/005_exams.sql` (for the `ai_generated` column).
 */

import { supabase } from "../lib/supabaseClient"
import { requireTeacherId } from "../lib/teacherScope"
import { apiPost } from "./apiClient"

const TABLE = "question_bank"
const SELECT_FULL = "*, category:categories(id,title)"

function friendly(error, fallback) {
  const msg = (error?.message || "").toLowerCase()
  if (msg.includes("relation") && msg.includes("question_bank") && msg.includes("does not exist")) {
    return new Error("Missing table question_bank. Run Backend/sql/004_text_materials_question_bank.sql.")
  }
  if (msg.includes("ai_generated")) {
    return new Error("Missing column question_bank.ai_generated. Run Backend/sql/005_exams.sql.")
  }
  if (msg.includes("in_bank")) {
    return new Error("Missing column question_bank.in_bank. Run Backend/sql/011_question_bank_in_bank.sql.")
  }
  return new Error(error?.message || fallback)
}

/**
 * Run AI generation on the backend.
 *
 * @param {object} args
 * @param {string} args.content
 * @param {string} [args.title]
 * @param {string} [args.categoryTitle]
 * @param {string|null} [args.categoryId]
 * @param {string|null} [args.textMaterialId]
 * @param {{ mcq:number, short:number, essay:number, difficulty:string,
 *           marksMcq?:number, marksShort?:number, marksEssay?:number }} args.config
 * @returns {Promise<Array<object>>} the rows that were saved (with category join)
 */
export async function generateQuestionsFromText(args) {
  const { content, title, categoryTitle, categoryId, textMaterialId, config } = args
  console.log("📝 Sending content for AI generation...", {
    chars: content?.length,
    title,
    categoryTitle,
  })
  console.log("⚙️ Generation Config:", config)

  try {
    console.log("📥 Receiving AI response...")
    const out = await apiPost("/api/ai/generate-questions", {
      content,
      title,
      categoryTitle,
      categoryId: categoryId ?? null,
      textMaterialId: textMaterialId ?? null,
      config,
      save: true,
    })
    console.log("✅ Questions generated successfully", { count: out.saved?.length ?? out.generated?.length })
    console.log("💾 Saving questions to Question Bank...", {
      saved: out.saved?.length,
      took_ms: out.took_ms,
    })
    return out.saved || []
  } catch (e) {
    console.error("❌ AI generation failed:", e?.message)
    throw e
  }
}

export async function fetchQuestionBank(opts = {}) {
  const { categoryId } = opts
  console.log("📂 Fetching question bank...", categoryId ? { categoryId } : {})

  const teacherId = await requireTeacherId()
  let q = supabase
    .from(TABLE)
    .select(SELECT_FULL)
    .eq("created_by", teacherId)
    .eq("in_bank", true)
    .order("created_at", { ascending: false })
  if (categoryId === "__uncategorized__") q = q.is("category_id", null)
  else if (categoryId) q = q.eq("category_id", categoryId)

  const { data, error } = await q
  if (error) {
    console.error("❌ Question bank fetch failed:", error.message)
    throw friendly(error, "Failed to load question bank.")
  }
  console.log("✅ Question bank loaded:", data?.length ?? 0)
  return data ?? []
}

export async function updateQuestion(id, patch) {
  const payload = { updated_at: new Date().toISOString() }
  if (typeof patch.prompt === "string") payload.prompt = patch.prompt
  if ("model_answer" in patch) payload.model_answer = patch.model_answer
  if ("topic" in patch) payload.topic = patch.topic
  if (patch.difficulty) payload.difficulty = patch.difficulty
  if (typeof patch.marks === "number") payload.marks = patch.marks
  if (typeof patch.favorite === "boolean") payload.favorite = patch.favorite
  if (patch.options !== undefined) payload.options = patch.options
  if (patch.question_type) payload.question_type = patch.question_type
  if (patch.category_id !== undefined) payload.category_id = patch.category_id

  const teacherId = await requireTeacherId()
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .eq("created_by", teacherId)
    .select(SELECT_FULL)
    .single()
  if (error) throw friendly(error, "Failed to update question.")
  return data
}

export async function deleteQuestion(id) {
  const teacherId = await requireTeacherId()
  const { error } = await supabase.from(TABLE).delete().eq("id", id).eq("created_by", teacherId)
  if (error) throw friendly(error, "Failed to delete question.")
  return true
}

/** Promote exam-only questions so they appear in the reusable question bank. */
export async function saveQuestionsToBank(questionIds) {
  const cleanIds = Array.from(new Set((questionIds || []).filter(Boolean)))
  if (!cleanIds.length) return []
  const teacherId = await requireTeacherId()
  const { data, error } = await supabase
    .from(TABLE)
    .update({ in_bank: true, updated_at: new Date().toISOString() })
    .in("id", cleanIds)
    .eq("created_by", teacherId)
    .select(SELECT_FULL)
  if (error) throw friendly(error, "Failed to save questions to the bank.")
  return data ?? []
}

export async function deleteQuestions(ids) {
  const cleanIds = Array.from(new Set((ids || []).filter(Boolean)))
  if (!cleanIds.length) return true
  const teacherId = await requireTeacherId()
  const { error } = await supabase.from(TABLE).delete().eq("created_by", teacherId).in("id", cleanIds)
  if (error) throw friendly(error, "Failed to delete selected questions.")
  return true
}

/** Save a manually-entered question to the bank. */
export async function createQuestion(row) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes?.user) throw new Error("You must be signed in.")
  const payload = {
    created_by: userRes.user.id,
    category_id: row.category_id ?? null,
    text_material_id: row.text_material_id ?? null,
    prompt: row.prompt,
    model_answer: row.model_answer ?? null,
    question_type: row.question_type || "short",
    difficulty: row.difficulty || "medium",
    marks: Number(row.marks) || 2,
    topic: row.topic || null,
    options: row.options ?? null,
    favorite: !!row.favorite,
    ai_generated: !!row.ai_generated,
    in_bank: row.in_bank !== false,
  }
  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT_FULL).single()
  if (error) throw friendly(error, "Failed to save question.")
  return data
}
