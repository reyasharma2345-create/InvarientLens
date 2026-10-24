import { useId, type InputHTMLAttributes, type ReactNode } from "react"

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: ReactNode
  trailing?: ReactNode
}

/** Labelled input wired for errors: aria-invalid + aria-describedby. */
export function Field({
  label,
  error,
  hint,
  trailing,
  className = "",
  ...input
}: Props) {
  const id = useId()
  const msg = `${id}-msg`
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={id}
        className="il-input"
        aria-invalid={!!error}
        aria-describedby={error || hint ? msg : undefined}
        {...input}
      />
      {(error || hint) && (
        <p
          id={msg}
          className={`mt-1.5 text-xs ${error ? "text-brick" : "text-ink-3"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
