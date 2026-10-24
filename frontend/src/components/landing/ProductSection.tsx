import { motion } from "framer-motion"
import {
  GitBranch,
  ShieldAlert,
  Activity,
  CircleCheck,
  CircleAlert,
} from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { SERVICES, INVARIANTS } from "@/data/demo"
import { SERVICE_STYLE } from "@/components/investigation/serviceStyle"
import { SectionHeading } from "./SectionHeading"

const FEATURES = [
  {
    icon: GitBranch,
    title: "Workflow reconstruction",
    body: "Stitch events from Orders, Payments and Inventory into one causal timeline.",
    accent: "bloom" as const,
  },
  {
    icon: ShieldAlert,
    title: "Invariant violations",
    body: "“Every captured payment has reserved stock” — find where the rule silently broke.",
    accent: "brick" as const,
  },
  {
    icon: Activity,
    title: "Verified repairs",
    body: "Replay candidate fixes against the trace and prove the invariant holds again.",
    accent: "gold" as const,
  },
]

const broken = INVARIANTS[0]

export function ProductSection() {
  return (
    <section
      id="product"
      className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-28 pt-8 md:px-8"
    >
      <SectionHeading
        index="01"
        eyebrow="Product"
        title="Healthy services. Broken business."
        aside="Monitoring tells you each service is up. InvariantLens checks whether, together, they still did the right thing."
      />

      {/* What dashboards say vs. what actually happened */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="il-panel mb-5 grid overflow-hidden md:grid-cols-2"
      >
        <div className="p-6 sm:p-8">
          <p className="il-label mb-5">What your dashboards report</p>
          <ul className="space-y-3">
            {SERVICES.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-[var(--il-radius-sm)] border border-rock/10 bg-white/60 px-4 py-3"
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${SERVICE_STYLE[s.id].dot}`}
                    aria-hidden
                  />{" "}
                  {s.name}
                </span>
                <span className="flex items-center gap-4 font-mono text-xs text-ink-2">
                  <span className="hidden sm:inline">p95 {s.p95}</span>
                  <span className="flex items-center gap-1 text-sage">
                    <CircleCheck size={14} aria-hidden /> {s.uptime}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-rock/10 bg-gradient-to-br from-moon/40 via-white/40 to-transparent p-6 sm:p-8 md:border-l md:border-t-0">
          <p className="il-label mb-5">What InvariantLens sees</p>
          <p className="flex items-center gap-2 text-sm font-medium text-brick">
            <CircleAlert size={16} aria-hidden /> {broken.id} broken
          </p>
          <p className="mt-2 font-display text-2xl font-semibold leading-snug tracking-tight">
            {broken.name}
          </p>
          <p className="mt-3 font-mono text-sm text-ink-2">{broken.rule}</p>
          <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-rock/10 pt-5">
            {[
              ["37", "orders charged, no stock"],
              ["4,612", "workflows checked"],
              ["14:02", "first violation"],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col-reverse">
                <dt className="mt-1 text-xs leading-snug text-ink-3">{l}</dt>
                <dd className="font-display text-2xl text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <GlassCard key={f.title} accent={f.accent} delay={i * 0.1}>
            <div className="p-7">
              <div className="mb-10 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rock/10 bg-white/70">
                  <f.icon
                    size={20}
                    className={
                      f.accent === "brick"
                        ? "text-brick"
                        : f.accent === "gold"
                          ? "text-gold"
                          : "text-bloom"
                    }
                  />
                </span>
                <span className="il-label">0{i + 1}</span>
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-2">{f.body}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
