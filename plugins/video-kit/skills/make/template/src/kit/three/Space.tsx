import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { Euler, Matrix4, Vector3 } from 'three'
import type { CameraView, Vec3 } from './camera'

/**
 * A 3D world made of ordinary scene elements: screenshots, the rebuilt product UI, cards, words.
 * The camera flies through it (`cameraAt`) while everything stays sharp, in the brand's fonts,
 * because it's still the page, only placed in depth. For real solid objects (the logo as a solid,
 * lit shapes) use `Stage3D`.
 *
 * Units are pixels: an element 1440 wide at `z = 0`, seen from `[0, 0, focal]`, is drawn 1440 px
 * wide. Things fade into the canvas with distance (`fog`), so depth reads without lighting.
 */
interface SpaceState {
  view: Matrix4
  focal: number
  fog: [number, number]
  /** Distance kept sharp, and how strongly the rest blurs (0: everything sharp). */
  focus: number
  depthOfField: number
}

const SpaceContext = createContext<SpaceState | null>(null)

const FLIP = new Matrix4().makeScale(1, -1, 1)
const UP = new Vector3(0, 1, 0)

function css(matrix: Matrix4): string {
  return `matrix3d(${matrix.elements.map(value => value.toFixed(6)).join(',')})`
}

/** The distance at which one unit of the space is one pixel, for a vertical field of view. */
export function focalLength(height: number, fov = 35): number {
  return height / 2 / Math.tan((fov * Math.PI) / 360)
}

export interface SpaceProps {
  camera: CameraView
  /** Distances at which things start fading into the canvas and are gone (default 2.4 and 6 focal lengths). */
  fog?: [number, number]
  /**
   * Depth of field, like a camera lens: 0 (default) keeps everything sharp; 0.5 is gentle, 1 strong.
   * What sits at the camera's target stays sharp, and things blur the further they are from that
   * distance. Use it where one thing is the subject and others pass by; not in every scene.
   */
  depthOfField?: number
  children: ReactNode
  style?: CSSProperties
}

export function Space({ camera, fog, depthOfField = 0, children, style }: SpaceProps) {
  const { height } = useVideoConfig()
  const focal = focalLength(height, camera.fov)
  const eye = new Vector3(...camera.position)
  const look = new Matrix4().lookAt(eye, new Vector3(...camera.target), UP).setPosition(eye)
  const view = look.invert()
  // CSS has y pointing down; the space has it pointing up. Flip on the way in and out, and put the
  // camera `focal` in front of the page, where CSS perspective places the viewer.
  const world = new Matrix4().makeTranslation(0, 0, focal).multiply(FLIP).multiply(view).multiply(FLIP)
  return (
    <AbsoluteFill style={{ perspective: focal, perspectiveOrigin: '50% 50%', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: css(world) }}>
        <SpaceContext.Provider value={{ view, focal, fog: fog ?? [2.4 * focal, 6 * focal], depthOfField, focus: eye.distanceTo(new Vector3(...camera.target)) }}>
          {children}
        </SpaceContext.Provider>
      </div>
    </AbsoluteFill>
  )
}

export interface PlaceProps {
  /** Where the element's centre sits. */
  at: Vec3
  width: number
  height: number
  /** Turned around the vertical axis, in degrees; positive turns its face to the right. */
  turn?: number
  /** Tipped back around the horizontal axis, in degrees; positive tips its top away. */
  tilt?: number
  children: ReactNode
  style?: CSSProperties
}

/** An element placed in a `Space`, at its natural size, fading with distance from the camera. */
export function Place({ at, width, height, turn = 0, tilt = 0, children, style }: PlaceProps) {
  const space = useContext(SpaceContext)
  if (!space) {
    throw new Error('<Place> goes inside a <Space>.')
  }
  const depth = -new Vector3(...at).applyMatrix4(space.view).z
  const [near, far] = space.fog
  // Close to or behind the camera, CSS perspective turns an element inside out: hide it first.
  const tooClose = Math.min(1, Math.max(0, (depth - space.focal * 0.12) / (space.focal * 0.25)))
  const fade = 1 - Math.min(1, Math.max(0, (depth - near) / (far - near)))
  const opacity = tooClose * fade
  // Out of focus with the distance from the focused plane, capped so nothing turns to fog.
  const blur = space.depthOfField ? Math.min(9, (space.depthOfField * 14 * Math.abs(depth - space.focus)) / space.focus) : 0
  const place = FLIP.clone()
    .multiply(new Matrix4().makeTranslation(...at))
    .multiply(new Matrix4().makeRotationFromEuler(new Euler((-tilt * Math.PI) / 180, (turn * Math.PI) / 180, 0, 'YXZ')))
    .multiply(FLIP)
  return (
    <div
      style={{
        position: 'absolute', left: -width / 2, top: -height / 2, width, height,
        transform: css(place), backfaceVisibility: 'hidden',
        opacity, visibility: opacity < 0.01 ? 'hidden' : 'visible', filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined, ...style
      }}
    >
      {children}
    </div>
  )
}
