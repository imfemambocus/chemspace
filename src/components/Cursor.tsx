import { useEffect, useRef, useState } from 'react'

// A custom pointer: two concentric accent rings. The inner ring tracks the mouse
// closely, the outer ring trails and expands over clickable elements. Only enabled on
// fine-pointer (mouse) devices, and it snaps instead of easing under reduced-motion.

const INTERACTIVE = 'a, button, input, textarea, select, label, summary, [role="button"], .cursor-target'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function Cursor() {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)
    document.body.classList.add('has-custom-cursor')

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const o = { x: target.x, y: target.y, s: 1 } // outer ring, trailing
    const p = { x: target.x, y: target.y, s: 1 } // inner ring, tight
    let hovered = false
    let appliedHover = false
    let down = false
    let raf = 0

    const setVisible = (v: boolean) => {
      const value = v ? '1' : '0'
      if (outer.current) outer.current.style.opacity = value
      if (inner.current) inner.current.style.opacity = value
    }

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY
    }
    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null
      hovered = !!t?.closest(INTERACTIVE)
    }
    const onDown = () => (down = true)
    const onUp = () => (down = false)
    const onEnter = () => setVisible(true)
    const onLeave = () => setVisible(false)

    const tick = () => {
      const move = reduce ? 1 : 0.25
      const moveInner = reduce ? 1 : 0.4
      o.x = lerp(o.x, target.x, move)
      o.y = lerp(o.y, target.y, move)
      p.x = lerp(p.x, target.x, moveInner)
      p.y = lerp(p.y, target.y, moveInner)

      const outerTarget = (hovered ? 1.6 : 1) * (down ? 0.85 : 1)
      const innerTarget = (hovered ? 1.4 : 1) * (down ? 0.8 : 1)
      o.s = reduce ? outerTarget : lerp(o.s, outerTarget, 0.2)
      p.s = reduce ? innerTarget : lerp(p.s, innerTarget, 0.25)

      if (outer.current) {
        outer.current.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, -50%) scale(${o.s})`
      }
      if (inner.current) {
        inner.current.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.s})`
      }
      if (hovered !== appliedHover) {
        appliedHover = hovered
        outer.current?.classList.toggle('is-hover', hovered)
        inner.current?.classList.toggle('is-hover', hovered)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    root.addEventListener('mouseenter', onEnter)
    root.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      root.removeEventListener('mouseenter', onEnter)
      root.removeEventListener('mouseleave', onLeave)
      document.body.classList.remove('has-custom-cursor')
    }
  }, [])

  if (!enabled) return null
  return (
    <>
      <div ref={outer} className="pc-ring" aria-hidden />
      <div ref={inner} className="pc-dot" aria-hidden />
    </>
  )
}
