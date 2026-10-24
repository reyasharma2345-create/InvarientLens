import { Navigate, NavLink, Outlet, useLocation } from "react-router"
import { LayoutDashboard, LogOut, ScanSearch, ShieldCheck } from "lucide-react"
import { Atmosphere } from "@/components/background/Atmosphere"
import { Logo } from "@/components/layout/Logo"
import { demo, useDemo } from "@/lib/demoStore"

const NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  {
    to: "/app/investigations",
    label: "Investigations",
    icon: ScanSearch,
    end: false,
  },
  { to: "/app/invariants", label: "Invariants", icon: ShieldCheck, end: false },
]

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition-colors max-[400px]:px-2 md:flex-none md:px-3.5 ${
    isActive
      ? "bg-white text-ink shadow-sm ring-1 ring-rock/10"
      : "text-ink-2 hover:bg-white/60 hover:text-ink"
  }`

/** Authenticated shell for the demo workspace. */
export function AppLayout() {
  const session = useDemo((s) => s.session)
  const location = useLocation()

  if (!session)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )

  const initials = session.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="relative min-h-screen">
      <Atmosphere />
      <header className="sticky top-0 z-40 px-3 pt-3">
        <div className="il-glass mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--il-radius-lg)] px-4 py-2.5 md:flex-nowrap md:rounded-full md:px-6">
          <Logo />
          <nav
            aria-label="Workspace"
            className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:w-auto"
          >
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={tab}>
                <n.icon size={16} className="max-[400px]:hidden" aria-hidden />{" "}
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-sm font-medium text-ink">
                {session.name}
              </span>
              <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-ink-3">
                {session.org}
              </span>
            </span>
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blush to-bloom font-display text-sm font-semibold text-white"
            >
              {initials}
            </span>
            <button
              type="button"
              onClick={demo.signOut}
              className="il-btn il-btn-ghost il-btn-sm !px-2.5"
              aria-label="Sign out"
            >
              <LogOut size={16} aria-hidden />{" "}
              <span className="hidden lg:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
