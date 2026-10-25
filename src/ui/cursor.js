// Pixel-art mouse cursors, drawn from tiny text grids at startup.
// X = outline, o = fill, . = transparent. Exposed as CSS variables:
//   --cur-arrow (default) and --cur-hand (clickable things)

const ARROW = [
  'X...........',
  'XX..........',
  'XoX.........',
  'XooX........',
  'XoooX.......',
  'XooooX......',
  'XoooooX.....',
  'XooooooX....',
  'XoooooooX...',
  'XooooooooX..',
  'XoooooooooX.',
  'XooooooXXXXX',
  'XoooXooX....',
  'XooXXooX....',
  'XoX..XooX...',
  'XX...XooX...',
  'X.....XooX..',
  '......XooX..',
  '.......XX...',
]

const HAND = [
  '.....XX.........',
  '....XooX........',
  '....XooX........',
  '....XooX........',
  '....XooXXX......',
  '....XooXooXXX...',
  '....XooXooXooXX.',
  '.XX.XooXooXooXoX',
  'XooXXooooooooXoX',
  'XoooXooooooooooX',
  '.XoooooooooooooX',
  '..XooooooooooooX',
  '..XoooooooooooX.',
  '...XooooooooooX.',
  '...XoooooooooX..',
  '....XooooooooX..',
  '....XXXXXXXXXX..',
]

function toCursor(grid, hotX, hotY, fill, scale = 2) {
  const w = grid[0].length
  const h = grid.length
  let rects = ''
  grid.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch === '.') return
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ch === 'X' ? '#181425' : fill}"/>`
    })
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotX * scale} ${hotY * scale}`
}

export function installCursors() {
  const root = document.documentElement.style
  root.setProperty('--cur-arrow', `${toCursor(ARROW, 0, 0, '#ffffff')}, auto`)
  root.setProperty('--cur-hand', `${toCursor(HAND, 5, 0, '#ffffff')}, pointer`)
}

// Used by the 3D scene, where hover is detected in JavaScript
export function setCursor(kind) {
  document.body.style.cursor = kind === 'hand' ? 'var(--cur-hand)' : ''
}
