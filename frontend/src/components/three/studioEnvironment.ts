import * as THREE from "three"

/**
 * Builds a small HDR "studio" of emissive softboxes and pre-filters it with
 * PMREM. Glossy materials reflect these panels: a bright paper sky, blossom
 * and moon pinks, lavender mist — plus dark ink-rock panels, which draw the
 * crisp contrast lines that keep glossy forms legible on a light page.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#f1eff5").multiplyScalar(1.15) // bright mist surround: rims stay light
  const geo = new THREE.PlaneGeometry(1, 1)
  const mats: THREE.Material[] = []
  const panel = (
    color: string,
    intensity: number,
    pos: [number, number, number],
    scale: [number, number],
  ) => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
    })
    mats.push(m)
    const mesh = new THREE.Mesh(geo, m)
    mesh.position.set(...pos)
    mesh.scale.set(scale[0], scale[1], 1)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }
  panel("#ffffff", 2.2, [0, 10, 2], [22, 10]) // bright misty sky overhead
  panel("#f3a9c8", 1.6, [-9, 1, 4], [8, 12]) // blossom pink, left
  panel("#f4cfdb", 1.8, [8, 4, 4], [7, 6]) // moon pink, upper right
  panel("#8f88b0", 1.2, [6, -6, -4], [10, 6]) // lavender mist, low back
  panel("#2c303d", 1, [-2, -9, 3], [16, 5]) // ink rock floor: dark lower reflections
  panel("#1b1e28", 1, [-10, -2, -6], [6, 14]) // ink rock cliff: dark edge line
  panel("#ffffff", 6, [-1, 8, 7], [4, 1.2]) // small softbox: crisp speculars
  panel("#ffffff", 4.5, [6, 1, 9], [0.6, 6]) // vertical strip: long highlight streaks

  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromScene(scene, 0.035)
  pmrem.dispose()
  geo.dispose()
  mats.forEach((m) => m.dispose())
  return rt
}
