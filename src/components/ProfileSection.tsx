import type { Properties, Rule } from '../data/properties'
import { descriptors, druglikeness } from '../data/properties'
import { PropertyRadar } from './PropertyRadar'

// The "Profile" section: descriptor and druglikeness text first, then the bordered blocks - a
// radar chart paired with the value list (the accessible table view), and below them the
// Lipinski and Veber druglikeness rule cards as two equal columns.
export function ProfileSection({
  props,
  loading,
  splashDone,
}: Readonly<{ props: Properties | null; loading: boolean; splashDone: boolean }>) {
  const data = props ? descriptors(props) : []
  const drug = props && !loading ? druglikeness(props) : null

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-100">Profile</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Computed molecular descriptors, each normalized to a typical small-molecule range so the
        bars are comparable. Heights are relative; exact values are listed alongside.
      </p>

      {/* Radar + value list. The column template mirrors the info | structure grid up top, so the
          radar lines up with the structure card and the value list with the info panel. */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_minmax(0,320px)]">
        <div
          className="relative h-80 overflow-hidden rounded-xl border border-white/10 lg:h-95"
          style={{ background: 'radial-gradient(circle at 50% 60%, #141414, #0a0a0a 70%)' }}
        >
          {props && !loading ? (
            <PropertyRadar descriptors={data} play={splashDone} />
          ) : (
            <RadarFallback label={loading ? 'Loading descriptors…' : 'Descriptors unavailable'} />
          )}
        </div>

        {/* Value list / table view */}
        <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-5">
          <dl className="space-y-3.5">
            {(data.length ? data : placeholder).map((d) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <dt className="text-neutral-300">{d.label}</dt>
                  <dd className="text-neutral-100">
                    {d.display}
                    {d.unit ? <span className="ml-1 text-xs text-neutral-500">{d.unit}</span> : null}
                  </dd>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    // hold at zero until the splash clears so the fill isn't seen animating
                    // behind the fading overlay; then it grows in with the radar
                    style={{ width: splashDone ? `${Math.round(d.norm * 100)}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* QED* / druglikeness intro, sitting between the two rows of cards. */}
      {drug && (
        <p className="mt-8 text-sm text-neutral-500">
          {drug.qed != null ? (
            <>
              <span className="text-neutral-300">QED*</span>{' '}
              <span className="font-medium text-neutral-100">{drug.qed.toFixed(2)}</span>: an
              approximate estimate of druglikeness (0 to 1, higher is better), omitting two of its
              eight terms PubChem does not expose.
            </>
          ) : (
            'Rule-of-thumb druglikeness filters (Lipinski, Veber) computed from these descriptors.'
          )}
        </p>
      )}

      {/* Druglikeness rule cards: two equal columns, same gap as the radar / value grid. */}
      {drug && (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {drug.rules.map((r) => (
            <RuleCard key={r.key} rule={r} />
          ))}
        </div>
      )}
    </section>
  )
}

// One druglikeness rule as its own bordered card: name + verdict, then the pass/fail criteria.
function RuleCard({ rule }: Readonly<{ rule: Rule }>) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-neutral-200">{rule.name}</span>
          <span className="ml-2 text-xs text-neutral-600">{rule.full}</span>
        </div>
        <Verdict pass={rule.pass} complete={rule.complete} />
      </div>
      <ul className="mt-3 space-y-1.5">
        {rule.criteria.map((c) => (
          <li key={c.label} className="flex items-center justify-between text-xs">
            <span className={c.ok ? 'text-neutral-400' : 'text-amber-300/90'}>
              <span className="mr-1.5">{c.ok ? '✓' : '✕'}</span>
              {c.label}
            </span>
            <span className="identifier text-neutral-500">{c.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Pass in the accent (good/active), fail in amber (the palette's caution colour, as used by
// the "2D layout" badge); "Partial" when a descriptor a criterion needs was missing.
function Verdict({ pass, complete }: Readonly<{ pass: boolean; complete: boolean }>) {
  const base = 'rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide'
  if (!complete) {
    return <span className={`${base} border-white/10 text-neutral-500`}>Partial</span>
  }
  return pass ? (
    <span className={`${base} border-accent/30 bg-accent/10 text-accent`}>Pass</span>
  ) : (
    <span className={`${base} border-amber-400/30 bg-amber-400/10 text-amber-300/90`}>Fail</span>
  )
}

// Shared placeholder for the radar cell: shown while descriptors load, while the WebGL
// chunk streams in, or when a compound has no descriptors.
function RadarFallback({ label }: Readonly<{ label: string }>) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="animate-pulse text-sm text-neutral-600">{label}</span>
    </div>
  )
}

const placeholder = descriptors({ cid: 0 })
