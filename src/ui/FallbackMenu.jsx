// Plain list of every section — for visitors who'd rather not explore,
// and the only navigation when WebGL isn't available.
export default function FallbackMenu({ open, sections, onSelect }) {
  return (
    <nav className={`px-box menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <ol>
        {sections.map((s, i) => (
          <li key={s.id}>
            <button onClick={() => onSelect(s.id)} tabIndex={open ? 0 : -1}>
              <span className="menu__arrow" aria-hidden="true">▶</span>
              <span className="menu__label">{s.label}</span>
              <kbd className="menu__num">{i + 1}</kbd>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
