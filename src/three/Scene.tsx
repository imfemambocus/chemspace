import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO } from '@react-three/postprocessing'
import type { Molecule as Mol } from '../data/molecule'
import { Molecule } from './Molecule'
import { useStore } from '../store'

export function Scene({ molecule }: Readonly<{ molecule: Mol | null }>) {
  const spin = useStore((s) => s.spin)

  return (
    <>
      {/* Transparent canvas: the card behind it provides the background gradient. */}
      {/* Key light, cool fill, and a soft ambient so nothing goes fully black. */}
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

      {/* Keyed by CID so each molecule mounts fresh with correctly-sized instance buffers. */}
      {molecule && <Molecule key={molecule.cid} molecule={molecule} />}

      {/* Postprocessing: N8AO adds contact shadows in the crevices between atoms so the
          ball-and-stick reads with real depth, and a threshold-gated bloom gives only the
          bright specular highlights a soft glow. multisampling keeps edges antialiased,
          since the composer bypasses the canvas's own MSAA. Coordinates are in Angstrom,
          so the AO radius is sized to atom/bond spacing (~1-2 A). */}
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
