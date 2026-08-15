// The compound lives in the path (/compound/2256), mirroring the PubChem and PubChemLite pages
// the app is modeled on. No router, deliberately: one page needs a pattern and two history
// calls, not a routing library in the entry chunk.
//
// Every host has to fall back to index.html for unknown paths. The Vite dev server does by
// default; vercel.json and docker/nginx.conf carry it for the deployed builds.

export const DEFAULT_CID = 177785841 // the C10H14N2 compound

const COMPOUND_PATH = /^\/compound\/(\d+)\/?$/

function parseCid(value: string | null): number | null {
  const n = value ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

/** The canonical path for a compound, the single source of the URL shape. */
export function compoundPath(cid: number): string {
  return `/compound/${cid}`
}

/**
 * The CID the current URL points at, falling back to the default compound. `?cid=` links are
 * accepted too: shares in that form are still in circulation.
 */
export function cidFromUrl(): number {
  const fromPath = parseCid(COMPOUND_PATH.exec(window.location.pathname)?.[1] ?? null)
  const fromQuery = parseCid(new URLSearchParams(window.location.search).get('cid'))
  return fromPath ?? fromQuery ?? DEFAULT_CID
}
