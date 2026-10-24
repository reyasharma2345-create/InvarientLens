import { MotionConfig } from "framer-motion"
import { RouterProvider } from "react-router"
import { router } from "./routes"

export default function App() {
  // Respect prefers-reduced-motion for every Framer animation (transforms are skipped).
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
