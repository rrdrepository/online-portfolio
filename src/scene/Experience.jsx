import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl, Environment, Lightformer, Sparkles } from '@react-three/drei'
import { Selection } from '@react-three/postprocessing'
import { getLighting } from './lighting'
import Room from './Room'
import Desk from './Desk'
import Character from './Character'
import Labels from './Labels'
import Effects from './Effects'
import { Cats, Mouse } from './Critters'
import { InteractionContext } from './interaction'
import { SECTION_BY_ID } from '../data/sections'

const { ACTION } = CameraControlsImpl
const DEG = Math.PI / 180

// Default view: three-quarter angle from the front-right of the room.
const HOME = { position: [2.95, 2.1, 2.3], target: [0.1, 1.0, -0.7] }
// Phones: a more frontal, pulled-back view so the whole desk fits the tall frame.
const HOME_NARROW = { position: [2.3, 2.35, 4.9], target: [0.35, 1.15, -0.8] }
// Panel close-ups sit a little further back than the raw focus poses.
const FOCUS_DISTANCE = 1.25

const LIMITS = {
  minAzimuthAngle: -35 * DEG,
  maxAzimuthAngle: 85 * DEG,
  minPolarAngle: 45 * DEG,
  maxPolarAngle: 84 * DEG,
  minDistance: 1.2,
}
const FREE = {
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  minDistance: 0.05,
}

function pose(p, factor = 1) {
  const [px, py, pz] = p.position
  const [tx, ty, tz] = p.target
  return [tx + (px - tx) * factor, ty + (py - ty) * factor, tz + (pz - tz) * factor, tx, ty, tz]
}

export default function Experience({ hour, timeMoving, activeId, onSelect, reducedMotion, onReady, touch }) {
  const controls = useRef()
  const savedPose = useRef(null)
  const { scene, size } = useThree()
  const light = useMemo(() => getLighting(hour), [hour])
  const narrow = size.width / size.height < 0.85
  const [hovered, setHovered] = useState(null)
  const [introGlow, setIntroGlow] = useState(false)
  const [mouseRun, setMouseRun] = useState(0)
  const period = light.period

  // Background colour follows the time of day
  useEffect(() => {
    scene.background = light.background
  }, [scene, light])

  // Camera setup: limits, no panning, gentle damping
  useEffect(() => {
    const c = controls.current
    Object.assign(c, LIMITS)
    c.maxDistance = narrow ? 7 : 5
    c.smoothTime = reducedMotion ? 0.05 : 0.5
    c.draggingSmoothTime = 0.12
    c.dollyToCursor = false
    c.mouseButtons.right = ACTION.NONE
    c.mouseButtons.middle = ACTION.NONE
    c.touches.two = ACTION.TOUCH_DOLLY
    c.touches.three = ACTION.NONE
    c.setLookAt(...pose(narrow ? HOME_NARROW : HOME), false)
    onReady?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow])

  // Once the scene is up, briefly outline every clickable object so visitors
  // learn what can be explored (the outlines are otherwise hidden until hover).
  useEffect(() => {
    if (reducedMotion) return
    const on = setTimeout(() => setIntroGlow(true), 1800)
    const off = setTimeout(() => setIntroGlow(false), 3600)
    return () => { clearTimeout(on); clearTimeout(off) }
  }, [reducedMotion])

  // Glide to the selected object; glide back to where the visitor was on close
  useEffect(() => {
    const c = controls.current
    if (activeId) {
      if (!savedPose.current) {
        savedPose.current = [...c.getPosition().toArray(), ...c.getTarget().toArray()]
      }
      setHovered(null)
      const section = SECTION_BY_ID[activeId]
      c.enabled = false
      Object.assign(c, FREE)
      if (section.kind === 'code') {
        // Straight at the laptop screen; the code view then fades in over it
        c.setFocalOffset(0, 0, 0, !reducedMotion)
        c.setLookAt(...pose(section.focus), !reducedMotion)
      } else {
        c.setLookAt(...pose(section.focus, (narrow ? 1.35 : 1) * FOCUS_DISTANCE), !reducedMotion)
        // Nudge the object out from under the panel:
        // panel on the right (desktop) → shift view right; bottom sheet (phone) → shift view down.
        if (narrow) c.setFocalOffset(0, 0.45, 0, !reducedMotion)
        else c.setFocalOffset(0.42, 0, 0, !reducedMotion)
      }
    } else if (savedPose.current) {
      c.setFocalOffset(0, 0, 0, !reducedMotion)
      c.setLookAt(...savedPose.current, !reducedMotion)
      savedPose.current = null
      Object.assign(c, LIMITS)
      c.enabled = true
    }
  }, [activeId, narrow, reducedMotion])

  const interaction = useMemo(
    () => ({ hovered, setHovered, select: onSelect, activeId, introGlow, reducedMotion }),
    [hovered, onSelect, activeId, introGlow, reducedMotion]
  )

  return (
    <InteractionContext.Provider value={interaction}>
      <CameraControls ref={controls} makeDefault />

      {/* Reflections and soft ambient light, built from simple light panels (no download) */}
      <Environment resolution={256} frames={1} environmentIntensity={light.env} key={timeMoving ? 'moving' : Math.round(hour * 4)}>
        <Lightformer form="rect" position={[-5, 1.6, -0.35]} rotation-y={Math.PI / 2} scale={[3, 2.4]} color={light.sky} intensity={light.isNight ? 0.6 : 3} />
        <Lightformer form="rect" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[6, 6]} color="#ffffff" intensity={light.isNight ? 0.15 : 0.8} />
        <Lightformer form="rect" position={[4, 2, 4]} rotation-y={-Math.PI / 4} scale={[4, 3]} color={light.isNight ? '#ffb070' : '#fff6ec'} intensity={light.isNight ? 0.4 : 0.6} />
        <Lightformer form="rect" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[6, 6]} color="#8a6a50" intensity={0.25} />
      </Environment>

      {/* Lighting — driven by the clock */}
      <hemisphereLight args={[light.hemiSky, light.hemiGround, light.hemiIntensity * 0.42]} />
      <ambientLight color="#ffd2a8" intensity={light.lamp * 0.25} />
      <directionalLight
        position={light.sunPosition}
        color={light.sunColor}
        intensity={light.sunIntensity * 1.2}
        castShadow
        // Small shadow map = crisp, stair-stepped pixel shadows
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-camera-near={1}
        shadow-camera-far={16}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />

      <Selection>
        <Room light={light} />
        <Desk light={light} reducedMotion={reducedMotion} period={period} />
        <Character reducedMotion={reducedMotion} period={period} hour={hour} onMouseScare={() => setMouseRun((n) => n + 1)} />
        <Mouse runAt={mouseRun} />
        <Cats active={period === 'afternoon'} reducedMotion={reducedMotion} />
        {/* Morning: dust drifting in the sunbeam from the window */}
        {period === 'morning' && !reducedMotion && (
          <Sparkles count={70} scale={[1.6, 1.4, 1.4]} position={[-1.3, 1.1, -0.2]} size={1.2} speed={0.18} opacity={0.5} color="#fff3d6" noise={0.6} />
        )}
        <Labels touch={touch} />
        <Effects />
      </Selection>
    </InteractionContext.Provider>
  )
}
