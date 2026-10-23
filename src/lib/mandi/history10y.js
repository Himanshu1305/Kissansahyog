// Batch 15A — ten years of MONTHLY Modal prices (table mandi_monthly_history, migration 0069): the read.
// The pure functions live in history10yCalc.js (re-exported here) so they can be unit tested without a client.
import { supabase } from '../supabaseClient'
import { fetchAllPages } from './history'
import { MIN_DIVISION_MONTHS, normalizeRows, pickScope } from './history10yCalc'

export * from './history10yCalc'

// Reads the history of one commodity. Never throws: a missing table (migration not applied) or an empty table
// gives { rows: [], scope: null } and the page hides the section.
export async function fetchMonthlyHistory(commodityEn, scope = 'sagar_division') {
  const read = async (sc) => {
    const { data, error } = await fetchAllPages((from, to) => supabase
      .from('mandi_monthly_history')
      .select('month,modal_price,districts_reporting')
      .eq('commodity_en', commodityEn)
      .eq('scope', sc)
      .order('month', { ascending: true })
      .range(from, to))
    return error ? [] : normalizeRows(data)
  }
  try {
    if (scope === 'mp') return pickScope([], await read('mp'))
    const division = await read('sagar_division')
    if (division.length >= MIN_DIVISION_MONTHS) return { rows: division, scope: 'sagar_division' }
    return pickScope(division, await read('mp'))
  } catch {
    return { rows: [], scope: null }
  }
}
