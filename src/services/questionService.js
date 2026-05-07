/**
 * Question bank (`question_bank`) + generation from pasted text.
 *
 * Generation:
 * - If `VITE_AI_QUESTIONS_URL` is set, POST JSON there with Bearer Supabase JWT (optional hook for your backend).
 * - Otherwise uses a deterministic **mock** generator from sentence splits (no PDF/OCR — text only).
 *
 * Schema: Backend/sql/004_text_materials_question_bank.sql
 */

import { supabase } from "../lib/supabaseClient"

const TABLE = "question_bank"

const SELECT_FULL = "*, category:categories(id,title)"

function friendly(error, fallback) {
  const msg = (error?.message || "").toLowerCase()
  if (msg.includes("relation") && msg.includes("question_bank") && msg.includes("does not exist")) {
    return new Error("Missing table question_bank. Run Backend/sql/004_text_materials_question_bank.sql.")
  }
  return new Error(error?.message || fallback)
}

/**
 * Split content into usable snippets for mock questions.
 * @param {string} text
 */
function sentences(text) {
  const raw = (text || "").trim()
  if (!raw) return []
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
}

const DISTRACTORS = [
  "This concept is unrelated to the material provided.",
  "The passage explicitly rejects this interpretation.",
  "This would only apply in a different domain context.",
]

/**
 * Mock generator — ties questions to phrases from the pasted text (no external AI).
 *
 * @param {object} args
 * @param {string} args.content
 * @param {string} [args.topic]
 * @param {object} args.config
 */
export function mockGenerateQuestionsFromText({ content, topic = "General", config }) {
  const snips = sentences(content)
  const fallback = content.trim().slice(0, 280) || "Review the study material."
  const pool = snips.length ? snips : [fallback]
  const out = []
  let i = 0

  const diff = config.difficulty || "medium"
  const prefix =
    diff === "easy"
      ? "(Fundamentals) "
      : diff === "hard"
        ? "(Advanced) "
        : ""

  for (let n = 0; n < config.mcq; n += 1) {
    const anchor = pool[i % pool.length]
    i += 1
    const correct = anchor.slice(0, Math.min(anchor.length, 120))
    const opts = [
      correct,
      ...DISTRACTORS.slice(0, 3).map((d, idx) => `${d} (${idx + 1})`),
    ].slice(0, 4)
    for (let j = opts.length - 1; j > 0; j -= 1) {
      const k = Math.floor(Math.random() * (j + 1))
      ;[opts[j], opts[k]] = [opts[k], opts[j]]
    }
    out.push({
      prompt: `${prefix}Based on your notes, which option best matches this idea?\n\n"${anchor.slice(0, 160)}${anchor.length > 160 ? "…" : ""}"`,
      model_answer: correct,
      question_type: "mcq",
      difficulty: diff,
      marks: config.marksMcq ?? 2,
      topic,
      options: opts,
    })
  }

  for (let n = 0; n < config.short; n += 1) {
    const anchor = pool[i % pool.length]
    i += 1
    out.push({
      prompt: `${prefix}In 2–4 sentences, explain the following concept from your material:\n"${anchor.slice(0, 200)}${anchor.length > 200 ? "…" : ""}"`,
      model_answer: `Key idea: ${anchor.slice(0, 160)}`,
      question_type: "short",
      difficulty: diff,
      marks: config.marksShort ?? 4,
      topic,
      options: null,
    })
  }

  for (let n = 0; n < config.essay; n += 1) {
    const anchor = pool[i % pool.length]
    i += 1
    out.push({
      prompt: `${prefix}Essay: Critically discuss the themes implied by this excerpt from your notes. Structure with introduction, analysis, and conclusion.\n\n"${anchor.slice(0, 240)}${anchor.length > 240 ? "…" : ""}"`,
      model_answer: `Outline: (1) Summarize the excerpt; (2) Connect to broader concepts in "${topic}"; (3) Give one limitation or counterpoint.`,
      question_type: "essay",
      difficulty: diff,
      marks: config.marksEssay ?? 10,
      topic,
      options: null,
    })
  }

  return out
}

async function remoteGenerateIfConfigured({ content, title, categoryTitle, config }) {
  const url = import.meta.env.VITE_AI_QUESTIONS_URL
  if (!url) return null

  const { data: sess } = await supabase.auth.getSession()
  const token = sess?.session?.access_token
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      content,
      title,
      categoryTitle,
      config,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `AI endpoint failed (${res.status})`)
  }
  const json = await res.json()
  return json.questions ?? json
}

/**
 * @param {object} args
 * @param {string} args.content
 * @param {string} [args.title]
 * @param {string} [args.categoryTitle]
 * @param {string|null} [args.categoryId]
 * @param {string|null} [args.textMaterialId]
 * @param {object} args.config
 */
export async function generateQuestionsFromText(args) {
  console.log("🤖 Starting AI question generation...")
  const { content, title, categoryTitle, categoryId, textMaterialId, config } = args

  let rows
  try {
    const remote = await remoteGenerateIfConfigured({
      content,
      title,
      categoryTitle,
      config,
    })
    if (remote && Array.isArray(remote) && remote.length) {
      console.log("✅ Remote AI returned questions:", remote.length)
      rows = remote
    } else {
      console.log("📚 Generating MCQs...")
      console.log("📚 Generating short & essay items (local mock from pasted text)...")
      rows = mockGenerateQuestionsFromText({
        content,
        topic: categoryTitle || title || "Study material",
        config,
      })
      console.log("✅ Questions generated successfully:", rows.length)
    }
  } catch (e) {
    console.error("❌ Question generation failed:", e)
    throw e
  }

  console.log("💾 Saving generated questions to Question Bank...")
  const saved = await insertGeneratedQuestions({
    rows,
    categoryId,
    textMaterialId,
  })
  console.log("✅ Question Bank updated:", saved.length)
  return saved
}

export async function insertGeneratedQuestions({ rows, categoryId, textMaterialId }) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes?.user) throw new Error("You must be signed in.")

  const payload = rows.map((r) => ({
    created_by: userRes.user.id,
    category_id: categoryId ?? null,
    text_material_id: textMaterialId ?? null,
    prompt: r.prompt,
    model_answer: r.model_answer ?? null,
    question_type: r.question_type,
    difficulty: r.difficulty ?? "medium",
    marks: r.marks ?? 2,
    topic: r.topic ?? null,
    options: r.options ?? null,
  }))

  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT_FULL)
  if (error) {
    console.error("❌ Bulk insert question bank failed:", error.message)
    throw friendly(error, "Failed to save questions.")
  }
  return data ?? []
}

export async function fetchQuestionBank(opts = {}) {
  const { categoryId } = opts
  console.log("📂 Fetching question bank...", categoryId ? { categoryId } : {})

  let q = supabase.from(TABLE).select(SELECT_FULL).order("created_at", { ascending: false })
  if (categoryId) q = q.eq("category_id", categoryId)

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
  if (typeof patch.model_answer === "string") payload.model_answer = patch.model_answer
  if (typeof patch.topic === "string") payload.topic = patch.topic
  if (patch.difficulty) payload.difficulty = patch.difficulty
  if (typeof patch.marks === "number") payload.marks = patch.marks
  if (typeof patch.favorite === "boolean") payload.favorite = patch.favorite
  if (patch.options !== undefined) payload.options = patch.options

  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", id).select(SELECT_FULL).single()
  if (error) throw friendly(error, "Failed to update question.")
  return data
}

export async function deleteQuestion(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) throw friendly(error, "Failed to delete question.")
  return true
}
