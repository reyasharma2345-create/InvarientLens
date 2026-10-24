import { Activity, Database, FileText, Radio, Waypoints } from "lucide-react"
import { EVIDENCE, type Evidence } from "@/data/demo"

const KIND = {
  span: Waypoints,
  broker: Radio,
  log: FileText,
  query: Database,
  metric: Activity,
} as const

type Props = {
  activeEvent?: string
  onSelect?: (e: Evidence) => void
  items?: Evidence[]
}

/** Cited evidence; selecting an item focuses its event in the trace. */
export function EvidenceList({
  activeEvent,
  onSelect,
  items = EVIDENCE,
}: Props) {
  return (
    <ul className="space-y-2">
      {items.map((ev) => {
        const Icon = KIND[ev.kind]
        const on = activeEvent === ev.event
        return (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => onSelect?.(ev)}
              aria-pressed={on}
              className={`flex w-full items-start gap-3 rounded-[var(--il-radius-sm)] border px-3.5 py-3 text-left transition-colors duration-300 ${
                on
                  ? "border-bloom/40 bg-moon/30"
                  : "border-rock/10 bg-white/55 hover:border-rock/20 hover:bg-white/80"
              }`}
            >
              <span
                className={`mt-0.5 font-mono text-xs font-medium ${
                  on ? "text-bloom" : "text-ink-3"
                }`}
              >
                {ev.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Icon size={13} aria-hidden /> {ev.source}
                </span>
                <span className="mt-1 block break-words font-mono text-[0.78rem] leading-relaxed text-ink">
                  {ev.text}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
