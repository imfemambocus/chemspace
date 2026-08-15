// PubChem's PUG REST serves 3D coordinates as an SDF under record_type=3d. Not every compound
// has a 3D conformer; the flat 2D layout is the fallback for those.

import { readCache, writeCache } from './cache'

export interface Atom {
  el: string
  x: number
  y: number
  z: number
}

export interface Bond {
  a: number // atom index (0-based)
  b: number
  order: number // 1 single, 2 double, 3 triple
}

export interface Molecule {
  cid: number
  atoms: Atom[]
  bonds: Bond[]
  radius: number // bounding radius from the centroid, used to frame the camera
  is3D: boolean
}

async function load(cid: number, type: '3d' | '2d', signal?: AbortSignal): Promise<Molecule> {
  const url = `/pubchem/rest/pug/compound/cid/${cid}/record/SDF?record_type=${type}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`PubChem returned ${res.status} for CID ${cid} (${type})`)
  }
  return parseSDF(await res.text(), cid, type === '3d')
}

export async function fetchMolecule(cid: number, signal?: AbortSignal): Promise<Molecule> {
  const key = `mol:${cid}`
  const hit = readCache<Molecule>(key)
  if (hit) return hit

  // an abort is the caller cancelling, not a missing conformer: do not fire the 2D fallback
  let mol: Molecule
  try {
    mol = await load(cid, '3d', signal)
  } catch (e) {
    if (signal?.aborted) throw e
    mol = await load(cid, '2d', signal)
  }
  writeCache(key, mol)
  return mol
}

// the depiction needs real layout coordinates even where a 3D conformer exists. projecting the
// 3D coordinates flat overlaps atoms, so this always pulls PubChem's own 2D drawing
export async function fetchMolecule2D(cid: number, signal?: AbortSignal): Promise<Molecule> {
  const key = `mol2d:${cid}`
  const hit = readCache<Molecule>(key)
  if (hit) return hit
  const mol = await load(cid, '2d', signal)
  writeCache(key, mol)
  return mol
}

// V2000 uses fixed-width columns, so slice by position rather than splitting on
// whitespace (adjacent 3-digit counts can run together with no separator).
export function parseSDF(sdf: string, cid: number, is3D: boolean): Molecule {
  const lines = sdf.split(/\r?\n/)
  if (lines.length < 4) throw new Error(`Empty or invalid SDF for CID ${cid}`)

  const counts = lines[3]
  const na = Number.parseInt(counts.substring(0, 3), 10)
  const nb = Number.parseInt(counts.substring(3, 6), 10)
  if (!Number.isFinite(na) || na <= 0) {
    throw new Error(`No atoms found for CID ${cid}`)
  }

  const atoms: Atom[] = []
  for (let i = 0; i < na; i++) {
    const l = lines[4 + i]
    atoms.push({
      x: Number.parseFloat(l.substring(0, 10)),
      y: Number.parseFloat(l.substring(10, 20)),
      z: Number.parseFloat(l.substring(20, 30)),
      el: l.substring(31, 34).trim(),
    })
  }

  const bonds: Bond[] = []
  for (let i = 0; i < nb; i++) {
    const l = lines[4 + na + i]
    bonds.push({
      a: Number.parseInt(l.substring(0, 3), 10) - 1,
      b: Number.parseInt(l.substring(3, 6), 10) - 1,
      order: Number.parseInt(l.substring(6, 9), 10),
    })
  }

  // centred on the centroid, which is what makes the molecule orbit about the origin
  let cx = 0
  let cy = 0
  let cz = 0
  for (const a of atoms) {
    cx += a.x
    cy += a.y
    cz += a.z
  }
  cx /= na
  cy /= na
  cz /= na

  let radius = 0
  for (const a of atoms) {
    a.x -= cx
    a.y -= cy
    a.z -= cz
    radius = Math.max(radius, Math.hypot(a.x, a.y, a.z))
  }

  return { cid, atoms, bonds, radius: Math.max(radius, 1), is3D }
}

// Molecular formula in Hill order (C, then H, then the rest alphabetically; if there
// is no carbon, everything alphabetical). Returned as parts so the UI can subscript.
export function formula(atoms: Atom[]): { el: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const a of atoms) counts[a.el] = (counts[a.el] ?? 0) + 1

  const rest = Object.keys(counts)
    .filter((el) => el !== 'C' && el !== 'H')
    .sort((a, b) => a.localeCompare(b))

  const order = counts.C ? ['C', ...(counts.H ? ['H'] : []), ...rest] : Object.keys(counts).sort((a, b) => a.localeCompare(b))

  return order.map((el) => ({ el, count: counts[el] }))
}
