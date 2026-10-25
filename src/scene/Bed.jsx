import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { MathUtils } from 'three'
import { MAT } from './palette'

// Single bed in the back-right corner, headboard against the back wall.
// Centre of the bed on the floor plan, and the height of the mattress top.
export const BED = { x: 1.72, z: -0.485, top: 0.48 }

const LENGTH = 1.96
const WIDTH = 0.92
const DUVET_LEN = 1.35
const DUVET_FLAT = 0.06 // duvet lying flat on an empty bed
const DUVET_FULL = 0.27 // puffed up over a sleeping body

// `occupied` puffs the duvet up over him while he sleeps.
export default function Bed({ occupied }) {
  const duvet = useRef()
  const fold = useRef()
  const h = useRef(DUVET_FLAT)

  useFrame((_, dt) => {
    h.current = MathUtils.damp(h.current, occupied ? DUVET_FULL : DUVET_FLAT, 4, Math.min(dt, 0.1))
    const y = BED.top + h.current / 2 - 0.01
    duvet.current.scale.y = h.current / 0.1
    duvet.current.position.y = y
    fold.current.scale.y = (h.current + 0.012) / 0.1
    fold.current.position.y = y + 0.004
  })

  const wood = { color: '#b28a62', ...MAT.satinWood }
  const duvetZ = LENGTH / 2 - DUVET_LEN / 2 + 0.02 // duvet runs from chest height to the foot

  return (
    <group position={[BED.x, 0, BED.z]}>
      {/* Base and legs */}
      <RoundedBox args={[WIDTH, 0.12, LENGTH]} radius={0.02} smoothness={3} position={[0, 0.24, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...wood} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (WIDTH / 2 - 0.05), 0.09, sz * (LENGTH / 2 - 0.05)]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.18, 16]} />
          <meshStandardMaterial {...wood} />
        </mesh>
      ))}

      {/* Headboard */}
      <RoundedBox args={[WIDTH + 0.04, 0.74, 0.05]} radius={0.02} smoothness={4} position={[0, 0.55, -LENGTH / 2 + 0.01]} castShadow receiveShadow>
        <meshStandardMaterial {...wood} />
      </RoundedBox>

      {/* Mattress */}
      <RoundedBox args={[WIDTH - 0.04, 0.18, LENGTH - 0.06]} radius={0.04} smoothness={4} position={[0, 0.39, 0.02]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f3efe8" {...MAT.fabric} sheen={0.5} sheenColor="#ffffff" />
      </RoundedBox>

      {/* Pillow */}
      <RoundedBox args={[0.6, 0.1, 0.3]} radius={0.045} smoothness={5} position={[0, BED.top + 0.04, -LENGTH / 2 + 0.24]} rotation-x={-0.08} castShadow receiveShadow>
        <meshPhysicalMaterial color="#faf8f4" {...MAT.fabric} sheen={0.7} sheenColor="#ffffff" />
      </RoundedBox>

      {/* Duvet (height animated) with a white sheet folded over its top edge */}
      <RoundedBox ref={duvet} args={[WIDTH + 0.06, 0.1, DUVET_LEN]} radius={0.04} smoothness={5} position={[0, BED.top + DUVET_FLAT / 2, duvetZ]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#8fa2b5" {...MAT.fabric} roughness={0.9} sheen={0.8} sheenRoughness={0.5} sheenColor="#dfe8f0" />
      </RoundedBox>
      <RoundedBox ref={fold} args={[WIDTH + 0.07, 0.1, 0.1]} radius={0.035} smoothness={4} position={[0, BED.top + DUVET_FLAT / 2, duvetZ - DUVET_LEN / 2 + 0.05]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f6f3ee" {...MAT.fabric} sheen={0.6} sheenColor="#ffffff" />
      </RoundedBox>
    </group>
  )
}
