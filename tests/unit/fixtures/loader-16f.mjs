// Test-only resolver: lets Node import src files that use extensionless imports, and swaps the browser
// Supabase client for an empty stub (forFarmer.js -> mspApi.js imports it; the tile logic never calls it).
export async function resolve(specifier, context, next) {
  if (/supabaseClient$/.test(specifier)) return { url: 'data:text/javascript,export const supabase = {}', shortCircuit: true }
  try { return await next(specifier, context) } catch (e) {
    if (/^\.\.?\//.test(specifier)) for (const ext of ['.js', '.jsx']) { try { return await next(specifier + ext, context) } catch { /* next */ } }
    throw e
  }
}
