import { Outlet } from "react-router"
import { Atmosphere } from "@/components/background/Atmosphere"
import { SiteNav } from "./SiteNav"
import { SiteFooter } from "./SiteFooter"

export function PublicLayout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Atmosphere />
      <SiteNav />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
