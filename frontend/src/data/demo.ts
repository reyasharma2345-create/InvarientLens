/*
 * Simulated demo data. Everything InvariantLens shows is derived from this one
 * scenario: order ord_4821 was charged but its stock reservation was silently
 * dropped after an Inventory consumer rebalance — while every service stayed green.
 */

export type ServiceId = "orders" | "payments" | "inventory"
export type Tone = "ok" | "warn" | "fail" | "missing"

export const SERVICES: {
  id: ServiceId
  name: string
  role: string
  uptime: string
  p95: string
  errors: string
  throughput: string
  spark: number[]
}[] = [
  {
    id: "orders",
    name: "Orders",
    role: "Checkout & order lifecycle",
    uptime: "99.98%",
    p95: "84 ms",
    errors: "0.02%",
    throughput: "1.2k/min",
    spark: [42, 44, 41, 47, 52, 49, 55, 58, 54, 57, 61, 59],
  },
  {
    id: "payments",
    name: "Payments",
    role: "Authorise & capture",
    uptime: "99.99%",
    p95: "212 ms",
    errors: "0.04%",
    throughput: "1.1k/min",
    spark: [38, 40, 39, 43, 47, 45, 50, 53, 51, 52, 56, 55],
  },
  {
    id: "inventory",
    name: "Inventory",
    role: "Stock reservations",
    uptime: "99.95%",
    p95: "61 ms",
    errors: "0.01%",
    throughput: "1.2k/min",
    spark: [40, 43, 42, 46, 50, 48, 52, 57, 60, 52, 58, 57],
  },
]

export const serviceName = (id: ServiceId) =>
  SERVICES.find((s) => s.id === id)!.name

export type TraceEvent = {
  id: string
  service: ServiceId
  /** ms after the first event */
  t: number
  label: string
  detail: string
  tone: Tone
}

export const TRACE: TraceEvent[] = [
  {
    id: 'e1',
    service: 'orders',
    t: 0,
    label: 'order placed',
    detail: 'Customer placed order ord_4821 for €84.20',
    tone: 'ok',
  },
  {
    id: 'e2',
    service: 'payments',
    t: 180,
    label: 'payment authorized',
    detail: 'Payment card authorized successfully',
    tone: 'ok',
  },
  {
    id: 'e3',
    service: 'orders',
    t: 260,
    label: 'stock reserve sent',
    detail: 'Orders asked Inventory service to reserve items',
    tone: 'ok',
  },
  {
    id: 'e4',
    service: 'inventory',
    t: 430,
    label: 'stock reserve received',
    detail: 'Inventory service started processing the request',
    tone: 'ok',
  },
  {
    id: 'e5',
    service: 'inventory',
    t: 1640,
    label: 'server switched mid-task',
    detail: 'Inventory server restarted while saving stock data',
    tone: 'warn',
  },
  {
    id: 'e6',
    service: 'inventory',
    t: 1910,
    label: 'duplicate check bug',
    detail: 'System mistakenly thought this task was already finished and skipped saving',
    tone: 'fail',
  },
  {
    id: 'e7',
    service: 'payments',
    t: 2120,
    label: 'payment charged',
    detail: 'Customer was successfully charged €84.20',
    tone: 'ok',
  },
  {
    id: 'e8',
    service: 'orders',
    t: 2380,
    label: 'order confirmed',
    detail: 'Order marked as successful and receipt sent',
    tone: 'ok',
  },
  {
    id: 'e9',
    service: 'inventory',
    t: 2600,
    label: 'stock missing in database',
    detail: 'Problem found: Customer was charged, but stock was never actually saved!',
    tone: 'missing',
  },
]

/** Causal edges [from, to] between trace events. */
export const TRACE_LINKS: [string, string][] = [
  ["e1", "e2"],
  ["e1", "e3"],
  ["e3", "e4"],
  ["e4", "e5"],
  ["e5", "e6"],
  ["e2", "e7"],
  ["e7", "e8"],
  ["e6", "e9"],
]

export type Evidence = {
  id: string
  kind: "span" | "broker" | "log" | "query" | "metric"
  source: string
  text: string
  event: string
}

export const EVIDENCE: Evidence[] = [
  {
    id: "E1",
    kind: "span",
    source: "payments · trace 7c1a…e9",
    text: "payments.capture ord_4821 → status=OK amount=€84.20",
    event: "e7",
  },
  {
    id: "E2",
    kind: "broker",
    source: "kafka · inventory.reserve",
    text: "offset 88412 on partition 7 delivered 2× (redelivery after rebalance)",
    event: "e3",
  },
  {
    id: "E3",
    kind: "metric",
    source: "kafka · consumer-group inventory",
    text: "rebalance at 14:02:10.7 — session timeout 1.5 s exceeded by inventory-2",
    event: "e5",
  },
  {
    id: "E4",
    kind: "log",
    source: "inventory-3 · stdout",
    text: "WARN dedupe hit key=rsv_ord_4821 → ack (no write)",
    event: "e6",
  },
  {
    id: "E5",
    kind: "query",
    source: "inventory-db · reservations",
    text: "SELECT * FROM reservations WHERE order_id='ord_4821' → 0 rows",
    event: "e9",
  },
]

export type RepairOutcome = "pass" | "fail"
export type Repair = {
  id: string
  title: string
  change: string
  outcome: RepairOutcome
  summary: string
  holds: string
  sideEffect?: string
}

export const REPAIRS: Repair[] = [
  {
    id: "R1",
    title: "Write the dedupe key in the reservation transaction",
    change:
      "inventory/reserve.ts — insert reservation and dedupe key atomically; ack only after commit.",
    outcome: "pass",
    summary:
      "Redelivered messages now find a committed reservation, or none at all, and redo the write.",
    holds: "37 / 37 traces hold",
  },
  {
    id: "R2",
    title: "Raise consumer session timeout to 10 s",
    change: "inventory/kafka.yaml — session.timeout.ms 1500 → 10000",
    outcome: "fail",
    summary:
      "Fewer rebalances, but deploy-time rebalances still drop reservations.",
    holds: "26 / 37 traces hold",
  },
  {
    id: "R3",
    title: "Re-check stock at capture and retry",
    change:
      "payments/capture.ts — query inventory before capture, retry on miss.",
    outcome: "fail",
    summary:
      "Every order gets stock, but retried captures charge some customers twice.",
    holds: "37 / 37 traces hold",
    sideEffect: "Breaks INV-004 “At most one capture per order” in 3 traces",
  },
]

export type Invariant = {
  id: string
  name: string
  rule: string
  services: ServiceId[]
  checked: number
  violations: number
  custom?: boolean
}

export const INVARIANTS: Invariant[] = [
  {
    id: "INV-001",
    name: "Every captured payment has reserved stock",
    rule: "captured(payment, o) ⇒ ∃ reservation(o)",
    services: ["payments", "inventory"],
    checked: 4612,
    violations: 37,
  },
  {
    id: "INV-002",
    name: "Refunded orders release reserved stock",
    rule: "refunded(o) ⇒ released(reservation(o)) within 5m",
    services: ["payments", "inventory"],
    checked: 318,
    violations: 0,
  },
  {
    id: "INV-003",
    name: "Order total equals captured amount",
    rule: "total(o) = Σ captured(payment, o)",
    services: ["orders", "payments"],
    checked: 4612,
    violations: 0,
  },
  {
    id: "INV-004",
    name: "At most one capture per order",
    rule: "count(captured(payment, o)) ≤ 1",
    services: ["payments"],
    checked: 4612,
    violations: 0,
  },
  {
    id: "INV-005",
    name: "Confirmed orders have a reservation before email",
    rule: "confirmed(o).t > reservation(o).t",
    services: ["orders", "inventory"],
    checked: 4598,
    violations: 0,
  },
]

export type Investigation = {
  id: string
  title: string
  invariant: string
  severity: "critical" | "minor"
  opened: string
  violations: number
  services: ServiceId[]
  /** Only the live investigation keeps its full trace. */
  hasTrace: boolean
  resolvedBy?: string
  resolvedAt?: string
}

export const INVESTIGATIONS: Investigation[] = [
  {
    id: "IL-214",
    title: "Charged orders shipped without reserved stock",
    invariant: "INV-001",
    severity: "critical",
    opened: "Today · 14:20",
    violations: 37,
    services: ["orders", "payments", "inventory"],
    hasTrace: true,
  },
  {
    id: "IL-209",
    title: "Refunds left stock locked after saga timeout",
    invariant: "INV-002",
    severity: "minor",
    opened: "Mon · 09:12",
    violations: 12,
    services: ["payments", "inventory"],
    hasTrace: false,
    resolvedBy: "Emit stock.release from the refund saga compensator",
    resolvedAt: "Mon · 16:40",
  },
  {
    id: "IL-201",
    title: "Multi-currency totals drifted by one cent",
    invariant: "INV-003",
    severity: "minor",
    opened: "Last week",
    violations: 3,
    services: ["orders", "payments"],
    hasTrace: false,
    resolvedBy: "Round in minor units before summing line items",
    resolvedAt: "Last week",
  },
]

/** INV-001 violations per hour, last 24 h (deploy at 13:00 triggers rebalances). */
export const VIOLATIONS_24H = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 9, 4, 3, 5, 2, 3, 1, 2, 1,
]

export const STAGES = [
  {
    key: "ingest",
    title: "Ingest",
    body: "Stream spans, logs, broker offsets and database reads from every service — no code changes.",
  },
  {
    key: "reconstruct",
    title: "Reconstruct",
    body: "Stitch events into one causal workflow per business entity, across queues and retries.",
  },
  {
    key: "evaluate",
    title: "Evaluate",
    body: "Check every reconstructed workflow against the business invariants you declare.",
  },
  {
    key: "diagnose",
    title: "Diagnose",
    body: "Pinpoint where the rule broke and cite each step of the explanation to raw evidence.",
  },
  {
    key: "verify",
    title: "Verify",
    body: "Replay candidate repairs against the recorded traces and prove the invariant holds again.",
  },
] as const
