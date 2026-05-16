const PLACEHOLDER_TITLES = /^category\s*select\s*category/i

const BOILERPLATE_CONTENT = [
  /pdf uploads in the files tab are for storage only/i,
  /this studio never reads files/i,
  /question generation always uses the text you paste/i,
  /questions are generated from the text you add here/i,
  /not from uploaded files/i,
]

/** Strip broken placeholder titles saved by older UI. */
export function sanitizeNoteTitle(title) {
  const t = (title || "").trim()
  if (!t || PLACEHOLDER_TITLES.test(t) || t === "Select category…" || /^category$/i.test(t)) {
    return ""
  }
  return t
}

/** Remove system disclaimer text mistaken for note body. */
export function sanitizeNoteContent(content) {
  const c = (content || "").trim()
  if (!c) return ""
  if (BOILERPLATE_CONTENT.some((re) => re.test(c))) return ""
  return content
}

export function displayNoteTitle(row) {
  const fromTitle = sanitizeNoteTitle(row?.title)
  if (fromTitle) return fromTitle
  const clean = sanitizeNoteContent(row?.content)
  const line = clean.split("\n").find((l) => l.trim())
  if (line) {
    const snippet = line.trim().slice(0, 72)
    return snippet.length < line.trim().length ? `${snippet}…` : snippet
  }
  return null
}

export function noteWordCount(content) {
  const clean = sanitizeNoteContent(content)
  if (!clean) return 0
  return clean.trim().split(/\s+/).length
}

/** Broken exam titles saved from old UI placeholders. */
export function isBrokenExamTitle(title) {
  const t = (title || "").trim()
  if (!t) return true
  return /category\s*select\s*category/i.test(t) || /select category/i.test(t)
}
