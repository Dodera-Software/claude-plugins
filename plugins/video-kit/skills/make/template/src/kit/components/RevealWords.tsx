import type { CSSProperties } from 'react'
import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { progress } from '../motion'

interface Props {
  text: string
  start?: number
  stagger?: number
  duration?: number
  /** Words (without punctuation) drawn in the accent colour. */
  accent?: string[]
  accentColor?: string
  style?: CSSProperties
}

/** Words rise and come into focus one after another, like a keynote title. */
export function RevealWords({ text, start = 0, stagger = 4, duration = 40, accent = [], accentColor, style }: Props) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const words = text.split(' ')
  return (
    <span style={style}>
      {words.map((word, index) => {
        const amount = progress(frame, start + index * stagger, duration)
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity: amount,
              transform: `translateY(${(1 - amount) * 0.35}em)`,
              filter: `blur(${(1 - amount) * 8}px)`,
              color: accent.includes(word.replace(/[.,!?]/g, '')) ? (accentColor ?? colors.accent) : undefined
            }}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}

/** The frame at which RevealWords has finished bringing in its last word. */
export function revealEnd(text: string, start = 0, stagger = 4, duration = 40): number {
  return start + (text.split(' ').length - 1) * stagger + duration
}
