import type { ServiceId, Tone } from "@/data/demo"

/** Service colours mirror the hero sculpture: pearl/lavender, sakura, ink-rock. */
export const SERVICE_STYLE: Record<ServiceId, {
  dot: string
  stroke: string
  border: string
  text: string
}> = {
  orders: {
    dot: "bg-lavender",
    stroke: "stroke-lavender",
    border: "border-lavender",
    text: "text-lavender",
  },
  payments: {
    dot: "bg-bloom",
    stroke: "stroke-bloom",
    border: "border-bloom",
    text: "text-bloom",
  },
  inventory: {
    dot: "bg-rock",
    stroke: "stroke-rock",
    border: "border-rock",
    text: "text-rock",
  },
}

export const TONE_LABEL: Record<Tone, string> = {
  ok: "ok",
  warn: "warning",
  fail: "failure",
  missing: "missing",
}
