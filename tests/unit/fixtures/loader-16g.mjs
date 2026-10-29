// Test-only resolver (Batch 16G follow-up): like loader-16f, but the Supabase client is a stand-in that forwards to
// globalThis.__sb, so a test can decide what weather_cache_v2 and the RPC return.
export async function resolve(specifier, context, next) {
  if (/supabaseClient$/.test(specifier)) return { url: 'data:text/javascript,export const supabase = new Proxy({}, { get: (_, k) => globalThis.__sb[k] })', shortCircuit: true }
  try { return await next(specifier, context) } catch (e) {
    if (/^\.\.?\//.test(specifier)) for (const ext of ['.js', '.jsx']) { try { return await next(specifier + ext, context) } catch { /* next */ } }
    throw e
  }
}
