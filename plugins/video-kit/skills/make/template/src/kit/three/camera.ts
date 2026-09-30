import { easeInOut, mix, progress } from '../motion'

/** A point in a 3D scene: x to the right, y up, z toward the viewer. */
export type Vec3 = [number, number, number]

/** Where the camera is, what it looks at, and how wide it sees (vertical field of view, degrees). */
export interface CameraView {
  position: Vec3
  target: Vec3
  fov?: number
}

/** The camera at a frame of the scene; between keys it glides, eased, and after the last it holds. */
export interface ViewKey extends CameraView {
  at: number
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
}

/**
 * The camera between keyframes, eased in and out of each one, so every move starts and lands
 * softly. `keys` are in order of `at`. Used by both `Space` and `Stage3D`.
 */
export function cameraAt(frame: number, keys: ViewKey[], ease = easeInOut): CameraView {
  let index = 0
  while (index < keys.length - 1 && frame >= keys[index + 1].at) {
    index++
  }
  const from = keys[index]
  const to = keys[Math.min(index + 1, keys.length - 1)]
  const t = to === from ? 0 : progress(frame, from.at, to.at - from.at, ease)
  return {
    position: lerp3(from.position, to.position, t),
    target: lerp3(from.target, to.target, t),
    fov: mix(from.fov ?? 35, to.fov ?? 35, t)
  }
}
