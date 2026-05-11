/**
 * Student — published exams + attempts + draft autosave.
 */

import { apiGet, apiPatch, apiPost } from "./apiClient"

export async function fetchStudentExamsCatalog() {
  console.log("📚 Fetching active exams...")
  const out = await apiGet("/api/student/exams")
  console.log("✅ Active exams loaded:", out?.exams?.length ?? 0)
  return out?.exams ?? []
}

export async function startOrResumeExam(publishedId) {
  console.log("🚀 Student started exam", { publishedId })
  console.log("📝 Creating submission record")
  const out = await apiPost(`/api/student/exams/${publishedId}/start`, {})
  console.log("⏱️ Timer initialized")
  return out
}

export async function saveExamDraft(submissionId, body) {
  console.log("💾 Saving answer...")
  const out = await apiPatch(`/api/student/submissions/${submissionId}/draft`, body)
  console.log("✅ Answer saved")
  return out?.submission
}

export async function submitExam(submissionId, body = {}) {
  console.log("📤 Submitting exam...")
  const out = await apiPost(`/api/student/submissions/${submissionId}/submit`, body)
  console.log("✅ Submission completed")
  console.log("📊 Updating dashboard statistics")
  return out
}
