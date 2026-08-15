import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { fetchMolecule, type Molecule } from './data/molecule'
import { fetchProperties, type Properties } from './data/properties'
import { cidFromUrl, compoundPath } from './url'
import { Loader } from './components/Loader'
import { Header } from './components/Header'
import { Formula } from './components/Formula'
import { StructuralInfo } from './components/StructuralInfo'
import { ProfileSection } from './components/ProfileSection'

// three.js, drei and postprocessing all arrive with this one. the import starts on mount, in
// parallel with the fetch, but the text paints without waiting on any of it
const StructureViewer = lazy(() =>
  import('./components/StructureViewer').then((m) => ({ default: m.StructureViewer })),
)

type Status = 'loading' | 'ready' | 'error'

// the card's frame, held while the 3D chunk streams in. without it the grid row reflows on mount
function ViewerFallback() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
      <div className="flex items-center border-b border-white/10 px-4 py-2.5">
        <span className="text-xs uppercase tracking-wider text-neutral-500">Structure</span>
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
  const [cid, setCid] = useState(cidFromUrl)
  const [molecule, setMolecule] = useState<Molecule | null>(null)
  const [props, setProps] = useState<Properties | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  // the Profile radar holds its grow-in until the splash clears and it is actually visible
  const [splashDone, setSplashDone] = useState(false)
  const onSplashDone = useCallback(() => setSplashDone(true), [])

  useEffect(() => {
    // one controller does both jobs: cancel the superseded requests, and block a stale
    // response from writing state behind the newer one
    const controller = new AbortController()
    const { signal } = controller
    setStatus('loading')
    setError('')

    // the structure is required. properties are best-effort, and a compound missing some
    // descriptors still renders
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

  // the first run replaces rather than pushes. an entry URL of `/` or `?cid=` is normalized in
  // place: pushing would stack it behind a history entry nobody navigated from
  const urlSynced = useRef(false)
  useEffect(() => {
    const path = compoundPath(cid)
    if (path !== window.location.pathname) {
      if (urlSynced.current) window.history.pushState(null, '', path)
      else window.history.replaceState(null, '', path)
    }
    urlSynced.current = true
  }, [cid])

  // back and forward move between compounds; follow whatever the popped URL points at
  useEffect(() => {
    const onPopState = () => setCid(cidFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const loading = status === 'loading'

  return (
    <div className="min-h-full">
      <Loader onDone={onSplashDone} />
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
                <StructureViewer molecule={status === 'ready' ? molecule : null} loading={loading} cid={cid} />
              </Suspense>
            </div>

            <ProfileSection props={props} loading={loading} splashDone={splashDone} />
          </>
        )}
      </main>
    </div>
  )
}
