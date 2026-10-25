import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Object3D, SRGBColorSpace } from 'three'
import { Billboard, RoundedBox } from '@react-three/drei'
import { TIME_ZONE } from '../hooks/useTimeOfDay'
import { PALETTE, MAT } from './palette'
import { brushed, deskWood } from './textures'
import { Interactive } from './interaction'
import { CODE_LINES, TOKEN_COLORS } from '../data/code'

// Desk sits against the back wall. Top surface is at y = 0.76.
export const DESK_TOP = 0.76
const DESK_Z = -1.05

export default function Desk({ light, reducedMotion, period }) {
  const wood = useMemo(deskWood, [])
  return (
    <group>
      {/* Desktop + legs */}
      <RoundedBox args={[1.6, 0.035, 0.8]} radius={0.01} smoothness={3} position={[0, DESK_TOP - 0.0175, DESK_Z]} castShadow receiveShadow>
        <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={0.5} {...MAT.satinWood} />
      </RoundedBox>
      {/* Steel frame */}
      {[[-0.74, -0.34], [0.74, -0.34], [-0.74, 0.34], [0.74, 0.34]].map(([x, z], i) => (
        <mesh key={i} position={[x, (DESK_TOP - 0.035) / 2, DESK_Z + z]} castShadow receiveShadow>
          <boxGeometry args={[0.035, DESK_TOP - 0.035, 0.035]} />
          <meshStandardMaterial color={PALETTE.black} {...MAT.powderCoat} />
        </mesh>
      ))}
      {[-0.34, 0.34].map((z) => (
        <mesh key={z} position={[0, DESK_TOP - 0.06, DESK_Z + z]} castShadow>
          <boxGeometry args={[1.48, 0.05, 0.02]} />
          <meshStandardMaterial color={PALETTE.black} {...MAT.powderCoat} />
        </mesh>
      ))}

      <Laptop glow={light.screen} reducedMotion={reducedMotion} asleep={period === 'night'} />
      <Keyboard />
      <Lamp on={light.lamp} />
      <Books />
      {/* Morning only: a fresh, steaming coffee */}
      {period === 'morning' && <Mug steaming={!reducedMotion} />}
      <Notebook />
      <Phone />
      <Plant />
    </group>
  )
}

// ─── Laptop screen: the resume being typed out as code ───────────────────

const SCREEN_W = 1024 // drawing units
const SCREEN_H = 640
const SCREEN_SCALE = 1.5 // canvas is drawn at 1.5× for a sharper screen

const lockTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  ...(TIME_ZONE ? { timeZone: TIME_ZONE } : {}),
})
const lockDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long',
  ...(TIME_ZONE ? { timeZone: TIME_ZONE } : {}),
})

// Night: the laptop has gone to its lock screen
function drawLockScreen(g) {
  const W = SCREEN_W
  const H = SCREEN_H
  const grad = g.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#141a33')
  grad.addColorStop(1, '#2a1d3a')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.6)
  glow.addColorStop(0, 'rgba(242,180,109,0.18)')
  glow.addColorStop(1, 'rgba(242,180,109,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)
  const now = new Date()
  g.textAlign = 'center'
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.font = '200 150px ui-sans-serif, system-ui, sans-serif'
  g.fillText(lockTime.format(now), W / 2, H * 0.47)
  g.font = '500 24px ui-sans-serif, system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.7)'
  g.fillText(lockDate.format(now), W / 2, H * 0.47 + 50)
  g.font = '15px ui-sans-serif, system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.45)'
  g.fillText('radin.ts — all changes saved', W / 2, H - 40)
  g.textAlign = 'left'
}

function drawScreen(g, shownChars, cursorOn) {
  const W = SCREEN_W
  const H = SCREEN_H
  g.fillStyle = '#0f111a'
  g.fillRect(0, 0, W, H)

  // Title bar
  g.fillStyle = '#181a24'
  g.fillRect(0, 0, W, 30)
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    g.fillStyle = c
    g.beginPath()
    g.arc(18 + i * 18, 15, 5.5, 0, Math.PI * 2)
    g.fill()
  })
  g.fillStyle = '#7d8299'
  g.font = '13px ui-sans-serif, system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText('radin.ts — resume', W / 2, 19)
  g.textAlign = 'left'

  // Sidebar (file tree)
  const SB = 170
  g.fillStyle = '#12141d'
  g.fillRect(0, 30, SB, H - 30)
  g.fillStyle = '#5b6078'
  g.font = '600 11px ui-sans-serif, system-ui, sans-serif'
  g.fillText('EXPLORER', 16, 56)
  const files = ['radin.ts', 'projects.ts', 'education.ts', 'skills.ts', 'contact.ts']
  g.font = '13px ui-sans-serif, system-ui, sans-serif'
  files.forEach((f, i) => {
    const y = 84 + i * 24
    if (i === 0) {
      g.fillStyle = '#1f2233'
      g.fillRect(0, y - 16, SB, 24)
    }
    g.fillStyle = '#3178c6'
    g.fillText('TS', 18, y)
    g.fillStyle = i === 0 ? '#e6e9f5' : '#8b90a8'
    g.fillText(f, 42, y)
  })

  // Tab
  g.fillStyle = '#12141d'
  g.fillRect(SB, 30, W - SB, 34)
  g.fillStyle = '#0f111a'
  g.fillRect(SB, 30, 130, 34)
  g.fillStyle = '#f2b46d'
  g.fillRect(SB, 30, 130, 2)
  g.fillStyle = '#e6e9f5'
  g.fillText('radin.ts', SB + 30, 52)

  // Code
  const LH = 22
  const top = 90
  const visible = Math.floor((H - top - 30) / LH)
  g.font = '15px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'

  // Work out which line the "cursor" is on
  let remaining = shownChars
  let cursorLine = 0
  let cursorCol = 0
  for (let i = 0; i < CODE_LINES.length; i++) {
    const len = CODE_LINES[i].reduce((n, t) => n + t.v.length, 0)
    if (remaining <= len) {
      cursorLine = i
      cursorCol = remaining
      break
    }
    remaining -= len + 1
    cursorLine = i + 1
    cursorCol = 0
  }
  const first = Math.max(0, cursorLine - visible + 4)

  for (let row = 0; row < visible; row++) {
    const i = first + row
    if (i > cursorLine || i >= CODE_LINES.length) break
    const y = top + row * LH
    if (i === cursorLine) {
      g.fillStyle = 'rgba(255,255,255,0.04)'
      g.fillRect(SB, y - 16, W - SB, LH)
    }
    g.fillStyle = i === cursorLine ? '#c8cbe0' : '#3d4157'
    g.textAlign = 'right'
    g.fillText(String(i + 1), SB + 44, y)
    g.textAlign = 'left'

    let x = SB + 64
    let budget = i === cursorLine ? cursorCol : Infinity
    for (const t of CODE_LINES[i]) {
      if (budget <= 0) break
      const text = t.v.slice(0, budget)
      budget -= text.length
      g.fillStyle = TOKEN_COLORS[t.t]
      g.fillText(text, x, y)
      x += g.measureText(text).width
    }
    if (i === cursorLine && cursorOn) {
      g.fillStyle = '#f2b46d'
      g.fillRect(x + 1, y - 14, 2, 18)
    }
  }

  // Status bar
  g.fillStyle = '#3178c6'
  g.fillRect(0, H - 24, W, 24)
  g.fillStyle = '#ffffff'
  g.font = '12px ui-sans-serif, system-ui, sans-serif'
  g.fillText('⎇ main', 12, H - 8)
  g.textAlign = 'right'
  g.fillText(`Ln ${cursorLine + 1}, Col ${cursorCol + 1}    TypeScript`, W - 12, H - 8)
  g.textAlign = 'left'
}

const TOTAL_CHARS = CODE_LINES.reduce((n, l) => n + l.reduce((m, t) => m + t.v.length, 0) + 1, 0)
const START_CHARS = CODE_LINES.slice(0, 14).reduce((n, l) => n + l.reduce((m, t) => m + t.v.length, 0) + 1, 0)

function useScreenTexture(reducedMotion, asleep) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_W * SCREEN_SCALE
    canvas.height = SCREEN_H * SCREEN_SCALE
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    return { canvas, texture }
  }, [])

  useEffect(() => {
    const g = canvas.getContext('2d')
    g.setTransform(SCREEN_SCALE, 0, 0, SCREEN_SCALE, 0, 0)

    if (asleep) {
      const render = () => { drawLockScreen(g); texture.needsUpdate = true }
      render()
      document.fonts?.ready.then(render)
      const id = setInterval(render, 20_000)
      return () => clearInterval(id)
    }

    let chars = reducedMotion ? 900 : START_CHARS
    let pause = 0
    let tick = 0
    const render = () => {
      drawScreen(g, chars, reducedMotion || Math.floor(tick / 4) % 2 === 0)
      texture.needsUpdate = true
    }
    render()
    document.fonts?.ready.then(render)
    if (reducedMotion) return

    // Type ~3 characters per tick at 9 ticks/second, then pause and start over.
    const id = setInterval(() => {
      if (document.hidden) return
      tick++
      if (pause > 0) {
        pause--
      } else {
        chars += 1 + Math.floor(Math.random() * 4)
        if (chars >= TOTAL_CHARS) {
          chars = TOTAL_CHARS
          pause = 30
        }
      }
      if (pause === 1) chars = START_CHARS
      render()
    }, 110)
    return () => clearInterval(id)
  }, [canvas, texture, reducedMotion, asleep])

  return texture
}

// Laptop on an aluminium stand → Resume (opens the full code view)
function Laptop({ glow, reducedMotion, asleep }) {
  const screen = useScreenTexture(reducedMotion, asleep)
  const metal = useMemo(brushed, [])
  const alu = { map: metal, color: '#c9ccd2', ...MAT.aluminium }

  return (
    <Interactive id="resume">
      <group position={[0, DESK_TOP, -1.18]}>
        {/* Stand: base plate, four posts, tilted platform */}
        <mesh position={[0, 0.003, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.006, 0.24]} />
          <meshStandardMaterial {...alu} />
        </mesh>
        {[-0.11, 0.11].map((x) =>
          [[0.09, 0.07], [-0.09, 0.118]].map(([z, h]) => (
            <mesh key={`${x}${z}`} position={[x, 0.006 + h / 2, z]} castShadow>
              <boxGeometry args={[0.012, h, 0.012]} />
              <meshStandardMaterial {...alu} />
            </mesh>
          ))
        )}
        <group position={[0, 0.1, 0]} rotation-x={0.2}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.27, 0.006, 0.24]} />
            <meshStandardMaterial {...alu} />
          </mesh>

          {/* Laptop base */}
          <RoundedBox args={[0.36, 0.016, 0.25]} radius={0.005} smoothness={3} position={[0, 0.011, 0]} castShadow receiveShadow>
            <meshStandardMaterial {...alu} />
          </RoundedBox>
          <mesh position={[0, 0.0195, -0.03]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.3, 0.11]} />
            <meshStandardMaterial color="#1b1c20" {...MAT.plastic} />
          </mesh>
          <mesh position={[0, 0.0195, 0.075]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.12, 0.07]} />
            <meshStandardMaterial color="#aeb1b7" {...MAT.aluminium} roughness={0.2} />
          </mesh>

          {/* Lid, hinged at the back edge */}
          <group position={[0, 0.019, -0.122]} rotation-x={-0.38}>
            <RoundedBox args={[0.36, 0.245, 0.007]} radius={0.004} smoothness={3} position={[0, 0.1225, -0.0035]} castShadow>
              <meshStandardMaterial {...alu} />
            </RoundedBox>
            {/* Black glass front */}
            <mesh position={[0, 0.1225, 0.0002]}>
              <planeGeometry args={[0.354, 0.24]} />
              <meshStandardMaterial color="#060608" roughness={0.08} metalness={0} />
            </mesh>
            {/* Display */}
            <mesh position={[0, 0.127, 0.0005]}>
              <planeGeometry args={[0.336, 0.21]} />
              <meshStandardMaterial
                color="#000000"
                emissive="#ffffff"
                emissiveMap={screen}
                emissiveIntensity={0.85 + glow * 0.35}
                roughness={0.35}
                metalness={0}
              />
            </mesh>
            {/* Screen glow spilling onto the desk and the figure */}
            <pointLight position={[0, 0.12, 0.35]} color="#b8c8ff" intensity={0.06 + glow * 0.22} distance={0.8} decay={2} />
          </group>
        </group>
      </group>
    </Interactive>
  )
}

function Keyboard() {
  return (
    <group position={[0, DESK_TOP, -0.82]}>
      <RoundedBox args={[0.42, 0.012, 0.13]} radius={0.004} smoothness={3} position={[0, 0.006, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#cfd2d7" {...MAT.aluminium} />
      </RoundedBox>
      {/* Key rows (one mesh per row keeps draw calls low) */}
      {[-0.044, -0.022, 0, 0.022, 0.044].map((z, i) => (
        <RoundedBox key={i} args={[i === 4 ? 0.24 : 0.39, 0.007, 0.017]} radius={0.002} smoothness={2} position={[0, 0.015, z]} castShadow>
          <meshStandardMaterial color="#f3f3f1" {...MAT.plastic} />
        </RoundedBox>
      ))}
      {/* Mouse */}
      <mesh position={[0.32, 0.013, 0.01]} scale={[0.75, 0.42, 1.15]} castShadow receiveShadow>
        <sphereGeometry args={[0.035, 32, 16]} />
        <meshPhysicalMaterial color="#f3f3f1" {...MAT.plastic} clearcoat={0.6} clearcoatRoughness={0.3} />
      </mesh>
      {/* Desk mat */}
      <RoundedBox args={[0.8, 0.003, 0.32]} radius={0.0015} smoothness={2} position={[0.05, -0.0005, 0.02]} receiveShadow>
        <meshStandardMaterial color="#3a3d44" {...MAT.fabric} />
      </RoundedBox>
    </group>
  )
}

function Lamp({ on }) {
  // A spotlight needs a target object in the scene to aim at.
  const [target] = useState(() => new Object3D())
  const metal = { color: PALETTE.black, ...MAT.powderCoat }
  return (
    <group position={[-0.6, DESK_TOP, -1.2]}>
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.02, 48]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0.02, 0.22, 0.04]} rotation-x={0.25} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.42, 16]} />
        <meshStandardMaterial color="#c9ccd2" {...MAT.chrome} />
      </mesh>
      {/* Shade, tilted towards the keyboard */}
      <group position={[0.06, 0.43, 0.13]} rotation={[0.9, 0, -0.35]}>
        <mesh castShadow>
          <coneGeometry args={[0.085, 0.13, 48, 1, true]} />
          <meshStandardMaterial color={PALETTE.accent} side={2} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.028, 24, 16]} />
          <meshStandardMaterial color="#fff3dc" emissive="#ffd9a0" emissiveIntensity={0.2 + on * 6} toneMapped={false} />
        </mesh>
      </group>
      {/* Warm pool of light on the desk (casts soft shadows at night) */}
      <spotLight
        position={[0.06, 0.4, 0.14]}
        target={target}
        color="#ffc888"
        intensity={on * 7}
        angle={0.9}
        penumbra={0.85}
        distance={3}
        decay={2}
        castShadow={on > 0.3}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <primitive object={target} position={[0.5, 0, 0.45]} />
      {/* Gentle room fill so the night scene isn't pitch black */}
      <pointLight position={[0.1, 0.5, 0.3]} color="#ffbf80" intensity={on * 1.1} distance={3.5} decay={1.5} />
    </group>
  )
}

// Stack of books → Education
function Books() {
  const stack = [
    [0.26, 0.045, PALETTE.bookB, 0.05],
    [0.23, 0.04, PALETTE.bookA, -0.1],
    [0.21, 0.032, PALETTE.bookC, 0.14],
  ]
  let y = DESK_TOP
  return (
    <Interactive id="education" hitbox={{ size: [0.3, 0.14, 0.24], position: [0.6, DESK_TOP + 0.06, -1.2] }}>
      <group position={[0.6, 0, -1.2]}>
        {stack.map(([w, h, c, r], i) => {
          const yy = y + h / 2
          y += h
          const d = w * 0.74
          return (
            <group key={i} position={[0, yy, 0]} rotation-y={r}>
              <RoundedBox args={[w, h, d]} radius={0.004} smoothness={2} castShadow receiveShadow>
                <meshStandardMaterial color={c} {...MAT.fabric} roughness={0.75} />
              </RoundedBox>
              {/* Page block visible on three sides */}
              <mesh position={[0.006, 0, 0]}>
                <boxGeometry args={[w - 0.004, h - 0.008, d + 0.002]} />
                <meshStandardMaterial color={PALETTE.pages} {...MAT.paint} />
              </mesh>
            </group>
          )
        })}
      </group>
    </Interactive>
  )
}

// Soft round puff used for the coffee steam
function useSteamTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    return new CanvasTexture(c)
  }, [])
}

function Steam() {
  const tex = useSteamTexture()
  const puffs = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.current.forEach((m, i) => {
      if (!m) return
      const k = (t * 0.35 + i / 5) % 1 // 0 → 1 as the puff rises
      m.position.set(Math.sin(t * 1.3 + i * 2) * 0.012 * (1 + k * 2), 0.09 + k * 0.2, Math.cos(t + i) * 0.008)
      m.scale.setScalar(0.03 + k * 0.07)
      m.material.opacity = Math.sin(k * Math.PI) * 0.32
    })
  })
  return Array.from({ length: 5 }).map((_, i) => (
    <Billboard key={i}>
      <mesh ref={(m) => (puffs.current[i] = m)}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0} />
      </mesh>
    </Billboard>
  ))
}

function Mug({ steaming }) {
  const ceramic = { color: '#f1ede6', ...MAT.ceramic }
  return (
    <group position={[-0.42, DESK_TOP, -0.99]}>
      {/* saucer */}
      <mesh position={[0, 0.005, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.01, 48]} />
        <meshPhysicalMaterial {...ceramic} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <group position={[0, 0.01, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.036, 0.032, 0.09, 48, 1, true]} />
          <meshPhysicalMaterial {...ceramic} side={2} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.004, 32]} />
          <meshPhysicalMaterial {...ceramic} />
        </mesh>
        <mesh position={[0.042, 0.048, 0]} castShadow>
          <torusGeometry args={[0.02, 0.005, 12, 24]} />
          <meshPhysicalMaterial {...ceramic} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.078, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.034, 32]} />
          <meshPhysicalMaterial color="#3b2418" roughness={0.05} clearcoat={1} />
        </mesh>
        {/* crema */}
        <mesh position={[0, 0.0785, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.026, 0.034, 32]} />
          <meshStandardMaterial color="#a8774f" roughness={0.4} />
        </mesh>
        {steaming && <Steam />}
      </group>
    </group>
  )
}

// Notebook and pen beside the laptop
function Notebook() {
  return (
    <group position={[0.34, DESK_TOP, -0.95]} rotation-y={0.25}>
      <RoundedBox args={[0.15, 0.012, 0.21]} radius={0.003} smoothness={2} position={[0, 0.006, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2f3a4a" {...MAT.fabric} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0.004, 0.006, 0]}>
        <boxGeometry args={[0.146, 0.009, 0.205]} />
        <meshStandardMaterial color={PALETTE.pages} {...MAT.paint} />
      </mesh>
      <mesh position={[-0.052, 0.0125, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.004, 0.21]} />
        <meshStandardMaterial color="#c9a14e" />
      </mesh>
      <mesh position={[0.11, 0.006, 0.01]} rotation={[Math.PI / 2, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.14, 12]} />
        <meshStandardMaterial color="#1c1d20" roughness={0.25} metalness={0.4} />
      </mesh>
    </group>
  )
}

// Phone → Contact
function Phone() {
  return (
    <Interactive id="contact" hitbox={{ size: [0.14, 0.06, 0.22], position: [0, 0.02, 0] }}>
      <group position={[0.47, DESK_TOP + 0.005, -0.7]} rotation-y={-0.3}>
        <RoundedBox args={[0.074, 0.009, 0.155]} radius={0.004} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color="#3a3c42" {...MAT.aluminium} />
        </RoundedBox>
        <mesh position={[0, 0.0047, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.068, 0.148]} />
          <meshPhysicalMaterial color="#050507" roughness={0.05} clearcoat={1} />
        </mesh>
      </group>
    </Interactive>
  )
}

function Plant() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        a: (i / 14) * Math.PI * 2 + (i % 2) * 0.3,
        tilt: 0.25 + (i % 4) * 0.15,
        h: 0.3 + (i % 5) * 0.06,
        s: 0.85 + (i % 3) * 0.15,
      })),
    []
  )
  return (
    <group position={[1.03, 0, -1.28]} scale={0.85}>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.34, 48]} />
        <meshStandardMaterial color={PALETTE.pot} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.01, 32]} />
        <meshStandardMaterial color="#3a2a1f" roughness={1} />
      </mesh>
      {leaves.map(({ a, tilt, h, s }, i) => (
        <group key={i} position={[0, 0.32, 0]} rotation={[0, a, tilt]}>
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.004, 0.006, h, 6]} />
            <meshStandardMaterial color="#4f6b3f" roughness={0.7} />
          </mesh>
          <mesh position={[0, h + 0.05 * s, 0]} rotation-x={0.3} scale={[0.9 * s, 1.9 * s, 0.22]} castShadow>
            <sphereGeometry args={[0.05, 16, 12]} />
            <meshPhysicalMaterial color={i % 3 ? PALETTE.leaf : '#6e8f58'} roughness={0.45} sheen={0.5} sheenColor="#a8c890" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
