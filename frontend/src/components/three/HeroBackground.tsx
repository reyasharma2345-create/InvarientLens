import { lazy, Suspense, useEffect, useState } from "react"
import { hasWebGL, isConstrainedDevice } from "@/lib/device"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

/** Lazy-load the scene, retrying once — chunk fetches can fail transiently. */
const HeroScene = lazy(() =>
  import("./HeroScene").catch(
    () =>
      new Promise<typeof import("./HeroScene")>((resolve, reject) => {
        setTimeout(() => import("./HeroScene").then(resolve, reject), 1200)
      }),
  ),
)

/**
 * Full-bleed hero background: misty paper sky with a pale pink moon behind
 * the real-time liquid sculpture, and a soft paper fade on the left for copy.
 */
export function HeroBackground() {
  const reduced = useReducedMotion()
  const [env, setEnv] = useState<{
    webgl: boolean
    low: boolean
  } | null>(null)

  useEffect(() => {
    setEnv({ webgl: hasWebGL(), low: isConstrainedDevice() })
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      // Fade the whole hero (sculpture included) into the page atmosphere — no seam.
      style={{
        maskImage: "linear-gradient(180deg, #000 72%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, #000 72%, transparent 100%)",
      }}
    >
      {/* Mist + pink moon (also the no-WebGL fallback). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 80% 12%, rgba(220,217,228,0.95), transparent 70%)," +
            "radial-gradient(45% 40% at 95% 85%, rgba(189,186,203,0.5), transparent 70%)," +
            "linear-gradient(180deg, rgba(245,243,247,0.9) 0%, rgba(251,250,251,0) 70%)",
        }}
      />
      <div
        className="absolute left-[70%] top-[46%] aspect-square w-[min(46rem,62vw)] -translate-x-1/2 -translate-y-1/2 rounded-full max-lg:left-[72%] max-lg:top-[22%] max-lg:w-[85vw]"
        style={{
          background:
            "radial-gradient(circle at 42% 38%, #fbe4ec 0%, #f4cfdb 45%, rgba(239,186,205,0.55) 68%, rgba(244,207,219,0) 72%)",
          filter: "blur(2px)",
        }}
      />
      {env?.webgl && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <div className="absolute inset-0 animate-[il-fade-in_2.2s_ease-out_both]">
              <HeroScene reduced={reduced} lowDetail={env.low} />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Readability: soft paper fade on the left and a light mist under the nav. */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_95%_at_8%_55%,rgba(251,250,251,0.95)_0%,rgba(251,250,251,0.78)_38%,rgba(251,250,251,0)_72%)] max-lg:bg-[linear-gradient(180deg,rgba(251,250,251,0.1)_0%,rgba(251,250,251,0.55)_30%,rgba(251,250,251,0.88)_60%,rgba(251,250,251,0.94)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-paper/80 to-transparent" />
    </div>
  )
}
