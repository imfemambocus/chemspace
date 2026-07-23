import * as THREE from 'three'
import type { Atom } from '../data/molecule'

// Geometry read straight off the SDF coordinates: two picked atoms give a distance,
// three give the valence angle at the middle atom, four give the dihedral (torsion)
// about the central bond. `at` is where the in-scene value label should sit.
export interface Measurement {
  kind: 'distance' | 'angle' | 'dihedral'
  label: string // the atom sequence, e.g. "C1-N2-O3"
  text: string // the formatted value, e.g. "1.421 Å" or "118.7°"
  at: THREE.Vector3
}

const vec = (a: Atom) => new THREE.Vector3(a.x, a.y, a.z)

// 1-based atom numbering, matching how SDF and chemists refer to atoms.
const name = (atoms: Atom[], i: number) => `${atoms[i].el}${i + 1}`

export function measure(atoms: Atom[], sel: number[]): Measurement | null {
  if (sel.length < 2) return null
  const label = sel.map((i) => name(atoms, i)).join('-')

  if (sel.length === 2) {
    const a = vec(atoms[sel[0]])
    const b = vec(atoms[sel[1]])
    return { kind: 'distance', label, text: `${a.distanceTo(b).toFixed(3)} Å`, at: a.clone().lerp(b, 0.5) }
  }

  if (sel.length === 3) {
    const a = vec(atoms[sel[0]])
    const b = vec(atoms[sel[1]]) // vertex
    const c = vec(atoms[sel[2]])
    const deg = THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(c.clone().sub(b)))
    return { kind: 'angle', label, text: `${deg.toFixed(1)}°`, at: b }
  }

  // dihedral about the b-c bond, via the standard atan2 of the two bond-plane normals
  const a = vec(atoms[sel[0]])
  const b = vec(atoms[sel[1]])
  const c = vec(atoms[sel[2]])
  const d = vec(atoms[sel[3]])
  const b1 = b.clone().sub(a)
  const b2 = c.clone().sub(b)
  const b3 = d.clone().sub(c)
  const n1 = b1.clone().cross(b2)
  const n2 = b2.clone().cross(b3)
  const m1 = n1.clone().cross(b2.clone().normalize())
  const deg = THREE.MathUtils.radToDeg(Math.atan2(m1.dot(n2), n1.dot(n2)))
  return { kind: 'dihedral', label, text: `${deg.toFixed(1)}°`, at: b.clone().lerp(c, 0.5) }
}
