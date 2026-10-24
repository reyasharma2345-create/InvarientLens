/** Returns true when a WebGL context can be created. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

/** Rough heuristic for constrained devices — used to lower 3D detail. */
export function isConstrainedDevice(): boolean {
  const coarse = window.matchMedia("(pointer: coarse)").matches
  const cores = navigator.hardwareConcurrency ?? 8
  return coarse || cores <= 4 || window.innerWidth < 768
}
