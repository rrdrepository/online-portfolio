import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import { CatmullRomCurve3, Euler, LatheGeometry, MathUtils, Quaternion, Vector2, Vector3 } from 'three'
import { PALETTE, MAT } from './palette'
import { useHop, useInteraction } from './interaction'
import { sfx } from '../ui/sfx'
import { complete } from '../ui/quests'
import { setCursor } from '../ui/cursor'
import { formatHour } from '../hooks/useTimeOfDay'
import Bed, { BED } from './Bed'

// ─────────────────────────────────────────────────────────────
// The clay figure, built as a jointed rig.
//
// Every joint is a <group> whose rotation comes from a "pose" (a set of
// joint angles in radians). Reactions blend a pose in and out over time.
// The whole body can also move around the room (root position + rotation).
//
// Poke him:
//   upper body / head / arms → scratches his head, or turns round to see who did it
//   legs                     → lifts his feet and peers under the desk ("a mouse?!")
//   asleep at the desk       → checks his watch; at night he gets up, walks to
//                              the bed and sleeps there until morning
//   asleep in bed            → stirs, mumbles, goes back to sleep
// In the morning he gets out of bed and walks back to the desk.
// ─────────────────────────────────────────────────────────────

// Resting poses
const TYPING = {
  spineX: -0.18, spineY: 0, spineZ: 0,
  neckX: 0.06, neckY: 0, neckZ: 0,
  lShX: 1.1, lShY: 0, lShZ: 0.12, lElX: 0.55, lElY: -0.32,
  rShX: 1.1, rShY: 0, rShZ: -0.12, rElX: 0.55, rElY: 0.32,
  lHipX: 1.5, lHipZ: -0.05, lKneeX: -1.42,
  rHipX: 1.5, rHipZ: 0.05, rKneeX: -1.42,
}
// Fell asleep at the desk: slumped forward, arms out on the desk, head resting on them
const SLEEP = {
  ...TYPING,
  spineX: -0.8, spineY: 0.04,
  neckX: -0.6, neckY: 0.6, neckZ: 0.2,
  lShX: 2.05, lShZ: 0.3, lElX: 0.32, lElY: -0.2,
  rShX: 2.05, rShZ: -0.3, rElX: 0.32, rElY: 0.2,
}

// Standing upright, arms relaxed at his sides
const STAND = {
  spineX: 0, spineY: 0, spineZ: 0,
  neckX: 0, neckY: 0, neckZ: 0,
  lShX: 0.05, lShY: 0, lShZ: -0.08, lElX: 0.18, lElY: 0,
  rShX: 0.05, rShY: 0, rShZ: 0.08, rElX: 0.18, rElY: 0,
  lHipX: 0, lHipZ: -0.03, lKneeX: -0.02,
  rHipX: 0, rHipZ: 0.03, rKneeX: -0.02,
}
// Sitting on the edge of the bed
const PERCH = { ...STAND, spineX: -0.1, lHipX: 1.5, lKneeX: -1.45, rHipX: 1.5, rKneeX: -1.45 }
// Lying on his back in bed, head turned a little on the pillow
const LIE = { ...STAND, neckX: -0.2, neckY: 0.4, lShZ: -0.12, rShZ: 0.12, lKneeX: -0.12, rHipX: 0.06, rKneeX: -0.2 }

// Reactions: each overrides only the joints it needs
const ACTIONS = {
  checkTime: {
    duration: 3.2,
    bubble: '',
    pose: {
      spineX: -0.08, neckX: -0.35, neckY: 0.22,
      lShX: 0.5, lShY: -0.6, lShZ: 0.25, lElX: 1.5, lElY: 0,
      rShX: 0.55, rShZ: -0.1, rElX: 0.6,
    },
  },
  bedStir: {
    duration: 3.4,
    bubble: 'mmh… five more minutes',
    pose: { neckY: -0.35, neckX: -0.1, lShZ: -0.3, rShZ: 0.3, lKneeX: -0.4 },
  },
  scratch: {
    duration: 3.2,
    bubble: 'Hmm?',
    pose: { rShX: 2.25, rShZ: 0.75, rElX: 2.25, rElY: -0.4, neckZ: -0.22, neckX: 0.1 },
  },
  lookBack: {
    duration: 3,
    bubble: 'Who was that?',
    pose: { spineX: -0.05, spineY: -0.72, neckY: -1.15, neckX: 0.18, lShX: 0.55, lElX: 0.7, rShX: 0.35, rShZ: -0.35, rElX: 0.5 },
  },
  lookUnder: {
    duration: 4,
    bubble: 'Was that… a mouse?!',
    pose: {
      spineX: -0.95, spineY: 0.25, spineZ: 0.08, neckX: -0.4, neckY: 0.35,
      lShX: 1.0, lElX: 0.35, rShX: 0.9, rElX: 0.25,
      lHipX: 1.8, lKneeX: -1.15, rHipX: 1.8, rKneeX: -1.15,
    },
  },
}

const JOINTS = Object.keys(TYPING)
const ease = (t) => t * t * (3 - 2 * t)
const blendPose = (a, b, e) => {
  const out = {}
  for (const j of JOINTS) out[j] = MathUtils.lerp(a[j], b[j], e)
  return out
}

// ── Getting around the room ──────────────────────────────────
// Root (pelvis) positions, in metres
const v3 = (x, y, z) => new Vector3(x, y, z)
const SEAT = v3(0, 0.575, -0.13) // on the desk chair
const DESK_STAND = v3(0, 0.99, -0.47) // standing between chair and desk
const BED_STAND = v3(1.1, 0.99, -0.4) // standing beside the bed
const BED_PERCH = v3(BED.x - 0.32, BED.top + 0.08, -0.45) // sitting on the edge of the bed
const BED_LIE = v3(BED.x, BED.top + 0.105, -0.5) // lying down, head on the pillow

// Floor path from the desk to the bed (walked backwards to return)
const WALK = new CatmullRomCurve3([v3(0, 0, -0.47), v3(0.35, 0, -0.53), v3(0.75, 0, -0.44), v3(0.95, 0, -0.4), v3(1.1, 0, -0.4)])
const WALK_LEN = WALK.getLength()
const WALK_SPEED = 0.5 // m/s
const STRIDE = 0.7 // metres per full step cycle

// Keyframed moves. yaw = which way he faces (0 = towards the desk),
// tilt = leaning back (π/2 = lying flat), lift = arc the move upwards a little.
const H = Math.PI / 2
const TRACKS = {
  standUp: [
    { t: 0, pos: SEAT, yaw: 0, tilt: 0, pose: TYPING },
    { t: 1.3, pos: DESK_STAND, yaw: 0, tilt: 0, pose: STAND, lift: 0.1 },
    { t: 1.8, pos: DESK_STAND, yaw: -H, tilt: 0, pose: STAND },
  ],
  lieDown: [
    { t: 0, pos: BED_STAND, yaw: -H, tilt: 0, pose: STAND },
    { t: 0.7, pos: BED_STAND, yaw: H, tilt: 0, pose: STAND }, // turn round, back to the bed
    { t: 1.6, pos: BED_PERCH, yaw: H, tilt: 0, pose: PERCH }, // sit on the edge
    { t: 3.0, pos: BED_LIE, yaw: Math.PI, tilt: H, pose: LIE, lift: 0.08 }, // swing legs up, lie back
  ],
  getUp: [
    { t: 0, pos: BED_LIE, yaw: Math.PI, tilt: H, pose: LIE },
    { t: 1.4, pos: BED_PERCH, yaw: H, tilt: 0, pose: PERCH, lift: 0.08 },
    { t: 2.3, pos: BED_STAND, yaw: H, tilt: 0, pose: STAND, lift: 0.06 },
  ],
  sitDown: [
    { t: 0, pos: DESK_STAND, yaw: H, tilt: 0, pose: STAND },
    { t: 0.5, pos: DESK_STAND, yaw: 0, tilt: 0, pose: STAND },
    { t: 1.8, pos: SEAT, yaw: 0, tilt: 0, pose: TYPING, lift: 0.1 },
  ],
}
const NEXT = { standUp: 'walkToBed', lieDown: 'bed', getUp: 'walkToDesk', sitDown: 'desk' }

// Position (written into `pos`), facing, lean and pose at time k on a track
function sampleTrack(track, k, pos) {
  const last = track[track.length - 1]
  if (k >= last.t) {
    pos.copy(last.pos)
    return { yaw: last.yaw, tilt: last.tilt, pose: last.pose, done: true }
  }
  let i = 0
  while (k > track[i + 1].t) i++
  const a = track[i]
  const b = track[i + 1]
  const e = ease(Math.max(0, (k - a.t) / (b.t - a.t)))
  pos.lerpVectors(a.pos, b.pos, e)
  if (b.lift) pos.y += Math.sin(Math.PI * e) * b.lift
  return { yaw: MathUtils.lerp(a.yaw, b.yaw, e), tilt: MathUtils.lerp(a.tilt, b.tilt, e), pose: blendPose(a.pose, b.pose, e), done: false }
}

function Skin(props) {
  return <meshPhysicalMaterial color={PALETTE.skin} roughness={0.55} clearcoat={0.08} clearcoatRoughness={0.6} sheen={0.25} sheenColor="#ffd8c4" {...props} />
}
function Cloth({ color }) {
  return <meshPhysicalMaterial color={color} {...MAT.fabric} roughness={0.88} sheen={0.7} sheenRoughness={0.55} sheenColor="#ffffff" />
}

// Capsule hanging down from its parent joint
function Bone({ length, radius, children, offset = 0 }) {
  return (
    <mesh position={[0, -length / 2 - offset, 0]} castShadow receiveShadow>
      <capsuleGeometry args={[radius, Math.max(0.001, length - radius * 2), 10, 28]} />
      {children}
    </mesh>
  )
}

function Hand({ side }) {
  return (
    <group position={[0, -0.27, 0]}>
      {/* palm + fingers, slightly curled */}
      <RoundedBox args={[0.07, 0.085, 0.028]} radius={0.012} smoothness={4} position={[0, -0.035, 0]} rotation-x={0.25} castShadow>
        <Skin />
      </RoundedBox>
      <RoundedBox args={[0.064, 0.05, 0.022]} radius={0.01} smoothness={4} position={[0, -0.09, -0.012]} rotation-x={0.6} castShadow>
        <Skin />
      </RoundedBox>
      {/* thumb */}
      <mesh position={[side * -0.038, -0.035, -0.012]} rotation={[0.4, 0, side * 0.6]} castShadow>
        <capsuleGeometry args={[0.011, 0.035, 6, 12]} />
        <Skin />
      </mesh>
    </group>
  )
}

function Arm({ side, sh, el, watch }) {
  return (
    <group ref={sh} position={[side * 0.185, 0.42, 0]}>
      {/* shoulder ball keeps the joint smooth */}
      <mesh castShadow>
        <sphereGeometry args={[0.058, 28, 20]} />
        <Cloth color={PALETTE.shirt} />
      </mesh>
      {/* t-shirt sleeve over the upper arm */}
      <Bone length={0.15} radius={0.054}><Cloth color={PALETTE.shirt} /></Bone>
      <Bone length={0.2} radius={0.043} offset={0.08}><Skin /></Bone>
      <group ref={el} position={[0, -0.28, 0]} rotation-order="YXZ">
        <mesh castShadow>
          <sphereGeometry args={[0.042, 24, 16]} />
          <Skin />
        </mesh>
        <Bone length={0.26} radius={0.037}><Skin /></Bone>
        {watch && (
          <mesh position={[0, -0.215, 0]} rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[0.038, 0.009, 10, 28]} />
            <meshStandardMaterial color="#1e1f22" roughness={0.4} metalness={0.3} />
          </mesh>
        )}
        <Hand side={side} />
      </group>
    </group>
  )
}

function Leg({ side, hip, knee, ankle }) {
  return (
    <group ref={hip} position={[side * 0.1, -0.02, 0]}>
      <Bone length={0.44} radius={0.072}><Cloth color={PALETTE.trousers} /></Bone>
      <group ref={knee} position={[0, -0.43, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.066, 24, 16]} />
          <Cloth color={PALETTE.trousers} />
        </mesh>
        <Bone length={0.46} radius={0.058}><Cloth color={PALETTE.trousers} /></Bone>
        <group ref={ankle} position={[0, -0.47, 0]}>
          {/* trainer: upper and white sole */}
          <RoundedBox args={[0.1, 0.07, 0.24]} radius={0.03} smoothness={4} position={[0, -0.02, -0.05]} castShadow receiveShadow>
            <meshStandardMaterial color={PALETTE.shoe} roughness={0.55} />
          </RoundedBox>
          <RoundedBox args={[0.106, 0.024, 0.25]} radius={0.01} smoothness={3} position={[0, -0.055, -0.05]} castShadow receiveShadow>
            <meshStandardMaterial color="#efece6" roughness={0.6} />
          </RoundedBox>
        </group>
      </group>
    </group>
  )
}

export default function Character({ reducedMotion, period, hour, onMouseScare }) {
  const { hovered, setHovered, activeId, reducedMotion: rm } = useInteraction()
  // Little startled jump when poked
  const [hop, kick] = useHop(false, rm)
  const night = period === 'night'
  const periodRef = useRef(period)
  periodRef.current = period

  const refs = {
    root: useRef(), head: useRef(), anchor: useRef(),
    spine: useRef(), neck: useRef(), breath: useRef(),
    lSh: useRef(), lEl: useRef(), rSh: useRef(), rEl: useRef(),
    lHip: useRef(), lKnee: useRef(), lAnkle: useRef(),
    rHip: useRef(), rKnee: useRef(), rAnkle: useRef(),
  }
  const current = useRef({ ...(night ? SLEEP : TYPING) })
  const action = useRef(null) // { name, start }
  const [bubble, setBubble] = useState(null)

  // Where he is: desk → checking → standUp → walkToBed → lieDown → bed
  //              bed → getUp → walkToDesk → sitDown → desk
  const seq = useRef({ mode: 'desk', start: 0 })
  const [mode, setMode] = useState('desk')
  const go = (next) => {
    seq.current = { mode: next, start: performance.now() / 1000 }
    setMode(next)
  }
  const sleeping = mode === 'bed' || (mode === 'desk' && night)
  const tmp = useMemo(
    () => ({ pos: new Vector3(), tan: new Vector3(), head: new Vector3(), q: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), first: true }),
    []
  )

  // Torso: a lathe profile (hips → waist → chest → shoulders) instead of a plain capsule
  const torsoGeo = useMemo(() => {
    const pts = [
      [0.0, 0.0], [0.12, 0.01], [0.15, 0.06], [0.145, 0.16], [0.155, 0.27],
      [0.17, 0.37], [0.165, 0.42], [0.12, 0.47], [0.06, 0.5], [0.0, 0.505],
    ].map(([r, y]) => new Vector2(r, y))
    return new LatheGeometry(pts, 48)
  }, [])

  const trigger = (name, text) => {
    const a = action.current
    if (a && performance.now() / 1000 - a.start < ACTIONS[a.name].duration * 0.8) return false
    action.current = { name, start: performance.now() / 1000 }
    setBubble({ text: text ?? ACTIONS[name].bubble, ms: ACTIONS[name].duration * 1000 - 300 })
    if (name === 'lookUnder') onMouseScare?.()
    return true
  }

  // Bubble disappears when the reaction ends
  useEffect(() => {
    if (!bubble) return
    const id = setTimeout(() => setBubble(null), bubble.ms)
    return () => clearTimeout(id)
  }, [bubble])

  const poke = (zone) => (e) => {
    e.stopPropagation()
    if (activeId || e.delta > 6) return
    const m = seq.current.mode
    if (m === 'bed') {
      if (trigger('bedStir')) { sfx.snore(); kick(0.35); complete('poke') }
      return
    }
    if (m !== 'desk') return // busy walking about
    let ok
    if (night) {
      // Wakes up and checks his watch; the time decides what happens next
      const text = `${formatHour(hour)}?! I should be in bed.`
      ok = trigger('checkTime', text)
      if (ok) go('checking')
    } else if (zone === 'legs') {
      ok = trigger('lookUnder')
    } else {
      ok = trigger(Math.random() < 0.5 ? 'scratch' : 'lookBack')
    }
    if (ok) { sfx.poke(); kick(1.1); complete('poke') }
  }
  const over = (e) => {
    e.stopPropagation()
    if (activeId) return
    if (hovered !== 'person') sfx.hover()
    setHovered('person')
    setCursor('hand')
  }
  const out = () => {
    setHovered((h) => (h === 'person' ? null : h))
    setCursor()
  }

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const now = performance.now() / 1000
    const step = Math.min(dt, 0.1)
    const isNight = periodRef.current === 'night'
    const s = seq.current
    const k = now - s.start
    const pos = tmp.pos
    let base = TYPING
    let yaw = 0
    let tilt = 0
    let walk = null // step phase while walking

    switch (s.mode) {
      case 'desk':
        base = isNight ? SLEEP : TYPING
        pos.copy(SEAT)
        break
      case 'checking':
        // Sitting up looking at his watch; then off to bed if it's night
        pos.copy(SEAT)
        if (k > ACTIONS.checkTime.duration) go(!isNight ? 'desk' : reducedMotion ? 'bed' : 'standUp')
        break
      case 'walkToBed':
      case 'walkToDesk': {
        const toBed = s.mode === 'walkToBed'
        const d = Math.min(WALK_LEN, k * WALK_SPEED)
        const u = toBed ? d / WALK_LEN : 1 - d / WALK_LEN
        WALK.getPointAt(u, pos)
        WALK.getTangentAt(MathUtils.clamp(u, 0.001, 0.999), tmp.tan)
        if (!toBed) tmp.tan.negate()
        yaw = Math.atan2(-tmp.tan.x, -tmp.tan.z)
        pos.y = DESK_STAND.y
        base = STAND
        walk = (d / STRIDE) * Math.PI * 2
        if (d >= WALK_LEN) go(toBed ? 'lieDown' : 'sitDown')
        break
      }
      case 'bed':
        base = LIE
        pos.copy(BED_LIE)
        yaw = Math.PI
        tilt = H
        // Sleeps until morning, then heads back to the desk
        if (!isNight && k > 2) {
          setBubble({ text: 'Morning already? Back to work.', ms: 3200 })
          go(reducedMotion ? 'desk' : 'getUp')
        }
        break
      default: {
        // standUp, lieDown, getUp, sitDown
        const r = sampleTrack(TRACKS[s.mode], k, pos)
        base = r.pose
        yaw = r.yaw
        tilt = r.tilt
        if (r.done) go(NEXT[s.mode])
      }
    }
    if (walk !== null && !reducedMotion) pos.y -= Math.abs(Math.sin(walk)) * 0.02

    // Move and turn the whole body
    const root = refs.root.current
    root.position.copy(pos)
    tmp.e.set(tilt, yaw, 0, 'YXZ')
    tmp.q.setFromEuler(tmp.e)
    if (tmp.first) root.quaternion.copy(tmp.q)
    else root.quaternion.slerp(tmp.q, 1 - Math.exp(-12 * step))

    const sleepingNow = s.mode === 'bed' || (s.mode === 'desk' && isNight)
    const target = { ...base }

    // Blend the active reaction in and out
    let env = 0
    const a = action.current
    if (a) {
      const def = ACTIONS[a.name]
      const k = now - a.start
      if (k > def.duration) {
        action.current = null
      } else {
        env = ease(Math.min(1, k / 0.45)) * ease(Math.min(1, (def.duration - k) / 0.6))
        for (const j in def.pose) target[j] = MathUtils.lerp(base[j], def.pose[j], env)
        if (a.name === 'scratch' && !reducedMotion) {
          target.rElX += Math.sin(k * 22) * 0.16 * env
          target.rShY = Math.sin(k * 22) * 0.12 * env
        }
      }
    }

    // Idle life on top of the pose
    if (!reducedMotion) {
      if (sleepingNow) {
        target.spineX += Math.sin(t * 0.9) * 0.015
        target.neckY += Math.sin(t * 0.13) * 0.03
      } else if (s.mode === 'desk') {
        const idle = 1 - env
        target.neckY += (Math.sin(t * 0.23) * 0.16 + Math.sin(t * 0.9) * 0.02) * idle
        target.neckX += Math.sin(t * 0.31) * 0.04 * idle
        target.lElX += Math.max(0, Math.sin(t * 9)) * 0.05 * idle
        target.rElX += Math.max(0, Math.sin(t * 9 + 1.7)) * 0.05 * idle
      }
      if (walk !== null) {
        // Legs swing, the knee bends on the forward swing, arms counter-swing
        const sw = Math.sin(walk)
        const cw = Math.cos(walk)
        target.lHipX += sw * 0.42
        target.rHipX -= sw * 0.42
        target.lKneeX -= Math.max(0, cw) * 0.6
        target.rKneeX -= Math.max(0, -cw) * 0.6
        target.lShX -= sw * 0.3
        target.rShX += sw * 0.3
      }
    }

    // Ease every joint towards its target
    const c = current.current
    const speed = reducedMotion ? 30 : 9
    for (const j of JOINTS) c[j] = MathUtils.damp(c[j], target[j], speed, step)

    const r = refs
    r.spine.current.rotation.set(c.spineX, c.spineY, c.spineZ)
    r.neck.current.rotation.set(c.neckX, c.neckY, c.neckZ)
    r.lSh.current.rotation.set(c.lShX, c.lShY, c.lShZ)
    r.rSh.current.rotation.set(c.rShX, c.rShY, c.rShZ)
    r.lEl.current.rotation.set(c.lElX, c.lElY, 0)
    r.rEl.current.rotation.set(c.rElX, c.rElY, 0)
    r.lHip.current.rotation.set(c.lHipX, 0, c.lHipZ)
    r.rHip.current.rotation.set(c.rHipX, 0, c.rHipZ)
    r.lKnee.current.rotation.x = c.lKneeX
    r.rKnee.current.rotation.x = c.rKneeX
    // keep the feet level
    r.lAnkle.current.rotation.x = -(c.lHipX + c.lKneeX)
    r.rAnkle.current.rotation.x = -(c.rHipX + c.rKneeX)
    // breathing
    const breath = sleepingNow ? Math.sin(t * 0.9) * 0.012 : Math.sin(t * 1.6) * 0.008
    r.breath.current.scale.set(1 + breath * 0.6, 1 + breath, 1 + breath)

    // Speech bubble / zzz float just above his head, wherever he is
    r.head.current.updateWorldMatrix(true, false)
    r.head.current.getWorldPosition(tmp.head)
    tmp.head.y += 0.32
    if (tmp.first) r.anchor.current.position.copy(tmp.head)
    else r.anchor.current.position.lerp(tmp.head, 1 - Math.exp(-6 * step))
    tmp.first = false
  })

  const outlined = !activeId && hovered === 'person'
  const hint =
    mode === 'bed' ? 'Shh… he’s asleep'
      : mode === 'desk' && night ? 'Dozed off at his desk… poke him'
      : mode === 'desk' ? 'Go on, poke him'
      : null

  return (
    <group>
      <Chair />
      <Bed occupied={mode === 'bed'} />
      <group onPointerOver={over} onPointerOut={out}>
        <group ref={hop}>
        <Select enabled={outlined}>
          {/* Pelvis / root: moved and turned each frame */}
          <group ref={refs.root} position={[0, 0.575, -0.13]}>
            {/* Hips + legs = the "legs" poke zone */}
            <group onClick={poke('legs')}>
              <mesh scale={[1.2, 0.62, 0.95]} castShadow>
                <sphereGeometry args={[0.135, 32, 24]} />
                <Cloth color={PALETTE.trousers} />
              </mesh>
              <Leg side={-1} hip={refs.lHip} knee={refs.lKnee} ankle={refs.lAnkle} />
              <Leg side={1} hip={refs.rHip} knee={refs.rKnee} ankle={refs.rAnkle} />
            </group>

            {/* Everything above the waist = the "upper body" poke zone */}
            <group ref={refs.spine} position={[0, 0.02, 0]} onClick={poke('upper')}>
              <group ref={refs.breath}>
                <mesh geometry={torsoGeo} scale={[1, 1, 0.74]} castShadow receiveShadow>
                  <Cloth color={PALETTE.shirt} />
                </mesh>
                {/* collar */}
                <mesh position={[0, 0.49, -0.005]} rotation-x={Math.PI / 2 + 0.15}>
                  <torusGeometry args={[0.05, 0.012, 10, 32]} />
                  <Cloth color={PALETTE.shirt} />
                </mesh>
              </group>

              <group ref={refs.neck} position={[0, 0.5, -0.015]}>
                <mesh position={[0, 0.04, 0]} castShadow>
                  <cylinderGeometry args={[0.038, 0.044, 0.09, 24]} />
                  <Skin />
                </mesh>
                {/* Head: slightly oval, with jaw, nose, ears and hair */}
                <group ref={refs.head} position={[0, 0.15, -0.012]}>
                  <mesh scale={[0.9, 1.06, 0.98]} castShadow receiveShadow>
                    <sphereGeometry args={[0.105, 48, 36]} />
                    <Skin />
                  </mesh>
                  <mesh position={[0, -0.065, -0.035]} scale={[0.85, 0.6, 0.85]} castShadow>
                    <sphereGeometry args={[0.07, 32, 24]} />
                    <Skin />
                  </mesh>
                  <mesh position={[0, -0.005, -0.1]} scale={[0.7, 1, 0.9]}>
                    <sphereGeometry args={[0.018, 16, 12]} />
                    <Skin />
                  </mesh>
                  {[-1, 1].map((s) => (
                    <mesh key={s} position={[s * 0.093, -0.005, 0.005]} scale={[0.45, 1, 0.75]} castShadow>
                      <sphereGeometry args={[0.025, 16, 12]} />
                      <Skin />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.022, 0.012]} rotation-x={0.35} scale={[0.95, 0.9, 1]} castShadow>
                    <sphereGeometry args={[0.108, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                    <meshPhysicalMaterial color={PALETTE.hair} roughness={0.7} sheen={0.6} sheenColor="#6b5a50" />
                  </mesh>
                </group>
              </group>

              <Arm side={-1} sh={refs.lSh} el={refs.lEl} watch />
              <Arm side={1} sh={refs.rSh} el={refs.rEl} />
            </group>
          </group>
        </Select>
        </group>
      </group>

      {/* Thought bubble / snoring */}
      <group ref={refs.anchor} position={[0.05, 1.25, -0.3]}>
        <Html center zIndexRange={[25, 0]} style={{ pointerEvents: 'none' }}>
          {bubble ? (
            <div className="bubble" key={bubble.text}>{bubble.text}</div>
          ) : outlined ? (
            <div className="tag is-visible">
              <span className="tag__label">Radin</span>
              {hint && <span className="tag__hint">{hint}</span>}
              {mode === 'desk' && <span className="tag__cta">▶ poke</span>}
            </div>
          ) : sleeping && !activeId ? (
            <div className="zzz" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></div>
          ) : null}
        </Html>
      </group>
    </group>
  )
}

function Chair() {
  const seat = { color: PALETTE.chair, ...MAT.fabric, roughness: 0.85 }
  const chrome = { color: '#cfd3d8', ...MAT.chrome }
  return (
    <group position={[0, 0, -0.08]}>
      {/* Seat cushion and backrest */}
      <RoundedBox args={[0.5, 0.07, 0.48]} radius={0.03} smoothness={5} position={[0, 0.47, -0.02]} castShadow receiveShadow>
        <meshPhysicalMaterial {...seat} sheen={0.4} sheenColor="#ffffff" />
      </RoundedBox>
      <RoundedBox args={[0.46, 0.56, 0.06]} radius={0.03} smoothness={5} position={[0, 0.83, 0.23]} rotation-x={-0.12} castShadow receiveShadow>
        <meshPhysicalMaterial {...seat} sheen={0.4} sheenColor="#ffffff" />
      </RoundedBox>
      <mesh position={[0, 0.62, 0.23]} castShadow>
        <boxGeometry args={[0.06, 0.2, 0.02]} />
        <meshStandardMaterial color={PALETTE.black} {...MAT.powderCoat} />
      </mesh>
      {/* Armrests */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.27, 0, 0]}>
          <mesh position={[0, 0.56, 0.02]} castShadow>
            <boxGeometry args={[0.025, 0.16, 0.025]} />
            <meshStandardMaterial color={PALETTE.black} {...MAT.powderCoat} />
          </mesh>
          <RoundedBox args={[0.06, 0.025, 0.24]} radius={0.01} position={[0, 0.65, -0.02]} castShadow>
            <meshStandardMaterial color={PALETTE.black} roughness={0.6} />
          </RoundedBox>
        </group>
      ))}
      {/* Gas lift and five-star base */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.4, 24]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i} rotation-y={a}>
            <mesh position={[0.15, 0.07, 0]} rotation-z={0.12} castShadow>
              <boxGeometry args={[0.3, 0.025, 0.035]} />
              <meshStandardMaterial {...chrome} />
            </mesh>
            <mesh position={[0.29, 0.028, 0]} rotation-x={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.026, 0.026, 0.022, 20]} />
              <meshStandardMaterial color={PALETTE.black} roughness={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
