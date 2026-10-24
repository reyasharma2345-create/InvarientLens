import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { motion } from "framer-motion"
import {
  Archive,
  ArrowLeft,
  CircleCheck,
  CircleX,
  FlaskConical,
  Play,
  RotateCcw,
} from "lucide-react"
import {
  EVIDENCE,
  INVARIANTS,
  INVESTIGATIONS,
  REPAIRS,
  TRACE,
  serviceName,
  type Investigation,
  type Repair,
} from "@/data/demo"
import { TraceTimeline } from "@/components/investigation/TraceTimeline"
import { EvidenceList } from "@/components/investigation/EvidenceList"
import { StatusChip } from "@/components/ui/StatusChip"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { demo, useDemo } from "@/lib/demoStore"
import { isResolved } from "@/lib/derive"
import { NotFoundPage } from "@/pages/NotFoundPage"

const TOTAL_TRACES = 37
const AFFECTED = [
  ["ord_4821", "€84.20", "14:02:11"],
  ["ord_4836", "€129.00", "14:03:47"],
  ["ord_4852", "€42.50", "14:05:02"],
  ["ord_4859", "€310.75", "14:05:39"],
  ["ord_4877", "€18.90", "14:08:14"],
  ["ord_4890", "€66.00", "14:11:56"],
] as const

const Card = ({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
}) => (
  <section className={`il-panel p-5 sm:p-6 ${className}`} aria-label={title}>
    {eyebrow && <p className="il-label mb-1">{eyebrow}</p>}
    <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
    {children}
  </section>
)

function RepairCard({
  repair,
  investigation,
  resolvedWith,
}: {
  repair: Repair
  investigation: Investigation
  resolvedWith?: string
}) {
  const outcome = useDemo((s) => s.replays[repair.id])
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState<number | null>(null)

  // Simulated replay: walk the recorded traces, then store the outcome.
  useEffect(() => {
    if (progress === null) return
    if (progress >= TOTAL_TRACES) {
      demo.recordReplay(repair.id, repair.outcome)
      setProgress(null)
      return
    }
    const t = window.setTimeout(
      () => setProgress((p) => (p === null ? p : p + 1)),
      45,
    )
    return () => window.clearTimeout(t)
  }, [progress, repair])

  const run = () => {
    if (reduced) demo.recordReplay(repair.id, repair.outcome)
    else setProgress(0)
  }
  const running = progress !== null
  const applied = resolvedWith === repair.title

  return (
    <li
      className={`rounded-[var(--il-radius-md)] border bg-white/60 p-5 transition-colors ${
        applied
          ? "border-sage/40"
          : outcome === "fail"
            ? "border-brick/25"
            : "border-rock/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-3">{repair.id}</p>
          <h3 className="font-display text-lg font-semibold">{repair.title}</h3>
        </div>
        {outcome && (
          <StatusChip
            status={outcome === "pass" ? "holds" : "broken"}
            label={outcome === "pass" ? "Verified" : "Rejected"}
          />
        )}
      </div>
      <p className="mt-2 break-words rounded-[var(--il-radius-sm)] bg-rock/5 px-3 py-2 font-mono text-[0.78rem] text-ink-2">
        {repair.change}
      </p>

      <div aria-live="polite">
        {running && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-xs text-ink-3">
              <span>Replaying recorded traces</span>
              <span>
                {progress} / {TOTAL_TRACES}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-rock/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TOTAL_TRACES}
              aria-valuenow={progress}
              aria-label={`Replay of ${repair.id}`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blush to-bloom"
                style={{ width: `${(progress / TOTAL_TRACES) * 100}%` }}
              />
            </div>
          </div>
        )}
        {outcome && !running && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex gap-3 text-sm"
          >
            {outcome === "pass" ? (
              <CircleCheck
                size={18}
                className="mt-0.5 shrink-0 text-sage"
                aria-hidden
              />
            ) : (
              <CircleX
                size={18}
                className="mt-0.5 shrink-0 text-brick"
                aria-hidden
              />
            )}
            <div>
              <p className="font-medium text-ink">
                INV-001: {repair.holds}
                {repair.sideEffect ? ", but…" : ""}
              </p>
              {repair.sideEffect && (
                <p className="font-medium text-brick">{repair.sideEffect}</p>
              )}
              <p className="mt-0.5 text-ink-2">{repair.summary}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!outcome && (
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="il-btn il-btn-outline il-btn-sm"
          >
            <Play size={14} aria-hidden />{" "}
            {running ? "Replaying…" : `Replay against ${TOTAL_TRACES} traces`}
          </button>
        )}
        {outcome === "pass" && !resolvedWith && (
          <button
            type="button"
            onClick={() => demo.resolve(investigation.id, repair.title)}
            className="il-btn il-btn-primary il-btn-sm"
          >
            <CircleCheck size={14} aria-hidden /> Apply fix &amp; resolve
          </button>
        )}
        {applied && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-sage">
            <CircleCheck size={16} aria-hidden /> Applied, {investigation.id}{" "}
            resolved
          </p>
        )}
      </div>
    </li>
  )
}

type HeaderProps = {
  inv: Investigation
  resolved: boolean
}

function Header({ inv, resolved }: HeaderProps) {
  const rule = INVARIANTS.find((i) => i.id === inv.invariant)
  return (
    <div className="mb-8">
      <Link
        to="/app/investigations"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden /> All investigations
      </Link>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-3">{inv.id}</span>
        <StatusChip status={resolved ? "resolved" : "open"} />
        <StatusChip status={inv.severity} />
      </div>
      <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {inv.title}
      </h1>
      <p className="mt-2 text-ink-2">
        {rule ? (
          <>
            <span className="font-mono text-sm">{rule.id}</span> · {rule.name}
          </>
        ) : (
          inv.invariant
        )}{" "}
        · opened {inv.opened}
      </p>
    </div>
  )
}

export function InvestigationPage() {
  const { id } = useParams()
  const resolvedMap = useDemo((s) => s.resolved)
  const [active, setActive] = useState("e6")
  const inv = INVESTIGATIONS.find((i) => i.id === id)
  if (!inv) return <NotFoundPage />

  const resolved = isResolved(inv, resolvedMap)
  const resolvedWith = inv.resolvedBy ?? resolvedMap[inv.id]

  if (!inv.hasTrace) {
    return (
      <>
        <Header inv={inv} resolved={resolved} />
        <section
          className="il-panel max-w-3xl p-6 sm:p-8"
          aria-label="Archived summary"
        >
          <div className="mb-6 flex items-center gap-3 text-ink-2">
            <Archive size={18} aria-hidden />{" "}
            <span className="text-sm">
              Archived. Raw traces are kept for 72 hours, so only the summary is
              left.
            </span>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ["Resolved with", inv.resolvedBy],
              ["Resolved", inv.resolvedAt],
              ["Violations before fix", String(inv.violations)],
              ["Services", inv.services.map(serviceName).join(", ")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="il-label">{k}</dt>
                <dd className="mt-1 text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </>
    )
  }

  const cite = (eid: string) => {
    const ev = EVIDENCE.find((e) => e.id === eid)!
    return (
      <button
        type="button"
        onClick={() => setActive(ev.event)}
        aria-pressed={active === ev.event}
        className={`mx-0.5 rounded px-1 align-super font-mono text-[0.65rem] transition-colors ${
          active === ev.event
            ? "bg-bloom text-white"
            : "bg-bloom/10 text-bloom hover:bg-bloom/20"
        }`}
      >
        {eid}
      </button>
    )
  }

  return (
    <>
      <Header inv={inv} resolved={resolved} />

      {resolved && (
        <div className="mb-6 flex flex-col gap-4 rounded-[var(--il-radius-lg)] border border-sage/25 bg-gradient-to-r from-sage/10 to-white/40 p-5 sm:flex-row sm:items-center">
          <CircleCheck size={22} className="shrink-0 text-sage" aria-hidden />
          <p className="flex-1 text-ink-2">
            <span className="font-medium text-ink">Resolved.</span> “
            {resolvedWith}” was verified against all {TOTAL_TRACES} recorded
            traces. INV-001 holds again.
          </p>
          <button
            type="button"
            onClick={() => demo.reopen(inv.id)}
            className="il-btn il-btn-ghost il-btn-sm self-start sm:self-auto"
          >
            <RotateCcw size={14} aria-hidden /> Reopen demo
          </button>
        </div>
      )}

      <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [
            "Violations",
            String(inv.violations),
            resolved ? "text-ink" : "text-brick",
          ],
          ["First seen", "14:02:11", "text-ink"],
          ["Revenue at risk", "€3,184", "text-ink"],
          ["Dashboards", "All green", "text-sage"],
        ].map(([k, v, c]) => (
          <div key={k} className="il-panel px-4 py-3.5">
            <dt className="il-label !text-[0.6rem]">{k}</dt>
            <dd className={`mt-1 font-display text-xl font-semibold ${c}`}>
              {v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card
          eyebrow={`Reconstructed workflow · ${TRACE.length} events`}
          title="ord_4821"
          className="min-w-0"
        >
          <TraceTimeline active={active} onSelect={setActive} />
        </Card>
        <Card eyebrow="Cited evidence" title="Raw sources" className="min-w-0">
          <EvidenceList
            activeEvent={active}
            onSelect={(e) => setActive(e.event)}
          />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card eyebrow="Diagnosis" title="Why the reservation disappeared">
          <div className="space-y-3 leading-relaxed text-ink-2">
            <p>
              Payment for <span className="font-mono text-ink">ord_4821</span>{" "}
              was captured{cite("E1")} while its{" "}
              <span className="font-mono text-ink">inventory.reserve</span>{" "}
              message was delivered twice{cite("E2")}. A consumer group
              rebalance moved partition 7 to{" "}
              <span className="font-mono text-ink">inventory-3</span> mid-write
              {cite("E3")}.
            </p>
            <p>
              Because the dedupe key is written <em>before</em> the reservation
              commits, the new consumer took the redelivery for a duplicate and
              acknowledged it without writing{cite("E4")}. No reservation exists
              for the order{cite("E5")}, yet every service reported success.
            </p>
            <p className="rounded-[var(--il-radius-sm)] bg-moon/30 px-4 py-3 text-sm text-ink">
              Root cause: the dedupe write and the reservation write are not
              atomic. Any rebalance between them loses the reservation.
            </p>
          </div>
        </Card>
        <Card eyebrow={`${inv.violations} orders`} title="Affected orders">
          <ul className="divide-y divide-rock/10 text-sm">
            {AFFECTED.map(([o, amt, t]) => (
              <li key={o} className="flex items-center gap-3 py-2.5">
                <span className="font-mono text-ink">{o}</span>
                <span className="ml-auto font-mono text-ink-2">{amt}</span>
                <span className="w-16 text-right font-mono text-xs text-ink-3">
                  {t}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-3">
            and {inv.violations - AFFECTED.length} more, all captured, none
            reserved.
          </p>
        </Card>
      </div>

      <section className="mt-5" aria-labelledby="repairs-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="il-label mb-1 flex items-center gap-1.5">
              <FlaskConical size={13} aria-hidden /> Verification
            </p>
            <h2
              id="repairs-title"
              className="font-display text-2xl font-semibold"
            >
              Candidate repairs
            </h2>
          </div>
          <p className="max-w-md text-sm text-ink-2">
            Each fix is replayed against every recorded violating trace, and
            checked against all other invariants too.
          </p>
        </div>
        <ul className="grid gap-4 lg:grid-cols-3">
          {REPAIRS.map((r) => (
            <RepairCard
              key={r.id}
              repair={r}
              investigation={inv}
              resolvedWith={resolvedWith}
            />
          ))}
        </ul>
      </section>
    </>
  )
}
