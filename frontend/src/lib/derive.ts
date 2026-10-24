import { INVESTIGATIONS, type Investigation, type Invariant } from "@/data/demo"

/** An investigation is resolved by seed data or by a verified repair in this browser. */
export const isResolved = (
  inv: Investigation,
  resolved: Record<string, string>,
) => !!(inv.resolvedBy || resolved[inv.id])

/** An invariant is currently broken while its live investigation remains open. */
export function isBroken(
  invariant: Invariant,
  resolved: Record<string, string>,
) {
  if (!invariant.violations) return false
  const live = INVESTIGATIONS.find(
    (i) => i.invariant === invariant.id && i.hasTrace,
  )
  return live ? !resolved[live.id] : false
}

export const holdRate = (i: Invariant) =>
  i.checked
    ? ((1 - i.violations / i.checked) * 100).toFixed(i.violations ? 2 : 0) + "%"
    : "—"
