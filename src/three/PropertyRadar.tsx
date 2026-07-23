import { useLayoutEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import type { Descriptor } from '../data/properties'

const MAX_H = 3 // world height of a fully-saturated (norm = 1) bar
const RADIUS = 2.6 // ring the bars stand on
const FLOOR = 0.04 // minimum height so a zero value still shows a nub
const ACCENT = '#2dd4bf'

// A ring of vertical bars, one per descriptor, height encoding the normalized value.
// Single hue (magnitude, not identity) with a direct label above each bar, so the
// chart needs no legend of its own.
export function PropertyRadar({ descriptors }: Readonly<{ descriptors: Descriptor[] }>) {
  const barRefs = useRef<(THREE.Mesh | null)[]>([])

  // Radar web the bars stand on: concentric rings plus one spoke per axis, as line
  // segments in the ground (XZ) plane.
  const web = useMemo(() => {
    const pts: number[] = []
    const seg = 72
    for (const f of [0.25, 0.5, 0.75, 1]) {
      const r = f * RADIUS
      for (let s = 0; s < seg; s++) {
        const a1 = (s / seg) * Math.PI * 2
        const a2 = ((s + 1) / seg) * Math.PI * 2
        pts.push(Math.cos(a1) * r, 0, Math.sin(a1) * r, Math.cos(a2) * r, 0, Math.sin(a2) * r)
      }
    }
    for (let i = 0; i < descriptors.length; i++) {
      const a = (i / descriptors.length) * Math.PI * 2
      pts.push(0, 0, 0, Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS)
    }
    return new Float32Array(pts)
  }, [descriptors.length])

  const placed = descriptors.map((d, i) => {
    const angle = (i / descriptors.length) * Math.PI * 2
    return {
      d,
      x: Math.cos(angle) * RADIUS,
      z: Math.sin(angle) * RADIUS,
      height: FLOOR + d.norm * MAX_H,
    }
  })

  // Grow the bars from the floor with a staggered ease on mount / data change.
  useLayoutEffect(() => {
    placed.forEach((p, i) => {
      const mesh = barRefs.current[i]
      if (!mesh) return
      const proxy = { h: FLOOR }
      gsap.to(proxy, {
        h: p.height,
        duration: 0.9,
        delay: 0.05 + i * 0.07,
        ease: 'power3.out',
        onUpdate: () => {
          mesh.scale.y = proxy.h
          mesh.position.y = proxy.h / 2
        },
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptors])

  return (
    <group>
      {/* Radar web the bars sit on. */}
      <lineSegments>
        <bufferGeometry key={web.length}>
          <bufferAttribute attach="attributes-position" args={[web, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#3a3a3a" transparent opacity={0.9} />
      </lineSegments>

      {placed.map((p, i) => (
        <group key={p.d.key} position={[p.x, 0, p.z]}>
          <mesh
            ref={(m) => {
              barRefs.current[i] = m
            }}
            position={[0, FLOOR / 2, 0]}
            scale={[1, FLOOR, 1]}
          >
            <boxGeometry args={[0.36, 1, 0.36]} />
            <meshStandardMaterial
              color={ACCENT}
              emissive={ACCENT}
              emissiveIntensity={0.18}
              roughness={0.4}
              metalness={0.05}
            />
          </mesh>

          <Html
            position={[0, p.height + 0.45, 0]}
            center
            wrapperClass="pointer-events-none"
            zIndexRange={[8, 0]}
          >
            <div className="whitespace-nowrap text-center leading-tight">
              <div className="text-[11px] font-medium text-neutral-300">{p.d.short}</div>
              <div className="text-[10px] text-neutral-500">
                {p.d.display}
                {p.d.unit ? ` ${p.d.unit}` : ''}
              </div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}
