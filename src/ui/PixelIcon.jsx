// Little 9×9 pixel icons for the HUD. X = filled pixel, . = empty.
// They take the current text colour, so CSS decides their colour.
const ICONS = {
  sun: [
    '....X....',
    '.X.....X.',
    '...XXX...',
    '..XXXXX..',
    'X.XXXXX.X',
    '..XXXXX..',
    '...XXX...',
    '.X.....X.',
    '....X....',
  ],
  cat: [
    'X.......X',
    'XX.....XX',
    'XXXXXXXXX',
    'XX.XXX.XX',
    'XXXXXXXXX',
    'XXXX.XXXX',
    '.XXXXXXX.',
    '..XXXXX..',
    '.........',
  ],
  dusk: [
    '.........',
    '....X....',
    '.X.....X.',
    '...XXX...',
    '..XXXXX..',
    '.XXXXXXX.',
    'XXXXXXXXX',
    '.........',
    '.XX.XXX.X',
  ],
  moon: [
    '..XXXX...',
    '.XXX.....',
    'XXX......',
    'XXX....X.',
    'XXX......',
    'XXX......',
    '.XXX.....',
    '..XXXX...',
    '.........',
  ],
  live: [
    '.........',
    '...XXX...',
    '..XXXXX..',
    '.XXXXXXX.',
    '.XXXXXXX.',
    '.XXXXXXX.',
    '..XXXXX..',
    '...XXX...',
    '.........',
  ],
  sound: [
    '....X....',
    '...XX..X.',
    'XXXXX...X',
    'XXXXX.X.X',
    'XXXXX.X.X',
    'XXXXX...X',
    '...XX..X.',
    '....X....',
    '.........',
  ],
  mute: [
    '....X....',
    '...XX....',
    'XXXXX.X.X',
    'XXXXX..X.',
    'XXXXX.X.X',
    'XXXXX....',
    '...XX....',
    '....X....',
    '.........',
  ],
  grid: [
    'XXXX.XXXX',
    'XXXX.XXXX',
    'XXXX.XXXX',
    'XXXX.XXXX',
    '.........',
    'XXXX.XXXX',
    'XXXX.XXXX',
    'XXXX.XXXX',
    'XXXX.XXXX',
  ],
}

const PATHS = Object.fromEntries(
  Object.entries(ICONS).map(([name, rows]) => [
    name,
    rows.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : ''))).join(''),
  ])
)

export default function PixelIcon({ name, size = 18 }) {
  return (
    <svg className={`picon picon--${name}`} width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  )
}
