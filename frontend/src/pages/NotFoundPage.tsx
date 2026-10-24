import { Link } from "react-router"
import { ArrowLeft, Compass } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[80svh] max-w-lg items-center px-5 py-28">
      <GlassCard className="w-full" intensity={5}>
        <div className="p-8 sm:p-10">
          <span className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl border border-rock/10 bg-white/70">
            <Compass size={20} className="text-bloom" />
          </span>
          <p className="il-label mb-3">404 · No trace found</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            This path broke an invariant.
          </h1>
          <p className="mt-3 leading-relaxed text-ink-2">
            The page you were looking for doesn't exist, or it moved while
            nobody was watching.
          </p>
          <Link to="/" className="il-btn il-btn-outline mt-8">
            <ArrowLeft size={16} /> Back to site
          </Link>
        </div>
      </GlassCard>
    </section>
  )
}
