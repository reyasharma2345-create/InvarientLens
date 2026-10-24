/** Minimal area sparkline; colour comes from the parent's text colour. */
export function Sparkline({
  values,
  className = "",
}: {
  values: number[]
  className?: string
}) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * 100,
    28 - ((v - min) / (max - min || 1)) * 24,
  ])
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ")
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={`h-10 w-full ${className}`}
      aria-hidden
    >
      <polygon
        points={`0,30 ${line} 100,30`}
        className="fill-current opacity-10"
      />
      <polyline
        points={line}
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}
