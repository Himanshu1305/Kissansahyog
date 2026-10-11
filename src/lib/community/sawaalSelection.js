const hasRealAnswer = (row) => [row?.answer_hi, row?.answer_en].some((answer) => typeof answer === 'string' && answer.trim())

// Featured answers lead the home feed. Recent published answers fill any remaining
// slots, so an editor does not need to feature every card just to keep the row full.
export function topUpFeaturedSawaal(featured = [], recent = [], limit = 2) {
  const selected = []
  const seen = new Set()
  for (const row of [...featured, ...recent]) {
    if (!row?.id || seen.has(row.id) || !hasRealAnswer(row)) continue
    selected.push(row)
    seen.add(row.id)
    if (selected.length >= limit) break
  }
  return selected
}
