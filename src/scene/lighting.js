import { Color } from 'three'

// ── Time of day ──────────────────────────────────────────────
// The day is split into four periods, each with its own story:
//   morning   6:00–12:00  coffee on the desk, sunlight and dust in the air
//   afternoon 12:00–17:00 cats wander through every 10 minutes
//   evening   17:00–21:00 the sun sets through the window (it faces west)
//   night     21:00–6:00  he has fallen asleep at the desk, lamp still on
export const PERIODS = {
  morning: { label: 'Morning', note: 'Coffee first' },
  afternoon: { label: 'Afternoon', note: 'Watch out for cats' },
  evening: { label: 'Evening', note: 'Sunset hours' },
  night: { label: 'Night', note: 'Radin is asleep' },
}

export function getPeriod(hour) {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// Lighting "keyframes". Values between keyframes are blended, so the room
// changes gradually through the day.
//
// bg     – colour around the room (the void outside the walls)
// sky    – base sky colour seen through the window
// sun    – light coming through the window (colour, strength)
// hemi   – soft ambient fill (sky colour, ground colour, strength)
// lamp   – desk lamp brightness
// screen – laptop screen brightness
const NIGHT = { bg: '#14161b', sky: '#18203a', sun: ['#7d93d6', 0.4], hemi: ['#5a6a94', '#2a2622', 0.85], lamp: 0.45, screen: 0.25 }
const KEYS = [
  { h: 0, ...NIGHT },
  { h: 5.5, ...NIGHT },
  { h: 6.6, bg: '#2c2830', sky: '#e9a58c', sun: ['#ffb38a', 1.0], hemi: ['#d4b2aa', '#4a3c34', 1.2], lamp: 0.5, screen: 0.7 },
  { h: 7.6, bg: '#dad3c8', sky: '#cfe0ee', sun: ['#ffe9cc', 3.2], hemi: ['#eef0f2', '#8a7c6c', 2.2], lamp: 0, screen: 0.55 },
  { h: 12, bg: '#dcd8d0', sky: '#a9cdea', sun: ['#ffffff', 3.6], hemi: ['#f2f5f8', '#8c7e70', 2.5], lamp: 0, screen: 0.5 },
  { h: 16.5, bg: '#d9d2c6', sky: '#bcd3e6', sun: ['#fff0dc', 3.2], hemi: ['#f2ede6', '#8a7866', 2.3], lamp: 0, screen: 0.5 },
  { h: 17.75, bg: '#cfbda8', sky: '#f3c48f', sun: ['#ffc98a', 2.7], hemi: ['#f4dcc4', '#86705e', 1.8], lamp: 0, screen: 0.6 },
  { h: 18.9, bg: '#4a3434', sky: '#ee8a5c', sun: ['#ff8a50', 1.8], hemi: ['#d79a88', '#4a3a34', 1.2], lamp: 0.5, screen: 0.85 },
  { h: 19.6, bg: '#26232f', sky: '#4f4470', sun: ['#8a7ad0', 0.5], hemi: ['#7a74a0', '#2e2a2a', 1.0], lamp: 1, screen: 1 },
  { h: 20.75, bg: '#181a21', sky: '#1f2744', sun: ['#7d93d6', 0.4], hemi: ['#5a6a94', '#2a2622', 0.9], lamp: 1, screen: 1 },
  { h: 21.25, ...NIGHT },
  { h: 24, ...NIGHT },
]

const lerp = (a, b, t) => a + (b - a) * t
const mix = (a, b, t) => new Color(a).lerp(new Color(b), t)

export function getLighting(hour) {
  let i = 0
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)))

  // Sun arc: 7:00 → 19:20. The window faces west, so the sun itself is only
  // visible through it in the late afternoon and evening.
  const dayProgress = Math.min(1, Math.max(0, (hour - 7) / 12.33))
  const elevation = Math.sin(dayProgress * Math.PI) * 0.9 + 0.25
  const sweep = (dayProgress - 0.5) * 2.4
  const sunInWindow = hour >= 15.5 && hour <= 19.45 ? Math.max(0, (19.4 - hour) / 3.9) : null

  const sunIntensity = lerp(a.sun[1], b.sun[1], t)
  const background = mix(a.bg, b.bg, t)
  const hsl = {}
  background.getHSL(hsl)

  return {
    hour,
    period: getPeriod(hour),
    // Strength of reflections/ambient from the environment (bright by day, dim at night)
    env: 0.15 + Math.min(1, sunIntensity / 3) * 0.75,
    background,
    sky: mix(a.sky, b.sky, t),
    sunColor: mix(a.sun[0], b.sun[0], t),
    sunIntensity,
    sunPosition: [-6, 1.2 + elevation * 4, sweep],
    sunInWindow, // 0 (horizon) … 1 (high), or null when not visible
    hemiSky: mix(a.hemi[0], b.hemi[0], t),
    hemiGround: mix(a.hemi[1], b.hemi[1], t),
    hemiIntensity: lerp(a.hemi[2], b.hemi[2], t),
    lamp: lerp(a.lamp, b.lamp, t),
    screen: lerp(a.screen, b.screen, t),
    isNight: hsl.l < 0.3,
  }
}
