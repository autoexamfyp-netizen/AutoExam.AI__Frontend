/**
 * Teacher dashboard summary.
 *
 * Goes through the backend so the same Supabase rules apply uniformly and
 * counts are computed server-side (less data over the wire).
 */

import { apiGet } from "./apiClient"

export async function fetchTeacherDashboard() {
  console.log("📊 Loading teacher dashboard...")
  const out = await apiGet("/api/dashboard/teacher")
  console.log("✅ Dashboard loaded", out?.stats)
  return out
}

export async function fetchStudentDashboard() {
  console.log("📥 Fetching student dashboard data...")
  const out = await apiGet("/api/dashboard/student")
  console.log("✅ Dashboard data loaded")
  return out
}
