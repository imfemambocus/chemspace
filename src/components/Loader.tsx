import { useEffect, useState } from 'react'
import { LogoMark } from './LogoMark'

// First-load splash: a molecule assembles and tumbles in the center, then the overlay
// fades out and unmounts. Plays once per page load, so a manual reload shows it again, but
// never on in-page fetches: App mounts it once and never remounts it, so switching
// compounds does not replay it. `onDone` fires when it clears, so the page can hold its
// entrance animations until the splash is out of the way.
export function Loader({ onDone }: Readonly<{ onDone?: () => void }>) {
  const [leaving, setLeaving] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = reduce ? 500 : 1600
    const startFade = setTimeout(() => setLeaving(true), hold)
    // Fallback in case the opacity transitionend never fires.
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
