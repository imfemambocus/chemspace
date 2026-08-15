import { useEffect, useState } from 'react'
import { LogoMark } from './LogoMark'

// Once per page load, never on an in-page fetch: App mounts this once and never remounts it,
// which is what stops a compound change replaying it. `onDone` fires when it clears, and the
// page holds its own entrance animations until then.
export function Loader({ onDone }: Readonly<{ onDone?: () => void }>) {
  const [leaving, setLeaving] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? 500 : 1600
    const startFade = setTimeout(() => setLeaving(true), hold)
    // in case the opacity transitionend never fires
    const forceHide = setTimeout(() => setHidden(true), hold + 700)
    return () => {
      clearTimeout(startFade)
      clearTimeout(forceHide)
    }
  }, [])

  useEffect(() => {
    if (hidden) onDone?.()
  }, [hidden, onDone])

  if (hidden) return null

  return (
    <div
      className={`loader-overlay ${leaving ? 'is-leaving' : ''}`}
      onTransitionEnd={() => leaving && setHidden(true)}
      aria-hidden
    >
      <div className="loader-inner">
        <LogoMark />
        <span className="loader-word">ChemSpace</span>
      </div>
    </div>
  )
}
