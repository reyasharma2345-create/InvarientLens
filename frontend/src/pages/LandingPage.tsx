import { motion } from "framer-motion"
import { Link } from "react-router"
import { ArrowRight, Orbit } from "lucide-react"
import { HeroBackground } from "@/components/three/HeroBackground"
import { ProductSection } from "@/components/landing/ProductSection"
import { WorkflowSection } from "@/components/landing/WorkflowSection"
import { EvidenceSection } from "@/components/landing/EvidenceSection"
import { CtaSection } from "@/components/landing/CtaSection"

const fade = (d: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] as const },
})

export function LandingPage() {
  return (
    <>
      <section
        className="relative isolate flex min-h-[100svh] items-center overflow-hidden"
        aria-label="Abstract liquid sculpture: three service flows merge and split, and one is severed — a broken business invariant"
      >
        <HeroBackground />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-28 md:px-8 lg:pt-20">
          <div className="max-w-xl">
            <motion.p
              {...fade(0.05)}
              className="il-label mb-6 flex items-center gap-2"
            >
              <Orbit size={14} className="text-bloom" /> Distributed failure
              intelligence
            </motion.p>
            <motion.h1
              {...fade(0.15)}
              className="font-display text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-[4.4rem]"
            >
              See the <span className="text-bloom">failures</span> hiding{" "}
              <span className="text-ink-2">between</span> your{" "}
              <span className="bg-gradient-to-r from-bloom to-lavender bg-clip-text text-transparent">
                services.
              </span>
            </motion.h1>
            <motion.p
              {...fade(0.28)}
              className="mt-6 max-w-md text-base leading-relaxed text-ink-2 sm:text-lg"
            >
              InvariantLens reconstructs workflows across services, detects
              broken business invariants, and traces every diagnosis back to
              evidence — even when each service reports healthy.
            </motion.p>
            <motion.div {...fade(0.4)} className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/app/investigations/IL-214"
                className="il-btn il-btn-primary"
              >
                Launch Investigation <ArrowRight size={18} />
              </Link>
              <Link to="/#product" className="il-btn il-btn-outline">
                Explore the System
              </Link>
            </motion.div>
            <motion.dl
              {...fade(0.55)}
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-rock/10 pt-6"
            >
              {[
                ["3", "services traced"],
                ["1", "invariant broken"],
                ["5", "stage workflow"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="il-label !text-[0.6rem]">{l}</dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{v}</dd>
                </div>
              ))}
            </motion.dl>
            <p className="mt-4 font-mono text-[0.65rem] text-ink-3">
              Demo figures · simulated trace data
            </p>
          </div>
        </div>
      </section>

      <ProductSection />
      <WorkflowSection />
      <EvidenceSection />
      <CtaSection />
    </>
  )
}
