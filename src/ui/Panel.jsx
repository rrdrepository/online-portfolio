import { useEffect, useRef, useState } from 'react'
import { Typewriter } from './Hud'

// Turn emails and URLs into links; leave everything else as text.
function Value({ v }) {
  if (typeof v !== 'string') return v
  if (/^https?:\/\//.test(v)) return <a href={v} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\/(www\.)?/, '')}</a>
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return <a href={`mailto:${v}`}>{v}</a>
  return v
}

function Block({ b }) {
  if (b.heading) return <h3 className="panel__heading">{b.heading}</h3>
  if (b.p) return <p className="panel__body">{b.p}</p>
  if (b.list) return <ul className="panel__list">{b.list.map((x, i) => <li key={i}>{x}</li>)}</ul>
  if (b.rows) {
    return (
      <dl className="panel__rows">
        {b.rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd><Value v={v} /></dd></div>
        ))}
      </dl>
    )
  }
  if (b.cards) {
    return b.cards.map((c) => (
      <article key={c.title} className="panel__card">
        <h3>{c.title}</h3>
        {c.meta && <p className="panel__meta">{c.meta}</p>}
        {c.text && <p>{c.text}</p>}
        {c.points && <ul>{c.points.map((pt, i) => <li key={i}>{pt}</li>)}</ul>}
      </article>
    ))
  }
  return null
}

// Slide-in panel (right side on desktop, bottom sheet on phones).
// Keeps rendering the last section while it animates out.
export default function Panel({ section, onClose, reducedMotion }) {
  const [shown, setShown] = useState(section)
  const closeBtn = useRef()

  useEffect(() => {
    if (section) {
      setShown(section)
      const id = setTimeout(() => closeBtn.current?.focus({ focusVisible: false }), 350)
      return () => clearTimeout(id)
    }
  }, [section])

  const open = !!section

  return (
    <aside className={`px-box panel ${open ? 'is-open' : ''}`} aria-hidden={!open} role="dialog" aria-label={shown?.label}>
      {shown && (
        <div className="panel__inner">
          <div className="panel__bar">
            <span className="panel__bar-title">{shown.label}.txt</span>
            <button ref={closeBtn} className="px-btn panel__close" onClick={onClose} tabIndex={open ? 0 : -1}>
              ✕ Back
            </button>
          </div>
          <h2 className="panel__title">{shown.label}</h2>
          <p className="panel__eyebrow">
            {open ? <Typewriter key={shown.id} text={shown.hint} reducedMotion={reducedMotion} /> : shown.hint}
          </p>
          {shown.blocks?.map((b, i) => <Block key={i} b={b} />)}
        </div>
      )}
    </aside>
  )
}
