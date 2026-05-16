/** Sanitize exam title input — strip mojibake and non-ASCII characters. */

import { isBrokenExamTitle } from "../components/materials/noteUtils"

const MOJIBAKE_FIXES = [
  [/Ã¢â‚¬â€/g, "-"],
  [/Ã¢â‚¬â„¢/g, "'"],
  [/Ã¢â‚¬Å"/g, '"'],
  [/Ã‚Â·/g, " "],
  [/ÃƒÂ./g, ""],
  [/Â./g, ""],
  [/â€"/g, "-"],
  [/â€™/g, "'"],
]

export function sanitizeExamTitleInput(value) {
  let s = String(value ?? "")
  for (const [re, rep] of MOJIBAKE_FIXES) {
    s = s.replace(re, rep)
  }
  s = s.replace(/[^\x20-\x7E]/g, "")
  return s.replace(/\s+/g, " ").replace(/^\s+/, "")
}

export function buildExamTitleFromNote(label) {
  const clean = sanitizeExamTitleInput(label) || "Untitled note"
  return `${clean} - Exam`
}

/** Display title for exam cards and lists — replaces broken placeholders. */
export function displayExamTitle(title) {
  const t = String(title ?? "").trim()
  if (!t) return "Untitled Exam"
  if (isBrokenExamTitle(t)) return "Untitled Exam"
  if (/^category/i.test(t) || /\bselect\b/i.test(t)) return "Untitled Exam"
  return t
}

/** Map exam.status to UI label (defaults to Draft). */
export function resolveExamStatusLabel(exam) {
  const raw = String(exam?.status ?? "draft").toLowerCase()
  if (raw === "published") return "Published"
  if (raw === "closed") return "Closed"
  if (raw === "ready") return "Ready"
  return "Draft"
}

const STATUS_STYLES = {
  Draft: "bg-[#eef1f7] text-[#5d6580]",
  Ready: "bg-[#e8fbf3] text-[#1f9d67]",
  Published: "bg-[#6562f1] text-white",
  Closed: "bg-[#c94a4a] text-white",
}

export function examStatusBadgeClass(exam) {
  return STATUS_STYLES[resolveExamStatusLabel(exam)] || STATUS_STYLES.Draft
}

/** Source note line for exam cards; null when no source. */
export function formatExamSourceLabel(source) {
  const title = String(source?.title ?? "").trim()
  if (!title) return null
  return `Source: ${title} notes`
}
