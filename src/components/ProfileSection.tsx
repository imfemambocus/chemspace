import type { Properties } from '../data/properties'
import { descriptors } from '../data/properties'
import { PropertyRadar } from './PropertyRadar'

// The "Profile" section: an SVG radial bar chart of computed descriptors, paired with a
// value list that doubles as the accessible table view.
export function ProfileSection({
  props,
  loading,
  splashDone,
}: Readonly<{ props: Properties | null; loading: boolean; splashDone: boolean }>) {
  const data = props ? descriptors(props) : []

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-100">Profile</h2>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Computed molecular descriptors, each normalized to a typical small-molecule range so the
        bars are comparable. Heights are relative; exact values are listed alongside.
      </p>

      <div className="mt-5 grid gap-4 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/60 lg:grid-cols-[1fr_320px]">
        <div
          className="relative h-80 lg:h-95"
          style={{ background: 'radial-gradient(circle at 50% 60%, #141414, #0a0a0a 70%)' }}
        >
          {props && !loading ? (
            <PropertyRadar descriptors={data} play={splashDone} />
          ) : (
            <RadarFallback label={loading ? 'Loading descriptors…' : 'Descriptors unavailable'} />
          )}
        </div>

        {/* Value list / table view */}
        <div className="border-t border-white/10 p-5 lg:border-l lg:border-t-0">
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
    </section>
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
