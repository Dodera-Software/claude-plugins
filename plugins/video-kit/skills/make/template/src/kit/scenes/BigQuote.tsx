import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { RevealWords } from '../components/RevealWords'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

export interface BigQuoteProps {
  /** Word for word, from a quote the product really shows. Never invented. */
  quote: string
  name: string
  role?: string
  accent?: string[]
}

export function bigQuoteFrames(props: BigQuoteProps): number {
  return 20 + readingFrames(`${props.quote} ${props.name}`) + 60
}

/** A single quote, big, and who said it. */
export function BigQuote({ quote, name, role, accent }: BigQuoteProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, align } = useLook()
  const { wide, width, pad } = useShape()
  const side = wide ? 200 : pad
  const words = quote.split(' ').length
  const size = Math.round((words > 22 ? (wide ? 56 : 46) : wide ? 72 : 58) * type.scale)
  const by = progress(frame, 20 + words * 3, 30)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align, padding: `0 ${side}px` }}>
      <div style={{ fontSize: size * 2.4, lineHeight: 0.6, height: size * 0.9, fontWeight: 800, color: colors.accent, opacity: progress(frame, 0, 24) }}>“</div>
      <div style={{ maxWidth: width - 2 * side, fontSize: size, lineHeight: 1.18, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.text }}>
        <RevealWords text={quote} start={10} stagger={3} accent={accent} />
      </div>
      <div style={{ marginTop: 44, fontSize: 32, opacity: by, transform: `translateY(${(1 - by) * 12}px)` }}>
        <span style={{ fontWeight: 700, color: colors.text }}>{name}</span>
        {role && <span style={{ color: colors.muted }}>{`, ${role}`}</span>}
      </div>
    </AbsoluteFill>
  )
}
