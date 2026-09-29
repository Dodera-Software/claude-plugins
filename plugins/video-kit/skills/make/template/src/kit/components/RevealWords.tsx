import type { CSSProperties } from 'react'
import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { useLook } from '../look'
import { progress } from '../motion'

interface Props {
  text: string
  start?: number
  stagger?: number
  duration?: number
  /** Words drawn in the accent colour; punctuation is ignored on both sides ("done" matches "done."). */
  accent?: string[]
  accentColor?: string
  style?: CSSProperties
}

function bare(word: string) {
  return word.replace(/[.,!?;:…"'“”‘’]/g, '')
}

/**
 * Words arriving one after another, the way the video's look moves: drifting into focus
 * (editorial), snapping up (bold), typed (technical) or bouncing in (playful). `stagger` and
 * `duration` override the look's own timing.
 */
export function RevealWords({ text, start = 0, stagger, duration, accent = [], accentColor, style }: Props) {
  const accented = new Set(accent.map(bare))
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { motion } = useLook()
  const every = stagger ?? motion.stagger
  const takes = duration ?? motion.duration
  const words = text.split(' ')
  return (
    <span style={style}>
      {words.map((word, index) => {
        const linear = progress(frame, start + index * every, takes, t => t)
        const amount = motion.ease(linear)
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity: Math.min(1, linear * 2),
              transform: `translateY(${(1 - amount) * motion.rise}em) scale(${1 - (1 - amount) * motion.pop})`,
              filter: motion.blur ? `blur(${Math.max(0, 1 - amount) * motion.blur}px)` : undefined,
              color: accented.has(bare(word)) ? (accentColor ?? colors.accent) : undefined
            }}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}

/** The frame at which RevealWords has finished bringing in its last word (at the calmest look's pace). */
export function revealEnd(text: string, start = 0, stagger = 5, duration = 48): number {
  return start + (text.split(' ').length - 1) * stagger + duration
}
