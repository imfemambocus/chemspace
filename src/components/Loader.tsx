import { useEffect, useState } from 'react'

// First-load splash: a molecule assembles and tumbles in the center, then the overlay
// fades out and unmounts. Plays once on mount; App never remounts it, so it does not
// reappear on later CID changes.
export function Loader() {
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

  if (hidden) return null

  return (
    <div
      className={`loader-overlay ${leaving ? 'is-leaving' : ''}`}
      onTransitionEnd={() => leaving && setHidden(true)}
      aria-hidden
    >
      <div className="loader-inner">
        <svg viewBox="0 0 120 120" width="96" height="96" className="loader-mol">
          <g className="loader-spin">
            <line className="loader-bond" x1="60" y1="60" x2="60" y2="24" />
            <line className="loader-bond" x1="60" y1="60" x2="30" y2="84" />
            <line className="loader-bond" x1="60" y1="60" x2="90" y2="84" />
            <circle className="loader-atom" cx="60" cy="24" r="8" fill="#ededed" />
            <circle className="loader-atom" cx="30" cy="84" r="8" fill="#ededed" />
            <circle className="loader-atom" cx="90" cy="84" r="8" fill="#ededed" />
            <circle className="loader-atom loader-core" cx="60" cy="60" r="11" fill="#2dd4bf" />
          </g>
        </svg>
        <span className="loader-word">ChemSpace</span>
      </div>
    </div>
  )
}
