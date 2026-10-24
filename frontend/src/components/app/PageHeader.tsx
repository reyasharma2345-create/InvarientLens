import type { ReactNode } from "react"

export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="il-label mb-2">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {lede && <p className="mt-2 max-w-xl text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
