/**
 * Teacher — published exam scheduling (`published_exams` table).
 * All calls go through the backend with the Supabase JWT attached.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient"

export async function fetchPublishedExams(opts = {}) {
  console.log("📂 Loading published exams...")
  const out = await apiGet("/api/published-exams", opts)
  console.log("✅ Published exams loaded:", out?.published?.length ?? 0)
  return out?.published ?? []
}

export async function fetchPublishedSubmissionCounts() {
  const out = await apiGet("/api/published-exams/counts")
  return out?.counts ?? {}
}

export async function publishExam(payload) {
  console.log("[folder] Publishing exam...")
  const out = await apiPost("/api/published-exams", payload)
  console.log("✅ Exam published successfully:", out?.published?.id)
  return out?.published
}

export async function updatePublishedExam(id, patch) {
  console.log("✏️ Updating published exam:", id)
  const out = await apiPatch(`/api/published-exams/${id}`, patch)
  return out?.published
}

export async function deletePublishedExam(id) {
  await apiDelete(`/api/published-exams/${id}`)
}
