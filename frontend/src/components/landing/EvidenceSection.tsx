import { useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router"
import { ArrowRight, Quote } from "lucide-react"
import { EVIDENCE } from "@/data/demo"
import { TraceTimeline } from "@/components/investigation/TraceTimeline"
import { EvidenceList } from "@/components/investigation/EvidenceList"
import { SectionHeading } from "./SectionHeading"

export function EvidenceSection() {
  const [active, setActive] = useState("e6")
  const cited = EVIDENCE.filter((e) => e.event === active).map((e) => e.id)
  return (
    <section
      id="evidence"
      className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-28 md:px-8"
    >
      <SectionHeading
        index="03"
        eyebrow="Evidence"
        title="Every claim traces back to a span, a log line or a row."
        aside="No black-box scores. Click any event or citation — the explanation and the raw evidence move together."
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="il-panel grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.5fr_1fr]"
      >
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="il-label">Reconstructed workflow</p>
              <p className="mt-1 font-mono text-sm text-ink">
                ord_4821 · 9 events · 3 services
              </p>
            </div>
            <span className="il-chip text-brick">INV-001 violated</span>
          </div>
          <TraceTimeline active={active} onSelect={setActive} />
          <figure className="mt-6 flex gap-3 rounded-[var(--il-radius-md)] bg-gradient-to-r from-moon/40 to-transparent p-5">
            <Quote size={18} className="mt-1 shrink-0 text-bloom" aria-hidden />
            <div>
              <blockquote className="leading-relaxed text-ink-2">
                The reservation was lost when Inventory's consumer group
                rebalanced mid-write: the redelivered message hit the dedupe
                cache and was acknowledged without being stored.
              </blockquote>
              <figcaption className="mt-2 font-mono text-xs text-ink-3">
                {cited.length
                  ? `This event is cited as ${cited.join(", ")}`
                  : "Diagnosis cites E1–E5"}
              </figcaption>
            </div>
          </figure>
        </div>
        <div className="min-w-0">
          <p className="il-label mb-4">Cited evidence</p>
          <EvidenceList
            activeEvent={active}
            onSelect={(e) => setActive(e.event)}
          />
          <Link
            to="/app/investigations/IL-214"
            className="il-btn il-btn-outline il-btn-sm mt-5"
          >
            Open the full investigation <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
