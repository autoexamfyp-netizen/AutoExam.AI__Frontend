/**
 * Teacher — review exam submissions.
 */

import { apiGet, apiPatch } from "./apiClient"

export async function fetchTeacherSubmissions(params = {}) {
  console.log("📥 Loading submissions...")
  const out = await apiGet("/api/submissions", params)
  console.log("✅ Submissions loaded:", out?.submissions?.length ?? 0)
  return out?.submissions ?? []
}

export async function fetchSubmissionDetail(id) {
  console.log("[folder] Opening submission:", id)
  const out = await apiGet(`/api/submissions/${id}`)
  console.log("✅ Submission loaded")
  return out
}

export async function gradeSubmission(id, body) {
  console.log("📝 Reviewing student answers")
  const out = await apiPatch(`/api/submissions/${id}/grade`, body)
  console.log("✅ Grades saved")
  return out?.submission
}
