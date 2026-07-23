import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Atom, Molecule as Mol } from '../data/molecule'
import { BOND_RADIUS, ballRadius, cpkColor, vdwRadius } from '../data/elements'
import { buildBondInstances } from './bonds'
import { measure } from './measure'
import { useStore } from '../store'

// matches --color-accent in index.css; the single accent used for interactive highlights
const ACCENT = '#2dd4bf'
const Y = new THREE.Vector3(0, 1, 0)

// A picked object under the pointer: an atom by its index, or a bond by its index.
type Hover = { kind: 'atom'; index: number } | { kind: 'bond'; index: number } | null

function orderName(order: number): string {
  if (order === 2) return 'double'
  if (order === 3) return 'triple'
  return 'single'
}

function bondName(mol: Mol, i: number): string {
  const b = mol.bonds[i]
  return `${mol.atoms[b.a].el}${b.a + 1}-${mol.atoms[b.b].el}${b.b + 1} · ${orderName(b.order)}`
}

// Position/orientation of a full-length cylinder spanning atoms A and B.
function bondTransform(A: Atom, B: Atom) {
  const a = new THREE.Vector3(A.x, A.y, A.z)
  const b = new THREE.Vector3(B.x, B.y, B.z)
  const dir = b.clone().sub(a)
  const length = dir.length()
  return {
    position: a.clone().lerp(b, 0.5),
    quaternion: new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()),
    length,
  }
}

// One InstancedMesh for all atoms and one for all bonds, so a whole molecule is two
// draw calls regardless of atom count. Molecules are small, so this is trivially fast;
// the instancing is really about keeping the door open for larger structures later.
export function Molecule({ molecule }: Readonly<{ molecule: Mol }>) {
  const style = useStore((s) => s.style)
  const measuring = useStore((s) => s.measure)
  const selection = useStore((s) => s.selection)
  const pickAtom = useStore((s) => s.pickAtom)
  const clearSelection = useStore((s) => s.clearSelection)

  const atomsRef = useRef<THREE.InstancedMesh>(null!)
  const bondsRef = useRef<THREE.InstancedMesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const [hover, setHover] = useState<Hover>(null)

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)

  const bondInstances = useMemo(() => buildBondInstances(molecule), [molecule])

  // atom radius for the current render style, reused by the highlight overlays
  const atomRadius = (el: string) => (style === 'spacefill' ? vdwRadius(el) : ballRadius(el))

  // A stale selection would point at the previous molecule's atoms, so reset on change.
  useEffect(() => {
    clearSelection()
    setHover(null)
  }, [molecule, clearSelection])

  // Pointer cursor over pickable atoms while measuring.
  useEffect(() => {
    gl.domElement.style.cursor = measuring && hover?.kind === 'atom' ? 'pointer' : ''
    return () => {
      gl.domElement.style.cursor = ''
    }
  }, [gl, measuring, hover])

  // Write instance matrices and colors whenever the molecule or render style changes.
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    const atoms = molecule.atoms
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]
      dummy.position.set(a.x, a.y, a.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(style === 'spacefill' ? vdwRadius(a.el) : ballRadius(a.el))
      dummy.updateMatrix()
      atomsRef.current.setMatrixAt(i, dummy.matrix)
      atomsRef.current.setColorAt(i, color.set(cpkColor(a.el)))
    }
    atomsRef.current.instanceMatrix.needsUpdate = true
    if (atomsRef.current.instanceColor) atomsRef.current.instanceColor.needsUpdate = true

    for (let i = 0; i < bondInstances.length; i++) {
      const b = bondInstances[i]
      dummy.position.copy(b.position)
      dummy.quaternion.copy(b.quaternion)
      dummy.scale.set(BOND_RADIUS, b.length, BOND_RADIUS)
      dummy.updateMatrix()
      bondsRef.current.setMatrixAt(i, dummy.matrix)
      bondsRef.current.setColorAt(i, color.set(b.color))
    }
    // Bonds are meaningless in a space-filling view, so hide them by zeroing the count.
    bondsRef.current.count = style === 'spacefill' ? 0 : bondInstances.length
    bondsRef.current.instanceMatrix.needsUpdate = true
    if (bondsRef.current.instanceColor) bondsRef.current.instanceColor.needsUpdate = true
    // These imperative buffer writes bypass the reconciler, so request a frame ourselves
    // for the molecule swap and the ball-and-stick / space-filling toggle to repaint.
    invalidate()
  }, [molecule, style, bondInstances, invalidate])

  // Scale-in reveal, once per molecule. Kept separate from the camera fit so it does
  // not re-fire when `controls` becomes available on the very first load.
  useLayoutEffect(() => {
    gsap.fromTo(
      groupRef.current.scale,
      { x: 0.01, y: 0.01, z: 0.01 },
      { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.5)', onUpdate: invalidate },
    )
  }, [molecule, invalidate])

  // Frame the camera to the molecule's bounding radius.
  useLayoutEffect(() => {
    // Distance at which the bounding sphere fits the vertical field of view, with margin.
    const fov = (camera.fov * Math.PI) / 180
    const dist = (molecule.radius / Math.sin(fov / 2)) * 1.5
    const to = new THREE.Vector3(0.4, 0.3, 1).normalize().multiplyScalar(dist)
    const onUpdate = () => {
      controls?.update()
      invalidate()
    }

    gsap.killTweensOf(camera.position)
    gsap.to(camera.position, {
      x: to.x,
      y: to.y,
      z: to.z,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate,
    })
    if (controls) {
      gsap.killTweensOf(controls.target)
      gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 0.9, ease: 'power3.out' })
    }
  }, [molecule, camera, controls, invalidate])

  // Atom picking: hover to identify (always on), click to select (only while measuring).
  const onAtomMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const i = e.instanceId
    if (i == null) return
    setHover((h) => (h?.kind === 'atom' && h.index === i ? h : { kind: 'atom', index: i }))
  }
  const onAtomOut = () => setHover((h) => (h?.kind === 'atom' ? null : h))
  const onAtomClick = (e: ThreeEvent<MouseEvent>) => {
    if (!measuring) return
    e.stopPropagation()
    if (e.instanceId != null) pickAtom(e.instanceId)
  }

  // Bond hover maps the picked half-cylinder instance back to its chemical bond.
  const onBondMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const inst = e.instanceId
    if (inst == null) return
    const bond = bondInstances[inst]?.bond
    if (bond == null) return
    setHover((h) => (h?.kind === 'bond' && h.index === bond ? h : { kind: 'bond', index: bond }))
  }
  const onBondOut = () => setHover((h) => (h?.kind === 'bond' ? null : h))

  // Hover highlight geometry, derived from the current hover target.
  const hoverAtom = hover?.kind === 'atom' ? molecule.atoms[hover.index] : null
  const hoverBond =
    hover?.kind === 'bond' && style !== 'spacefill' ? molecule.bonds[hover.index] : null
  const hoverBondT = hoverBond
    ? bondTransform(molecule.atoms[hoverBond.a], molecule.atoms[hoverBond.b])
    : null

  // Measurement overlay: the polyline through the picked atoms and its value label.
  const selPoints = useMemo(
    () => selection.map((i) => new THREE.Vector3(molecule.atoms[i].x, molecule.atoms[i].y, molecule.atoms[i].z)),
    [selection, molecule],
  )
  const result = selection.length >= 2 ? measure(molecule.atoms, selection) : null

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={atomsRef}
        args={[undefined, undefined, molecule.atoms.length]}
        frustumCulled={false}
        onPointerMove={onAtomMove}
        onPointerOut={onAtomOut}
        onClick={onAtomClick}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial roughness={0.35} metalness={0.1} />
      </instancedMesh>

      <instancedMesh
        ref={bondsRef}
        args={[undefined, undefined, Math.max(bondInstances.length, 1)]}
        frustumCulled={false}
        onPointerMove={onBondMove}
        onPointerOut={onBondOut}
      >
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial roughness={0.5} metalness={0.05} />
      </instancedMesh>

      {/* Hover: translucent accent shell over the atom, plus an identifying tooltip. */}
      {hoverAtom && (
        <>
          <mesh position={[hoverAtom.x, hoverAtom.y, hoverAtom.z]}>
            <sphereGeometry args={[atomRadius(hoverAtom.el) * 1.15, 20, 20]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <Tooltip position={[hoverAtom.x, hoverAtom.y, hoverAtom.z]} text={`${hoverAtom.el}${hover!.index + 1}`} />
        </>
      )}

      {/* Hover: accent sleeve over the bond cylinder, plus a "C1-N2 · single" tooltip. */}
      {hoverBond && hoverBondT && (
        <>
          <mesh position={hoverBondT.position} quaternion={hoverBondT.quaternion} scale={[1, hoverBondT.length, 1]}>
            <cylinderGeometry args={[BOND_RADIUS * 1.7, BOND_RADIUS * 1.7, 1, 16]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <Tooltip position={hoverBondT.position} text={bondName(molecule, hover!.index)} />
        </>
      )}

      {/* Measurement: mark each picked atom, connect them, and label the value. */}
      {selPoints.map((p, i) => (
        <mesh key={`${selection[i]}`} position={p}>
          <sphereGeometry args={[atomRadius(molecule.atoms[selection[i]].el) * 1.25, 20, 20]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
      {selPoints.length >= 2 && (
        <Line points={selPoints} color={ACCENT} lineWidth={1.5} dashed dashSize={0.16} gapSize={0.1} />
      )}
      {result && (
        <Html position={result.at} center style={{ pointerEvents: 'none' }}>
          <div className="-translate-y-6 whitespace-nowrap rounded-md border border-accent/40 bg-neutral-900/90 px-1.5 py-0.5 text-[11px] font-medium text-accent">
            {result.text}
          </div>
        </Html>
      )}
    </group>
  )
}

// Small screen-space label anchored to a point in the scene, lifted clear of the atom.
function Tooltip({ position, text }: Readonly<{ position: THREE.Vector3 | [number, number, number]; text: string }>) {
  return (
    <Html position={position} center style={{ pointerEvents: 'none' }}>
      <div className="-translate-y-6 whitespace-nowrap rounded-md border border-white/15 bg-neutral-900/90 px-1.5 py-0.5 text-[11px] font-medium text-neutral-100">
        {text}
      </div>
    </Html>
  )
}
