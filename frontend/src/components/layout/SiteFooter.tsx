import { Link } from "react-router"
import { Logo } from "./Logo"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", to: "/#product" },
      { label: "How it works", to: "/#workflow" },
      { label: "Evidence", to: "/#evidence" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/signup" },
      { label: "Open the demo", to: "/app" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-rock/10 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
            Distributed failure intelligence — find the business rules your
            healthy services broke.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="il-label mb-4">{c.title}</p>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-ink-2 transition-colors hover:text-bloom"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-rock/10 px-5 py-6 text-xs text-ink-3 sm:flex-row sm:justify-between md:px-8">
        <p>© {new Date().getFullYear()} InvariantLens</p>
        <p className="font-mono">
          Demo build · simulated trace data · no backend
        </p>
      </div>
    </footer>
  )
}
