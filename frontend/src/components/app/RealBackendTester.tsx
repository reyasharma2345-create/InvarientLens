import { useState } from 'react'

export function RealBackendTester() {
  const [seed, setSeed] = useState(42)
  const [activeBug, setActiveBug] = useState('C1_A')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [minimized, setMinimized] = useState(false)

  const runSimulate = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: Number(seed),
          stock: { 'SKU-A': 0 },
          active_bugs: [activeBug],
          num_orders: 1
        })
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      console.error(e)
      alert('Failed to connect to FastAPI backend at http://127.0.0.1:8000')
    } finally {
      setLoading(false)
    }
  }

  const runDiagnose = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: Number(seed),
          stock: { 'SKU-A': 0 },
          active_bugs: [activeBug]
        })
      })
      const data = await res.json()
      setDiagnosis(data)
    } catch (e) {
      console.error(e)
      alert('Failed to connect to FastAPI backend at http://127.0.0.1:8000')
    } finally {
      setLoading(false)
    }
  }

  if (minimized) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-white backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-gray-300">InvariantLens Real Backend Bridge</span>
        </div>
        <button 
          onClick={() => setMinimized(false)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded bg-indigo-950/50 border border-indigo-800/50 transition"
        >
          Open Bridge
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 text-white backdrop-blur-md shadow-xl relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">InvariantLens Real Backend Bridge</h2>
        <button 
          onClick={() => setMinimized(true)}
          className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded bg-neutral-800/80 border border-neutral-700/50 transition"
        >
          Minimize
        </button>
      </div>
      <div className="flex gap-4 mb-4 items-center flex-wrap">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Seed</label>
          <input 
            type="number" 
            value={seed} 
            onChange={(e) => setSeed(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded text-sm w-28 text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Active Bug</label>
          <select 
            value={activeBug} 
            onChange={(e) => setActiveBug(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded text-sm text-white"
          >
            <option value="C1_A">C1_A: Missing Compensation</option>
            <option value="C1_B">C1_B: Orders Crash</option>
            <option value="C2_A">C2_A: Last-Item Race</option>
            <option value="C3_A">C3_A: Idempotency Double-Charge</option>
          </select>
        </div>
        <div className="flex gap-2 items-end">
          <button 
            onClick={runSimulate}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
          <button 
            onClick={runDiagnose}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Nemotron Diagnose'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 p-4 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono max-h-60 overflow-y-auto">
          <p className="font-bold text-emerald-400 mb-2">Simulation Result ({result.total_events} events, {result.violations.length} violations):</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {diagnosis && (
        <div className="mt-4 p-4 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono max-h-60 overflow-y-auto">
          <p className="font-bold text-indigo-400 mb-2">Nemotron Diagnosis Result:</p>
          <pre>{JSON.stringify(diagnosis, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

