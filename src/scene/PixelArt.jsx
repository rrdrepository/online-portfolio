import { forwardRef, useEffect, useMemo } from 'react'
import { Effect, EffectAttribute } from 'postprocessing'
import { Color, Uniform, Vector3 } from 'three'

// ─────────────────────────────────────────────────────────────
// The pixel-art look.
//
// The canvas itself is rendered at a low resolution and scaled up with
// `image-rendering: pixelated` (see App.jsx / styles.css), which gives the
// chunky pixels. This effect then finishes the job:
//   1. dark outlines around every object (found from jumps in depth)
//   2. every pixel snapped to a fixed pixel-art palette, with a light
//      ordered dither so gradients turn into clean colour bands
// ─────────────────────────────────────────────────────────────

// A 32-colour base (Endesga 32) plus a few warm neutrals for the room and
// deep pond teals/greens in the spirit of the reference art.
export const PIXEL_PALETTE = [
  // Endesga 32
  '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
  '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
  '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
  '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
  // warm neutrals (walls, bedding, wood)
  '#f6f0e4', '#e6dccb', '#dcc7a6', '#cbbba4', '#b8a07f', '#a8957c', '#8f7a5f', '#7a6754', '#4d4038',
  // mid browns (cork, wood in shadow)
  '#9b6a3f', '#7a4f2e', '#5a3a24',
  // soft cool greys (screen glow, moonlight)
  '#9aa3b5', '#6e7590',
  // muted greens (shirt, plant)
  '#6f8a68', '#3f5446',
  // pond teals and lily-pad green
  '#0a2a33', '#0f3b45', '#1f6b5e', '#2fb35f',
]

// Palette colours → linear RGB (what the shader works in) and Oklab (for
// "which colour looks closest" matching that follows human perception).
function toLinear(hex) {
  const c = new Color(hex) // three converts hex (sRGB) to linear on input
  return [c.r, c.g, c.b]
}
function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const SIZE = PIXEL_PALETTE.length

const fragmentShader = /* glsl */ `
#define PALETTE_SIZE ${SIZE}
uniform vec3 paletteRgb[PALETTE_SIZE];
uniform vec3 paletteLab[PALETTE_SIZE];
uniform float outlineStrength;
uniform float outlineThreshold;
uniform float dither;
uniform float paletteMix;

vec3 toOklab(vec3 c) {
  c = max(c, vec3(0.0));
  float l = pow(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b, 1.0 / 3.0);
  float m = pow(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b, 1.0 / 3.0);
  float s = pow(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b, 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  );
}

// 4×4 ordered (Bayer) dither threshold, 0…1
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// 1 / distance from the camera. Unlike raw distance, this changes linearly
// across a flat surface on screen, so flat walls and floors never get outlined.
float invDist(vec2 uv) { return -1.0 / getViewZ(readDepth(uv)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec3 col = inputColor.rgb;

  // ── Outlines ──
  // Compare this pixel with its four neighbours. A sharp jump towards
  // "further away" means we sit on the edge of a nearer object.
  float wc = -1.0 / getViewZ(depth);
  vec2 t = texelSize;
  float lap = invDist(uv + vec2(t.x, 0.0)) + invDist(uv - vec2(t.x, 0.0))
            + invDist(uv + vec2(0.0, t.y)) + invDist(uv - vec2(0.0, t.y)) - 4.0 * wc;
  float edge = step(outlineThreshold, -lap / wc) * step(depth, 0.99999);
  // Ink is a darker, cooler version of the colour underneath (never flat black)
  col = mix(col, col * vec3(0.28, 0.3, 0.42), edge * outlineStrength);

  // ── Palette ──
  vec3 lab = toOklab(col);
  lab.x += (bayer4(gl_FragCoord.xy) - 0.5) * dither;
  float best = 1e9;
  vec3 pick = col;
  for (int i = 0; i < PALETTE_SIZE; i++) {
    vec3 d = paletteLab[i] - lab;
    float dist = dot(d, d);
    if (dist < best) { best = dist; pick = paletteRgb[i]; }
  }
  outputColor = vec4(mix(col, pick, paletteMix), inputColor.a);
}
`

class PixelArtEffectImpl extends Effect {
  constructor({ outlineStrength = 0.85, outlineThreshold = 0.06, dither = 0.012, paletteMix = 1 } = {}) {
    const rgb = PIXEL_PALETTE.map(toLinear)
    super('PixelArtEffect', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['paletteRgb', new Uniform(rgb.map((c) => new Vector3(...c)))],
        ['paletteLab', new Uniform(rgb.map((c) => new Vector3(...linearToOklab(c))))],
        ['outlineStrength', new Uniform(outlineStrength)],
        ['outlineThreshold', new Uniform(outlineThreshold)],
        ['dither', new Uniform(dither)],
        ['paletteMix', new Uniform(paletteMix)],
      ]),
    })
  }
}

export const PixelArt = forwardRef(function PixelArt({ outlineStrength, outlineThreshold, dither, paletteMix }, ref) {
  const effect = useMemo(() => new PixelArtEffectImpl(), [])
  useEffect(() => {
    const u = effect.uniforms
    if (outlineStrength !== undefined) u.get('outlineStrength').value = outlineStrength
    if (outlineThreshold !== undefined) u.get('outlineThreshold').value = outlineThreshold
    if (dither !== undefined) u.get('dither').value = dither
    if (paletteMix !== undefined) u.get('paletteMix').value = paletteMix
  }, [effect, outlineStrength, outlineThreshold, dither, paletteMix])
  useEffect(() => () => effect.dispose(), [effect])
  return <primitive ref={ref} object={effect} dispose={null} />
})
