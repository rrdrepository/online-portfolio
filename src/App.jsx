import { useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Experience from './scene/Experience'
import Panel from './ui/Panel'
import CodeView from './ui/CodeView'
import FallbackMenu from './ui/FallbackMenu'
import Loader from './ui/Loader'
import { QuestLog, TimeSwitch, Toasts } from './ui/Hud'
import { SECTIONS, SECTION_BY_ID } from './data/sections'
import { useTimeOfDay, TIME_ZONE } from './hooks/useTimeOfDay'
import { getLighting, getPeriod, PERIODS } from './scene/lighting'
import { complete } from './ui/quests'
import { setSound, sfx, useSound } from './ui/sfx'
import { setCursor } from './ui/cursor'
import PixelIcon from './ui/PixelIcon'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl')
  } catch {
    return false
  }
}

// How big the pixels are. The scene is rendered at roughly this many pixels
// tall, then scaled up without smoothing.
const PIXEL_MODES = [
  { id: 'chunky', label: 'Chunky', rows: 170 },
  { id: 'classic', label: 'Classic', rows: 250 },
  { id: 'crisp', label: 'Crisp', rows: 380 },
]
const PIXEL_KEY = 'radin-pixels'

function usePixelMode() {
  const [mode, setMode] = useState(() => {
    try { return PIXEL_MODES.find((m) => m.id === localStorage.getItem(PIXEL_KEY)) ?? PIXEL_MODES[1] } catch { return PIXEL_MODES[1] }
  })
  const [height, setHeight] = useState(window.innerHeight)
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const cycle = () => {
    const next = PIXEL_MODES[(PIXEL_MODES.indexOf(mode) + 1) % PIXEL_MODES.length]
    setMode(next)
    try { localStorage.setItem(PIXEL_KEY, next.id) } catch { /* ignore */ }
  }
  // Size of one art pixel in CSS pixels (whole numbers keep the grid even)
  const pixelSize = Math.max(1, Math.round(height / mode.rows))
  return { mode, cycle, pixelSize }
}

export default function App() {
  const [activeId, setActiveId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [timeTarget, setTimeTarget] = useState(null)
  const webgl = useMemo(hasWebGL, [])
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // Touch screens can't hover, so they get small markers to tap instead
  const touch = useMemo(() => window.matchMedia('(hover: none)').matches, [])
  const { hour, label, preview, moving } = useTimeOfDay(timeTarget, { animate: !reducedMotion })
  const isNight = getLighting(hour).isNight
  const periodId = getPeriod(hour)
  const period = PERIODS[periodId]
  const { mode: pixelMode, cycle: cyclePixels, pixelSize } = usePixelMode()
  const soundOn = useSound()

  const select = useCallback((id) => {
    sfx.select()
    setActiveId(id)
    setMenuOpen(false)
    setInteracted(true)
    complete(id)
  }, [])
  const close = useCallback(() => {
    sfx.close()
    setActiveId(null)
  }, [])

  const pickTime = (h) => {
    sfx.time()
    setInteracted(true)
    setTimeTarget(h)
  }

  // Keyboard: Esc closes, 1–5 open a section straight away
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (activeId) close()
        else setMenuOpen(false)
        return
      }
      if (activeId || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= SECTIONS.length) select(SECTIONS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, close, select])

  const active = SECTION_BY_ID[activeId]

  return (
    <div className={`app ${isNight ? 'theme-night' : 'theme-day'}`}>
      {webgl ? (
        <Canvas
          className="scene"
          shadows="percentage"
          // Render at 1/pixelSize resolution; CSS scales it up with hard pixel edges
          dpr={1 / pixelSize}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: 40, near: 0.05, far: 50, position: [2.95, 2.1, 2.3] }}
          onPointerDown={() => setInteracted(true)}
          onPointerMissed={() => setCursor()}
        >
          <Experience
            hour={hour}
            timeMoving={moving}
            activeId={activeId}
            onSelect={select}
            reducedMotion={reducedMotion}
            touch={touch}
            onReady={() => setReady(true)}
          />
        </Canvas>
      ) : (
        <div className="no-webgl">
          <p>Your browser can't show the 3D workspace, so here's the direct version.</p>
        </div>
      )}

      {/* Top bar: identity + quest log, settings + menu */}
      <header className={`topbar ${activeId ? 'has-panel' : ''}`}>
        <div className="topbar__left">
          <div className="px-box identity">
            <h1>Radin Mikael</h1>
            <p>Computer Science · Sunway University</p>
          </div>
          {webgl && <QuestLog />}
        </div>
        <div className="topbar__right">
          <button
            className="px-btn px-btn--icon"
            onClick={() => setSound(!soundOn)}
            aria-pressed={soundOn}
            title={soundOn ? 'Mute sounds' : 'Turn sounds on'}
          >
            <PixelIcon name={soundOn ? 'sound' : 'mute'} />
            <span className="sr-only">Sound {soundOn ? 'on' : 'off'}</span>
          </button>
          {webgl && (
            <button className="px-btn" onClick={() => { sfx.click(); cyclePixels() }} title="Change pixel size">
              <PixelIcon name="grid" />
              <span className="px-btn__label">{pixelMode.label}</span>
            </button>
          )}
          <button className="px-btn menu-toggle" onClick={() => { sfx.click(); setMenuOpen((o) => !o) }} aria-expanded={menuOpen}>
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>

      <FallbackMenu open={menuOpen || !webgl} sections={SECTIONS} onSelect={select} />

      {/* Bottom bar: hint, local time + time-of-day switcher */}
      <footer className={`bottombar ${activeId ? 'is-dim' : ''}`}>
        <p className={`px-box hint ${interacted ? 'is-faded' : ''}`}>
          <span className="blink" aria-hidden="true">▶</span>{' '}
          {touch ? 'Drag to look around · Tap a marker · Tap Radin' : 'Drag to look around · Hover objects · Poke Radin · Keys 1–5'}
        </p>
        <div className="px-box timebox">
          <p className="clock">
            <span className="clock__dot" />
            {period.label} · {label}{preview ? ' (preview)' : TIME_ZONE ? ' in KL' : ''}
            <span className="clock__note">— {period.note}</span>
          </p>
          {webgl && <TimeSwitch active={periodId} preview={preview} onPick={pickTime} />}
        </div>
      </footer>

      <Toasts reducedMotion={reducedMotion} />
      <Panel section={active?.kind === 'panel' ? active : null} onClose={close} reducedMotion={reducedMotion} />
      <CodeView open={active?.kind === 'code'} onClose={close} />
      <Loader done={ready || !webgl} />
    </div>
  )
}
