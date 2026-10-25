// Covers the first frames while the scene compiles, then fades away.
export default function Loader({ done }) {
  return (
    <div className={`loader ${done ? 'is-done' : ''}`} aria-hidden={done}>
      <p className="loader__text">Loading room<span className="blink">_</span></p>
      <div className="loader__bar">
        {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
      </div>
    </div>
  )
}
