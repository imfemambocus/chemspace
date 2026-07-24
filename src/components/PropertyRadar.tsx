import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import type { Descriptor } from '../data/properties'

// SVG radar (spider) chart of the computed descriptors: a single translucent area whose
// vertices sit at each axis's normalized value, with an opaque border and small vertex
// dots, over a faint concentric-ring web. Single accent hue, a direct label at each axis
// so the chart needs no legend. Replaces the old WebGL radar to drop the second canvas /
// render loop; the value list beside it is the accessible view. `play` gates the reveal so
// the area holds until the first-load splash clears.

const ACCENT = '#2dd4bf'
const MAX_R = 84 // radius of the outermost (norm = 1) ring
const LABEL_R = 106 // label ring, outside the area
const RINGS = [0.25, 0.5, 0.75, 1]

// Polar to cartesian, measured from straight up and going clockwise (SVG y points down).
function polar(angle: number, r: number) {
  return { x: Math.sin(angle) * r, y: -Math.cos(angle) * r }
}

// Horizontal text anchor for a label, by the side of the center it sits on.
function labelAnchor(x: number): 'middle' | 'start' | 'end' {
  if (Math.abs(x) < 1) return 'middle'
  if (x > 0) return 'start'
  return 'end'
}

export function PropertyRadar({
  descriptors,
  play,
}: Readonly<{ descriptors: Descriptor[]; play: boolean }>) {
  const shapeRef = useRef<SVGGElement>(null)
  // a <title> (named via aria-labelledby) gives the inline SVG an accessible name without the
  // role="img" that some AT/devices handle inconsistently; the value list beside it is the detail
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

  // Reveal the filled area growing from the center (scale about the SVG origin), once the
  // splash is out of the way (`play`). Re-runs on data change, which by then is past the
  // splash. No React `style`/`transform` on the group so re-renders don't clobber GSAP.
  useLayoutEffect(() => {
    const g = shapeRef.current
    if (!g) return
    gsap.killTweensOf(g)
    if (!play) {
      gsap.set(g, { scale: 0, opacity: 0, svgOrigin: '0 0' }) // hold collapsed until the splash clears
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(g, { scale: 1, opacity: 1, svgOrigin: '0 0' })
      return
    }
    gsap.fromTo(
      g,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, svgOrigin: '0 0', duration: 0.9, ease: 'power3.out' },
    )
  }, [placed, play])

  return (
    <svg
      className="h-full w-full select-none"
      viewBox="-140 -140 280 280"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Property radar of computed molecular descriptors</title>
      {/* Radar web: faint concentric magnitude rings plus one spoke per axis. */}
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

      {/* Value area: translucent fill, opaque-ish border, dots at each vertex. */}
      <g ref={shapeRef}>
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

      {/* Direct labels at each axis: the short name over the value. */}
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
