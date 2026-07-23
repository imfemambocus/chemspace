import { Canvas } from '@react-three/fiber'
import type { Molecule } from '../data/molecule'
import { cpkColor } from '../data/elements'
import { Scene } from '../three/Scene'
import { measure } from '../three/measure'
import { ViewerHint } from './ViewerHint'
import { useStore } from '../store'

interface Props {
  molecule: Molecule | null
  loading: boolean
}

export function StructureViewer({ molecule, loading }: Readonly<Props>) {
  const style = useStore((s) => s.style)
  const setStyle = useStore((s) => s.setStyle)
  const spin = useStore((s) => s.spin)
  const toggleSpin = useStore((s) => s.toggleSpin)
  const measuring = useStore((s) => s.measure)
  const toggleMeasure = useStore((s) => s.toggleMeasure)
  const selection = useStore((s) => s.selection)
  const clearSelection = useStore((s) => s.clearSelection)

  // The live measurement doubles as the accessible, non-3D readout of the picked atoms.
  const result = molecule && selection.length >= 2 ? measure(molecule.atoms, selection) : null

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wider text-neutral-500">3D structure</span>
        <div className="flex items-center gap-2">
          {molecule && !molecule.is3D && (
            <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-[10px] text-amber-300/90">
              2D layout
            </span>
          )}
          <Segmented
            options={[
              { value: 'ballstick', label: 'Ball & stick' },
              { value: 'spacefill', label: 'Space-filling' },
            ]}
            value={style}
            onChange={(v) => setStyle(v as typeof style)}
          />
          <button
            onClick={toggleMeasure}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              measuring
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
            }`}
          >
            Measure
          </button>
          <button
            onClick={toggleSpin}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              spin
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
            }`}
          >
            Spin
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative flex-1 min-h-75 sm:min-h-105 lg:min-h-120"
        style={{ background: 'radial-gradient(circle at 50% 35%, #151515, #0a0a0a 70%)' }}
      >
        {/* Absolutely positioned so the canvas never feeds its rendered height back into
            the flex/grid sizing; the container height stays driven by content and resets
            per compound instead of sticking at the tallest one seen. */}
        <Canvas
          camera={{ position: [0, 0, 30], fov: 45, near: 0.1, far: 1000 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ position: 'absolute', inset: 0 }}
          onPointerMissed={clearSelection}
        >
          <Scene molecule={molecule} />
        </Canvas>

        {/* Measurement readout: the live value, and the accessible view of what's picked. */}
        {molecule && !loading && measuring && (
          <div className="absolute left-3 top-3 max-w-60 rounded-lg border border-white/10 bg-neutral-900/85 px-3 py-2 text-xs backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-wider text-neutral-500">Measure</span>
              <button
                onClick={clearSelection}
                disabled={!selection.length}
                className="text-neutral-400 transition hover:text-neutral-100 disabled:opacity-40"
              >
                Clear
              </button>
            </div>
            {result ? (
              <div className="mt-1.5">
                <span className="identifier text-neutral-400">{result.label}</span>
                <span className="ml-2 font-medium text-accent">{result.text}</span>
              </div>
            ) : (
              <p className="mt-1.5 leading-relaxed text-neutral-500">
                Click atoms: two for a distance, three for an angle, four for a torsion.
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse text-sm text-neutral-500">Loading structure…</span>
          </div>
        )}

        {/* Element legend */}
        {molecule && !loading && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1">
            {uniqueElements(molecule).map(({ el, count }) => (
              <span key={el} className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/15"
                  style={{ background: cpkColor(el) }}
                />
                {el}
                <span className="text-neutral-600">{count}</span>
              </span>
            ))}
          </div>
        )}

        {molecule && !loading && <ViewerHint />}
      </div>
    </div>
  )
}

function uniqueElements(mol: Molecule): { el: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const a of mol.atoms) counts[a.el] = (counts[a.el] ?? 0) + 1
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((el) => ({ el, count: counts[el] }))
}

function Segmented({
  options,
  value,
  onChange,
}: Readonly<{
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}>) {
  return (
    <div className="flex rounded-md border border-white/10 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 text-xs transition ${
            value === o.value
              ? 'bg-white/10 text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
