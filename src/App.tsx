import { lazy, Suspense, useEffect, useState } from 'react'
import { fetchMolecule, type Molecule } from './data/molecule'
import { fetchProperties, type Properties } from './data/properties'
import { Loader } from './components/Loader'
import { Header } from './components/Header'
import { Formula } from './components/Formula'
import { StructuralInfo } from './components/StructuralInfo'
import { ProfileSection } from './components/ProfileSection'

// The 3D viewer pulls in three.js, drei and postprocessing, so keep it out of the entry
// chunk: it renders immediately (import kicks off on mount, in parallel with the fetch),
// but text-first paint never waits on three.js. A placeholder holds the card's frame.
const StructureViewer = lazy(() =>
  import('./components/StructureViewer').then((m) => ({ default: m.StructureViewer })),
)

type Status = 'loading' | 'ready' | 'error'

const DEFAULT_CID = 177785841 // the C10H14N2 compound

// Read the CID from a shareable ?cid= link so a pasted URL opens that molecule.
function initialCid(): number {
  const param = new URLSearchParams(window.location.search).get('cid')
  const n = param ? Number.parseInt(param, 10) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CID
}

// Holds the structure card's frame (border, toolbar bar, canvas min-heights) while the
// lazy 3D chunk streams in, so the grid row doesn't reflow when the viewer mounts.
function ViewerFallback() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      <div className="flex items-center border-b border-white/10 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wider text-neutral-500">3D structure</span>
      </div>
      <div
        className="relative flex-1 min-h-75 sm:min-h-105 lg:min-h-120"
        style={{ background: 'radial-gradient(circle at 50% 35%, #151515, #0a0a0a 70%)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-pulse text-sm text-neutral-500">Loading 3D…</span>
        </div>
      </div>
    </div>
  )
}

function CompoundTitle({
  loading,
  props,
  cid,
}: Readonly<{
  loading: boolean
  props: Properties | null
  cid: number
}>) {
  if (loading) return <span className="animate-pulse text-neutral-600">Loading compound…</span>
  if (props?.iupacName) return <>{props.iupacName}</>
  if (props?.formula) return <Formula value={props.formula} />
  return <>CID {cid}</>
}

export default function App() {
  const [cid, setCid] = useState(initialCid)
  const [molecule, setMolecule] = useState<Molecule | null>(null)
  const [props, setProps] = useState<Properties | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    // One controller both cancels the in-flight requests when the CID changes (a new
    // search supersedes the old one) and guards against a stale response setting state.
    const controller = new AbortController()
    const { signal } = controller
    setStatus('loading')
    setError('')

    // The structure is required; properties are best-effort so a compound without
    // some descriptors still renders.
    Promise.all([fetchMolecule(cid, signal), fetchProperties(cid, signal).catch(() => null)])
      .then(([m, p]) => {
        if (signal.aborted) return
        setMolecule(m)
        setProps(p)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load this compound')
        setStatus('error')
      })

    return () => controller.abort()
  }, [cid])

  // Keep the URL in sync so the current compound is always shareable. replaceState
  // avoids piling a history entry onto every example-chip click.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('cid', String(cid))
    window.history.replaceState(null, '', url)
  }, [cid])

  const loading = status === 'loading'

  return (
    <div className="min-h-full">
      <Loader />
      <Header cid={cid} onLoadCid={setCid} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {status === 'error' ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h1 className="text-base font-medium text-red-300">Could not load CID {cid}</h1>
            <p className="mt-1 text-sm text-red-400/80">{error}</p>
            <p className="mt-3 text-sm text-neutral-500">
              Check the CID, or pick one of the examples above.
            </p>
          </div>
        ) : (
          <>
            {/* Title block */}
            <div>
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-wider text-accent hover:underline"
              >
                PubChem CID {cid}
              </a>
              <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-neutral-100">
                <CompoundTitle loading={loading} props={props} cid={cid} />
              </h1>
              {props?.formula && (
                <div className="mt-2 inline-block rounded-md border border-white/10 px-2.5 py-1">
                  <Formula value={props.formula} className="identifier text-sm text-neutral-300" />
                </div>
              )}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
              <StructuralInfo props={props} loading={loading} />
              <Suspense fallback={<ViewerFallback />}>
                <StructureViewer molecule={status === 'ready' ? molecule : null} loading={loading} />
              </Suspense>
            </div>

            <ProfileSection props={props} loading={loading} />
          </>
        )}
      </main>
    </div>
  )
}
