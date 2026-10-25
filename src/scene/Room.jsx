import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace } from 'three'
import { PALETTE, MAT } from './palette'
import { cork, drawWindowView, floorPlanks, plaster, rugFabric } from './textures'
import { Interactive } from './interaction'
import { TIME_ZONE } from '../hooks/useTimeOfDay'

// Room layout (metres): floor spans x −2.2…2.2 and z −1.5…1.9.
// Back wall at z = −1.5, window wall at x = −2.2.
// Walls are single-sided, so when the camera swings outside the room they
// become see-through instead of blocking the view (a "dollhouse" cutaway).
// The window wall is built around a real opening, so sunlight through it
// casts the window-frame shadow onto the floor.

const W = 4.4
const D = 3.4
const H = 2.8
const BACK_Z = -1.5
const LEFT_X = -2.2
const ZC = BACK_Z + D / 2 // centre of the room along z

// Window opening on the left wall
const WIN = { z: -0.35, y: 1.5, w: 1.3, h: 1.1 }

export default function Room({ light }) {
  const tex = useMemo(
    () => ({ floor: floorPlanks(), rug: rugFabric(), wall: plaster(PALETTE.wall), side: plaster(PALETTE.wallSide) }),
    []
  )

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, ZC]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={tex.floor} bumpMap={tex.floor} bumpScale={0.6} {...MAT.satinWood} roughness={0.55} />
      </mesh>

      {/* Rug */}
      <mesh position={[0.05, 0.006, -0.45]} receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, 0.012, 96]} />
        <meshStandardMaterial map={tex.rug} bumpMap={tex.rug} bumpScale={1.5} {...MAT.fabric} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, H / 2, BACK_Z]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex.wall} bumpMap={tex.wall} bumpScale={0.4} {...MAT.paint} />
      </mesh>

      <WindowWall tex={tex.side} />
      <Window light={light} />

      {/* Skirting boards */}
      <mesh position={[0, 0.045, BACK_Z + 0.008]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.09, 0.016]} />
        <meshStandardMaterial color={PALETTE.trim} {...MAT.paint} roughness={0.6} />
      </mesh>
      <mesh position={[LEFT_X + 0.008, 0.045, ZC]} receiveShadow>
        <boxGeometry args={[0.016, 0.09, D]} />
        <meshStandardMaterial color={PALETTE.trim} {...MAT.paint} roughness={0.6} />
      </mesh>

      <WallClock />
      <Pinboard />
      <Certificate />
      <Shelf />
    </group>
  )
}

// Left wall in four pieces around the window opening (so it can block sunlight)
function WindowWall({ tex }) {
  const z0 = WIN.z - WIN.w / 2
  const z1 = WIN.z + WIN.w / 2
  const y0 = WIN.y - WIN.h / 2
  const y1 = WIN.y + WIN.h / 2
  const zMin = BACK_Z
  const zMax = BACK_Z + D
  const pieces = [
    { z: (zMin + zMax) / 2, y: y0 / 2, w: D, h: y0 }, // below
    { z: (zMin + zMax) / 2, y: (y1 + H) / 2, w: D, h: H - y1 }, // above
    { z: (zMin + z0) / 2, y: WIN.y, w: z0 - zMin, h: WIN.h }, // back side
    { z: (z1 + zMax) / 2, y: WIN.y, w: zMax - z1, h: WIN.h }, // front side
  ]
  return pieces.map((p, i) => (
    <mesh key={i} position={[LEFT_X, p.y, p.z]} rotation-y={Math.PI / 2} castShadow receiveShadow>
      <planeGeometry args={[p.w, p.h]} />
      <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={0.4} {...MAT.paint} shadowSide={DoubleSide} />
    </mesh>
  ))
}

function Window({ light }) {
  // The outside view is a canvas, redrawn when the time of day changes
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 864
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return { canvas, texture }
  }, [])
  const skyKey = light.sky.getHexString() + light.isNight + light.sunInWindow?.toFixed(2)
  useEffect(() => {
    drawWindowView(canvas, light)
    texture.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyKey])

  const frame = { color: PALETTE.trim, ...MAT.paint, roughness: 0.5 }
  return (
    <group position={[LEFT_X, WIN.y, WIN.z]} rotation-y={Math.PI / 2}>
      {/* Outside view, a little way beyond the wall */}
      <mesh position={[0, 0, -0.6]}>
        <planeGeometry args={[2.6, 2.2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Glass: faint reflections only */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[WIN.w, WIN.h]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.06} {...MAT.glass} roughness={0.2} />
      </mesh>
      {/* Frame, mullion and transom: these cast the window shadow */}
      {[
        [0, WIN.h / 2 - 0.03, WIN.w + 0.08, 0.06],
        [0, -WIN.h / 2 + 0.03, WIN.w + 0.08, 0.06],
        [-WIN.w / 2 + 0.03, 0, 0.06, WIN.h],
        [WIN.w / 2 - 0.03, 0, 0.06, WIN.h],
        [0, 0, 0.04, WIN.h],
        [0, 0.12, WIN.w, 0.035],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, -0.01]} castShadow receiveShadow>
          <boxGeometry args={[w, h, 0.07]} />
          <meshStandardMaterial {...frame} />
        </mesh>
      ))}
      {/* Reveal (wall thickness around the opening) */}
      {[
        [0, WIN.h / 2, WIN.w, 0.012, 0.14],
        [0, -WIN.h / 2, WIN.w, 0.012, 0.14],
        [-WIN.w / 2, 0, 0.012, WIN.h, 0.14],
        [WIN.w / 2, 0, 0.012, WIN.h, 0.14],
      ].map(([x, y, w, h, d], i) => (
        <mesh key={i} position={[x, y, -0.07]} receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={PALETTE.wallSide} {...MAT.paint} />
        </mesh>
      ))}
      {/* Sill */}
      <mesh position={[0, -WIN.h / 2 - 0.02, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[WIN.w + 0.2, 0.035, 0.16]} />
        <meshStandardMaterial {...frame} />
      </mesh>
      {/* Curtain rod and two linen curtains drawn to the sides */}
      <mesh position={[0, WIN.h / 2 + 0.16, 0.09]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.008, 0.008, WIN.w + 0.6, 16]} />
        <meshStandardMaterial color="#b9b2a6" {...MAT.aluminium} />
      </mesh>
      {[-1, 1].map((s) => (
        <Curtain key={s} position={[s * (WIN.w / 2 + 0.1), WIN.h / 2 + 0.15, 0.1]} />
      ))}
    </group>
  )
}

// A gathered curtain: a plane folded into soft pleats, hanging from the rod
function Curtain({ position }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(0.42, 1.75, 48, 24)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const flare = 1 + (0.875 - y) * 0.25 // pleats open up towards the hem
      pos.setZ(i, Math.sin(x * 46) * 0.022 * flare)
      pos.setX(i, x * (0.85 + (0.875 - y) * 0.12))
    }
    g.translate(0, -0.875, 0)
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      <meshPhysicalMaterial color="#e9e2d6" roughness={0.95} sheen={1} sheenRoughness={0.5} sheenColor="#ffffff" side={DoubleSide} transmission={0} />
    </mesh>
  )
}

const clockFormat = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  ...(TIME_ZONE ? { timeZone: TIME_ZONE } : {}),
})

// A real clock: the hands show the current time (same time zone as the lighting).
function WallClock() {
  const hourHand = useRef()
  const minuteHand = useRef()
  const secondHand = useRef()

  useFrame(() => {
    const parts = clockFormat.formatToParts(new Date())
    const get = (t) => Number(parts.find((p) => p.type === t).value)
    const s = get('second')
    const m = get('minute') + s / 60
    const h = (get('hour') % 12) + m / 60
    secondHand.current.rotation.z = -(s / 60) * Math.PI * 2
    minuteHand.current.rotation.z = -(m / 60) * Math.PI * 2
    hourHand.current.rotation.z = -(h / 12) * Math.PI * 2
  })

  return (
    <group position={[-0.95, 1.88, BACK_Z + 0.03]}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.045, 64]} />
        <meshStandardMaterial color={PALETTE.black} {...MAT.powderCoat} />
      </mesh>
      <mesh position={[0, 0, 0.0235]}>
        <circleGeometry args={[0.152, 64]} />
        <meshStandardMaterial color="#f6f3ee" {...MAT.paint} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.13, Math.cos(a) * 0.13, 0.026]} rotation-z={-a}>
            <boxGeometry args={[i % 3 === 0 ? 0.008 : 0.004, i % 3 === 0 ? 0.03 : 0.016, 0.002]} />
            <meshStandardMaterial color={PALETTE.black} />
          </mesh>
        )
      })}
      <group ref={hourHand} position={[0, 0, 0.03]}>
        <mesh position={[0, 0.035, 0]}>
          <boxGeometry args={[0.01, 0.085, 0.003]} />
          <meshStandardMaterial color={PALETTE.black} />
        </mesh>
      </group>
      <group ref={minuteHand} position={[0, 0, 0.034]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.007, 0.12, 0.003]} />
          <meshStandardMaterial color={PALETTE.black} />
        </mesh>
      </group>
      <group ref={secondHand} position={[0, 0, 0.038]}>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.002, 0.13, 0.002]} />
          <meshStandardMaterial color="#d2553f" />
        </mesh>
      </group>
      {/* Glass cover */}
      <mesh position={[0, 0, 0.044]}>
        <circleGeometry args={[0.155, 64]} />
        <meshPhysicalMaterial transparent opacity={0.12} {...MAT.glass} />
      </mesh>
    </group>
  )
}

// A paper note drawn with a few "handwritten" lines
function useNoteTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, 128, 128)
    g.strokeStyle = 'rgba(40,40,60,0.55)'
    g.lineWidth = 3
    g.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const y = 28 + i * 22
      g.beginPath()
      g.moveTo(18, y)
      for (let x = 18; x < 18 + 70 + (i % 2) * 20; x += 6) g.lineTo(x, y + Math.sin(x * 0.5 + i) * 2)
      g.stroke()
    }
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
}

// Pinboard with project notes → Projects
function Pinboard() {
  const corkTex = useMemo(cork, [])
  const note = useNoteTexture()
  const notes = [
    [-0.2, 0.08, '#fff4c9', 0.06],
    [0.04, 0.11, '#ffd9c2', -0.08],
    [0.22, -0.06, '#d9ecd9', 0.1],
    [-0.07, -0.12, '#ffffff', -0.04],
  ]
  return (
    <Interactive id="projects" hitbox={{ size: [0.76, 0.54, 0.08], position: [1.15, 1.6, BACK_Z + 0.04] }}>
      <group position={[1.15, 1.6, BACK_Z + 0.02]}>
        <RoundedBox args={[0.72, 0.5, 0.03]} radius={0.008} castShadow receiveShadow>
          <meshStandardMaterial color="#6e5a46" {...MAT.satinWood} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0155]} receiveShadow>
          <planeGeometry args={[0.68, 0.46]} />
          <meshStandardMaterial map={corkTex} bumpMap={corkTex} bumpScale={2} {...MAT.fabric} />
        </mesh>
        {notes.map(([x, y, c, r], i) => (
          <group key={i} position={[x, y, 0.018]} rotation-z={r}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.13, 0.13, 0.001]} />
              <meshStandardMaterial map={note} color={c} {...MAT.paint} />
            </mesh>
            <mesh position={[0, 0.05, 0.006]} castShadow>
              <sphereGeometry args={[0.008, 12, 8]} />
              <meshStandardMaterial color={i % 2 ? '#d2553f' : PALETTE.bookB} {...MAT.plastic} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>
    </Interactive>
  )
}

// Framed certificate on the wall → Experience
function Certificate() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 320
    const g = c.getContext('2d')
    g.fillStyle = '#fbf8f1'
    g.fillRect(0, 0, 256, 320)
    g.strokeStyle = '#c8a96a'
    g.lineWidth = 4
    g.strokeRect(14, 14, 228, 292)
    g.fillStyle = '#3a3a44'
    g.fillRect(58, 58, 140, 10)
    g.fillStyle = 'rgba(58,58,68,0.45)'
    ;[96, 116, 136, 156, 176].forEach((y, i) => g.fillRect(48 + (i % 2) * 10, y, 160 - (i % 2) * 20, 5))
    g.fillStyle = '#c8a96a'
    g.beginPath()
    g.arc(128, 242, 24, 0, Math.PI * 2)
    g.fill()
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  return (
    <Interactive id="experience">
      <group position={[-1.55, 1.5, BACK_Z + 0.02]} rotation-z={0.01}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.45, 0.025]} />
          <meshStandardMaterial color={PALETTE.black} {...MAT.satinWood} />
        </mesh>
        <mesh position={[0, 0, 0.0128]}>
          <planeGeometry args={[0.32, 0.41]} />
          <meshStandardMaterial color="#f4f1ea" {...MAT.paint} />
        </mesh>
        <mesh position={[0, 0, 0.013]}>
          <planeGeometry args={[0.24, 0.3]} />
          <meshStandardMaterial map={tex} {...MAT.paint} />
        </mesh>
        <mesh position={[0, 0, 0.014]}>
          <planeGeometry args={[0.32, 0.41]} />
          <meshPhysicalMaterial transparent opacity={0.1} {...MAT.glass} />
        </mesh>
      </group>
    </Interactive>
  )
}

// Floating shelf with books and a small succulent
function Shelf() {
  const books = [
    [-0.27, PALETTE.bookB, 0.21, 0.035],
    [-0.233, PALETTE.bookA, 0.23, 0.032],
    [-0.198, PALETTE.bookC, 0.19, 0.03],
    [-0.16, '#6d7f6a', 0.2, 0.034],
  ]
  return (
    <group position={[-0.55, 1.42, BACK_Z + 0.12]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.03, 0.22]} />
        <meshStandardMaterial color="#b28a62" {...MAT.satinWood} />
      </mesh>
      {books.map(([x, c, h, w], i) => (
        <group key={i} position={[x, 0.015 + h / 2, 0]} rotation-z={i === 3 ? -0.12 : 0}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, 0.16]} />
            <meshStandardMaterial color={c} {...MAT.fabric} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <boxGeometry args={[w - 0.006, h - 0.008, 0.157]} />
            <meshStandardMaterial color={PALETTE.pages} {...MAT.paint} />
          </mesh>
        </group>
      ))}
      {/* Small succulent in a concrete pot */}
      <group position={[0.18, 0.015, 0]}>
        <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.045, 0.038, 0.07, 32]} />
          <meshStandardMaterial color="#b7b3ac" roughness={0.95} />
        </mesh>
        {Array.from({ length: 9 }).map((_, k) => {
          const a = (k / 9) * Math.PI * 2
          const r = k % 3 === 0 ? 0 : 0.02
          return (
            <mesh key={k} position={[Math.cos(a) * r, 0.085 + (k % 3 === 0 ? 0.015 : 0), Math.sin(a) * r]} rotation={[Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6]} scale={[0.6, 1.2, 0.6]} castShadow>
              <sphereGeometry args={[0.018, 12, 8]} />
              <meshPhysicalMaterial color="#7f9f7a" roughness={0.5} sheen={0.6} sheenColor="#cfe3c8" />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
