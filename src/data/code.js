import { RESUME } from './resume'

// Turns the resume object into syntax-highlighted lines of "TypeScript".
// Each line is an array of tokens: { t: tokenType, v: text }.
// Used by both the laptop screen (drawn on a canvas) and the full code view (HTML).

export const TOKEN_COLORS = {
  kw: '#c792ea', // keywords
  key: '#82aaff', // object keys
  str: '#c3e88d', // strings
  num: '#f78c6c', // numbers
  fn: '#ffcb6b', // function names
  punc: '#89ddff', // punctuation
  com: '#676e95', // comments
  todo: '#e5a35a', // TODO comments
  plain: '#d6deeb',
}

const IDENT = /^[A-Za-z_$][\w$]*$/
const INDENT = '  '
const MAX_INLINE = 64

const tok = (t, v) => ({ t, v })
const isTodo = (v) => v && typeof v === 'object' && '__todo' in v

function inlineArray(arr) {
  if (!arr.every((v) => typeof v === 'string' || typeof v === 'number')) return null
  const text = '[' + arr.map((v) => JSON.stringify(v)).join(', ') + ']'
  if (text.length > MAX_INLINE) return null
  const tokens = [tok('punc', '[')]
  arr.forEach((v, i) => {
    tokens.push(tok(typeof v === 'number' ? 'num' : 'str', JSON.stringify(v)))
    if (i < arr.length - 1) tokens.push(tok('punc', ', '))
  })
  tokens.push(tok('punc', ']'))
  return tokens
}

function scalar(v) {
  if (typeof v === 'number') return [tok('num', String(v))]
  if (typeof v === 'boolean') return [tok('kw', String(v))]
  return [tok('str', JSON.stringify(v))]
}

// Recursively emit lines. `prefix` = tokens that start the first line (e.g. `key: `).
function emit(value, depth, prefix, trailing, lines) {
  const pad = tok('plain', INDENT.repeat(depth))

  if (isTodo(value)) {
    lines.push([pad, ...prefix, tok('kw', 'null'), tok('punc', trailing), tok('todo', ` // TODO: ${value.__todo}`)])
    return
  }

  if (Array.isArray(value)) {
    const inline = inlineArray(value)
    if (inline) {
      lines.push([pad, ...prefix, ...inline, tok('punc', trailing)])
      return
    }
    lines.push([pad, ...prefix, tok('punc', '[')])
    value.forEach((item, i) => {
      if (isTodo(item)) {
        lines.push([tok('plain', INDENT.repeat(depth + 1)), tok('todo', `// TODO: ${item.__todo}`)])
      } else {
        emit(item, depth + 1, [], i < value.length - 1 ? ',' : ',', lines)
      }
    })
    lines.push([pad, tok('punc', ']' + trailing)])
    return
  }

  if (value && typeof value === 'object') {
    lines.push([pad, ...prefix, tok('punc', '{')])
    Object.entries(value).forEach(([k, v]) => {
      const key = IDENT.test(k) ? k : JSON.stringify(k)
      emit(v, depth + 1, [tok('key', key), tok('punc', ': ')], ',', lines)
    })
    lines.push([pad, tok('punc', '}' + trailing)])
    return
  }

  lines.push([pad, ...prefix, ...scalar(value), tok('punc', trailing)])
}

export function buildCodeLines(resume = RESUME) {
  const lines = [
    [tok('com', '// radin.ts')],
    [tok('com', '// My resume, written the way I think: in code.')],
    [],
  ]
  emit(resume, 0, [tok('kw', 'export const '), tok('plain', 'radin'), tok('punc', ' = ')], '', lines)
  // `} as const;` on the closing line
  const last = lines[lines.length - 1]
  last[last.length - 1] = tok('punc', '}')
  last.push(tok('kw', ' as const'), tok('punc', ';'))
  lines.push(
    [],
    [tok('plain', 'radin'), tok('punc', '.'), tok('fn', 'openTo'), tok('punc', '('), tok('str', '"internships"'), tok('punc', ');')]
  )
  return lines
}

export const CODE_LINES = buildCodeLines()
export const CODE_TODO_COUNT = CODE_LINES.flat().filter((t) => t.t === 'todo').length
