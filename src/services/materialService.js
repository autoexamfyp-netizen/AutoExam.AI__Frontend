/**
 * Material metadata service.
 *
 * Files live in Cloudinary. Metadata lives in Supabase (`materials` table).
 * Materials may optionally be linked to a `categories` row via `category_id`.
 *
 * If you see one of these errors at runtime, run the matching SQL script:
 *   - "Could not find the 'X' column of 'materials' in the schema cache"
 *       → Backend/sql/001_materials.sql  (idempotent — safe to re-run)
 *   - "infinite recursion detected in policy for relation 'courses'"
 *       → Backend/sql/002_fix_courses_recursion.sql
 *   - "Supabase is missing the 'categories' table"
 *       → Backend/sql/003_categories.sql
 *
 * The canonical schema is documented in 001_materials.sql / 003_categories.sql.
 */

import { supabase } from "../lib/supabaseClient"

const TABLE = "materials"

const REQUIRED_COLUMNS = ["uploaded_by", "title", "file_url", "public_id", "material_type"]
const OPTIONAL_COLUMNS = [
  "original_filename",
  "resource_type",
  "mime_type",
  "size_bytes",
  "category_id",
]

const SELECT_WITH_CATEGORY =
  "*, category:categories(id,title)"

function isMissingColumnError(error) {
  if (!error) return null
  const text = `${error.code || ""} ${error.message || ""}`.toLowerCase()
  if (!text.includes("schema cache")) return null
  const match = /could not find the '([^']+)' column/i.exec(error.message || "")
  return match?.[1] || null
}

function isMissingRelationError(error, name) {
  if (!error) return false
  const msg = (error.message || "").toLowerCase()
  return msg.includes("relation") && msg.includes(name) && msg.includes("does not exist")
}

function isRecursionError(error) {
  if (!error) return false
  const text = (error.message || "").toLowerCase()
  return text.includes("infinite recursion") && text.includes("policy")
}

function friendlyError(error, fallback) {
  if (isRecursionError(error)) {
    return new Error(
      "Supabase RLS error: infinite recursion in a policy. Run Backend/sql/002_fix_courses_recursion.sql.",
    )
  }
  if (isMissingRelationError(error, "categories")) {
    return new Error("Supabase is missing the 'categories' table. Run Backend/sql/003_categories.sql.")
  }
  const missing = isMissingColumnError(error)
  if (missing) {
    if (missing === "category_id") {
      return new Error(
        "Supabase is missing the 'category_id' column on materials. Run Backend/sql/003_categories.sql.",
      )
    }
    return new Error(
      `Supabase schema is missing the '${missing}' column on materials. Run Backend/sql/001_materials.sql.`,
    )
  }
  return new Error(error?.message || fallback)
}

function buildPayload(args, omit = []) {
  const full = {
    uploaded_by: args.uploadedBy,
    title: args.title,
    original_filename: args.originalFilename ?? args.title,
    file_url: args.fileUrl,
    public_id: args.publicId,
    resource_type: args.resourceType,
    material_type: args.materialType,
    mime_type: args.mimeType ?? null,
    size_bytes: args.sizeBytes ?? null,
    category_id: args.categoryId ?? null,
  }
  const out = {}
  for (const [k, v] of Object.entries(full)) {
    if (omit.includes(k)) continue
    if (REQUIRED_COLUMNS.includes(k)) {
      out[k] = v
      continue
    }
    if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

/**
 * Insert a metadata row for a freshly-uploaded Cloudinary asset.
 * Auto-retries (up to 3 times) by dropping any optional column that PostgREST
 * reports as missing from its schema cache.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.fileUrl
 * @param {string} args.publicId
 * @param {string} args.resourceType   "image" | "raw" | "video" | "auto"
 * @param {"pdf"|"image"|"video"|"other"} args.materialType
 * @param {string} [args.mimeType]
 * @param {number} [args.sizeBytes]
 * @param {string} [args.originalFilename]
 * @param {string} [args.categoryId]
 * @param {string} [args.categoryName]   For logs only
 */
export async function saveMaterial(args) {
  console.log("📤 Uploading material to category:", args.categoryName ?? "(none)")
  console.log("💾 Saving material with category ID:", args.categoryId ?? null)

  const { data: userRes, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userRes?.user) {
    console.error("❌ Supabase Save Failed: no authenticated user", userErr)
    throw new Error("You must be signed in to save materials.")
  }

  const omit = []
  let lastError = null

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const payload = buildPayload({ ...args, uploadedBy: userRes.user.id }, omit)

    const insertQuery = supabase.from(TABLE).insert(payload).select(SELECT_WITH_CATEGORY).single()
    const { data, error } = await insertQuery
    if (!error) {
      console.log("✅ Metadata Saved Successfully:", data.id)
      return data
    }

    lastError = error
    const missing = isMissingColumnError(error)
    if (missing && OPTIONAL_COLUMNS.includes(missing) && !omit.includes(missing)) {
      console.warn(`⚠️ Column '${missing}' missing on materials — retrying without it.`)
      omit.push(missing)
      continue
    }

    console.error("❌ Supabase Save Failed:", error.message)
    throw friendlyError(error, "Failed to save material metadata.")
  }

  throw friendlyError(lastError, "Failed to save material metadata after retries.")
}

/**
 * Fetch all materials owned by the current user, newest first.
 *
 * @param {object} [opts]
 * @param {string|null} [opts.categoryId]   When set, only that category.
 *                                          Pass `"__uncategorized__"` to fetch
 *                                          rows where category_id is null.
 */
export async function fetchMaterials(opts = {}) {
  const { categoryId } = opts
  console.log("📥 Fetching materials...", categoryId ? { categoryId } : {})

  let query = supabase.from(TABLE).select(SELECT_WITH_CATEGORY).order("created_at", { ascending: false })
  if (categoryId === "__uncategorized__") {
    query = query.is("category_id", null)
  } else if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query
  if (error) {
    console.error("❌ Fetch Materials Failed:", error.message)
    throw friendlyError(error, "Failed to load materials.")
  }
  console.log("✅ Materials Loaded:", data?.length ?? 0)
  return data ?? []
}

/**
 * Rename a material's title.
 *
 * @param {string} id
 * @param {string} title
 */
export async function renameMaterial(id, title) {
  console.log("✏️ Renaming material...", { id, title })
  const { data, error } = await supabase
    .from(TABLE)
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT_WITH_CATEGORY)
    .single()

  if (error) {
    console.error("❌ Rename Failed:", error.message)
    throw friendlyError(error, "Failed to rename material.")
  }
  console.log("✅ Material Renamed")
  return data
}

/**
 * Move a material to a different category (or to uncategorized if `null`).
 *
 * @param {string} id
 * @param {string|null} categoryId
 */
export async function moveMaterial(id, categoryId) {
  console.log("🔀 Moving material to category:", { id, categoryId })
  const { data, error } = await supabase
    .from(TABLE)
    .update({ category_id: categoryId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT_WITH_CATEGORY)
    .single()

  if (error) {
    console.error("❌ Move Failed:", error.message)
    throw friendlyError(error, "Failed to move material.")
  }
  console.log("✅ Material Moved")
  return data
}

/**
 * Delete a material row. Cloudinary asset cleanup is a server-side TODO.
 *
 * @param {string} id
 */
export async function deleteMaterial(id) {
  console.log("🗑️ Deleting material...", { id })
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) {
    console.error("❌ Delete Failed:", error.message)
    throw friendlyError(error, "Failed to delete material.")
  }
  console.log("✅ Material Deleted")
  return true
}
