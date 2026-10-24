import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import { LiquidSculpture } from "./LiquidSculpture"

type Props = {
  reduced: boolean
  lowDetail: boolean
}

/**
 * The single WebGL context for the hero. Lazy-loaded by `HeroBackground`
 * so three.js stays out of the initial bundle. Transparent so the CSS
 * atmosphere behind it supplies the misty paper sky and pink moon.
 */
export default function HeroScene({ reduced, lowDetail }: Props) {
  return (
    <Canvas
      dpr={lowDetail ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0, 10], fov: 38, near: 0.1, far: 60 }}
      // Straight alpha + a transparent *mist-coloured* clear: antialiased edge
      // pixels then blend toward the light page rather than toward black, which
      // otherwise draws a dark dotted rim around pale ribbons.
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#f3f1f5", 0)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
      }}
      frameloop={reduced ? "demand" : "always"}
    >
      <LiquidSculpture reduced={reduced} lowDetail={lowDetail} />
    </Canvas>
  )
}
