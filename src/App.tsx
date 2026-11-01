import { lazy, Suspense, useEffect, useState } from 'react'

const AboutPage = lazy(() =>
  import('./about/AboutPage').then(({ AboutPage: Page }) => ({ default: Page })),
)
const SignDemo = lazy(() =>
  import('./demo/SignDemo').then(({ SignDemo: Demo }) => ({ default: Demo })),
)
const ContributorStudio = lazy(() =>
  import('./signpacks/components/ContributorStudio').then(({ ContributorStudio: Studio }) => ({
    default: Studio,
  })),
)

type Route = 'lab' | 'about' | 'studio'

const routeFromHash = (): Route =>
  window.location.hash === '#about'
    ? 'about'
    : window.location.hash === '#studio'
      ? 'studio'
      : 'lab'

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  const openAbout = () => {
    window.location.hash = 'about'
  }
  const openStudio = () => {
    window.location.hash = 'studio'
  }
  const openLab = () => {
    window.history.pushState(null, '', window.location.pathname + window.location.search)
    setRoute('lab')
  }

  return (
    <Suspense
      fallback={
        <div className="route-loader" role="status">
          LOADING ORCA HAND SIGN LAB
        </div>
      }
    >
      {route === 'about' ? <AboutPage onOpenLab={openLab} /> : null}
      {route === 'studio' ? (
        <ContributorStudio onOpenLab={openLab} onShowAbout={openAbout} />
      ) : null}
      {route === 'lab' ? <SignDemo onOpenStudio={openStudio} onShowAbout={openAbout} /> : null}
    </Suspense>
  )
}
