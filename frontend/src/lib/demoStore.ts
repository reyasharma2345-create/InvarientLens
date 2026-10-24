import { useSyncExternalStore } from "react"
import type { Invariant, RepairOutcome } from "@/data/demo"

/*
 * Tiny persisted store for the demo: session, replayed repairs, resolved
 * investigations and user-defined invariants. Lives in localStorage only —
 * there is no backend. Selectors must return existing references (not new
 * arrays/objects) so useSyncExternalStore stays stable.
 */

export type Session = {
  name: string
  email: string
  org: string
}

type State = {
  session: Session | null
  replays: Record<string, RepairOutcome>
  resolved: Record<string, string>
  invariants: Invariant[]
  paused: string[]
}

const KEY = "il.demo.v1"
const initial: State = {
  session: null,
  replays: {},
  resolved: {},
  invariants: [],
  paused: [],
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...initial, ...JSON.parse(raw) } : initial
  } catch {
    return initial
  }
}

let state: State = typeof window === "undefined" ? initial : load()
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useDemo<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(initial),
  )
}

export const demo = {
  signIn: (session: Session) => set({ session }),
  signOut: () => set({ session: null }),
  recordReplay: (repairId: string, outcome: RepairOutcome) =>
    set({ replays: { ...state.replays, [repairId]: outcome } }),
  resolve: (investigationId: string, repairTitle: string) =>
    set({ resolved: { ...state.resolved, [investigationId]: repairTitle } }),
  reopen: (investigationId: string) => {
    const rest = { ...state.resolved }
    delete rest[investigationId]
    set({ resolved: rest, replays: {} })
  },
  addInvariant: (inv: Invariant) =>
    set({ invariants: [...state.invariants, inv] }),
  removeInvariant: (id: string) =>
    set({ invariants: state.invariants.filter((i) => i.id !== id) }),
  togglePaused: (id: string) =>
    set({
      paused: state.paused.includes(id)
        ? state.paused.filter((p) => p !== id)
        : [...state.paused, id],
    }),
}
