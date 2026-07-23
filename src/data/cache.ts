// A tiny read-through cache keyed by string. An in-memory Map serves instant revisits
// within a session; sessionStorage backs it so a reload is still fast. PubChem structure
// and property data is effectively static, so entries live for the whole session with no
// expiry. sessionStorage access is wrapped: private mode or quota can throw, and the
// memory tier still works on its own.

const memory = new Map<string, unknown>()

export function readCache<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T
  try {
    const raw = sessionStorage.getItem(key)
    if (raw != null) {
      const value = JSON.parse(raw) as T
      memory.set(key, value) // promote into memory for the rest of the session
      return value
    }
  } catch {
    // sessionStorage unavailable or holding malformed JSON; fall through to a miss
  }
  return undefined
}

export function writeCache<T>(key: string, value: T): void {
  memory.set(key, value)
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage unavailable; the memory tier still serves this session
  }
}
