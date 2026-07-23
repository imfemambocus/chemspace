// Renders a molecular formula string like "C10H14N2" with the digit runs subscripted.
export function Formula({ value, className }: Readonly<{ value?: string; className?: string }>) {
  if (!value) return null
  const tokens = [...value.matchAll(/[A-Z][a-z]?|\d+/g)]
  if (!tokens.length) return <span className={className}>{value}</span>
  return (
    <span className={className}>
      {tokens.map((m) => {
        const p = m[0]
        return /^\d+$/.test(p) ? <sub key={m.index}>{p}</sub> : <span key={m.index}>{p}</span>
      })}
    </span>
  )
}
