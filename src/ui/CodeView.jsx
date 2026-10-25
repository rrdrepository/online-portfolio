import { useEffect, useRef, useState } from 'react'
import { CODE_LINES } from '../data/code'

// Full code editor that opens after the camera glides into the laptop screen.
// Lines cascade in on open, like the file is being loaded.
export default function CodeView({ open, onClose }) {
  const [mounted, setMounted] = useState(open)
  const closeBtn = useRef()

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = setTimeout(() => closeBtn.current?.focus({ focusVisible: false }), 900)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setMounted(false), 400)
    return () => clearTimeout(id)
  }, [open])

  if (!mounted) return null

  return (
    <div className={`codeview ${open ? 'is-open' : ''}`} role="dialog" aria-label="Resume as code">
      <div className="editor">
        <div className="editor__bar">
          <span className="editor__lights" aria-hidden="true"><i /><i /><i /></span>
          <span className="editor__title">radin.ts — resume</span>
          <button ref={closeBtn} className="px-btn editor__close" onClick={onClose}>
            ✕ Back
          </button>
        </div>
        <div className="editor__tabs">
          <span className="editor__tab"><b>TS</b> radin.ts</span>
        </div>
        <pre className="editor__code">
          <code>
            {CODE_LINES.map((line, i) => (
              <span className="ln" key={i} style={{ '--i': Math.min(i, 40) }}>
                <span className="ln__no" aria-hidden="true">{i + 1}</span>
                <span className="ln__text">
                  {line.length === 0 ? ' ' : line.map((t, j) => (
                    <span key={j} className={`tk-${t.t}`}>{t.v}</span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
        <div className="editor__status">
          <span>⎇ main</span>
          <span>TypeScript · UTF-8</span>
        </div>
      </div>
    </div>
  )
}
