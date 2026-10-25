import { useSyncExternalStore } from 'react'

// Tiny 8-bit sound effects, synthesised on the fly (no audio files).
// Sounds only ever play in response to something the visitor did, and can be
// muted from the top bar (the choice is remembered).

const KEY = 'radin-sound'
let ctx = null
let on = true
try { on = localStorage.getItem(KEY) !== 'off' } catch { /* storage blocked */ }
const subs = new Set()

function audio() {
  // Browsers refuse to start audio before the first click or key press
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone({ freq, to = freq, dur = 0.08, type = 'square', vol = 0.04, delay = 0 }) {
  if (!on) return
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + delay
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

const notes = (list, { step = 0.07, dur = 0.08, vol = 0.04, type = 'square' } = {}) =>
  list.forEach((f, i) => tone({ freq: f, dur, vol, type, delay: i * step }))

export const sfx = {
  hover: () => tone({ freq: 990, to: 1320, dur: 0.035, vol: 0.015 }),
  select: () => notes([523, 659, 784], { step: 0.055 }),
  close: () => tone({ freq: 660, to: 330, dur: 0.11, vol: 0.03 }),
  click: () => tone({ freq: 440, dur: 0.03, vol: 0.025 }),
  poke: () => tone({ freq: 180, to: 520, dur: 0.14, type: 'triangle', vol: 0.09 }),
  snore: () => tone({ freq: 140, to: 90, dur: 0.35, type: 'triangle', vol: 0.06 }),
  meow: () => {
    tone({ freq: 620, to: 1150, dur: 0.12, type: 'sawtooth', vol: 0.02 })
    tone({ freq: 1150, to: 560, dur: 0.22, type: 'sawtooth', vol: 0.02, delay: 0.12 })
  },
  squeak: () => notes([2100, 2500, 2100], { step: 0.05, dur: 0.04, vol: 0.02, type: 'sine' }),
  quest: () => notes([523, 659, 784, 1047], { step: 0.08, dur: 0.1 }),
  fanfare: () => notes([523, 523, 523, 698, 880, 784, 1047], { step: 0.11, dur: 0.14, vol: 0.05 }),
  time: () => notes([392, 523], { step: 0.06, dur: 0.06, vol: 0.03, type: 'triangle' }),
}

export function setSound(value) {
  on = value
  try { localStorage.setItem(KEY, value ? 'on' : 'off') } catch { /* ignore */ }
  subs.forEach((f) => f())
  if (value) sfx.click()
}

export function useSound() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => on)
}
