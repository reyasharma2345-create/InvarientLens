import { useRef, useState, type FormEvent } from "react"
import { Pause, Play, Plus, Trash2, X } from "lucide-react"
import { INVARIANTS, SERVICES, type ServiceId } from "@/data/demo"
import { PageHeader } from "@/components/app/PageHeader"
import { Field } from "@/components/ui/Field"
import { StatusChip } from "@/components/ui/StatusChip"
import { SERVICE_STYLE } from "@/components/investigation/serviceStyle"
import { demo, useDemo } from "@/lib/demoStore"
import { holdRate, isBroken } from "@/lib/derive"

type Errors = Partial<Record<"name" | "rule" | "services", string>>

function NewInvariantForm({ onDone }: { onDone: (id?: string) => void }) {
  const custom = useDemo((s) => s.invariants)
  const [name, setName] = useState("")
  const [rule, setRule] = useState("")
  const [services, setServices] = useState<ServiceId[]>([])
  const [errors, setErrors] = useState<Errors>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (name.trim().length < 4)
      next.name = "Give the rule a short, descriptive name."
    if (!rule.trim())
      next.rule = "Describe the condition that must always hold."
    if (!services.length) next.services = "Pick at least one service."
    setErrors(next)
    if (Object.keys(next).length) return
    const n =
      Math.max(100, ...custom.map((i) => Number(i.id.slice(4)) || 0)) + 1
    const id = `INV-${n}`
    demo.addInvariant({
      id,
      name: name.trim(),
      rule: rule.trim(),
      services,
      checked: 0,
      violations: 0,
      custom: true,
    })
    onDone(id)
  }

  const toggle = (s: ServiceId) =>
    setServices((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    )

  return (
    <form
      onSubmit={submit}
      noValidate
      className="il-panel mb-6 grid gap-5 p-5 sm:p-6"
      aria-labelledby="new-inv-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="new-inv-title" className="font-display text-xl font-semibold">
            New invariant
          </h2>
          <p className="text-sm text-ink-2">
            Checked against every new workflow from the moment you save it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDone()}
          className="il-btn il-btn-ghost il-btn-sm !px-2"
          aria-label="Cancel"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <Field
        label="Name"
        autoFocus
        placeholder="Shipped orders have a tracking number"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <div>
        <label
          htmlFor="inv-rule"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          Rule
        </label>
        <textarea
          id="inv-rule"
          rows={2}
          className="il-input font-mono text-sm"
          placeholder="shipped(o) ⇒ ∃ tracking(o) within 1h"
          value={rule}
          onChange={(e) => setRule(e.target.value)}
          aria-invalid={!!errors.rule}
          aria-describedby="inv-rule-msg"
        />
        <p
          id="inv-rule-msg"
          className={`mt-1.5 text-xs ${
            errors.rule ? "text-brick" : "text-ink-3"
          }`}
        >
          {errors.rule ??
            "Plain language or the formal notation used below. Both work in the demo."}
        </p>
      </div>
      <fieldset aria-describedby={errors.services ? "inv-svc-msg" : undefined}>
        <legend className="mb-2 text-sm font-medium text-ink">
          Services involved
        </legend>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => {
            const on = services.includes(s.id)
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bloom/40 ${
                  on
                    ? "border-bloom/40 bg-moon/40 text-ink"
                    : "border-rock/15 bg-white/60 text-ink-2 hover:border-rock/30"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => toggle(s.id)}
                />
                <span
                  className={`h-2.5 w-2.5 rounded-full ${SERVICE_STYLE[s.id].dot}`}
                  aria-hidden
                />{" "}
                {s.name}
              </label>
            )
          })}
        </div>
        {errors.services && (
          <p id="inv-svc-msg" className="mt-1.5 text-xs text-brick">
            {errors.services}
          </p>
        )}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="il-btn il-btn-primary il-btn-sm">
          Save invariant
        </button>
        <button
          type="button"
          onClick={() => onDone()}
          className="il-btn il-btn-ghost il-btn-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function InvariantsPage() {
  const custom = useDemo((s) => s.invariants)
  const paused = useDemo((s) => s.paused)
  const resolved = useDemo((s) => s.resolved)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState("")
  const newBtn = useRef<HTMLButtonElement>(null)
  const all = [...INVARIANTS, ...custom]

  const done = (id?: string) => {
    setCreating(false)
    if (id) setNotice(`${id} added and now evaluating.`)
    requestAnimationFrame(() => newBtn.current?.focus())
  }

  return (
    <>
      <PageHeader
        eyebrow="Invariants"
        title="The rules your business depends on"
        lede="Declare what must always be true across services. InvariantLens checks every workflow against them."
        actions={
          !creating && (
            <button
              ref={newBtn}
              type="button"
              onClick={() => {
                setNotice("")
                setCreating(true)
              }}
              className="il-btn il-btn-primary il-btn-sm"
            >
              <Plus size={16} aria-hidden /> New invariant
            </button>
          )
        }
      />
      <p
        aria-live="polite"
        className={notice ? "mb-4 text-sm font-medium text-sage" : "sr-only"}
      >
        {notice}
      </p>
      {creating && <NewInvariantForm onDone={done} />}

      <ul className="space-y-3">
        {all.map((inv) => {
          const isPaused = paused.includes(inv.id)
          const broken = !isPaused && isBroken(inv, resolved)
          return (
            <li
              key={inv.id}
              className={`il-panel grid gap-4 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center ${
                isPaused ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-3">{inv.id}</span>
                  <StatusChip
                    status={isPaused ? "paused" : broken ? "broken" : "holds"}
                  />
                  {inv.custom && <span className="il-chip">Custom</span>}
                </div>
                <h2 className="font-display text-lg font-semibold">
                  {inv.name}
                </h2>
                <p className="mt-1 break-words font-mono text-sm text-ink-2">
                  {inv.rule}
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
                  {inv.services.map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${SERVICE_STYLE[s].dot}`}
                        aria-hidden
                      />{" "}
                      {SERVICES.find((x) => x.id === s)!.name}
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-5 md:justify-end">
                <dl className="flex gap-6 text-sm">
                  <div>
                    <dt className="il-label !text-[0.6rem]">Checked</dt>
                    <dd className="font-mono text-ink-2">
                      {inv.checked
                        ? inv.checked.toLocaleString("en")
                        : "awaiting"}
                    </dd>
                  </div>
                  <div>
                    <dt className="il-label !text-[0.6rem]">Hold rate</dt>
                    <dd
                      className={`font-mono ${
                        broken ? "text-brick" : "text-ink-2"
                      }`}
                    >
                      {broken ? holdRate(inv) : inv.checked ? "100%" : "n/a"}
                    </dd>
                  </div>
                </dl>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => demo.togglePaused(inv.id)}
                    className="il-btn il-btn-ghost il-btn-sm !px-2.5"
                    aria-label={`${isPaused ? "Resume" : "Pause"} ${inv.id}`}
                  >
                    {isPaused ? (
                      <Play size={16} aria-hidden />
                    ) : (
                      <Pause size={16} aria-hidden />
                    )}
                  </button>
                  {inv.custom && (
                    <button
                      type="button"
                      onClick={() => {
                        demo.removeInvariant(inv.id)
                        setNotice(`${inv.id} removed.`)
                      }}
                      className="il-btn il-btn-ghost il-btn-sm !px-2.5 hover:!text-brick"
                      aria-label={`Remove ${inv.id}`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
