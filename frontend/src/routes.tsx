import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { AppLayout } from "@/components/app/AppLayout"
import { LandingPage } from "@/pages/LandingPage"
import { LoginPage, SignupPage } from "@/pages/AuthPages"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { OverviewPage } from "@/pages/app/OverviewPage"
import { InvestigationsPage } from "@/pages/app/InvestigationsPage"
import { InvestigationPage } from "@/pages/app/InvestigationPage"
import { InvariantsPage } from "@/pages/app/InvariantsPage"

function Root() {
  return (
    <>
      <Outlet />
      {/* Scrolls to top on navigation and to #hash targets on the landing page. */}
      <ScrollRestoration />
    </>
  )
}

export const router = createBrowserRouter(
  [
    {
      Component: Root,
      children: [
        {
          Component: PublicLayout,
          children: [
            { path: "/", Component: LandingPage },
            { path: "/login", Component: LoginPage },
            { path: "/signup", Component: SignupPage },
            { path: "*", Component: NotFoundPage },
          ],
        },
        {
          path: "/app",
          Component: AppLayout,
          children: [
            { index: true, Component: OverviewPage },
            { path: "investigations", Component: InvestigationsPage },
            { path: "investigations/:id", Component: InvestigationPage },
            { path: "invariants", Component: InvariantsPage },
            { path: "*", Component: NotFoundPage },
          ],
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
