import type { CSSProperties } from 'react'
import { useBrand } from '../brand'
import { useLook } from '../look'
import { Eyebrow } from './Eyebrow'
import { RevealWords } from './RevealWords'

interface Props {
  eyebrow?: string
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
  const { colors } = useBrand()
  const { type, align } = useLook()
  const asideAt = start + 8 + title.split(' ').length * 4 + 6
  return (
    <div style={{ textAlign: align, ...style }}>
      {eyebrow && <Eyebrow text={eyebrow} start={start} />}
      <div style={{ fontSize: size, fontWeight: type.weight, letterSpacing: type.tracking, lineHeight: 1.08, color: colors.text }}>
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
