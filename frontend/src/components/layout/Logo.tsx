import { Link } from "react-router"

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5"
      aria-label="InvariantLens home"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="13" stroke="#8f88b0" strokeOpacity="0.55" />
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5"
          stroke="#d2447f"
          strokeOpacity="0.75"
          transform="rotate(-28 16 16)"
        />
        <path
          d="M16 9l6 7-6 7-6-7 6-7z"
          fill="#f3a9c8"
          fillOpacity="0.45"
          stroke="#2c303d"
        />
        <circle cx="25" cy="10.5" r="1.6" fill="#d2447f" />
      </svg>
      <span className="font-display text-[1.05rem] font-semibold tracking-tight text-ink">
        Invariant<span className="text-bloom">Lens</span>
      </span>
    </Link>
  )
}
