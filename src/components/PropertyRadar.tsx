import { useId, useMemo } from 'react'
import type { Descriptor } from '../data/properties'

// Plain SVG, and the reveal is a CSS animation (`.radar-shape` in index.css) rather than a
// tween. This component renders eagerly, so an animation library here would land GSAP in the
// entry chunk. One direct label per axis, which is what saves it a legend.

const ACCENT = '#2dd4bf'
const MAX_R = 84 // radius of the outermost (norm = 1) ring
const LABEL_R = 106 // label ring, outside the area
const RINGS = [0.25, 0.5, 0.75, 1]

// from straight up, clockwise. SVG y points down
function polar(angle: number, r: number) {
  return { x: Math.sin(angle) * r, y: -Math.cos(angle) * r }
}

function labelAnchor(x: number): 'middle' | 'start' | 'end' {
  if (Math.abs(x) < 1) return 'middle'
  if (x > 0) return 'start'
  return 'end'
}

export function PropertyRadar({
  descriptors,
  play,
}: Readonly<{ descriptors: Descriptor[]; play: boolean }>) {
  // named by <title> and aria-labelledby, not role="img". the value list beside it is the detail
  const titleId = useId()

  const placed = useMemo(() => {
    const n = descriptors.length
    return descriptors.map((d, i) => {
      const angle = (i / n) * Math.PI * 2
      return {
        d,
        value: polar(angle, d.norm * MAX_R), // vertex at the normalized value
        spoke: polar(angle, MAX_R),
        label: polar(angle, LABEL_R),
      }
    })
  }, [descriptors])

  const points = placed.map((p) => `${p.value.x},${p.value.y}`).join(' ')

  return (
    <svg
      className="h-full w-full select-none"
      viewBox="-140 -140 280 280"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Property radar of computed molecular descriptors</title>
      {RINGS.map((f) => (
        <circle key={f} r={f * MAX_R} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={1} />
      ))}
      {placed.map((p) => (
        <line
          key={`spoke-${p.d.key}`}
          x1={0}
          y1={0}
          x2={p.spoke.x}
          y2={p.spoke.y}
          stroke="#ffffff"
          strokeOpacity={0.05}
          strokeWidth={1}
        />
      ))}

      {/* keyed on the point set: switching compound has to remount the group and replay the grow */}
      <g key={points} className={play ? 'radar-shape radar-play' : 'radar-shape'}>
        <polygon
          points={points}
          fill={ACCENT}
          fillOpacity={0.16}
          stroke={ACCENT}
          strokeOpacity={0.9}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {placed.map((p) => (
          <circle key={p.d.key} cx={p.value.x} cy={p.value.y} r={2.6} fill={ACCENT} />
        ))}
      </g>

      {placed.map((p) => {
        const anchor = labelAnchor(p.label.x)
        return (
          <text key={p.d.key} x={p.label.x} y={p.label.y} textAnchor={anchor}>
            <tspan fontSize={11} fontWeight={500} fill="#d4d4d4">
              {p.d.short}
            </tspan>
            <tspan x={p.label.x} dy={13} fontSize={9} fill="#737373">
              {p.d.display}
              {p.d.unit ? ` ${p.d.unit}` : ''}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
