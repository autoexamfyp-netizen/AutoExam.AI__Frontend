/**
 * Category (subject folder) service.
 *
 * Schema is provisioned by Backend/sql/003_categories.sql.
 * RLS keeps every teacher's categories private to themselves.
 */

import { supabase } from "../lib/supabaseClient"

const TABLE = "categories"

function friendlyError(error, fallback) {
  const msg = (error?.message || "").toLowerCase()
  if (msg.includes("infinite recursion") && msg.includes("policy")) {
    return new Error(
      "Supabase RLS error: infinite recursion in a policy. Run Backend/sql/002_fix_courses_recursion.sql.",
    )
  }
  if (msg.includes("relation") && msg.includes("categories") && msg.includes("does not exist")) {
    return new Error("Supabase is missing the 'categories' table. Run Backend/sql/003_categories.sql.")
  }
  if (msg.includes("duplicate key") || msg.includes("unique")) {
    return new Error("A category with that title already exists.")
  }
  return new Error(error?.message || fallback)
}

/**
 * Fetch all categories owned by the current user, plus material counts.
 * Returns: [{ id, title, description, created_at, updated_at, material_count }]
 */
export async function fetchCategories() {
  console.log("📂 Fetching categories...")
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title, description, created_at, updated_at, materials(count)")
    .order("title", { ascending: true })

  if (error) {
    console.error("❌ Categories fetch failed:", error.message)
    throw friendlyError(error, "Failed to load categories.")
  }

  const rows = (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    created_at: c.created_at,
    updated_at: c.updated_at,
    material_count: Array.isArray(c.materials) ? c.materials[0]?.count ?? 0 : 0,
  }))

  console.log("✅ Categories loaded:", rows.length)
  return rows
}

/**
 * Create a new category for the current user.
 *
 * @param {{ title: string, description?: string }} args
 */
export async function createCategory({ title, description }) {
  const trimmed = title?.trim()
  if (!trimmed) throw new Error("Category title is required.")

  console.log("📁 Creating category:", trimmed)

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes?.user) {
    console.error("❌ Category creation failed: not authenticated")
    throw new Error("You must be signed in to create a category.")
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      created_by: userRes.user.id,
      title: trimmed,
      description: description?.trim() || null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("❌ Category creation failed:", error.message)
    throw friendlyError(error, "Failed to create category.")
  }

  console.log("✅ Category created:", data.id)
  return { ...data, material_count: 0 }
}

/**
 * Rename / update a category.
 *
 * @param {string} id
 * @param {{ title?: string, description?: string }} patch
 */
export async function updateCategory(id, patch) {
  console.log("✏️ Updating category:", { id, patch })
  const payload = { updated_at: new Date().toISOString() }
  if (typeof patch.title === "string") payload.title = patch.title.trim()
  if (typeof patch.description === "string") payload.description = patch.description.trim() || null

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("❌ Category update failed:", error.message)
    throw friendlyError(error, "Failed to update category.")
  }

  console.log("✅ Category updated")
  return data
}

/**
 * Delete a category. Linked materials keep their rows; their `category_id`
 * is set to NULL via the foreign key's ON DELETE SET NULL.
 *
 * @param {string} id
 */
export async function deleteCategory(id) {
  console.log("🗑️ Deleting category:", id)
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) {
    console.error("❌ Category delete failed:", error.message)
    throw friendlyError(error, "Failed to delete category.")
  }
  console.log("✅ Category deleted")
  return true
}
