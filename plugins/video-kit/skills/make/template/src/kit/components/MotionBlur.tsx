import { CameraMotionBlur } from '@remotion/motion-blur'
import type { ReactNode } from 'react'

/**
 * Motion blur while the camera moves fast, like a real shutter: each frame is drawn from several
 * moments within it and blended. Only while `active` (a fly-through between stops, a hammer
 * falling): blur on a still picture is just softness, and each frame costs `samples` renders, so
 * keep it to the moves that are really fast.
 */
export function MotionBlur({ active, children, samples = 6 }: { active: boolean, children: ReactNode, samples?: number }) {
  if (!active) {
    return <>{children}</>
  }
  return <CameraMotionBlur shutterAngle={180} samples={samples}>{children}</CameraMotionBlur>
}
