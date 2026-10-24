import { CircleAlert, CircleCheck, CircleDot, CircleDashed } from "lucide-react"

const VARIANTS = {
  holds: { cls: "text-sage bg-sage/10", icon: CircleCheck, label: "Holds" },
  broken: { cls: "text-brick bg-brick/10", icon: CircleAlert, label: "Broken" },
  open: { cls: "text-brick bg-brick/10", icon: CircleDot, label: "Open" },
  resolved: {
    cls: "text-sage bg-sage/10",
    icon: CircleCheck,
    label: "Resolved",
  },
  healthy: { cls: "text-sage bg-sage/10", icon: CircleCheck, label: "Healthy" },
  paused: { cls: "text-ink-3 bg-rock/5", icon: CircleDashed, label: "Paused" },
  critical: {
    cls: "text-brick bg-brick/10",
    icon: CircleAlert,
    label: "Critical",
  },
  minor: { cls: "text-gold bg-gold/10", icon: CircleDot, label: "Minor" },
} as const

export type ChipStatus = keyof typeof VARIANTS

export function StatusChip({
  status,
  label,
}: {
  status: ChipStatus
  label?: string
}) {
  const v = VARIANTS[status]
  return (
    <span className={`il-chip !border-transparent ${v.cls}`}>
      <v.icon size={12} aria-hidden /> {label ?? v.label}
    </span>
  )
}
