import * as THREE from "three"

export type RibbonOptions = {
  /** Portion of the curve to sweep, 0–1. Lets one flow be split into pieces. */
  from?: number
  to?: number
  segments: number
  radial: number
  width: number
  thickness: number
  /** Total twist in radians along the full curve. */
  twist: number
  phase?: number
  /** Close the start/end with a rounded cap (false = runs off-screen). */
  capStart?: boolean
  capEnd?: boolean
}

const CAP_RINGS = 28

/**
 * Sweeps a soft lens-shaped cross-section along a curve using
 * parallel-transport frames, producing a thick, gently twisting liquid ribbon.
 *
 * Smoothness guarantees:
 * - radial vertices wrap without a seam, so shading has no visible join;
 * - caps are true half-ellipsoids, sampled by angle so rings bunch up near the
 *   tip, and the tip normal is set analytically — no pinched or creased points.
 */
export function ribbonGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  o: RibbonOptions,
) {
  const from = o.from ?? 0
  const to = o.to ?? 1
  const phase = o.phase ?? 0
  const length = curve.getLength()
  // Cap depth ≈ the mean half-extent, so the end reads as a round droplet.
  const capLen = (o.width + o.thickness) / 4 / length

  // Sample positions along the curve: [u, profile scale 0–1].
  const samples: [number, number][] = []
  if (o.capStart) {
    for (let k = 1; k < CAP_RINGS; k++) {
      const phi = (k / CAP_RINGS) * (Math.PI / 2)
      samples.push([from + (1 - Math.cos(phi)) * capLen, Math.sin(phi)])
    }
  }
  const bodyFrom = o.capStart ? from + capLen : from
  const bodyTo = o.capEnd ? to - capLen : to
  const bodySegs = Math.max(8, Math.round(o.segments * (bodyTo - bodyFrom)))
  for (let i = 0; i <= bodySegs; i++)
    samples.push([bodyFrom + ((bodyTo - bodyFrom) * i) / bodySegs, 1])
  if (o.capEnd) {
    for (let k = CAP_RINGS - 1; k >= 1; k--) {
      const phi = (k / CAP_RINGS) * (Math.PI / 2)
      samples.push([to - (1 - Math.cos(phi)) * capLen, Math.sin(phi)])
    }
  }

  const ringVerts = samples.length * o.radial
  const poles = (o.capStart ? 1 : 0) + (o.capEnd ? 1 : 0)
  const pos = new Float32Array((ringVerts + poles) * 3)
  const uv = new Float32Array((ringVerts + poles) * 2)
  const idx: number[] = []
  const T = new THREE.Vector3()
  const N = new THREE.Vector3()
  const B = new THREE.Vector3()
  const P = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  curve.getTangentAt(from, T)
  N.set(0, 0, 1).cross(T)
  if (N.lengthSq() < 1e-4) N.set(1, 0, 0).cross(T)
  N.normalize()

  samples.forEach(([u, f], i) => {
    curve.getPointAt(u, P)
    curve.getTangentAt(u, T)
    // Parallel transport: remove the tangent component from the previous normal.
    N.sub(tmp.copy(T).multiplyScalar(N.dot(T))).normalize()
    B.crossVectors(T, N).normalize()

    // Very gentle breathing along the length so the form feels poured.
    const w = (o.width / 2) * (0.93 + 0.07 * Math.sin(u * 6 + phase)) * f
    const th = (o.thickness / 2) * (0.95 + 0.05 * Math.cos(u * 8 + phase)) * f
    const a = o.twist * u + phase

    for (let j = 0; j < o.radial; j++) {
      const ang = (j / o.radial) * Math.PI * 2
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      // Soft lens: broad faces for reflections, fully rounded edges.
      const x = Math.sign(c) * Math.pow(Math.abs(c), 0.9) * w
      const y = s * th
      const rx = x * Math.cos(a) - y * Math.sin(a)
      const ry = x * Math.sin(a) + y * Math.cos(a)
      const p = (i * o.radial + j) * 3
      pos[p] = P.x + N.x * rx + B.x * ry
      pos[p + 1] = P.y + N.y * rx + B.y * ry
      pos[p + 2] = P.z + N.z * rx + B.z * ry
      uv[(i * o.radial + j) * 2] = u
      uv[(i * o.radial + j) * 2 + 1] = j / o.radial
    }
  })

  for (let i = 0; i < samples.length - 1; i++) {
    for (let j = 0; j < o.radial; j++) {
      const a = i * o.radial + j
      const b = i * o.radial + ((j + 1) % o.radial)
      const c = a + o.radial
      const d = b + o.radial
      // Counter-clockwise seen from outside, so normals point outward.
      idx.push(a, b, c, b, d, c)
    }
  }

  // Close caps with one pole vertex each (a triangle fan) — a single point
  // with an exact outward normal, so tips shade as a perfect dome.
  const poleNormals: [number, THREE.Vector3][] = []
  let pole = ringVerts
  const addPole = (u: number, ring: number, dir: 1 | -1) => {
    curve.getPointAt(u, P)
    curve.getTangentAt(u, T)
    pos.set([P.x, P.y, P.z], pole * 3)
    uv.set([u, 0], pole * 2)
    for (let j = 0; j < o.radial; j++) {
      const a = ring * o.radial + j
      const b = ring * o.radial + ((j + 1) % o.radial)
      if (dir < 0) idx.push(pole, b, a)
      else idx.push(pole, a, b)
    }
    poleNormals.push([pole, T.clone().multiplyScalar(dir)])
    pole++
  }
  if (o.capStart) addPole(from, 0, -1)
  if (o.capEnd) addPole(to, samples.length - 1, 1)

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const normals = g.getAttribute("normal") as THREE.BufferAttribute
  for (const [i, n] of poleNormals) normals.setXYZ(i, n.x, n.y, n.z)
  normals.needsUpdate = true
  return g
}
