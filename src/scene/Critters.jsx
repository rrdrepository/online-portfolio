import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { TIME_ZONE } from '../hooks/useTimeOfDay'
import { sfx } from '../ui/sfx'
import { complete } from '../ui/quests'
import { setCursor } from '../ui/cursor'

// ─────────────────────────────────────────────────────────────
// Afternoon cats and the under-desk mouse.
//
// Cats: in the afternoon (12:00–17:00) two cats stroll through the room
// every 10 minutes on the clock (12:00, 12:10, 12:20 …), stop to sit in the
// sunlight by the window, then wander out. They also walk once shortly after
// the page loads, so an afternoon visitor always gets to see them.
// ─────────────────────────────────────────────────────────────

const minuteFormat = new Intl.DateTimeFormat('en-GB', {
  minute: 'numeric',
  ...(TIME_ZONE ? { timeZone: TIME_ZONE } : {}),
})

const v = (x, z) => new Vector3(x, 0, z)

// Two legs of the walk, with a sit in the sunbeam in between
const IN = [v(3.4, 1.5), v(2.2, 0.9), v(1.2, 0.62), v(0.6, 0.3), v(-0.5, 0.3), v(-1.35, -0.05)]
const OUT = [v(-1.35, -0.05), v(-1.25, 0.5), v(-0.4, 0.95), v(0.7, 1.45), v(1.8, 2.3), v(2.4, 3.0)]
const SPEED = 0.36 // metres per second
const SIT = 14 // seconds sitting in the sun

function offsetPath(points, dx, dz) {
  return points.map((p) => p.clone().add(new Vector3(dx, 0, dz)))
}

export function Cats({ active, reducedMotion }) {
  const [walkId, setWalkId] = useState(0)

  useEffect(() => {
    if (!active) return
    const first = setTimeout(() => setWalkId((n) => n + 1), 3500)
    let last = -1
    const id = setInterval(() => {
      const m = Number(minuteFormat.format(new Date()))
      if (m % 10 === 0 && m !== last) {
        last = m
        setWalkId((n) => n + 1)
      }
    }, 10_000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [active])

  if (!active || walkId === 0) return null
  return (
    <group key={walkId}>
      <Cat colors={TABBY} delay={0} reducedMotion={reducedMotion} />
      <Cat colors={GREY} delay={2.2} offset={[0.28, 0.22]} scale={0.88} reducedMotion={reducedMotion} />
    </group>
  )
}

const TABBY = { body: '#d48a4c', belly: '#f3d2b0', dark: '#a8612e' }
const GREY = { body: '#7d8188', belly: '#d9dadc', dark: '#55585e' }

function Cat({ colors, delay, offset = [0, 0], scale = 1, reducedMotion }) {
  const root = useRef()
  const body = useRef()
  const legs = [useRef(), useRef(), useRef(), useRef()]
  const tail = useRef()
  const head = useRef()
  const start = useRef(null)
  // Click a cat: it hops, meows and shows some hearts
  const jump = useRef(-10)
  const [pets, setPets] = useState(0)
  useEffect(() => {
    if (!pets) return
    const t = setTimeout(() => setPets(0), 1400)
    return () => clearTimeout(t)
  }, [pets])
  const pet = (e) => {
    if (!root.current.visible) return // hidden cats still catch rays; let the click through
    e.stopPropagation()
    if (e.delta > 6) return
    jump.current = performance.now() / 1000
    sfx.meow()
    complete('cat')
    setPets((n) => n + 1)
  }

  const { pathIn, pathOut, tIn, tOut } = useMemo(() => {
    const pathIn = new CatmullRomCurve3(offsetPath(IN, ...offset))
    const pathOut = new CatmullRomCurve3(offsetPath(OUT, ...offset))
    return { pathIn, pathOut, tIn: pathIn.getLength() / SPEED, tOut: pathOut.getLength() / SPEED }
  }, [offset])

  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime + delay
    const k = clock.elapsedTime - start.current
    const g = root.current
    if (k < 0 || k > tIn + SIT + tOut) {
      g.visible = false
      return
    }
    g.visible = true

    let walking = true
    let curve = pathIn
    let u = 0
    if (k < tIn) u = k / tIn
    else if (k < tIn + SIT) { walking = false; u = 1 }
    else { curve = pathOut; u = (k - tIn - SIT) / tOut }

    const p = curve.getPointAt(Math.min(1, u))
    const j = performance.now() / 1000 - jump.current
    const hopY = j < 0.4 ? Math.sin((j / 0.4) * Math.PI) * 0.12 : 0
    g.position.set(p.x, hopY, p.z)
    const tan = curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)))
    const yaw = Math.atan2(tan.x, tan.z)
    g.rotation.y = walking ? yaw : MathUtils.damp(g.rotation.y, yaw + 0.9, 3, 0.016)

    // Sitting: lower the back and lift the chest
    const sit = walking ? 0 : Math.min(1, (k - tIn) / 0.6)
    body.current.rotation.x = -0.42 * sit
    body.current.position.y = -0.04 * sit

    const step = reducedMotion ? 0 : k * 7.5
    const swing = walking ? 0.5 : 0
    legs[0].current.rotation.x = Math.sin(step) * swing
    legs[3].current.rotation.x = Math.sin(step) * swing
    legs[1].current.rotation.x = Math.sin(step + Math.PI) * swing
    legs[2].current.rotation.x = Math.sin(step + Math.PI) * swing
    // back legs fold under when sitting
    legs[2].current.rotation.x += 1.1 * sit
    legs[3].current.rotation.x += 1.1 * sit
    tail.current.rotation.z = Math.sin(k * (walking ? 3 : 1.4)) * 0.35
    head.current.rotation.y = walking ? Math.sin(k * 0.8) * 0.15 : Math.sin(k * 0.5) * 0.4 - 0.5
  })

  const fur = { color: colors.body, roughness: 0.9 }
  return (
    <group
      ref={root}
      scale={scale}
      visible={false}
      onClick={pet}
      onPointerOver={(e) => { if (!root.current.visible) return; e.stopPropagation(); setCursor('hand') }}
      onPointerOut={() => setCursor()}
    >
      {pets > 0 && (
        <Html position={[0, 0.5, 0.15]} center zIndexRange={[24, 0]} style={{ pointerEvents: 'none' }}>
          <div className="hearts" key={pets} aria-hidden="true">
            <span>♥</span><span>mrrp!</span><span>♥</span>
          </div>
        </Html>
      )}
      <group ref={body}>
        {/* body */}
        <mesh position={[0, 0.2, 0]} scale={[0.115, 0.1, 0.24]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
          <meshPhysicalMaterial {...fur} sheen={0.8} sheenColor={colors.belly} />
        </mesh>
        <mesh position={[0, 0.17, 0.02]} scale={[0.09, 0.07, 0.19]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={colors.belly} roughness={0.95} />
        </mesh>
        {/* stripes */}
        {[-0.1, -0.03, 0.04, 0.11].map((z) => (
          <mesh key={z} position={[0, 0.285, z]} scale={[0.1, 0.02, 0.022]}>
            <sphereGeometry args={[1, 16, 8]} />
            <meshStandardMaterial color={colors.dark} roughness={0.9} />
          </mesh>
        ))}
        {/* head */}
        <group ref={head} position={[0, 0.3, 0.22]}>
          <mesh scale={[0.075, 0.066, 0.07]} castShadow>
            <sphereGeometry args={[1, 32, 20]} />
            <meshPhysicalMaterial {...fur} sheen={0.8} sheenColor={colors.belly} />
          </mesh>
          <mesh position={[0, -0.018, 0.05]} scale={[0.035, 0.026, 0.03]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color={colors.belly} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.005, 0.078]}>
            <sphereGeometry args={[0.007, 8, 6]} />
            <meshStandardMaterial color="#c97a7a" />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.042, 0.055, -0.005]} rotation-z={-s * 0.3} castShadow>
                <coneGeometry args={[0.024, 0.05, 4]} />
                <meshStandardMaterial {...fur} />
              </mesh>
              <mesh position={[s * 0.028, 0.012, 0.062]}>
                <sphereGeometry args={[0.009, 12, 8]} />
                <meshStandardMaterial color="#1a1a14" roughness={0.1} />
              </mesh>
            </group>
          ))}
        </group>
        {/* tail: a gentle S-curve */}
        <group ref={tail} position={[0, 0.24, -0.22]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, 0.03 + i * 0.045, -0.03 - Math.sin(i * 0.5) * 0.06]} castShadow>
              <sphereGeometry args={[0.022 - i * 0.002, 12, 8]} />
              <meshStandardMaterial color={i === 4 ? colors.dark : colors.body} roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>
      {/* legs: front left, front right, back left, back right */}
      {[[-0.05, 0.13], [0.05, 0.13], [-0.055, -0.13], [0.055, -0.13]].map(([x, z], i) => (
        <group key={i} ref={legs[i]} position={[x, 0.17, z]}>
          <mesh position={[0, -0.085, 0]} castShadow>
            <capsuleGeometry args={[0.02, 0.13, 6, 12]} />
            <meshStandardMaterial {...fur} />
          </mesh>
          <mesh position={[0, -0.162, 0.01]} scale={[1, 0.6, 1.3]}>
            <sphereGeometry args={[0.022, 12, 8]} />
            <meshStandardMaterial color={colors.belly} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// A tiny mouse that darts out from under the desk when Radin peers down
const MOUSE_PATH = new CatmullRomCurve3([v(-0.55, -1.05), v(-0.2, -0.55), v(0.5, -0.2), v(1.3, 0.5), v(2.4, 1.6), v(3.2, 2.4)])
const MOUSE_TIME = 2.6

export function Mouse({ runAt }) {
  const root = useRef()
  const start = useRef(null)
  useEffect(() => {
    start.current = null
    if (!runAt) return
    complete('mouse')
    const t = setTimeout(() => sfx.squeak(), 800)
    return () => clearTimeout(t)
  }, [runAt])

  useFrame(({ clock }) => {
    const g = root.current
    if (!runAt) { g.visible = false; return }
    if (start.current === null) start.current = clock.elapsedTime + 0.7
    const k = clock.elapsedTime - start.current
    if (k < 0 || k > MOUSE_TIME) { g.visible = false; return }
    g.visible = true
    const u = k / MOUSE_TIME
    const p = MOUSE_PATH.getPointAt(u)
    const tan = MOUSE_PATH.getTangentAt(Math.min(0.999, u))
    g.position.set(p.x, Math.abs(Math.sin(k * 30)) * 0.006, p.z)
    g.rotation.y = Math.atan2(tan.x, tan.z)
  })

  return (
    <group ref={root} visible={false}>
      <mesh position={[0, 0.025, 0]} scale={[0.028, 0.024, 0.05]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#8d8a86" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.03, 0.045]} scale={[0.018, 0.017, 0.026]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#8d8a86" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.014, 0.048, 0.035]} rotation-y={s * 0.4}>
          <circleGeometry args={[0.011, 16]} />
          <meshStandardMaterial color="#d9a3a3" side={2} />
        </mesh>
      ))}
      <mesh position={[0, 0.012, -0.08]} rotation-x={Math.PI / 2 - 0.15}>
        <cylinderGeometry args={[0.002, 0.003, 0.07, 6]} />
        <meshStandardMaterial color="#c99a9a" />
      </mesh>
    </group>
  )
}
