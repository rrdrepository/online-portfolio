import { CanvasTexture, Color, NearestFilter, NearestMipmapNearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'

// Procedural textures drawn on canvases at startup.
// No image files to download. Each one is drawn in detail, then shrunk down to
// a handful of texels and shown without smoothing, so wood grain, cork and
// fabric read as chunky pixel art.

function rng(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function make(w, h, draw, { repeat = [1, 1], srgb = true, px = 8 } = {}) {
  const src = document.createElement('canvas')
  src.width = w
  src.height = h
  draw(src.getContext('2d'), w, h)
  // Shrink by `px`: every texel of the result is one "pixel" of the art
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w / px))
  c.height = Math.max(1, Math.round(h / px))
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, c.width, c.height)
  const tex = new CanvasTexture(c)
  if (srgb) tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(...repeat)
  tex.magFilter = NearestFilter
  tex.minFilter = NearestMipmapNearestFilter
  return tex
}

const shade = (hex, amt) => {
  const c = new Color(hex)
  c.offsetHSL(0, 0, amt)
  return `#${c.getHexString()}`
}

function grain(g, x, y, w, h, base, rand, density = 1) {
  g.fillStyle = base
  g.fillRect(x, y, w, h)
  // long fibres
  for (let i = 0; i < 70 * density; i++) {
    const yy = y + rand() * h
    g.strokeStyle = shade(base, (rand() - 0.55) * 0.12)
    g.globalAlpha = 0.25 + rand() * 0.35
    g.lineWidth = 0.6 + rand() * 1.6
    g.beginPath()
    g.moveTo(x, yy)
    const amp = 1 + rand() * 4
    const freq = 0.004 + rand() * 0.01
    for (let xx = x; xx <= x + w; xx += 8) g.lineTo(xx, yy + Math.sin(xx * freq + i) * amp)
    g.stroke()
  }
  // the odd knot
  if (rand() < 0.35) {
    const kx = x + rand() * w
    const ky = y + rand() * h
    g.globalAlpha = 0.35
    g.strokeStyle = shade(base, -0.12)
    for (let r = 2; r < 18; r += 3) {
      g.beginPath()
      g.ellipse(kx, ky, r * 2.4, r * 0.7, 0, 0, Math.PI * 2)
      g.stroke()
    }
  }
  g.globalAlpha = 1
}

// Desk top: one continuous piece of oak
export function deskWood() {
  return make(2048, 1024, (g, w, h) => {
    const rand = rng(11)
    grain(g, 0, 0, w, h, '#b8916a', rand, 3)
  }, { px: 12 })
}

// Floor: staggered oak planks with seams
export function floorPlanks() {
  return make(2048, 2048, (g, w, h) => {
    const rand = rng(23)
    const rows = 8
    const rh = h / rows
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 400
      while (x < w) {
        const len = 380 + rand() * 420
        const base = shade('#a88462', (rand() - 0.5) * 0.08)
        grain(g, x, r * rh, len, rh, base, rand, 1.2)
        g.fillStyle = 'rgba(40,25,15,0.55)'
        g.fillRect(x, r * rh, 2, rh) // end joint
        x += len
      }
      g.fillStyle = 'rgba(40,25,15,0.6)'
      g.fillRect(0, r * rh, w, 2) // long seam
    }
  }, { repeat: [2, 2], px: 12 })
}

// Woven rug
export function rugFabric() {
  return make(512, 512, (g, w, h) => {
    const rand = rng(5)
    g.fillStyle = '#8a978f'
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 3) {
      g.fillStyle = `rgba(255,255,255,${0.03 + rand() * 0.04})`
      g.fillRect(0, y, w, 1)
    }
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`
      g.fillRect(x, 0, 1, h)
    }
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
      g.fillRect(rand() * w, rand() * h, 2, 2)
    }
  }, { repeat: [3, 3], px: 6 })
}

// Subtle plaster for walls (used as both colour and bump)
export function plaster(base) {
  return make(512, 512, (g, w, h) => {
    const rand = rng(41)
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 9000; i++) {
      const s = 1 + rand() * 3
      g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)'
      g.fillRect(rand() * w, rand() * h, s, s)
    }
  }, { repeat: [3, 2], px: 6 })
}

// Cork board
export function cork() {
  return make(512, 512, (g, w, h) => {
    const rand = rng(9)
    g.fillStyle = '#b8936a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 14000; i++) {
      const s = 1 + rand() * 3
      const d = rand()
      g.fillStyle = d < 0.4 ? 'rgba(90,55,25,0.35)' : d < 0.8 ? 'rgba(230,190,140,0.3)' : 'rgba(60,35,15,0.4)'
      g.fillRect(rand() * w, rand() * h, s, s)
    }
  }, { px: 12 })
}

// Brushed metal for the laptop and stand
export function brushed() {
  return make(256, 256, (g, w, h) => {
    const rand = rng(3)
    g.fillStyle = '#b9bcc2'
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.06})`
      g.fillRect(0, y, w, 1)
    }
  })
}

// The view through the window: sky gradient, distant skyline, lit windows at night.
export function drawWindowView(canvas, light) {
  const g = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const rand = rng(77)
  const sky = new Color(light.sky)
  const top = sky.clone().offsetHSL(0, 0.05, -0.12)
  const sunset = light.sunInWindow !== null && light.sunInWindow !== undefined && light.sunInWindow < 0.45
  const horizon = sky.clone().lerp(new Color(light.isNight ? '#3a3f5c' : sunset ? '#ffb46a' : '#fff2e0'), sunset ? 0.65 : 0.45)

  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, `#${top.getHexString()}`)
  grad.addColorStop(0.75, `#${horizon.getHexString()}`)
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)

  // Sun sinking towards the horizon (late afternoon → sunset)
  if (light.sunInWindow !== null && light.sunInWindow !== undefined) {
    const alt = light.sunInWindow
    const sx = w * 0.5
    const sy = h * (0.5 - alt * 0.3)
    const glowR = h * (0.55 - alt * 0.25)
    const glow = g.createRadialGradient(sx, sy, 0, sx, sy, glowR)
    glow.addColorStop(0, `rgba(255,${Math.round(190 + alt * 50)},${Math.round(120 + alt * 100)},0.85)`)
    glow.addColorStop(0.25, `rgba(255,${Math.round(150 + alt * 60)},${Math.round(90 + alt * 80)},0.35)`)
    glow.addColorStop(1, 'rgba(255,160,100,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, w, h)
    g.fillStyle = `rgb(255,${Math.round(225 + alt * 30)},${Math.round(170 + alt * 85)})`
    g.beginPath()
    g.arc(sx, sy, h * 0.045, 0, Math.PI * 2)
    g.fill()
  }

  if (light.isNight) {
    // Moon
    const mx = w * 0.28
    const my = h * 0.2
    const moonGlow = g.createRadialGradient(mx, my, 0, mx, my, h * 0.18)
    moonGlow.addColorStop(0, 'rgba(220,230,255,0.35)')
    moonGlow.addColorStop(1, 'rgba(220,230,255,0)')
    g.fillStyle = moonGlow
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#eef1ff'
    g.beginPath()
    g.arc(mx, my, h * 0.035, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`
      g.fillRect(rand() * w, rand() * h * 0.5, 1.5, 1.5)
    }
  }

  // Two layers of skyline: far (hazy) and near (darker)
  const layers = [
    { y: h * 0.66, min: 25, max: 90, alpha: 0.35 },
    { y: h * 0.76, min: 30, max: 140, alpha: 0.85 },
  ]
  const buildingColor = light.isNight ? [20, 22, 34] : [118, 128, 145]
  layers.forEach((layer, li) => {
    let x = 0
    while (x < w) {
      const bw = 30 + rand() * 70
      const bh = layer.min + rand() * (layer.max - layer.min)
      const top = layer.y - bh
      g.fillStyle = `rgba(${buildingColor.join(',')},${layer.alpha})`
      g.fillRect(x, top, bw - 4, h - top)
      if (li === 1) {
        for (let wy = top + 8; wy < h - 6; wy += 11) {
          for (let wx = x + 5; wx < x + bw - 10; wx += 9) {
            const lit = light.isNight ? rand() < 0.35 : rand() < 0.08
            if (!lit) continue
            g.fillStyle = light.isNight ? `rgba(255,214,150,${0.5 + rand() * 0.5})` : 'rgba(255,255,255,0.25)'
            g.fillRect(wx, wy, 4, 5)
          }
        }
      }
      x += bw
    }
  })
}
