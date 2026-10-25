import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { SECTIONS } from '../data/sections'
import { useInteraction } from './interaction'

const BURST_BITS = Array.from({ length: 10 }, (_, i) => i)

// Labels that appear above an object only while it is hovered.
// On touch screens (no hover) bouncing markers show each object instead; tap to open.
// Opening an object sets off a little burst of pixels from it.
export default function Labels({ touch }) {
  const { hovered, activeId, select } = useInteraction()
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    if (!activeId) return
    setBurst({ id: activeId, key: Date.now() })
    const t = setTimeout(() => setBurst(null), 900)
    return () => clearTimeout(t)
  }, [activeId])

  return SECTIONS.map((s, i) => {
    const visible = !activeId && hovered === s.id
    return (
      <Html key={s.id} position={s.anchor} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`tag ${visible ? 'is-visible' : ''}`} aria-hidden="true">
          <span className="tag__label">{s.label}</span>
          <span className="tag__hint">{s.hint}</span>
          <span className="tag__cta">{touch ? '▶ tap' : '▶ click'} <kbd>{i + 1}</kbd></span>
        </div>
        {burst?.id === s.id && (
          <div className="burst" key={burst.key} aria-hidden="true">
            {BURST_BITS.map((b) => <i key={b} style={{ '--a': `${b * 36}deg`, '--d': `${40 + (b % 3) * 14}px` }} />)}
          </div>
        )}
        {touch && !activeId && (
          <button
            className="dot"
            style={{ pointerEvents: 'auto', animationDelay: `${i * 0.2}s` }}
            onClick={() => select(s.id)}
            aria-label={`Open ${s.label}`}
          />
        )}
      </Html>
    )
  })
}
