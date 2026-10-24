import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { motion } from "framer-motion"
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
import { Field } from "@/components/ui/Field"
import { demo, type Session } from "@/lib/demoStore"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEMO = { email: "mira.ono@northwind.shop", password: "invariant-demo" }

const nameFromEmail = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ") || "Guest"
const orgFromEmail = (email: string) => {
  const o = email.split("@")[1]?.split(".")[0] ?? ""
  return o ? o[0].toUpperCase() + o.slice(1) : "Demo"
}

/** Demo sign-in: short pause for feedback, then follow an in-app ?next= or open the workspace. */
function useSignIn() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const next = params.get("next")
  const run = (session: Session) => {
    setBusy(true)
    timer.current = window.setTimeout(() => {
      demo.signIn(session)
      navigate(next?.startsWith("/app") ? next : "/app", { replace: true })
    }, 650)
  }
  return { busy, run }
}

function AuthShell({
  eyebrow,
  title,
  lede,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  lede: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <section className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-12 px-5 pb-16 pt-28 md:px-8 lg:grid-cols-[1fr_28rem]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block"
      >
        <p className="il-label mb-5">{eyebrow}</p>
        <p className="max-w-md font-display text-4xl font-semibold leading-[1.1] tracking-tight">
          Every service reported <span className="text-sage">healthy</span>.{" "}
          <span className="text-bloom">37 orders</span> still shipped without
          stock.
        </p>
        <ul className="mt-10 max-w-sm space-y-4 text-ink-2">
          {[
            "Workflows reconstructed across services and queues",
            "Each diagnosis cited to raw spans, logs and queries",
            "Repairs replayed against real traces before you ship",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-bloom"
                aria-hidden
              />{" "}
              {t}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="il-panel w-full p-7 sm:p-9"
      >
        <p className="il-label mb-3 lg:hidden">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-ink-2">{lede}</p>
        {children}
        <div className="mt-6 border-t border-rock/10 pt-5 text-sm text-ink-2">
          {footer}
        </div>
      </motion.div>
    </section>
  )
}

function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 rounded text-xs text-ink-3 hover:text-ink"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}{" "}
      {shown ? "Hide" : "Show"}
    </button>
  )
}

function SubmitButton({
  busy,
  children,
}: {
  busy: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="il-btn il-btn-primary mt-7 w-full justify-center"
    >
      {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {busy ? "Signing you in…" : children}
    </button>
  )
}

const DemoNotice = () => (
  <p className="mt-4 rounded-[var(--il-radius-sm)] bg-moon/40 px-3 py-2 text-xs leading-relaxed text-ink-2">
    Demo mode — nothing is sent anywhere. Your session is kept in this browser
    only.
  </p>
)

export function LoginPage() {
  const { busy, run } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [shown, setShown] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = {
      email: EMAIL.test(email.trim())
        ? undefined
        : "Enter a valid email address.",
      password:
        password.length >= 8
          ? undefined
          : "Password must be at least 8 characters.",
    }
    setErrors(next)
    if (next.email || next.password) return
    run({
      name: nameFromEmail(email.trim()),
      email: email.trim(),
      org: orgFromEmail(email.trim()),
    })
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      lede="Pick up the investigation where you left it."
      footer={
        <>
          New to InvariantLens?{" "}
          <Link to="/signup" className="font-medium text-bloom hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label="Password"
          type={shown ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          trailing={
            <PasswordToggle
              shown={shown}
              onToggle={() => setShown((s) => !s)}
            />
          }
        />
        <SubmitButton busy={busy}>
          Sign in <ArrowRight size={18} aria-hidden />
        </SubmitButton>
        <button
          type="button"
          disabled={busy}
          className="il-btn il-btn-outline w-full justify-center"
          onClick={() => {
            setEmail(DEMO.email)
            setPassword(DEMO.password)
            setErrors({})
          }}
        >
          Fill in demo account
        </button>
        <DemoNotice />
      </form>
    </AuthShell>
  )
}

export function SignupPage() {
  const { busy, run } = useSignIn()
  const [form, setForm] = useState({
    name: "",
    email: "",
    org: "",
    password: "",
  })
  const [shown, setShown] = useState(false)
  const [errors, setErrors] =
    useState<Partial<Record<keyof typeof form, string>>>({})
  const bind = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
    error: errors[k],
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = {
      name: form.name.trim() ? undefined : "Tell us your name.",
      org: form.org.trim() ? undefined : "Add your company or team.",
      email: EMAIL.test(form.email.trim())
        ? undefined
        : "Enter a valid work email.",
      password:
        form.password.length >= 8 ? undefined : "Use at least 8 characters.",
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    run({
      name: form.name.trim(),
      email: form.email.trim(),
      org: form.org.trim(),
    })
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start an investigation"
      lede="Connect three services, declare one invariant, see what broke."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-bloom hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            autoComplete="name"
            placeholder="Mira Ono"
            {...bind("name")}
          />
          <Field
            label="Company"
            autoComplete="organization"
            placeholder="Northwind"
            {...bind("org")}
          />
        </div>
        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...bind("email")}
        />
        <Field
          label="Password"
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          hint="At least 8 characters."
          trailing={
            <PasswordToggle
              shown={shown}
              onToggle={() => setShown((s) => !s)}
            />
          }
          {...bind("password")}
        />
        <SubmitButton busy={busy}>
          Create account <ArrowRight size={18} aria-hidden />
        </SubmitButton>
        <DemoNotice />
      </form>
    </AuthShell>
  )
}
