import { useEffect, useRef, useState } from 'react'
import { ALL, QUESTS, SECRETS, getDone, onComplete, resetQuests, useQuests } from './quests'
import { sfx } from './sfx'
import PixelIcon from './PixelIcon'

// ── Quest log ────────────────────────────────────────────────
// A small badge under the name ("QUESTS 3/6" + stars). Click to open the list.
export function QuestLog() {
  const done = useQuests()
  const [open, setOpen] = useState(false)
  const count = QUESTS.filter((q) => done.includes(q.id)).length
  const allDone = count === QUESTS.length

  return (
    <div className={`quests ${open ? 'is-open' : ''}`}>
      <button
        className="px-btn quests__toggle"
        onClick={() => { sfx.click(); setOpen((o) => !o) }}
        aria-expanded={open}
      >
        <span className="quests__title">{allDone ? 'All found!' : 'Quests'}</span>
        <span className="quests__stars" aria-label={`${count} of ${QUESTS.length} found`}>
          {QUESTS.map((q) => (
            <i key={q.id} className={done.includes(q.id) ? 'is-on' : ''} />
          ))}
        </span>
        <span className="quests__count">{count}/{QUESTS.length}</span>
      </button>
      {open && (
        <div className="px-box quests__list">
          <ul>
            {QUESTS.map((q) => (
              <li key={q.id} className={done.includes(q.id) ? 'is-done' : ''}>
                <span className="quests__check" aria-hidden="true" />
                {q.label}
              </li>
            ))}
          </ul>
          <p className="quests__sub">Secrets</p>
          <ul>
            {SECRETS.map((q) => {
              const found = done.includes(q.id)
              return (
                <li key={q.id} className={found ? 'is-done' : 'is-secret'}>
                  <span className="quests__check" aria-hidden="true" />
                  {found ? q.label : `??? — ${q.clue}`}
                </li>
              )
            })}
          </ul>
          {done.length > 0 && (
            <button className="quests__reset" onClick={() => { sfx.close(); resetQuests() }}>Reset progress</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Achievement toasts + confetti ────────────────────────────
export function Toasts({ reducedMotion }) {
  const [toasts, setToasts] = useState([])
  const [confetti, setConfetti] = useState(0)
  const nextId = useRef(0)

  useEffect(() => onComplete((id) => {
    const quest = ALL.find((q) => q.id === id)
    const secret = SECRETS.some((s) => s.id === id)
    const stored = getDone()
    const count = QUESTS.filter((q) => stored.includes(q.id)).length
    const finished = !secret && count === QUESTS.length

    const toast = {
      key: nextId.current++,
      kind: finished ? 'gold' : secret ? 'secret' : 'quest',
      title: finished ? 'All quests complete!' : secret ? 'Secret found!' : 'Quest complete',
      text: finished ? 'You’ve seen the whole resume. Say hi to Radin?' : `${quest.label}${secret ? '' : ` · ${count}/${QUESTS.length}`}`,
    }
    setToasts((t) => [...t.slice(-2), toast])
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== toast.key)), finished ? 5200 : 3200)
    // Let the "open" sound finish first
    setTimeout(() => (finished ? sfx.fanfare() : sfx.quest()), 380)
    if (finished && !reducedMotion) setConfetti((n) => n + 1)
  }), [reducedMotion])

  return (
    <>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className={`px-box toast toast--${t.kind}`}>
            <span className="toast__icon" aria-hidden="true">{t.kind === 'secret' ? '?' : '★'}</span>
            <span>
              <b className="toast__title">{t.title}</b>
              <span className="toast__text">{t.text}</span>
            </span>
          </div>
        ))}
      </div>
      {confetti > 0 && <Confetti key={confetti} />}
    </>
  )
}

const CONFETTI_COLORS = ['#fee761', '#f77622', '#e43b44', '#63c74d', '#0099db', '#2ce8f5', '#b55088', '#ffffff']
function Confetti() {
  const [bits] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 1.8 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 160,
      size: [6, 8, 10][i % 3],
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
  )
  const [gone, setGone] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGone(true), 4200); return () => clearTimeout(t) }, [])
  if (gone) return null
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`, width: b.size, height: b.size, background: b.color,
            animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, '--drift': `${b.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

// ── Time of day switcher ─────────────────────────────────────
export const TIME_PRESETS = [
  { id: 'morning', label: 'Morn', hour: 9, icon: 'sun' },
  { id: 'afternoon', label: 'Noon', hour: 14, icon: 'cat' },
  { id: 'evening', label: 'Dusk', hour: 18.6, icon: 'dusk' },
  { id: 'night', label: 'Night', hour: 23, icon: 'moon' },
]

export function TimeSwitch({ active, preview, onPick }) {
  return (
    <div className="timeswitch" role="group" aria-label="Time of day">
      {TIME_PRESETS.map((p) => (
        <button
          key={p.id}
          className={`timeswitch__btn ${preview && active === p.id ? 'is-active' : ''}`}
          onClick={() => onPick(p.hour)}
          aria-pressed={preview && active === p.id}
          title={`See the room in the ${p.id}`}
        >
          <PixelIcon name={p.icon} />
          {p.label}
        </button>
      ))}
      <button
        className={`timeswitch__btn timeswitch__live ${!preview ? 'is-active' : ''}`}
        onClick={() => onPick(null)}
        aria-pressed={!preview}
        title="Follow the real clock"
      >
        <PixelIcon name="live" />
        Live
      </button>
    </div>
  )
}

// ── Typewriter text ──────────────────────────────────────────
export function Typewriter({ text, speed = 22, reducedMotion }) {
  const [n, setN] = useState(reducedMotion ? text.length : 0)
  useEffect(() => {
    if (reducedMotion) { setN(text.length); return }
    setN(0)
    const id = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(id), k) : k + 1)), speed)
    return () => clearInterval(id)
  }, [text, speed, reducedMotion])
  return (
    <span aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  )
}
