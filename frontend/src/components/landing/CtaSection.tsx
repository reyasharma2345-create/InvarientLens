import { motion } from "framer-motion"
import { Link } from "react-router"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="il-panel relative overflow-hidden px-6 py-16 text-center sm:px-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/3 rounded-full bg-moon/70 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-lavender/20 blur-3xl"
        />
        <div className="relative">
          <p className="il-label mb-4">Start in minutes</p>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Find the rule your system broke{" "}
            <span className="bg-gradient-to-r from-bloom to-lavender bg-clip-text text-transparent">
              last Tuesday.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-ink-2">
            Open the demo investigation — a reconstructed trace, five cited
            pieces of evidence, and three repairs to replay.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/app/investigations/IL-214"
              className="il-btn il-btn-primary"
            >
              Open the demo <ArrowRight size={18} aria-hidden />
            </Link>
            <Link to="/signup" className="il-btn il-btn-outline">
              Create an account
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
