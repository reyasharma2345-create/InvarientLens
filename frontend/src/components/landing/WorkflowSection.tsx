import { useRef, useState, type JSX, type KeyboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, CircleAlert, CircleCheck, CircleX } from "lucide-react"
import { INVARIANTS, REPAIRS, STAGES, TRACE } from "@/data/demo"
import { SERVICE_STYLE } from "@/components/investigation/serviceStyle"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { SectionHeading } from "./SectionHeading"

type StageKey = typeof STAGES[number]["key"]

function IngestVisual() {
  const rows = [
    ["Spans", "1.24M", 92],
    ["Log lines", "3.9M", 75],
    ["Broker offsets", "612k", 58],
    ["DB reads", "88k", 41],
  ] as const
  return (
    <ul className="grid grid-cols-2 gap-3">
      {rows.map(([k, v, pct]) => (
        <li
          key={k}
          className="rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 p-4"
        >
          <p className="il-label">{k}</p>
          <p className="mt-2 font-display text-2xl">{v}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-rock/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blush to-bloom"
              style={{ width: `${pct}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ReconstructVisual() {
  return (
    <ol className="space-y-2">
      {TRACE.map((e, i) => (
        <li key={e.id} className="flex items-center gap-3 text-sm">
          <span className="w-5 text-right font-mono text-xs text-ink-3">
            {i + 1}
          </span>
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${SERVICE_STYLE[e.service].dot}`}
            aria-hidden
          />
          <span
            className={`truncate font-mono text-[0.8rem] ${
              e.tone === "fail" || e.tone === "missing"
                ? "text-brick"
                : "text-ink"
            }`}
          >
            {e.label}
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs text-ink-3">
            +{e.t} ms
          </span>
        </li>
      ))}
    </ol>
  )
}

function EvaluateVisual() {
  return (
    <ul className="space-y-2.5">
      {INVARIANTS.slice(0, 4).map((inv) => (
        <li
          key={inv.id}
          className="flex items-start gap-3 rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 px-4 py-3"
        >
          {inv.violations ? (
            <CircleAlert
              size={16}
              className="mt-0.5 shrink-0 text-brick"
              aria-label="Broken"
            />
          ) : (
            <CircleCheck
              size={16}
              className="mt-0.5 shrink-0 text-sage"
              aria-label="Holds"
            />
          )}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{inv.name}</span>
            <span className="break-words font-mono text-xs text-ink-3">
              {inv.rule}
            </span>
          </span>
          <span
            className={`font-mono text-xs ${
              inv.violations ? "text-brick" : "text-ink-3"
            }`}
          >
            {inv.violations}
          </span>
        </li>
      ))}
    </ul>
  )
}

const Cite = ({ n }: { n: string }) => (
  <sup className="ml-0.5 rounded bg-bloom/10 px-1 font-mono text-[0.65rem] text-bloom">
    {n}
  </sup>
)

function DiagnoseVisual() {
  return (
    <div className="rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 p-5 leading-relaxed text-ink-2">
      <p className="il-label mb-3">Diagnosis · IL-214</p>
      <p>
        Payment for <span className="font-mono text-ink">ord_4821</span> was
        captured
        <Cite n="E1" /> after its reserve message was redelivered
        <Cite n="E2" /> by a consumer rebalance
        <Cite n="E3" />. The new consumer treated it as a duplicate and acked
        without writing
        <Cite n="E4" />, so no reservation exists
        <Cite n="E5" />.
      </p>
    </div>
  )
}

function VerifyVisual() {
  return (
    <ul className="space-y-2.5">
      {REPAIRS.map((r) => (
        <li
          key={r.id}
          className="flex items-start gap-3 rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 px-4 py-3"
        >
          {r.outcome === "pass" ? (
            <CircleCheck
              size={16}
              className="mt-0.5 shrink-0 text-sage"
              aria-hidden
            />
          ) : (
            <CircleX
              size={16}
              className="mt-0.5 shrink-0 text-brick"
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-medium">{r.title}</span>
            <span className="text-xs text-ink-3">
              {r.sideEffect ?? r.holds}
            </span>
          </span>
          <span
            className={`font-mono text-xs ${
              r.outcome === "pass" ? "text-sage" : "text-brick"
            }`}
          >
            {r.outcome === "pass" ? "verified" : "rejected"}
          </span>
        </li>
      ))}
    </ul>
  )
}

const VISUAL: Record<StageKey, () => JSX.Element> = {
  ingest: IngestVisual,
  reconstruct: ReconstructVisual,
  evaluate: EvaluateVisual,
  diagnose: DiagnoseVisual,
  verify: VerifyVisual,
}

export function WorkflowSection() {
  const [index, setIndex] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const reduced = useReducedMotion()
  const stage = STAGES[index]
  const Visual = VISUAL[stage.key]

  // Roving focus for the tablist (arrow keys, Home/End).
  const focusTab = (i: number) => {
    const n = (i + STAGES.length) % STAGES.length
    setIndex(n)
    tabs.current[n]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: STAGES.length - 1,
    }
    if (e.key in map) {
      e.preventDefault()
      focusTab(map[e.key])
    }
  }

  return (
    <section
      id="workflow"
      className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-28 md:px-8"
    >
      <SectionHeading
        index="02"
        eyebrow="How it works"
        title="Five stages from raw telemetry to a proven fix."
        aside="Nothing to instrument by hand. Declare the rules your business depends on — InvariantLens does the rest."
      />
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <div
          role="tablist"
          aria-label="Workflow stages"
          onKeyDown={onKey}
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {STAGES.map((s, i) => {
            const on = i === index
            return (
              <button
                key={s.key}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`stage-tab-${s.key}`}
                aria-selected={on}
                aria-controls="stage-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => setIndex(i)}
                className={`flex shrink-0 items-center gap-4 rounded-[var(--il-radius-md)] border px-4 py-3.5 text-left transition-colors duration-300 lg:px-5 lg:py-4 ${
                  on
                    ? "il-glass !border-bloom/30"
                    : "border-transparent hover:bg-white/50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs transition-colors ${
                    on
                      ? "bg-bloom text-white"
                      : "border border-rock/15 bg-white/70 text-ink-2"
                  }`}
                >
                  0{i + 1}
                </span>
                <span>
                  <span
                    className={`block font-display text-lg font-semibold ${
                      on ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {s.title}
                  </span>
                  <span className="hidden text-sm leading-snug text-ink-3 lg:block">
                    {s.body}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div
          id="stage-panel"
          role="tabpanel"
          aria-labelledby={`stage-tab-${stage.key}`}
          className="il-panel relative min-h-[27rem] overflow-hidden p-6 sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-moon/50 blur-3xl"
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage.key}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <p className="il-label mb-2">Stage 0{index + 1} / 05</p>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                {stage.title}
              </h3>
              <p className="mb-7 mt-2 max-w-lg text-ink-2 lg:hidden">
                {stage.body}
              </p>
              <div className="lg:mt-7">
                <Visual />
              </div>
              {index < STAGES.length - 1 && (
                <button
                  type="button"
                  onClick={() => setIndex(index + 1)}
                  className="il-btn il-btn-ghost il-btn-sm -ml-3 mt-6"
                >
                  Next: {STAGES[index + 1].title}{" "}
                  <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
