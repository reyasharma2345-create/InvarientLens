import type { ReactNode } from "react"
import { motion } from "framer-motion"

export function SectionHeading({
  index,
  eyebrow,
  title,
  aside,
}: {
  index: string
  eyebrow: string
  title: ReactNode
  aside?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"
    >
      <div>
        <p className="il-label mb-3">
          {index} — {eyebrow}
        </p>
        <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      {aside && <p className="max-w-sm leading-relaxed text-ink-2">{aside}</p>}
    </motion.div>
  )
}
