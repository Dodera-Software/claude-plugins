import { useVideoConfig } from 'remotion'

export const FORMATS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 }
} as const

/** Wide (16:9, site and YouTube), square (LinkedIn, X) or tall (9:16, Reels, Shorts, TikTok). */
export type Shape = 'wide' | 'square' | 'tall'

export function shapeOf(width: number, height: number): Shape {
  const ratio = width / height
  return ratio > 1.3 ? 'wide' : ratio < 0.8 ? 'tall' : 'square'
}

/** Side margin: roomy in a wide frame, tighter where the frame is only 1080 px across. */
export function padFor(shape: Shape): number {
  return shape === 'wide' ? 120 : 80
}

/**
 * Every kit scene lays itself out from this: side by side in a wide frame, stacked in a square or
 * tall one, with the type sized for the space it has.
 */
export function useShape() {
  const { width, height } = useVideoConfig()
  const shape = shapeOf(width, height)
  return { shape, wide: shape === 'wide', width, height, pad: padFor(shape) }
}

/**
 * The largest font size, up to `max`, at which `text` fits on one line in `width` pixels,
 * estimated from Inter's average glyph width. For headlines and names that must not wrap.
 */
export function fitText(text: string, width: number, max: number, averageGlyph = 0.56): number {
  return Math.min(max, Math.floor(width / (Math.max(1, text.length) * averageGlyph)))
}

/** The frame size of a `defineVideo` format, for helpers that compute positions ahead of time. */
export function frameOf(format: keyof typeof FORMATS = 'landscape') {
  return FORMATS[format]
}

/**
 * Logo and name together: side by side in a wide frame, the logo above the name in a square or
 * tall one, with the name sized to fit on one line.
 */
export function lockupSizes(shape: Shape, width: number, name: string) {
  const wide = shape === 'wide'
  const logo = wide ? 128 : shape === 'tall' ? 150 : 120
  const room = wide ? width - 2 * 240 - logo - 36 : width - 2 * padFor(shape)
  return { logo, name: fitText(name, room, wide ? 112 : 120), stacked: !wide, tagline: wide ? 48 : shape === 'tall' ? 48 : 40 }
}
