/**
 * Shared, allocation-free pointer store.
 * Written by one window listener; read inside animation loops via refs,
 * so pointer movement never triggers React re-renders.
 */
export const pointer = { x: 0, y: 0, active: false }

let listeners = 0
const onMove = (e: PointerEvent) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  pointer.active = e.pointerType === "mouse"
  document.documentElement.style.setProperty("--il-px", `${e.clientX}px`)
  document.documentElement.style.setProperty("--il-py", `${e.clientY}px`)
}
const onLeave = () => {
  pointer.active = false
}

export function subscribePointer() {
  if (listeners++ === 0) {
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
  }
  return () => {
    if (--listeners === 0) {
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }
}
