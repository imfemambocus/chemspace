// Per-element visual data. Colors follow the common CPK convention (the coloring you
// see in most molecular viewers); radii are in Angstrom to match SDF coordinates.

interface ElementInfo {
  color: string // CPK hex
  covalent: number // used to size ball-and-stick atoms
  vdw: number // used for space-filling
}

const ELEMENTS: Record<string, ElementInfo> = {
  H: { color: '#ffffff', covalent: 0.31, vdw: 1.1 },
  C: { color: '#909090', covalent: 0.76, vdw: 1.7 },
  N: { color: '#3050f8', covalent: 0.71, vdw: 1.55 },
  O: { color: '#ff0d0d', covalent: 0.66, vdw: 1.52 },
  F: { color: '#90e050', covalent: 0.57, vdw: 1.47 },
  P: { color: '#ff8000', covalent: 1.07, vdw: 1.8 },
  S: { color: '#ffff30', covalent: 1.05, vdw: 1.8 },
  Cl: { color: '#1ff01f', covalent: 1.02, vdw: 1.75 },
  Br: { color: '#a62929', covalent: 1.2, vdw: 1.85 },
  I: { color: '#940094', covalent: 1.39, vdw: 1.98 },
  B: { color: '#ffb5b5', covalent: 0.84, vdw: 1.92 },
  Si: { color: '#f0c8a0', covalent: 1.11, vdw: 2.1 },
  Na: { color: '#ab5cf2', covalent: 1.66, vdw: 2.27 },
  K: { color: '#8f40d4', covalent: 2.03, vdw: 2.75 },
  Fe: { color: '#e06633', covalent: 1.32, vdw: 2.0 },
  Zn: { color: '#7d80b0', covalent: 1.22, vdw: 2.1 },
}

const DEFAULT: ElementInfo = { color: '#ff1493', covalent: 0.75, vdw: 1.7 }

function info(el: string): ElementInfo {
  return ELEMENTS[el] ?? DEFAULT
}

export const BOND_RADIUS = 0.13

export function cpkColor(el: string): string {
  return info(el).color
}

// Ball-and-stick keeps atoms small relative to bond length so the sticks read clearly.
export function ballRadius(el: string): number {
  return info(el).covalent * 0.4
}

export function vdwRadius(el: string): number {
  return info(el).vdw
}

// A few nice-looking, reliably-3D compounds for the quick-pick chips, starting with
// the example CID from the meeting.
export interface Example {
  cid: number
  name: string
}

export const EXAMPLES: Example[] = [
  { cid: 177785841, name: 'Naphthyridine (C10H14N2)' },
  { cid: 2519, name: 'Caffeine' },
  { cid: 2244, name: 'Aspirin' },
  { cid: 3672, name: 'Ibuprofen' },
  { cid: 5793, name: 'Glucose' },
  { cid: 5288826, name: 'Morphine' },
]
