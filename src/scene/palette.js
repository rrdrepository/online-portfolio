// Colours and material presets.
// Realism mostly comes from giving each surface the right roughness/metalness,
// so the environment reflections and shadows read correctly.
export const PALETTE = {
  wall: '#e9e3da',
  wallSide: '#e1d9ce',
  trim: '#f1eee9',
  skin: '#c99677',
  hair: '#2a2420',
  shirt: '#56695e',
  trousers: '#353a43',
  shoe: '#26282c',
  chair: '#2b2e33',
  accent: '#f2b46d',
  bookA: '#b5654c',
  bookB: '#4f6482',
  bookC: '#d8c08a',
  pages: '#efe7d6',
  leaf: '#5f7f4f',
  pot: '#c98f6c',
  black: '#1c1d20',
}

// Spread these onto <meshStandardMaterial> / <meshPhysicalMaterial>
export const MAT = {
  clay: { roughness: 0.85, metalness: 0 }, // the figure: soft, matte
  fabric: { roughness: 0.95, metalness: 0 },
  paint: { roughness: 0.9, metalness: 0 },
  satinWood: { roughness: 0.48, metalness: 0 },
  plastic: { roughness: 0.45, metalness: 0 },
  powderCoat: { roughness: 0.55, metalness: 0.5 },
  chrome: { roughness: 0.18, metalness: 1 },
  aluminium: { roughness: 0.32, metalness: 0.9 },
  ceramic: { roughness: 0.2, metalness: 0 },
  glass: { roughness: 0.05, metalness: 0 },
}
