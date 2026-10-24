import { useState, useEffect } from 'react'

export type BackendTraceEvent = {
  event_id: string
  trace_id: string
  service: string
  type: string
  payload: Record<string, any>
  timestamp: string
  delivery_seq: number
}

export type BackendViolation = {
  invariant_id: string
  verdict: string
  description: string
}

export type BackendDiagnosis = {
  violation: string
  verdict: string
  divergence_service: string
  expected_obligation: string
  ai_analysis: {
    root_cause: string
    hypothesis: string
    recommended_fix: string
    confidence: number
  }
}

class BackendClient {
  private baseURL = 'http://127.0.0.1:8000'

  async simulate(seed: number = 42, activeBug: string = 'C1_A'): Promise<{
    seed: number
    active_bugs: string[]
    total_events: number
    events: BackendTraceEvent[]
    violations: BackendViolation[]
  }> {
    try {
      const res = await fetch(`${this.baseURL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          stock: { 'SKU-A': 0 },
          active_bugs: [activeBug],
          num_orders: 1
        })
      })
      return await res.json()
    } catch (e) {
      console.error('Backend simulate failed:', e)
      return { seed, active_bugs: [activeBug], total_events: 0, events: [], violations: [] }
    }
  }

  async diagnose(seed: number = 42, activeBug: string = 'C1_A'): Promise<{
    seed: number
    active_bugs: string[]
    diagnoses: BackendDiagnosis[]
  }> {
    try {
      const res = await fetch(`${this.baseURL}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed,
          stock: { 'SKU-A': 0 },
          active_bugs: [activeBug]
        })
      })
      return await res.json()
    } catch (e) {
      console.error('Backend diagnose failed:', e)
      return { seed, active_bugs: [activeBug], diagnoses: [] }
    }
  }
}

export const backend = new BackendClient()

export function useLiveBackend(seed: number = 42, activeBug: string = 'C1_A') {
  const [events, setEvents] = useState<BackendTraceEvent[]>([])
  const [violations, setViolations] = useState<BackendViolation[]>([])
  const [diagnoses, setDiagnoses] = useState<BackendDiagnosis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([
      backend.simulate(seed, activeBug),
      backend.diagnose(seed, activeBug)
    ]).then(([sim, diag]) => {
      if (!mounted) return
      setEvents(sim.events)
      setViolations(sim.violations)
      setDiagnoses(diag.diagnoses)
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [seed, activeBug])

  return { events, violations, diagnoses, loading }
}
