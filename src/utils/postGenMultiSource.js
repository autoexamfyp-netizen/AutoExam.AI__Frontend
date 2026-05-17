/** Review-page helpers for exams built from multiple content sources. */

export function getQuestionSourceTitle(q) {
  const t = String(q?.source_note_title ?? "").trim()
  return t || null
}

/** True when two or more distinct source_note_title values exist. */
export function isMultiSourceExam(questions) {
  const titles = new Set()
  for (const q of questions || []) {
    const t = getQuestionSourceTitle(q)
    if (t) titles.add(t)
  }
  return titles.size > 1
}

/** Group questions by source in first-seen order (global question order preserved). */
export function groupQuestionsBySource(questions) {
  const order = []
  const map = new Map()

  for (const q of questions || []) {
    const key = getQuestionSourceTitle(q) || "__ungrouped__"
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key).push(q)
  }

  return order
    .filter((key) => key !== "__ungrouped__")
    .map((key) => {
      const qs = map.get(key)
      const marks = qs.reduce((s, q) => s + (Number(q.marks) || 0), 0)
      return {
        key,
        title: key,
        questions: qs,
        questionCount: qs.length,
        marks,
      }
    })
}

/**
 * @param {Array} questions
 * @param {Array<{key:string,title?:string,materialId?:string,chars?:number}>} catalog
 */
export function buildMultiSourceReviewData(questions, catalog = []) {
  const groups = groupQuestionsBySource(questions)
  const totalMarks = (questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0)

  const sources = groups.map((group) => {
    const entry =
      catalog.find((c) => c.key === group.title || c.title === group.title) || null
    const chars = entry?.chars ?? null
    const pct = totalMarks > 0 ? Math.round((group.marks / totalMarks) * 100) : 0
    return {
      ...group,
      materialId: entry?.materialId ?? null,
      chars,
      pct,
    }
  })

  return {
    sources,
    groups,
    sourceTitles: sources.map((s) => s.title),
    totalMarks,
  }
}

export function formatSourceSizeLabel(chars) {
  if (chars == null || chars <= 0) return null
  if (chars < 1500) {
    const words = Math.max(1, Math.round(chars / 5))
    return `${words.toLocaleString()} words`
  }
  return `${chars.toLocaleString()} chars`
}
