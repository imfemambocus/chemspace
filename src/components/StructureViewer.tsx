import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { fetchMolecule2D, type Molecule } from '../data/molecule'
import { cpkColor } from '../data/elements'
import { Scene } from '../three/Scene'
import { measure } from '../three/measure'
import { ViewerHint } from './ViewerHint'
import { LogoMark } from './LogoMark'
import { Depiction2D } from './Depiction2D'
import { useStore } from '../store'

interface Props {
  molecule: Molecule | null
  loading: boolean
  cid: number
}

// Which structure representation is showing: the interactive 3D model, or a flat 2D depiction
// we draw as SVG from PubChem's 2D layout coordinates. 2D needs only the CID, so it works even
// for compounds with no 3D conformer, where we would otherwise be worse than PubChemLite.
type View = '3d' | '2d'

// Hold the assembling logo up for at least this long so its full animation plays before the
// 2D depiction replaces it, even when the data is cached (skipped under reduced motion).
const MIN_2D_LOADER_MS = 900

export function StructureViewer({ molecule, loading, cid }: Readonly<Props>) {
  const [view, setView] = useState<View>('3d')
  // the loaded 2D layout to draw, and the CID it is for
  const [mol2d, setMol2d] = useState<Molecule | null>(null)
  // the CID whose 2D depiction is revealed; while it lags behind `cid` the logo mark spins
  const [loadedCid, setLoadedCid] = useState<number | null>(null)
  const loadStart = useRef(0)
  const loaderTimer = useRef<number | null>(null)
  // CIDs whose 2D layout has already been fetched this session, so toggling back does not replay
  // the loader for data that is now cached
  const loadedOnce = useRef<Set<number>>(new Set())
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

  // Fetch and reveal the 2D layout when the 2D view is active. A superseded CID aborts. The
  // logo mark spins until reveal; a CID already fetched this session skips the loader minimum.
  useEffect(() => {
    if (view !== '2d') return
    const controller = new AbortController()
    const cached = loadedOnce.current.has(cid)
    loadStart.current = Date.now()
    if (!cached) setLoadedCid(null)

    fetchMolecule2D(cid, controller.signal)
      .then((m) => {
        setMol2d(m)
        reveal(cid, cached)
      })
      .catch(() => {
        // on failure just clear the loader so it does not spin forever; without mol2d the
        // depiction simply does not render for this CID
        if (!controller.signal.aborted) reveal(cid, cached)
      })

    return () => {
      controller.abort()
      if (loaderTimer.current != null) clearTimeout(loaderTimer.current)
    }
  }, [cid, view])

  // Reveal the 2D depiction, but not before the loader's minimum has elapsed. A cached CID
  // (already seen this session) skips the wait entirely.
  const reveal = (c: number, cached: boolean) => {
    if (cached) {
      setLoadedCid(c)
      return
    }
    loadedOnce.current.add(c)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const min = reduce ? 0 : MIN_2D_LOADER_MS
    const wait = Math.max(0, min - (Date.now() - loadStart.current))
    loaderTimer.current = window.setTimeout(() => setLoadedCid(c), wait)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Structure</span>
        <div className="flex items-center gap-2">
          {/* Ball&stick / space-filling, measure and spin only apply to the 3D model. The
              3D/2D toggle sits last so it stays pinned to the right edge and does not shift
              when these 3D-only controls appear or disappear. */}
          {view === '3d' && (
            <>
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
              {/* divider between the 3D-only controls and the 3D/2D toggle */}
              <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />
            </>
          )}
          <Segmented
            options={[
              { value: '3d', label: '3D' },
              { value: '2d', label: '2D' },
            ]}
            value={view}
            onChange={(v) => setView(v as View)}
          />
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative flex-1 min-h-75 sm:min-h-105 lg:min-h-120"
        style={{ background: 'radial-gradient(circle at 50% 35%, #151515, #0a0a0a 70%)' }}
      >
        {view === '2d' ? (
          // Our own 2D depiction, drawn as SVG line art from PubChem's 2D layout coordinates
          // (Depiction2D) so it floats on the same dark canvas as the 3D model instead of a
          // white sheet. The spinning logo mark holds the space until it loads, then it fades in.
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {loadedCid !== cid && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <LogoMark size={72} />
              </div>
            )}
            {mol2d && mol2d.cid === cid && (
              <div
                className={`h-full w-full transition-opacity duration-300 ${
                  loadedCid === cid ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Depiction2D molecule={mol2d} />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Absolutely positioned so the canvas never feeds its rendered height back into
                the flex/grid sizing; the container height stays driven by content and resets
                per compound instead of sticking at the tallest one seen. */}
            <Canvas
              // On-demand rendering: an idle molecule costs ~0 GPU/CPU. Everything that changes
              // per frame requests one explicitly (spin driver, GSAP onUpdate, instance writes);
              // drag/zoom and hover/measure overlays already invalidate via drei/the reconciler.
              frameloop="demand"
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
          </>
        )}
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
