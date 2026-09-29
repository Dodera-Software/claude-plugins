import type { CSSProperties } from 'react'
import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { useLook } from '../look'
import { progress } from '../motion'

/** The small accent label over a heading, in the look's label font, easing in at `start`. */
export function Eyebrow({ text, start = 0, style }: { text: string, start?: number, style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type } = useLook()
  const shown = progress(frame, start, 30)
  return (
    <div style={{
      fontFamily: type.labelFont, fontSize: type.labelFont ? 20 : 18, fontWeight: 600, letterSpacing: type.labelFont ? '0.04em' : '0.14em',
      color: colors.accent, marginBottom: 18, opacity: shown, transform: `translateY(${(1 - shown) * 10}px)`, ...style
    }}
    >
      {text}
    </div>
  )
}
