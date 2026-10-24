import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { pointer } from "@/lib/pointer"
import { ribbonGeometry, type RibbonOptions } from "./ribbonGeometry"
import { createStudioEnvironment } from "./studioEnvironment"

/*
 * Hero sculpture: three thick liquid ribbons — service flows — that pour in
 * from beyond the frame, braid and merge at centre-right, then split apart.
 * The third flow is severed mid-pour (the broken business invariant); its two
 * torn ends catch a contrasting amber reflection.
 *
 * Palette (Sakura Mist): pearl mist, sakura, and wet ink-rock ribbons.
 * Rendering: physically based clearcoat + iridescence lit by a custom PMREM
 * studio environment, so highlights are reflections that roll across the
 * surface as the form slowly moves. A tiny vertex shader adds slow organic
 * undulation without re-building geometry.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

const curve = (...pts: THREE.Vector3[]) =>
  new THREE.CatmullRomCurve3(pts, false, "centripetal")

// Paths are verified so that (a) every bend radius is > 2x the ribbon's
// half-width — the inner edge can never fold into a crease — and (b) each flow
// sits on its own depth layer (front / middle / back), so ribbons cross over
// one another instead of intersecting into hard seams.
const FLOWS = {
  // Orders (front layer): pours in from top-right, arcs through, exits low-right.
  a: curve(
    v(9.5, 5, -2),
    v(5, 2.6, 0.6),
    v(2.4, 0.4, 1.3),
    v(2.6, -2.4, 1.0),
    v(5.5, -7, -1),
  ),
  // Payments (middle layer): enters from the right edge, sweeps down and out.
  b: curve(
    v(9.5, 1.5, -2.5),
    v(5.2, 0.6, -0.2),
    v(2.5, -0.7, 0),
    v(0.6, -2.8, 0.2),
    v(-0.6, -7, -1),
  ),
  // Inventory (back layer): rises from well below the frame on the lower-right
  // (so its start never shows as a second, accidental break) — severed in open space.
  c: curve(
    v(8.8, -12, -3.8),
    v(8.6, -5.4, -2.6),
    v(5, -2, -1.4),
    v(3, 0.2, -1.3),
    v(2.6, 2.4, -1.1),
    v(4.5, 6.5, -2.5),
  ),
}
// The gap along flow C (arc-length fractions, keeping the tear where it was).
const BREAK = { end: 0.4865, resume: 0.5413 }

type Props = {
  reduced: boolean
  lowDetail: boolean
}

export function LiquidSculpture({ reduced, lowDetail }: Props) {
  const { gl, scene, size } = useThree()

  // Studio environment drives every reflection on the sculpture.
  useEffect(() => {
    const rt = createStudioEnvironment(gl)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])

  const geos = useMemo(() => {
    const q = lowDetail
      ? { segments: 360, radial: 40 }
      : { segments: 720, radial: 64 }
    const base: Omit<RibbonOptions, "twist"> = {
      ...q,
      width: 1.5,
      thickness: 0.52,
    }
    const c = {
      ...base,
      width: 1.1,
      thickness: 0.6,
      twist: Math.PI * 0.3,
      phase: 2.9,
    }
    return [
      ribbonGeometry(FLOWS.a, { ...base, twist: Math.PI * 0.35, phase: 0.4 }),
      ribbonGeometry(FLOWS.b, {
        ...base,
        width: 1.7,
        twist: -Math.PI * 0.3,
        phase: 1.7,
      }),
      ribbonGeometry(FLOWS.c, { ...c, to: BREAK.end, capEnd: true }),
      ribbonGeometry(FLOWS.c, { ...c, from: BREAK.resume, capStart: true }),
    ]
  }, [lowDetail])
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  // One material per flow, sharing the undulation shader:
  // pearl mist (orders), sakura (payments), wet ink-rock (inventory — severed).
  const materials = useMemo(() => {
    const make = (p: THREE.MeshPhysicalMaterialParameters) => {
      const m = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.1,
        ...p,
      })
      // Slow organic undulation along the flow direction (uv.x).
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uniforms.uTime
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform float uTime;",
          )
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            // Uniform around each cross-section, so caps and tips stay watertight.
            float w = sin(uv.x * 16.0 - uTime * 0.3);
            transformed += objectNormal * w * 0.025;`,
          )
      }
      return m
    }
    const pearl = make({
      // No sheen: on a bright page it rims the silhouette with a stair-stepped halo.
      // Slightly softer gloss + gentler film: grazing-angle shimmer stays smooth
      // instead of flickering into a dotted silhouette on the light page.
      color: "#e6e1ee",
      metalness: 0.12,
      roughness: 0.16,
      clearcoatRoughness: 0.14,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [320, 560],
    })
    const sakura = make({
      color: "#e46a9f",
      metalness: 0.1,
      roughness: 0.2,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [300, 500],
      sheen: lowDetail ? 0 : 0.35,
      sheenColor: new THREE.Color("#fbe4ec"),
      sheenRoughness: 0.5,
    })
    const ink = make({
      color: "#2c303d",
      metalness: 0.35,
      roughness: 0.14,
      iridescence: 0.4,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [200, 420],
      envMapIntensity: 1.3,
    })
    return [pearl, sakura, ink, ink]
  }, [lowDetail, uniforms])
  useEffect(
    () => () => new Set(materials).forEach((m) => m.dispose()),
    [materials],
  )

  // Torn ends of flow C, where the amber reflection lives.
  const tear = useMemo(() => {
    const a = FLOWS.c.getPointAt(BREAK.end)
    const b = FLOWS.c.getPointAt(BREAK.resume)
    return a.clone().lerp(b, 0.5)
  }, [])

  const group = useRef<THREE.Group>(null)
  const amber = useRef<THREE.PointLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const g = group.current
    if (!g) return
    if (!reduced) uniforms.uTime.value = t

    const px = pointer.active && !reduced ? pointer.x : 0
    const py = pointer.active && !reduced ? pointer.y : 0
    const scroll = reduced
      ? 0
      : Math.min(window.scrollY / window.innerHeight, 1.2)

    // Calm drift + gentle parallax + a restrained scroll response.
    const ry =
      (reduced ? 0 : Math.sin(t * 0.07) * 0.12) + px * 0.12 + scroll * 0.25
    const rx =
      (reduced ? 0 : Math.sin(t * 0.05 + 1) * 0.06) - py * 0.07 + scroll * 0.18
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 2, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 2, dt)
    g.position.y = THREE.MathUtils.damp(g.position.y, scroll * 1.4, 3, dt)

    // Key light slowly orbits so highlights travel across the surface.
    if (key.current && !reduced)
      key.current.position.set(
        Math.cos(t * 0.12) * 6,
        5 + Math.sin(t * 0.09) * 2,
        5,
      )
    if (amber.current)
      amber.current.intensity =
        30 + (reduced ? 0 : Math.sin(t * 0.8) * Math.sin(t * 0.27) * 10)
  })

  // Compose for viewport: centre-right on wide screens, centred and pushed up on narrow ones.
  const aspect = size.width / size.height
  const narrow = aspect < 0.9
  // Mobile: smaller and lifted into the top-right so it frames, not fights, the copy.
  const offsetX = narrow ? -0.7 : aspect < 1.45 ? 0.5 : -0.1
  const offsetY = narrow ? 2.1 : -0.35
  const scale = narrow ? 0.5 : aspect < 1.45 ? 0.8 : 0.9

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight
        ref={key}
        position={[5, 6, 5]}
        intensity={1.2}
        color="#ffffff"
      />
      <directionalLight
        position={[-6, -2, -4]}
        intensity={1.4}
        color="#c9c3e0"
      />

      <group position={[offsetX, offsetY, 0]} scale={scale}>
        <group ref={group}>
          {/* Lives inside the moving group so it always lights the torn ends. */}
          <pointLight
            ref={amber}
            position={[tear.x, tear.y, tear.z + 0.7]}
            intensity={30}
            distance={3}
            decay={2}
            color="#ffae42"
          />
          {geos.map((g, i) => (
            <mesh key={i} geometry={g} material={materials[i]} />
          ))}
        </group>
      </group>
    </>
  )
}
