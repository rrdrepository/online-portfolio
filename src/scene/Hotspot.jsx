import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { PALETTE } from './palette'

// A floating marker: a glowing 3D orb (feels part of the scene) plus an HTML
// label (crisp text, real <button> for keyboard and screen-reader users).
export default function Hotspot({ section, index, onSelect, hidden, reducedMotion }) {
  const group = useRef()
  const orb = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (!reducedMotion) group.current.position.y = section.anchor[1] + Math.sin(t * 1.4 + index * 1.3) * 0.015
    // Ease scale towards target: grow on hover, shrink away when hidden
    const target = hidden ? 0 : hovered ? 1.45 : 1
    const s = orb.current.scale.x + (target - orb.current.scale.x) * Math.min(1, dt * 10)
    orb.current.scale.setScalar(s)
  })

  const enter = () => { setHovered(true); document.body.style.cursor = 'pointer' }
  const leave = () => { setHovered(false); document.body.style.cursor = '' }
  const select = (e) => { e.stopPropagation?.(); leave(); onSelect(section.id) }

  return (
    <group ref={group} position={section.anchor}>
      <group ref={orb}>
        <mesh onPointerOver={enter} onPointerOut={leave} onClick={select}>
          <sphereGeometry args={[0.028, 24, 16]} />
          <meshBasicMaterial color={PALETTE.accent} toneMapped={false} />
        </mesh>
        {/* Soft halo */}
        <mesh>
          <sphereGeometry args={[0.05, 24, 16]} />
          <meshBasicMaterial color={PALETTE.accent} transparent opacity={hovered ? 0.35 : 0.18} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      <Html center position={[0, 0.085, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: hidden ? 'none' : 'auto' }}>
        <button
          className={`hotspot ${hovered ? 'is-hovered' : ''} ${hidden ? 'is-hidden' : ''}`}
          onMouseEnter={enter}
          onMouseLeave={leave}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          onClick={select}
          tabIndex={hidden ? -1 : 0}
        >
          <span className="hotspot__label">{section.label}</span>
          <span className="hotspot__hint">{section.hint}</span>
        </button>
      </Html>
    </group>
  )
}
