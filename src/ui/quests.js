import { useSyncExternalStore } from 'react'

// A little quest log: visitors tick off each part of the resume as they find
// it. Progress is kept in this browser only (and works fine without it).

export const QUESTS = [
  { id: 'resume', label: 'Read the code on the laptop' },
  { id: 'projects', label: 'Check the pinboard' },
  { id: 'education', label: 'Look through the books' },
  { id: 'experience', label: 'Inspect the certificate' },
  { id: 'contact', label: 'Pick up the phone' },
  { id: 'poke', label: 'Poke Radin' },
]
// Bonus finds that depend on the time of day; they don't count towards 100%
export const SECRETS = [
  { id: 'mouse', label: 'Spot the mouse', clue: 'Something lives under the desk' },
  { id: 'cat', label: 'Pet a cat', clue: 'Cats visit in the afternoon' },
]
export const ALL = [...QUESTS, ...SECRETS]

const KEY = 'radin-quests-v1'
let done = new Set()
try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { /* storage blocked */ }
let snapshot = [...done]
const subs = new Set()
const listeners = new Set()

function save() {
  snapshot = [...done]
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)) } catch { /* ignore */ }
  subs.forEach((f) => f())
}

// Mark a quest as done. Calls `onComplete` listeners only the first time.
export function complete(id) {
  if (done.has(id) || !ALL.some((q) => q.id === id)) return
  done.add(id)
  save()
  listeners.forEach((f) => f(id))
}

export const getDone = () => snapshot

export function resetQuests() {
  done = new Set()
  save()
}

export function onComplete(f) {
  listeners.add(f)
  return () => listeners.delete(f)
}

export function useQuests() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => snapshot)
}
