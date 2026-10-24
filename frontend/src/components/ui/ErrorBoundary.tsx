import { Component, type ReactNode } from "react"

type Props = {
  fallback: ReactNode
  children: ReactNode
}

/** Contains render/lazy-load failures so one widget can't take down the page. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn("[InvariantLens] component failed, showing fallback:", error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
