import type { CSSProperties } from 'react'
import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { progress } from '../motion'
import { RevealWords } from './RevealWords'

interface Props {
  eyebrow: string
  title: string
  aside?: string
  sub?: string
  start?: number
  accent?: string[]
  size?: number
  style?: CSSProperties
}

/**
 * The heading a chapter opens with: a small accent label, the claim, and an optional muted
 * second line that lands the joke or the detail.
 */
export function ChapterTitle({ eyebrow, title, aside, sub, start = 0, accent, size = 64, style }: Props) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const label = progress(frame, start, 30)
  const asideAt = start + 8 + title.split(' ').length * 4 + 6
  return (
    <div style={style}>
      <div style={{
        fontSize: 18, fontWeight: 600, letterSpacing: '0.14em', color: colors.accent, marginBottom: 18,
        opacity: label, transform: `translateY(${(1 - label) * 10}px)`
      }}
      >
        {eyebrow}
      </div>
      <div style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08, color: colors.text }}>
        <RevealWords text={title} start={start + 8} accent={accent} />
        {aside && (
          <>
            <br />
            <RevealWords text={aside} start={asideAt} style={{ color: colors.muted }} />
          </>
        )}
      </div>
      {sub && (
        <div style={{ marginTop: 22, fontSize: size * 0.44, lineHeight: 1.4, color: colors.muted, letterSpacing: '-0.01em' }}>
          <RevealWords text={sub} start={asideAt + 20} stagger={2} />
        </div>
      )}
    </div>
  )
}
