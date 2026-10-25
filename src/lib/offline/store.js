// Batch 8B — where cached responses live: IndexedDB in the app, an in-memory map in node
// tests (or when IndexedDB is unavailable). Versioned schema, a total size cap with
// oldest-first eviction, and every storage error (quota included) swallowed: the cache is a
// convenience and must never break a page.
import { CACHE_CAP_BYTES, SCHEMA_VERSION } from './policy.js'

const DB_NAME = 'ks-offline'
const STORE = 'responses'

export function memoryBackend({ failPut = null } = {}) {
  const map = new Map()
  return {
    kind: 'memory',
    async get(key) { return map.get(key) || null },
    async put(entry) { if (failPut) throw failPut(); map.set(entry.key, entry) },
    async delete(key) { map.delete(key) },
    async all() { return [...map.values()] },
    async clear() { map.clear() },
  }
}

function req(r) { return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }) }

export function idbBackend() {
  let dbp = null
  const db = () => {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const open = indexedDB.open(DB_NAME, SCHEMA_VERSION)
        open.onupgradeneeded = () => {
          const d = open.result
          // A new schema version starts empty: old entries may not match the new format.
          for (const name of [...d.objectStoreNames]) d.deleteObjectStore(name)
          d.createObjectStore(STORE, { keyPath: 'key' })
        }
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
    }
    return dbp
  }
  const tx = async (mode) => (await db()).transaction(STORE, mode).objectStore(STORE)
  return {
    kind: 'indexeddb',
    async get(key) { return (await req((await tx('readonly')).get(key))) || null },
    async put(entry) { await req((await tx('readwrite')).put(entry)) },
    async delete(key) { await req((await tx('readwrite')).delete(key)) },
    async all() { return (await req((await tx('readonly')).getAll())) || [] },
    async clear() { await req((await tx('readwrite')).clear()) },
  }
}

let backend = null
export function getBackend() {
  if (!backend) backend = typeof indexedDB !== 'undefined' ? idbBackend() : memoryBackend()
  return backend
}
export function setBackend(b) { backend = b }

export async function readEntry(key) {
  try { return await getBackend().get(key) } catch { return null }
}

// Store one entry, then drop the oldest entries until the total is under the cap.
// Returns false (never throws) when storage refused it.
export async function writeEntry(entry, cap = CACHE_CAP_BYTES) {
  const b = getBackend()
  if (entry.bytes > cap) return false
  try {
    await b.put(entry)
    const all = (await b.all()).sort((x, y) => x.cachedAt - y.cachedAt)
    let total = all.reduce((n, e) => n + (e.bytes || 0), 0)
    for (const e of all) {
      if (total <= cap) break
      if (e.key === entry.key) continue
      await b.delete(e.key)
      total -= e.bytes || 0
    }
    return true
  } catch {
    return false // quota exceeded, storage disabled, private mode … the page carries on
  }
}

export async function allEntries() { try { return await getBackend().all() } catch { return [] } }
export async function clearCache() { try { await getBackend().clear() } catch { /* nothing to clear */ } }
