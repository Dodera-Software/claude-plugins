import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { ChapterTitle } from '../components/ChapterTitle'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

/** A name, and optionally its mark from simple-icons (`import { siReact } from 'simple-icons'`). */
export interface MarqueeItem {
  name: string
  icon?: { path: string, hex: string }
}

export interface MarqueeProps {
  eyebrow?: string
  title?: string
  accent?: string[]
  /** Technologies, integrations, industries: six or more reads as a stream. */
  items: MarqueeItem[]
}

export function marqueeFrames(props: MarqueeProps): number {
  return Math.max(210, 30 + (props.title ? readingFrames(props.title) : 0) + 90)
}

function Row({ items, speed, offset }: { items: MarqueeItem[], speed: number, offset: number }) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, round } = useLook()
  const repeated = [...items, ...items, ...items, ...items]
  return (
    <div style={{ display: 'flex', gap: 22, whiteSpace: 'nowrap', transform: `translateX(${offset - frame * speed}px)` }}>
      {repeated.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px', borderRadius: 18 * round, flexShrink: 0,
            background: colors.sheet, border: `1px solid ${colors.border}`, fontSize: 34, fontWeight: Math.max(500, type.weight - 100), letterSpacing: '-0.02em', color: colors.text
          }}
        >
          {item.icon && (
            <svg width={34} height={34} viewBox="0 0 24 24" style={{ display: 'block' }}>
              <path d={item.icon.path} fill={`#${item.icon.hex}`} />
            </svg>
          )}
          {item.name}
        </div>
      ))}
    </div>
  )
}

/** Names streaming past in two rows going opposite ways: what it works with, uses or serves. */
export function Marquee({ eyebrow, title, accent, items }: MarqueeProps) {
  const frame = useCurrentFrame()
  const { type } = useLook()
  const { wide, width, pad } = useShape()
  const half = Math.ceil(items.length / 2)
  const rows = items.length >= 8 ? [items.slice(0, half), items.slice(half)] : [items, [...items].reverse()]
  const shown = progress(frame, 10, 40)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', gap: wide ? 80 : 64 }}>
      {title && (
        <div style={{ padding: `0 ${wide ? 180 : pad}px` }}>
          <ChapterTitle eyebrow={eyebrow} title={title} accent={accent} start={4} size={Math.round((wide ? 76 : 60) * type.scale)} style={{ maxWidth: width - 2 * pad }} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, opacity: shown }}>
        <Row items={rows[0]} speed={1.6} offset={0} />
        <Row items={rows[1]} speed={-1.6} offset={-width} />
      </div>
    </AbsoluteFill>
  )
}
