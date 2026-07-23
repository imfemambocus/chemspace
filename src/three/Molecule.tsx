import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Molecule as Mol } from '../data/molecule'
import { BOND_RADIUS, ballRadius, cpkColor, vdwRadius } from '../data/elements'
import { buildBondInstances } from './bonds'
import { useStore } from '../store'

// One InstancedMesh for all atoms and one for all bonds, so a whole molecule is two
// draw calls regardless of atom count. Molecules are small, so this is trivially fast;
// the instancing is really about keeping the door open for larger structures later.
export function Molecule({ molecule }: Readonly<{ molecule: Mol }>) {
  const style = useStore((s) => s.style)
  const atomsRef = useRef<THREE.InstancedMesh>(null!)
  const bondsRef = useRef<THREE.InstancedMesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null

  const bondInstances = useMemo(() => buildBondInstances(molecule), [molecule])

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
  }, [molecule, style, bondInstances])

  // Scale-in reveal, once per molecule. Kept separate from the camera fit so it does
  // not re-fire when `controls` becomes available on the very first load.
  useLayoutEffect(() => {
    gsap.fromTo(
      groupRef.current.scale,
      { x: 0.01, y: 0.01, z: 0.01 },
      { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.5)' },
    )
  }, [molecule])

  // Frame the camera to the molecule's bounding radius.
  useLayoutEffect(() => {
    // Distance at which the bounding sphere fits the vertical field of view, with margin.
    const fov = (camera.fov * Math.PI) / 180
    const dist = (molecule.radius / Math.sin(fov / 2)) * 1.5
    const to = new THREE.Vector3(0.4, 0.3, 1).normalize().multiplyScalar(dist)
    const onUpdate = () => controls?.update()

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
  }, [molecule, camera, controls])

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={atomsRef}
        args={[undefined, undefined, molecule.atoms.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial roughness={0.35} metalness={0.1} />
      </instancedMesh>

      <instancedMesh
        ref={bondsRef}
        args={[undefined, undefined, Math.max(bondInstances.length, 1)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial roughness={0.5} metalness={0.05} />
      </instancedMesh>
    </group>
  )
}
