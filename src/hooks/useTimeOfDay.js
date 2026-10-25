import { useEffect, useRef, useState } from 'react'

// Whose clock drives the lighting.
// 'Asia/Kuala_Lumpur' = the room shows what it looks like in KL right now.
// Set to null to use each visitor's own local time instead.
export const TIME_ZONE = 'Asia/Kuala_Lumpur'

function readClock() {
  // Testing override: add ?hour=21.5 to the URL to preview any time of day.
  const override = new URLSearchParams(window.location.search).get('hour')
  if (override !== null && !Number.isNaN(parseFloat(override))) {
    const h = ((parseFloat(override) % 24) + 24) % 24
    return { hour: h, label: formatHour(h) }
  }

  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(TIME_ZONE ? { timeZone: TIME_ZONE } : {}),
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour').value)
  const m = Number(parts.find((p) => p.type === 'minute').value)
  return { hour: h + m / 60, label: formatHour(h + m / 60) }
}

export function formatHour(hour) {
  const h = Math.floor(hour)
  const m = Math.floor((hour - h) * 60)
  const suffix = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

// Returns { hour: 0–24 float, label: '1:49 AM', preview, moving }.
// The live clock refreshes every 30 s. Pass `target` (an hour) to preview
// another time of day: the room time-lapses forward to it. Pass null for live.
export function useTimeOfDay(target = null, { animate = true } = {}) {
  const [live, setLive] = useState(readClock)
  useEffect(() => {
    const id = setInterval(() => setLive(readClock()), 30_000)
    return () => clearInterval(id)
  }, [])

  const goal = target ?? live.hour
  const [shown, setShown] = useState(goal)
  const [moving, setMoving] = useState(false)
  const shownRef = useRef(goal)

  useEffect(() => {
    const from = shownRef.current
    const diff = (((goal - from) % 24) + 24) % 24 // always run the clock forwards
    if (!animate || diff < 0.5 || diff > 23.99) {
      shownRef.current = goal
      setShown(goal)
      return
    }
    const dur = 900 + diff * 60
    const t0 = performance.now()
    let last = 0
    let raf
    setMoving(true)
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      const h = (from + diff * e) % 24
      shownRef.current = h
      // ~20 updates a second is plenty and keeps the scene smooth
      if (k === 1 || now - last > 50) { setShown(h); last = now }
      if (k < 1) raf = requestAnimationFrame(tick)
      else setMoving(false)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); setMoving(false) }
  }, [goal, animate])

  return { hour: shown, label: formatHour(shown), preview: target !== null, moving }
}
