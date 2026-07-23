import { Canvas } from '@react-three/fiber'
import type { Descriptor } from '../data/properties'
import { RadarScene } from '../three/RadarScene'
import { ViewerHint } from './ViewerHint'

// The radar's WebGL half, split into its own module so three.js stays out of the entry
// chunk: ProfileSection lazy-loads this behind a placeholder while the value list (text)
// paints immediately. (Slated to become SVG per the roadmap, which drops this context.)
export function RadarCanvas({ data }: Readonly<{ data: Descriptor[] }>) {
  return (
    <>
      <Canvas camera={{ position: [0, 4, 9], fov: 42, near: 0.1, far: 100 }} dpr={[1, 2]}>
        <RadarScene descriptors={data} />
      </Canvas>
      <ViewerHint />
    </>
  )
}
