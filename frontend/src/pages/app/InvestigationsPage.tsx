import { useMemo, useState } from "react"
import { Link } from "react-router"
import { ArrowRight, Search } from "lucide-react"
import { INVARIANTS, INVESTIGATIONS, serviceName } from "@/data/demo"
import { PageHeader } from "@/components/app/PageHeader"
import { StatusChip } from "@/components/ui/StatusChip"
import { SERVICE_STYLE } from "@/components/investigation/serviceStyle"
import { useDemo } from "@/lib/demoStore"
import { isResolved } from "@/lib/derive"

const FILTERS = ["all", "open", "resolved"] as const

export function InvestigationsPage() {
  const resolved = useDemo((s) => s.resolved)
  const [filter, setFilter] = useState<typeof FILTERS[number]>("all")
  const [q, setQ] = useState("")

  const rows = useMemo(
    () =>
      INVESTIGATIONS.filter((i) => {
        const r = isResolved(i, resolved)
        if (filter === "open" && r) return false
        if (filter === "resolved" && !r) return false
        return `${i.id} ${i.title} ${i.invariant}`
          .toLowerCase()
          .includes(q.trim().toLowerCase())
      }),
    [filter, q, resolved],
  )

  return (
    <>
      <PageHeader
        eyebrow="Investigations"
        title="Where invariants broke"
        lede="Each investigation follows one broken rule from first violation to verified repair."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="radiogroup"
          aria-label="Filter by status"
          className="inline-flex self-start rounded-full border border-rock/10 bg-white/60 p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                filter === f
                  ? "bg-white text-ink shadow-sm ring-1 ring-rock/10"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <span className="sr-only">Search investigations</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            type="search"
            className="il-input !pl-10"
            placeholder="Search by id, title or invariant"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((inv) => {
            const r = isResolved(inv, resolved)
            const rule = INVARIANTS.find((x) => x.id === inv.invariant)
            return (
              <li key={inv.id}>
                <Link
                  to={`/app/investigations/${inv.id}`}
                  className="il-panel group grid gap-4 p-5 transition-colors hover:!border-bloom/30 sm:p-6 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-ink-3">
                        {inv.id}
                      </span>
                      <StatusChip status={r ? "resolved" : "open"} />
                      <StatusChip status={inv.severity} />
                    </div>
                    <h2 className="font-display text-xl font-semibold transition-colors group-hover:text-bloom">
                      {inv.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-2">
                      {rule ? `${rule.id} · ${rule.name}` : inv.invariant}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-6 md:justify-end">
                    <dl className="flex gap-6 text-sm">
                      <div>
                        <dt className="il-label !text-[0.6rem]">Violations</dt>
                        <dd
                          className={`font-mono ${
                            r ? "text-ink-2" : "text-brick"
                          }`}
                        >
                          {inv.violations}
                        </dd>
                      </div>
                      <div>
                        <dt className="il-label !text-[0.6rem]">Opened</dt>
                        <dd className="font-mono text-ink-2">{inv.opened}</dd>
                      </div>
                      <div>
                        <dt className="il-label !text-[0.6rem]">Services</dt>
                        <dd
                          className="mt-1.5 flex gap-1"
                          aria-label={inv.services.map(serviceName).join(", ")}
                        >
                          {inv.services.map((s) => (
                            <span
                              key={s}
                              className={`h-2.5 w-2.5 rounded-full ${SERVICE_STYLE[s].dot}`}
                              aria-hidden
                            />
                          ))}
                        </dd>
                      </div>
                    </dl>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-bloom"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="il-panel p-10 text-center">
          <p className="font-display text-lg font-semibold">
            No investigations match
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Try another filter or clear the search.
          </p>
          <button
            type="button"
            className="il-btn il-btn-outline il-btn-sm mt-5"
            onClick={() => {
              setQ("")
              setFilter("all")
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  )
}
