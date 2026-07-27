// The compound lives in the path (/compound/2256), mirroring the PubChem and PubChemLite
// pages the app is modeled on. Deliberately no router: the app is one page, so a path
// pattern and two history calls are cheaper than pulling a routing library into the entry
// chunk. Any host serving this must fall back to index.html for unknown paths (the Vite dev
// server does by default; see vercel.json and docker/nginx.conf for the deployed builds).

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
 * The CID the current URL points at, falling back to the default compound. Also accepts the
 * legacy `?cid=` links shared before the path form existed, so those keep resolving.
 */
export function cidFromUrl(): number {
  const fromPath = parseCid(COMPOUND_PATH.exec(window.location.pathname)?.[1] ?? null)
  const fromQuery = parseCid(new URLSearchParams(window.location.search).get('cid'))
  return fromPath ?? fromQuery ?? DEFAULT_CID
}
