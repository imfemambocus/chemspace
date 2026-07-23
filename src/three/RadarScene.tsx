import { OrbitControls } from '@react-three/drei'
import type { Descriptor } from '../data/properties'
import { PropertyRadar } from './PropertyRadar'

export function RadarScene({ descriptors }: Readonly<{ descriptors: Descriptor[] }>) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 8, 6]} intensity={1.6} />
      <directionalLight position={[-6, 3, -4]} intensity={0.4} color="#88aaff" />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={5}
        maxDistance={14}
        target={[0, 1, 0]}
      />

      <PropertyRadar descriptors={descriptors} />
    </>
  )
}
