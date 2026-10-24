import { useRef, type ReactNode } from "react"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion"
import { useReducedMotion } from "@/hooks/useReducedMotion"

type Props = {
  children: ReactNode
  className?: string
  /** Max tilt in degrees. */
  intensity?: number
  accent?: "bloom" | "gold" | "brick"
  delay?: number
}

const ACCENT = { bloom: "210,68,127", gold: "162,132,58", brick: "196,65,63" }

/**
 * Tactile 3D glass card: pointer-driven perspective tilt via springs,
 * a moving specular highlight, edge illumination, and an in-view reveal.
 * Motion values bypass React rendering, so hovering does not re-render.
 */
export function GlassCard({
  children,
  className = "",
  intensity = 9,
  accent = "bloom",
  delay = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const spring = { stiffness: 180, damping: 18, mass: 0.6 }
  const rotX = useSpring(
    useTransform(my, [0, 1], [intensity, -intensity]),
    spring,
  )
  const rotY = useSpring(
    useTransform(mx, [0, 1], [-intensity, intensity]),
    spring,
  )
  const hx = useTransform(mx, (v) => `${v * 100}%`)
  const hy = useTransform(my, (v) => `${v * 100}%`)
  const rgb = ACCENT[accent]
  const highlight = useMotionTemplate`radial-gradient(420px circle at ${hx} ${hy}, rgba(${rgb},0.1), transparent 55%)`

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const reset = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
      className={className}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        whileHover={reduced ? undefined : { y: -6 }}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="il-glass group relative h-full overflow-hidden rounded-[var(--il-radius-lg)] transition-[border-color] duration-500 hover:border-[var(--il-glass-border-hi)]"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: highlight }}
        />
        {/* Top edge illumination */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${rgb},0.7), transparent)`,
          }}
        />
        <div className="relative" style={{ transform: "translateZ(30px)" }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}
