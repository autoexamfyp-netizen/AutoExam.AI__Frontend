function equalPercentages(count) {
  if (count === 2) return [50, 50]
  if (count === 3) return [34, 33, 33]
  if (count === 4) return [25, 25, 25, 25]
  const base = Math.floor(100 / count)
  const remainder = 100 - base * count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

export function buildPercentageMap(materials) {
  const splits = equalPercentages(materials.length)
  const map = {}
  materials.forEach((m, i) => {
    map[m.id] = String(splits[i])
  })
  return map
}

export function computePctTotal(materials, percentages) {
  return materials.reduce((sum, m) => sum + (Number(percentages[m.id]) || 0), 0)
}

function pctValue(raw) {
  if (raw === "" || raw === undefined || raw === null) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {object} params
 * @param {Array<{id:string}>} params.materials
 * @param {Record<string,string>} params.percentages
 * @param {boolean} [params.submitAttempted]
 * @param {Set<string>} [params.touchedPctIds]
 */
export function validateWeightage({
  materials,
  percentages,
  submitAttempted = false,
  touchedPctIds = new Set(),
}) {
  if (!materials?.length || materials.length < 2) {
    return { valid: true, tooltip: null, pct: null }
  }

  const total = computePctTotal(materials, percentages)
  let totalMessage = null
  let totalTone = "muted"
  if (total < 100) {
    totalMessage = `${100 - total}% remaining to allocate`
    totalTone = "warning"
  } else if (total > 100) {
    totalMessage = `${total - 100}% over limit. Reduce to reach 100%`
    totalTone = "warning"
  } else {
    totalMessage = "Weightage balanced perfectly"
    totalTone = "success"
  }

  const rowErrors = {}
  let hasRowError = false
  for (const m of materials) {
    const show = submitAttempted || touchedPctIds.has(m.id)
    const raw = percentages[m.id]
    const value = pctValue(raw)
    if (show && (raw === "" || raw === undefined || value < 1)) {
      rowErrors[m.id] = "Each source must have at least 1%"
      hasRowError = true
    }
  }

  const allRowsValid = materials.every((m) => pctValue(percentages[m.id]) >= 1)
  const valid = total === 100 && allRowsValid && !hasRowError

  return {
    valid,
    tooltip: valid ? null : "Adjust weightages to reach 100% before generating",
    pct: { total, totalMessage, totalTone, rowErrors },
  }
}
