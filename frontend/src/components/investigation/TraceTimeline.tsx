import {
  SERVICES,
  TRACE,
  TRACE_LINKS,
  type ServiceId,
  type TraceEvent,
} from "@/data/demo"
import { SERVICE_STYLE, TONE_LABEL } from "./serviceStyle"

const SPAN = 2600
const x = (t: number) => 5 + (t / SPAN) * 90 // % of track width
const LANES: ServiceId[] = ["orders", "payments", "inventory"]
const laneY = (s: ServiceId) => LANES.indexOf(s) * 100 + 50 // SVG units, 100 per lane
const byId = Object.fromEntries(
  TRACE.map((e) => [e.id, e]),
) as Record<string, TraceEvent>
const nameOf = (s: ServiceId) => SERVICES.find((v) => v.id === s)!.name
// Inventory's flow is intact until the rebalance, then the reservation thread is lost.
const BREAK_T = TRACE.find((e) => e.tone === "warn")!.t

const MARKER: Record<TraceEvent["tone"], string> = {
  ok: "bg-white border-2 text-ink",
  warn: "bg-white border-2 border-gold text-gold",
  fail: "bg-brick border-2 border-brick text-white",
  missing: "bg-white border-2 border-dashed border-brick text-brick",
}

type Props = {
  active?: string
  onSelect?: (id: string) => void
}

/**
 * Swimlane view of one reconstructed workflow: one lane per service, numbered
 * events placed by time, causal links drawn between them. Scrolls sideways on
 * narrow screens instead of squashing the lanes.
 */
export function TraceTimeline({ active, onSelect }: Props) {
  const current = active ? byId[active] : undefined
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[36rem] grid-cols-[6.5rem_1fr]">
          <div className="flex flex-col">
            {LANES.map((s) => (
              <div
                key={s}
                className="flex h-16 items-center gap-2 text-sm font-medium text-ink"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${SERVICE_STYLE[s].dot}`}
                  aria-hidden
                />
                {nameOf(s)}
              </div>
            ))}
          </div>

          <div className="relative">
            <svg
              className="absolute inset-x-0 top-0 h-48 w-full"
              viewBox="0 0 100 300"
              preserveAspectRatio="none"
              aria-hidden
            >
              {LANES.map((s) => {
                const y = laneY(s)
                const broken = s === "inventory"
                return (
                  <g key={s}>
                    <line
                      x1="0"
                      x2={broken ? x(BREAK_T) : 100}
                      y1={y}
                      y2={y}
                      className={`${SERVICE_STYLE[s].stroke} opacity-25`}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                    {broken && (
                      <line
                        x1={x(BREAK_T)}
                        x2="100"
                        y1={y}
                        y2={y}
                        className="stroke-brick opacity-50"
                        strokeWidth="2"
                        strokeDasharray="4 5"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </g>
                )
              })}
              {TRACE_LINKS.map(([a, b]) => {
                const ea = byId[a]
                const eb = byId[b]
                const x1 = x(ea.t),
                  y1 = laneY(ea.service),
                  x2 = x(eb.t),
                  y2 = laneY(eb.service)
                const mid = (x1 + x2) / 2
                const lit = active === a || active === b
                const bad = eb.tone === "fail" || eb.tone === "missing"
                return (
                  <path
                    key={a + b}
                    d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`}
                    fill="none"
                    className={`${
                      bad ? "stroke-brick" : "stroke-ink-3"
                    } transition-opacity duration-300 ${
                      lit ? "opacity-90" : "opacity-30"
                    }`}
                    strokeWidth={lit ? 2 : 1.25}
                    strokeDasharray={bad ? "3 4" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </svg>

            <ol className="relative h-48" aria-label="Trace events">
              {TRACE.map((e, i) => {
                const selected = active === e.id
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(e.id)}
                      aria-pressed={selected}
                      aria-label={`${i + 1}. ${nameOf(e.service)}: ${e.label} at +${e.t} ms (${TONE_LABEL[e.tone]})`}
                      className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-[0.7rem] font-medium shadow-sm transition-transform duration-300 hover:scale-110 ${MARKER[e.tone]} ${
                        e.tone === "ok" ? SERVICE_STYLE[e.service].border : ""
                      } ${selected ? "scale-125 ring-4 ring-bloom/20" : ""}`}
                      style={{
                        left: `${x(e.t)}%`,
                        top: `${((LANES.indexOf(e.service) + 0.5) / LANES.length) * 100}%`,
                      }}
                    >
                      {i + 1}
                    </button>
                  </li>
                )
              })}
            </ol>

            <div
              className="relative mt-1 h-5 border-t border-rock/10 font-mono text-[0.625rem] text-ink-3"
              aria-hidden
            >
              {[0, 500, 1000, 1500, 2000, 2500].map((t) => (
                <span
                  key={t}
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${x(t)}%` }}
                >
                  {t === 0 ? "0" : `+${t}`} ms
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-3 min-h-[3.25rem] rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 px-4 py-3 text-sm"
      >
        {current ? (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-xs text-ink-3">
              #{TRACE.indexOf(current) + 1} · {nameOf(current.service)} · +
              {current.t} ms
            </span>
            <span className="font-medium text-ink">{current.label}</span>
            <span
              className={
                current.tone === "fail" || current.tone === "missing"
                  ? "text-brick"
                  : current.tone === "warn"
                    ? "text-gold"
                    : "text-ink-2"
              }
            >
              {current.detail}
            </span>
          </p>
        ) : (
          <p className="text-ink-3">Select an event to inspect it.</p>
        )}
      </div>
    </div>
  )
}
