/**
 * Pasted text study materials (`text_materials` table).
 * Schema: Backend/sql/004_text_materials_question_bank.sql
 */

import { supabase } from "../lib/supabaseClient"

const TABLE = "text_materials"

const SELECT_FULL = "*, category:categories(id,title)"

function friendly(error, fallback) {
  const msg = (error?.message || "").toLowerCase()
  if (
    (msg.includes("relation") && msg.includes("text_materials") && msg.includes("does not exist")) ||
    (msg.includes("text_materials") && msg.includes("schema cache"))
  ) {
    return new Error(
      "Database table `text_materials` is missing or not exposed yet. In Supabase → SQL Editor, run the full script `Backend/sql/004_text_materials_question_bank.sql`, then refresh this page (the script ends with `notify pgrst, 'reload schema'`).",
    )
  }
  return new Error(error?.message || fallback)
}

/**
 * @param {object} [opts]
 * @param {string|null} [opts.categoryId]  Filter by folder.
 * @param {boolean} [opts.uncategorizedOnly]  Only rows with null category_id.
 */
export async function fetchTextMaterials(opts = {}) {
  const { categoryId, uncategorizedOnly } = opts
  console.log("📂 Fetching text materials...", opts)

  let q = supabase.from(TABLE).select(SELECT_FULL).order("updated_at", { ascending: false })
  if (uncategorizedOnly) q = q.is("category_id", null)
  else if (categoryId) q = q.eq("category_id", categoryId)

  const { data, error } = await q
  if (error) {
    console.error("❌ Text materials fetch failed:", error.message)
    throw friendly(error, "Failed to load text materials.")
  }
  console.log("✅ Text materials loaded:", data?.length ?? 0)
  return data ?? []
}

/**
 * @param {{ title: string, content: string, categoryId?: string|null }} args
 */
export async function createTextMaterial(args) {
  console.log("📝 Text content created (saving...)")
  console.log("💾 Saving text content to Supabase...")

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes?.user) throw new Error("You must be signed in.")

  const payload = {
    created_by: userRes.user.id,
    title: args.title.trim(),
    content: args.content ?? "",
    category_id: args.categoryId ?? null,
  }

  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT_FULL).single()
  if (error) {
    console.error("❌ Save text content failed:", error.message)
    throw friendly(error, "Failed to save content.")
  }
  console.log("✅ Content saved successfully:", data.id)
  return data
}

/**
 * @param {string} id
 * @param {{ title?: string, content?: string, categoryId?: string|null }} patch
 */
export async function updateTextMaterial(id, patch) {
  console.log("💾 Updating text content...", id)
  const payload = { updated_at: new Date().toISOString() }
  if (typeof patch.title === "string") payload.title = patch.title.trim()
  if (typeof patch.content === "string") payload.content = patch.content
  if ("categoryId" in patch) payload.category_id = patch.categoryId

  const { data, error } = await supabase.from(TABLE).update(payload).eq("id", id).select(SELECT_FULL).single()
  if (error) {
    console.error("❌ Update text content failed:", error.message)
    throw friendly(error, "Failed to update content.")
  }
  console.log("✅ Content updated")
  return data
}

/**
 * @param {string} id
 */
export async function deleteTextMaterial(id) {
  console.log("🗑️ Deleting content:", id)
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) {
    console.error("❌ Delete text content failed:", error.message)
    throw friendly(error, "Failed to delete content.")
  }
  console.log("✅ Text content deleted")
  return true
}

/**
 * Duplicate a text material owned by the current user. Title gets " (copy)" suffix.
 * @param {object} row  Existing row (must include title, content, category_id)
 */
export async function duplicateTextMaterial(row) {
  console.log("📑 Duplicating content:", row.id)
  const copy = await createTextMaterial({
    title: `${row.title} (copy)`,
    content: row.content ?? "",
    categoryId: row.category_id ?? null,
  })
  return copy
}

/**
 * Aggregate question_bank rows per text_material_id, returning a Map.
 * Used by the content list to show a "questions: N" pill on each card.
 *
 * @param {string[]} textMaterialIds
 * @returns {Promise<Map<string, number>>}
 */
export async function fetchQuestionCountsByText(textMaterialIds) {
  if (!textMaterialIds.length) return new Map()
  const { data, error } = await supabase
    .from("question_bank")
    .select("text_material_id")
    .in("text_material_id", textMaterialIds)

  if (error) {
    console.warn("⚠️ Could not load question counts:", error.message)
    return new Map()
  }
  const m = new Map()
  for (const r of data ?? []) {
    if (!r.text_material_id) continue
    m.set(r.text_material_id, (m.get(r.text_material_id) ?? 0) + 1)
  }
  return m
}
