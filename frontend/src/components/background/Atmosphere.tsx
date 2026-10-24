import { useEffect, useRef } from "react"
import { subscribePointer } from "@/lib/pointer"
import { useReducedMotion } from "@/hooks/useReducedMotion"

/**
 * Page-wide atmospheric layer: paper + lavender mist gradients, a faint ink
 * grid, a cursor light, and one lightweight 2D canvas of drifting sakura
 * petals (no extra WebGL context).
 */
export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => subscribePointer(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    let w = 0
    let h = 0
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const count = w < 768 ? 16 : 34
    const petals = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.6 + 1.6,
      vx: Math.random() * 10 + 4,
      vy: Math.random() * 9 + 5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.2,
      sway: Math.random() * Math.PI * 2,
      a: Math.random() * 0.35 + 0.25,
      deep: Math.random() < 0.3,
    }))

    let raf = 0
    let last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, w, h)
      for (const p of petals) {
        p.sway += dt * 0.9
        p.x += (p.vx + Math.sin(p.sway) * 8) * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (p.y > h + 8) {
          p.y = -8
          p.x = Math.random() * w
        }
        if (p.x > w + 8) p.x = -8
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2)
        ctx.fillStyle = p.deep
          ? `rgba(210,68,127,${p.a * 0.7})`
          : `rgba(243,169,200,${p.a})`
        ctx.fill()
        ctx.restore()
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [reduced])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Paper sky with lavender cloud and blue-grey mist */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 70% at 80% 10%, rgba(220,217,228,0.9) 0%, transparent 55%)," +
            "radial-gradient(80% 60% at 5% 95%, rgba(189,186,203,0.45) 0%, transparent 60%)," +
            "radial-gradient(60% 40% at 90% 100%, rgba(244,207,219,0.55) 0%, transparent 70%)," +
            "linear-gradient(180deg, #fbfafb 0%, #f5f3f7 60%, #f2f0f5 100%)",
        }}
      />
      <div
        className="absolute -right-[10%] -top-[20%] h-[80vh] w-[70vw] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(244,207,219,0.7), transparent 65%)",
          animation: "il-drift 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -left-[15%] bottom-[-25%] h-[70vh] w-[60vw] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(143,136,176,0.35), transparent 65%)",
          animation: "il-drift 28s ease-in-out infinite reverse",
        }}
      />
      {/* Fine technical grid, masked so it fades at edges */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(44,48,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(44,48,61,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 60% 40%, #000 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 60% 40%, #000 30%, transparent 80%)",
        }}
      />
      {/* Cursor-following light field (position driven by CSS vars, no React state) */}
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(600px circle at var(--il-px, 70%) var(--il-py, 35%), rgba(210,68,127,0.06), transparent 60%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
