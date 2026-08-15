import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO } from '@react-three/postprocessing'
import type { Molecule as Mol } from '../data/molecule'
import { Molecule } from './Molecule'
import { useStore } from '../store'

// under frameloop="demand" the auto-rotate has no permanent loop to run in. asking for a frame
// every tick is what lets drei's OrbitControls advance it; the effect kicks the first one
function SpinDriver({ spin }: Readonly<{ spin: boolean }>) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    if (spin) invalidate()
  })
  useEffect(() => {
    if (spin) invalidate()
  }, [spin, invalidate])
  return null
}

export function Scene({ molecule }: Readonly<{ molecule: Mol | null }>) {
  const spin = useStore((s) => s.spin)

  return (
    <>
      <SpinDriver spin={spin} />

      {/* the canvas is transparent. the card behind it paints the background gradient */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 8]} intensity={2.2} />
      <directionalLight position={[-8, -4, -6]} intensity={0.5} color="#88aaff" />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={spin}
        autoRotateSpeed={1.2}
        minDistance={2}
        maxDistance={200}
      />

      {/* keyed by CID: a fresh mount is what sizes the instance buffers correctly */}
      {molecule && <Molecule key={molecule.cid} molecule={molecule} />}

      {/* multisampling here because the composer bypasses the canvas's own MSAA. coordinates
          are in Angstrom, so the AO radius is sized to atom and bond spacing (~1-2 A) */}
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <N8AO aoRadius={1.6} intensity={2.2} distanceFalloff={1} halfRes />
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.6}
        />
      </EffectComposer>
    </>
  )
}
