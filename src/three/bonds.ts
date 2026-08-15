import * as THREE from 'three'
import type { Molecule } from '../data/molecule'
import { BOND_RADIUS, cpkColor } from '../data/elements'

export interface BondInstance {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  length: number
  color: string
  bond: number // index into molecule.bonds, so a picked cylinder maps back to its bond
}

const Y = new THREE.Vector3(0, 1, 0)

// aromatic and unknown draw as a single line, the same as an actual single bond
function renderedOrder(order: number): 1 | 2 | 3 {
  if (order === 2) return 2
  if (order === 3) return 3
  return 1
}

function bondOffsets(order: 1 | 2 | 3, sep: number): number[] {
  if (order === 2) return [-sep / 2, sep / 2]
  if (order === 3) return [-sep, 0, sep]
  return [0]
}

// every bond becomes two half-cylinders, each carrying the colour of the atom at its end.
// that split is the classic ball-and-stick look
export function buildBondInstances(mol: Molecule): BondInstance[] {
  const out: BondInstance[] = []
  const va = new THREE.Vector3()
  const vb = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const perp = new THREE.Vector3()
  const seed = new THREE.Vector3()

  for (let bi = 0; bi < mol.bonds.length; bi++) {
    const bond = mol.bonds[bi]
    const A = mol.atoms[bond.a]
    const B = mol.atoms[bond.b]
    if (!A || !B) continue

    va.set(A.x, A.y, A.z)
    vb.set(B.x, B.y, B.z)
    dir.subVectors(vb, va)
    const fullLen = dir.length()
    if (fullLen === 0) continue
    dir.normalize()

    const quaternion = new THREE.Quaternion().setFromUnitVectors(Y, dir)

    // any vector not parallel to the bond works as the seed for this perpendicular
    seed.set(Math.abs(dir.x) > 0.9 ? 0 : 1, Math.abs(dir.x) > 0.9 ? 1 : 0, 0)
    perp.crossVectors(dir, seed).normalize()

    const order = renderedOrder(bond.order)
    const offsets = bondOffsets(order, BOND_RADIUS * 2.6)

    const colA = cpkColor(A.el)
    const colB = cpkColor(B.el)
    const halfLen = fullLen / 2

    for (const off of offsets) {
      const ox = perp.x * off
      const oy = perp.y * off
      const oz = perp.z * off

      // half nearest A, centred a quarter along
      const pa = va.clone().addScaledVector(dir, fullLen * 0.25)
      pa.x += ox
      pa.y += oy
      pa.z += oz
      out.push({ position: pa, quaternion: quaternion.clone(), length: halfLen, color: colA, bond: bi })

      // and B, three-quarters along
      const pb = va.clone().addScaledVector(dir, fullLen * 0.75)
      pb.x += ox
      pb.y += oy
      pb.z += oz
      out.push({ position: pb, quaternion: quaternion.clone(), length: halfLen, color: colB, bond: bi })
    }
  }

  return out
}
