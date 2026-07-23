import { useState } from 'react'
import { EXAMPLES } from '../data/elements'

// Sticky top bar: wordmark, CID search, and example quick-picks.
export function Header({ cid, onLoadCid }: Readonly<{ cid: number; onLoadCid: (cid: number) => void }>) {
  const [input, setInput] = useState('')

  const loadInput = () => {
    const n = Number.parseInt(input.trim(), 10)
    if (Number.isFinite(n) && n > 0) onLoadCid(n)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-neutral-100">ChemSpace</span>
          <span className="text-xs text-neutral-600">3D compound viewer</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadInput()
          }}
          className="flex flex-1 justify-end gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="numeric"
            placeholder="PubChem CID"
            className="w-40 rounded-md border border-white/10 bg-neutral-900/70 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            className="rounded-md border border-white/10 bg-neutral-800/80 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-white/25 hover:text-white"
          >
            Load
          </button>
        </form>

        <div className="flex w-full flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.cid}
              onClick={() => onLoadCid(ex.cid)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                ex.cid === cid
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
