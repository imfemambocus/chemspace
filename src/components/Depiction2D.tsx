import { useId, useMemo } from 'react'
import type { Bond, Molecule } from '../data/molecule'
import { cpkColor } from '../data/elements'

interface Props {
  molecule: Molecule
}

// Neutral outline stroke for bonds, so the drawing reads as line art rather than
// PubChem's black-on-white sheet. Atom symbols keep their CPK color for the pop.
const BOND_STROKE = 'rgba(212, 212, 212, 0.85)'

// A lightweight 2D structural depiction drawn as inline SVG straight from the molecule's
// flat layout coordinates. Carbons stay implicit (unlabeled); heteroatoms get a CPK-colored
// symbol. There is no background, so the drawing floats on the same dark canvas as the 3D
// model. All sizes derive from the average bond length, so the SVG scales to any molecule.
export function Depiction2D({ molecule }: Readonly<Props>) {
  const geom = useMemo(() => build(molecule), [molecule])
  // a <title> (named via aria-labelledby) gives the inline SVG an accessible name without
  // the role="img" that some AT/devices handle inconsistently
  const titleId = useId()

  return (
    <svg
      viewBox={geom.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full select-none"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{`2D structural depiction of CID ${molecule.cid}`}</title>
      <g strokeLinecap="round">
        {geom.segments.map((s) => (
          <line
            key={s.id}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={BOND_STROKE}
            strokeWidth={geom.stroke}
          />
        ))}
      </g>
      {geom.labels.map((l) => (
        <text
          key={l.atom}
          x={l.x}
          y={l.y}
          fill={l.color}
          fontSize={geom.font}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {l.el}
        </text>
      ))}
    </svg>
  )
}

interface Segment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}
interface Label {
  atom: number // source atom index, used as a stable react key
  x: number
  y: number
  el: string
  color: string
}

// Turn the molecule's 2D coordinates into ready-to-render SVG segments and labels. Works
// in screen space (y flipped, since SDF y points up and SVG y points down) and derives all
// sizing from the mean bond length so any molecule fills its frame consistently.
function build(mol: Molecule) {
  // screen-space atom positions (y flipped)
  const pts = mol.atoms.map((a) => ({ x: a.x, y: -a.y }))

  const avg = meanBondLength(pts, mol)
  const stroke = avg * 0.07
  const font = avg * 0.5
  const gap = font * 0.85 // pull bonds back from a labeled atom so the symbol has clear air
  const off2 = avg * 0.075 // half-separation of a double bond's two lines
  const off3 = avg * 0.12 // outer-line offset of a triple bond

  const labeled = mol.atoms.map((a) => a.el !== 'C')

  const segments = mol.bonds.flatMap((b) => bondSegments(b, pts, labeled, gap, off2, off3))

  // carbons stay implicit; every other atom gets a CPK-colored symbol
  const labels: Label[] = mol.atoms.flatMap((a, i) =>
    labeled[i] ? [{ atom: i, x: pts[i].x, y: pts[i].y, el: a.el, color: cpkColor(a.el) }] : [],
  )

  // frame the drawing with a margin so labels near the edge are not clipped
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const pad = avg + font
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2

  return { segments, labels, stroke, font, viewBox: `${minX} ${minY} ${w} ${h}` }
}

// The 1-3 parallel line segments that draw one bond (single, double, or triple), each ends
// trimmed back from a labeled atom so the symbol has clear air. IDs are keyed off the atom
// pair so react keys stay stable without leaning on array position.
function bondSegments(
  b: Bond,
  pts: { x: number; y: number }[],
  labeled: boolean[],
  gap: number,
  off2: number,
  off3: number,
): Segment[] {
  const A = pts[b.a]
  const B = pts[b.b]
  const dx = B.x - A.x
  const dy = B.y - A.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len

  const g1 = labeled[b.a] ? Math.min(gap, len * 0.4) : 0
  const g2 = labeled[b.b] ? Math.min(gap, len * 0.4) : 0
  const base: Segment = {
    id: `${b.a}-${b.b}`,
    x1: A.x + ux * g1,
    y1: A.y + uy * g1,
    x2: B.x - ux * g2,
    y2: B.y - uy * g2,
  }

  // perpendicular unit vector, for the parallel lines of double/triple bonds
  const px = -uy
  const py = ux

  if (b.order === 2) {
    return [
      { ...shift(base, px, py, off2), id: `${b.a}-${b.b}-a` },
      { ...shift(base, px, py, -off2), id: `${b.a}-${b.b}-b` },
    ]
  }
  if (b.order === 3) {
    return [
      base,
      { ...shift(base, px, py, off3), id: `${b.a}-${b.b}-a` },
      { ...shift(base, px, py, -off3), id: `${b.a}-${b.b}-b` },
    ]
  }
  // single, or any order we don't specially draw (e.g. aromatic 4)
  return [base]
}

function shift(s: Segment, px: number, py: number, d: number): Segment {
  return { id: s.id, x1: s.x1 + px * d, y1: s.y1 + py * d, x2: s.x2 + px * d, y2: s.y2 + py * d }
}

function meanBondLength(pts: { x: number; y: number }[], mol: Molecule): number {
  if (!mol.bonds.length) return 1
  let total = 0
  for (const b of mol.bonds) {
    total += Math.hypot(pts[b.a].x - pts[b.b].x, pts[b.a].y - pts[b.b].y)
  }
  return total / mol.bonds.length || 1
}
