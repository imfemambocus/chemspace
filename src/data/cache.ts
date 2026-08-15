// Two tiers: an in-memory Map for revisits within a session, sessionStorage behind it so a
// reload is still fast. No expiry, since PubChem structure and property data is static.
// Every sessionStorage call is wrapped. Private mode and quota both throw, and the memory
// tier works on its own.

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
