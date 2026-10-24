import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
} from 'lucide-react'
import {
  INVARIANTS,
  INVESTIGATIONS,
  SERVICES,
  VIOLATIONS_24H,
  serviceName,
} from '@/data/demo'
import { PageHeader } from '@/components/app/PageHeader'
import { Sparkline } from '@/components/app/Sparkline'
import { StatusChip } from '@/components/ui/StatusChip'
import { SERVICE_STYLE } from '@/components/investigation/serviceStyle'
import { useDemo } from '@/lib/demoStore'
import { isBroken, isResolved } from '@/lib/derive'

const rise = (d: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] as const },
})

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export function OverviewPage() {
  const session = useDemo((s) => s.session)
  const resolved = useDemo((s) => s.resolved)
  const custom = useDemo((s) => s.invariants)
  const paused = useDemo((s) => s.paused)
  const live = INVESTIGATIONS[0]
  const liveOpen = !isResolved(live, resolved)
  const all = [...INVARIANTS, ...custom]
  // Paused invariants are not evaluated, so they count as neither holding nor broken.
  const active = all.filter((i) => !paused.includes(i.id))
  const broken = active.filter((i) => isBroken(i, resolved))
  const peak = Math.max(...VIOLATIONS_24H)
  const total = VIOLATIONS_24H.reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader
        eyebrow="Overview · last 24 hours"
        title={`${greeting()}, ${session?.name.split(" ")[0] ?? "there"}.`}
        lede={`Three services, ${all.length} invariants, every workflow checked as it completes.`}
        actions={
          <Link
            to="/app/invariants"
            className="il-btn il-btn-outline il-btn-sm"
          >
            Manage invariants
          </Link>
        }
      />

      <motion.div {...rise(0)}>
        {liveOpen ? (
          <Link
            to={`/app/investigations/${live.id}`}
            className="group mb-6 flex flex-col gap-4 rounded-[var(--il-radius-lg)] border border-brick/25 bg-gradient-to-r from-brick/10 via-moon/30 to-white/40 p-5 transition-colors hover:border-brick/40 sm:flex-row sm:items-center sm:p-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brick text-white">
              <CircleAlert size={20} aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-semibold">
                {live.violations} orders were charged without reserved stock
              </span>
              <span className="text-sm text-ink-2">
                INV-001 broken since 14:02 · all services report healthy ·{" "}
                {live.id} is open
              </span>
            </span>
            <span className="il-btn il-btn-primary il-btn-sm self-start sm:self-auto">
              Investigate{" "}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ) : (
          <div className="mb-6 flex items-center gap-4 rounded-[var(--il-radius-lg)] border border-sage/25 bg-gradient-to-r from-sage/10 to-white/40 p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-white">
              <CircleCheck size={20} aria-hidden />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold">
                All invariants hold
              </span>
              <span className="text-sm text-ink-2">
                {live.id} resolved with “{resolved[live.id]}”.
              </span>
            </span>
          </div>
        )}
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {SERVICES.map((s, i) => (
          <motion.section
            key={s.id}
            {...rise(0.06 + i * 0.05)}
            className="il-panel p-5"
            aria-label={`${s.name} service health`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${SERVICE_STYLE[s.id].dot}`}
                    aria-hidden
                  />{" "}
                  {s.name}
                </h2>
                <p className="text-sm text-ink-3">{s.role}</p>
              </div>
              <StatusChip status="healthy" />
            </div>
            <Sparkline
              values={s.spark}
              className={`mt-4 ${SERVICE_STYLE[s.id].text}`}
            />
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-rock/10 pt-3">
              {[
                ["Uptime", s.uptime],
                ["p95", s.p95],
                ["Errors", s.errors],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="il-label !text-[0.6rem]">{k}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <motion.section
          {...rise(0.22)}
          className="il-panel min-w-0 p-5 sm:p-6"
          aria-labelledby="chart-title"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="il-label">INV-001 · violations per hour</p>
              <h2
                id="chart-title"
                className="mt-1 font-display text-xl font-semibold"
              >
                {total} violations since the 13:00 deploy
              </h2>
            </div>
            <span className="font-mono text-xs text-ink-3">peak {peak}/h</span>
          </div>
          <div
            className="flex h-40 items-end gap-[3px]"
            role="img"
            aria-label={`Hourly violations over 24 hours: none before 13:00, peaking at ${peak} per hour afterwards`}
          >
            {VIOLATIONS_24H.map((v, h) => (
              <div key={h} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className={`rounded-t-sm ${
                    v
                      ? "bg-gradient-to-t from-bloom to-blush"
                      : "h-[3px] bg-rock/10"
                  }`}
                  style={v ? { height: `${(v / peak) * 100}%` } : undefined}
                />
              </div>
            ))}
          </div>
          <div
            className="mt-2 flex justify-between font-mono text-[0.625rem] text-ink-3"
            aria-hidden
          >
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>now</span>
          </div>
        </motion.section>

        <motion.section
          {...rise(0.28)}
          className="il-panel min-w-0 p-5 sm:p-6"
          aria-labelledby="inv-title"
        >
          <div className="mb-4 flex items-end justify-between">
            <h2 id="inv-title" className="font-display text-xl font-semibold">
              Invariants
            </h2>
            <span className="font-mono text-xs text-ink-3">
              {active.length - broken.length}/{active.length} hold
              {paused.length ? ` · ${all.length - active.length} paused` : ""}
            </span>
          </div>
          <ul className="space-y-2.5">
            {all.slice(0, 6).map((inv) => (
              <li
                key={inv.id}
                className={`flex items-center gap-3 text-sm ${
                  paused.includes(inv.id) ? "text-ink-3" : ""
                }`}
              >
                {paused.includes(inv.id) ? (
                  <CircleDashed
                    size={16}
                    className="shrink-0 text-ink-3"
                    aria-label="Paused"
                  />
                ) : isBroken(inv, resolved) ? (
                  <CircleAlert
                    size={16}
                    className="shrink-0 text-brick"
                    aria-label="Broken"
                  />
                ) : (
                  <CircleCheck
                    size={16}
                    className="shrink-0 text-sage"
                    aria-label="Holds"
                  />
                )}
                <span className="truncate">{inv.name}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/app/invariants"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-bloom hover:underline"
          >
            All invariants <ArrowRight size={14} aria-hidden />
          </Link>
        </motion.section>
      </div>

      <motion.section
        {...rise(0.34)}
        className="il-panel mt-5 p-5 sm:p-6"
        aria-labelledby="recent-title"
      >
        <div className="mb-2 flex items-end justify-between">
          <h2 id="recent-title" className="font-display text-xl font-semibold">
            Recent investigations
          </h2>
          <Link
            to="/app/investigations"
            className="text-sm font-medium text-bloom hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="divide-y divide-rock/10">
          {INVESTIGATIONS.map((inv) => (
            <li key={inv.id}>
              <Link
                to={`/app/investigations/${inv.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 transition-colors hover:text-bloom"
              >
                <span className="font-mono text-xs text-ink-3">{inv.id}</span>
                <span className="min-w-0 flex-1 font-medium">{inv.title}</span>
                <span className="hidden text-sm text-ink-3 md:inline">
                  {inv.services.map(serviceName).join(" · ")}
                </span>
                <StatusChip
                  status={isResolved(inv, resolved) ? "resolved" : "open"}
                />
              </Link>
            </li>
          ))}
        </ul>
      </motion.section>
    </>
  )
}
