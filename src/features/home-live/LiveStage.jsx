// Batch 10D — the lazy live engine of the homepage hero (its own chunk, loaded after idle).
// Holds the ONE timer (HERO_TIMING.tickMs, divided by guideSpeed() for tests) and the
// screens of personas 2–5. The state itself lives in HomeLiveHero (one reducer), so the poster
// and this engine draw the same thing; this component only ticks it and draws the screen.
import { useEffect, useMemo } from 'react'
import { guideSpeed } from '../guide/timing.js'
import { HERO_TIMING as T } from './heroLive.config.js'
import { SCREENS } from './screens.js'
import { Screen } from './Screen.jsx'

export default function LiveStage({ idx, k, running, dispatch, t }) {
  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => dispatch({ type: 'step' }), T.tickMs / guideSpeed())
    return () => window.clearInterval(id)
  }, [running, dispatch])

  // Weekday names of the example forecast start from today (client only: never prerendered).
  const today = useMemo(() => new Date().getDay(), [])
  return <Screen screen={SCREENS[idx]} k={k} t={t} today={today} />
}
