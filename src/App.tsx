import { useEffect, useState } from 'react'
import { fetchMolecule, type Molecule } from './data/molecule'
import { fetchProperties, type Properties } from './data/properties'
import { Loader } from './components/Loader'
import { Header } from './components/Header'
import { Formula } from './components/Formula'
import { StructuralInfo } from './components/StructuralInfo'
import { StructureViewer } from './components/StructureViewer'
import { ProfileSection } from './components/ProfileSection'

type Status = 'loading' | 'ready' | 'error'

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
  const [cid, setCid] = useState(177785841) // the C10H14N2 compound from the meeting
  const [molecule, setMolecule] = useState<Molecule | null>(null)
  const [props, setProps] = useState<Properties | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError('')

    // The structure is required; properties are best-effort so a compound without
    // some descriptors still renders.
    Promise.all([fetchMolecule(cid), fetchProperties(cid).catch(() => null)])
      .then(([m, p]) => {
        if (cancelled) return
        setMolecule(m)
        setProps(p)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load this compound')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
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
              <StructureViewer molecule={status === 'ready' ? molecule : null} loading={loading} />
            </div>

            <ProfileSection props={props} loading={loading} />
          </>
        )}
      </main>
    </div>
  )
}
