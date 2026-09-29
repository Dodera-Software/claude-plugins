import { Easing, interpolate } from 'remotion'

export const FPS = 60

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)

export function seconds(value: number): number {
  return Math.round(value * FPS)
}

/** 0 → 1 between `start` and `start + duration`, clamped, eased. */
export function progress(frame: number, start: number, duration: number, easing = easeOut): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing
  })
}

export function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

/**
 * How long text must stay on screen, counted from its first word appearing: 3.5 words a
 * second plus 0.8 s to notice it arrived. Cutting earlier is the "too fast" viewers complain about.
 */
export function readingFrames(text: string): number {
  const words = text.trim().split(/\s+/).length
  return seconds(words / 3.5 + 0.8)
}
