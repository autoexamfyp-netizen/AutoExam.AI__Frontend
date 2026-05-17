/**
 * Distribute `total` across materials by percentage with rounding fix
 * applied to the highest-percentage source only.
 */
export function distributeCountsByPercentage(total, materials, percentages) {
  const n = materials.length
  if (n === 0) return []
  if (total === 0) return materials.map(() => 0)

  const pcts = materials.map((m) => Number(percentages[m.id]) || 0)
  const counts = pcts.map((p) => Math.round((total * p) / 100))
  const sum = counts.reduce((a, b) => a + b, 0)
  const diff = total - sum

  if (diff !== 0) {
    let maxIdx = 0
    for (let i = 1; i < pcts.length; i++) {
      if (pcts[i] > pcts[maxIdx]) maxIdx = i
    }
    counts[maxIdx] += diff
  }

  return counts
}

/**
 * @param {object} params
 * @param {Array} params.materials
 * @param {Record<string,string>} params.percentages
 * @param {{ targetMcq:number, targetShort:number, targetEssay:number }} params.totals
 */
export function buildSourceGenerationPlans({ materials, percentages, totals }) {
  const mcqCounts = distributeCountsByPercentage(totals.targetMcq, materials, percentages)
  const shortCounts = distributeCountsByPercentage(totals.targetShort, materials, percentages)
  const essayCounts = distributeCountsByPercentage(totals.targetEssay, materials, percentages)

  return materials.map((m, i) => ({
    material: m,
    targetMcq: mcqCounts[i],
    targetShort: shortCounts[i],
    targetEssay: essayCounts[i],
  }))
}

export function planHasQuestions(plan) {
  return (plan.targetMcq || 0) + (plan.targetShort || 0) + (plan.targetEssay || 0) > 0
}
