// the assemble-then-spin animation is the .loader-* classes in index.css, not anything here
export function LogoMark({ size = 96 }: Readonly<{ size?: number }>) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="loader-mol">
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
  )
}
