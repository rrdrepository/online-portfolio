import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Outline, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { PixelArt } from './PixelArt'

// Post-processing for the pixel-art look. Runs on the low-resolution canvas,
// so every effect works in "big pixels".
// - Outline:    chunky yellow outline on the hovered object
// - Bloom:      glow from the lamp bulb only (very bright pixels)
// - ToneMapping + saturation: rich colours before they are snapped to the palette
// - PixelArt:   dark object outlines + snap to the pixel palette (always last)
export default function Effects() {
  return (
    <EffectComposer multisampling={0} autoClear={false}>
      <Outline blur={false} edgeStrength={12} pulseSpeed={0.5} resolutionScale={1} visibleEdgeColor="#fee761" hiddenEdgeColor="#feae34" xRay />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.1} intensity={0.3} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.18} />
      <BrightnessContrast brightness={0.04} contrast={0.1} />
      <PixelArt />
    </EffectComposer>
  )
}
