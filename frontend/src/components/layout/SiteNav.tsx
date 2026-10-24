import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import { Menu, X } from "lucide-react"
import { Logo } from "./Logo"
import { useDemo } from "@/lib/demoStore"

const LINKS = [
  { label: "Product", to: "/#product" },
  { label: "How it works", to: "/#workflow" },
  { label: "Evidence", to: "/#evidence" },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const signedIn = useDemo((s) => !!s.session)
  const location = useLocation()
  const appHref = signedIn ? "/app" : "/login"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  useEffect(() => setOpen(false), [location.pathname, location.hash])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Frosts once the page scrolls, so content and the sculpture never sit under bare links. */}
      <div
        className={`mx-3 mt-3 flex max-w-7xl items-center justify-between rounded-full border px-5 py-2.5 transition-[background,border-color,box-shadow] duration-500 md:px-8 xl:mx-auto ${
          scrolled ? "il-glass" : "border-transparent"
        }`}
      >
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-ink-2 transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {!signedIn && (
            <Link
              to="/login"
              className="text-sm text-ink-2 transition-colors hover:text-ink"
            >
              Sign in
            </Link>
          )}
          <Link to={appHref} className="il-btn il-btn-outline il-btn-sm">
            {signedIn ? "Open app" : "Launch app"}
          </Link>
        </div>
        <button
          className="rounded-lg p-2 text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav
          aria-label="Mobile"
          className="il-glass mx-3 mt-2 flex flex-col gap-1 rounded-2xl p-3 md:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-3 text-ink-2 hover:bg-rock/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          {!signedIn && (
            <Link
              to="/login"
              className="rounded-lg px-3 py-3 text-ink-2 hover:bg-rock/5 hover:text-ink"
            >
              Sign in
            </Link>
          )}
          <Link
            to={appHref}
            className="il-btn il-btn-primary mt-2 justify-center"
          >
            {signedIn ? "Open app" : "Launch app"}
          </Link>
        </nav>
      )}
    </header>
  )
}
