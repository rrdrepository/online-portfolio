import { createContext, useContext, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { sfx } from '../ui/sfx'
import { setCursor } from '../ui/cursor'

// Shared hover/select state for every clickable object in the room.
export const InteractionContext = createContext(null)
export const useInteraction = () => useContext(InteractionContext)

// A springy vertical hop: objects bounce up when hovered and pop when clicked.
// Returns a ref for the group to move and a `kick(velocity)` function.
export function useHop(lifted, reducedMotion, height = 0.025) {
  const group = useRef()
  const s = useRef({ y: 0, v: 0 })
  useFrame((_, dt) => {
    if (!group.current) return
    const st = s.current
    const target = reducedMotion ? 0 : lifted ? height : 0
    const step = Math.min(dt, 1 / 30)
    // Under-damped spring, so it overshoots a little like a cartoon bounce
    st.v += ((target - st.y) * 260 - st.v * 13) * step
    st.y += st.v * step
    group.current.position.y = st.y
  })
  const kick = (v = 0.9) => { if (!reducedMotion) s.current.v += v }
  return [group, kick]
}

// Wrap any object to make it clickable.
// - children: the visible meshes (these get the outline and hop on hover)
// - hitbox:   optional invisible box that makes small objects easier to hit
//             { size: [w, h, d], position: [x, y, z] } in the object's local space
export function Interactive({ id, hitbox, children }) {
  const { hovered, setHovered, select, activeId, introGlow, reducedMotion } = useInteraction()
  const isHovered = !activeId && hovered === id
  const outlined = isHovered || (!activeId && introGlow)
  const [hop, kick] = useHop(isHovered, reducedMotion)

  const over = (e) => {
    e.stopPropagation()
    if (activeId) return
    if (hovered !== id) sfx.hover()
    setHovered(id)
    setCursor('hand')
  }
  const out = () => {
    setHovered((h) => (h === id ? null : h))
    setCursor()
  }
  const click = (e) => {
    e.stopPropagation()
    // Ignore the click that ends a camera drag
    if (activeId || e.delta > 6) return
    setCursor()
    kick(1.4)
    select(id)
  }

  return (
    <group onPointerOver={over} onPointerOut={out} onClick={click}>
      <group ref={hop}>
        <Select enabled={outlined}>{children}</Select>
      </group>
      {hitbox && (
        // visible={false}: never drawn, but still picked up by the pointer raycast
        <mesh position={hitbox.position} visible={false}>
          <boxGeometry args={hitbox.size} />
        </mesh>
      )}
    </group>
  )
}
