import type { LucideIcon } from 'lucide-react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { FORMATS, padFor, shapeOf, useShape, type Shape } from '../layout'
import { progress, readingFrames } from '../motion'

export interface PromiseListProps {
  /** Three to five short claims. The first is the headline and gets the filled icon. */
  items: { icon: LucideIcon, text: string }[]
}

const FIRST_AT = 10
const EVERY = 32

export function promiseListFrames(props: PromiseListProps): number {
  const last = props.items[props.items.length - 1]
  return FIRST_AT + (props.items.length - 1) * EVERY + readingFrames(last.text) + 90
}

interface Sizes { icon: number, radius: number, lead: number, rest: number, gap: number }

function sizes(shape: Shape): Sizes {
  if (shape === 'wide') {
    return { icon: 84, radius: 22, lead: 68, rest: 56, gap: 34 }
  }
  return shape === 'tall'
    ? { icon: 80, radius: 21, lead: 58, rest: 48, gap: 36 }
    : { icon: 68, radius: 18, lead: 48, rest: 40, gap: 28 }
}

/**
 * Where the list starts, centred vertically. Wide claims fit one line; in a square or tall frame a
 * claim may wrap, so its height is estimated from its length. The scene and promiseListLeadIcon()
 * share this, so the icon is exactly where the helper says, whatever the estimate.
 */
function top(shape: Shape, width: number, height: number, items: PromiseListProps['items']): number {
  const { icon, gap, lead, rest } = sizes(shape)
  const side = shape === 'wide' ? 240 : padFor(shape)
  const room = width - 2 * side - icon - (shape === 'wide' ? 32 : 24)
  const rows = items.map((item, index) => {
    const size = index === 0 ? lead : rest
    const lines = shape === 'wide' ? 1 : Math.max(1, Math.ceil((item.text.length * size * 0.56) / room))
    return Math.max(icon, lines * size * 1.12)
  })
  const total = rows.reduce((sum, row) => sum + row, 0) + gap * (items.length - 1)
  return Math.max(Math.round(height * 0.1), Math.round((height - total) / 2))
}

/**
 * The headline promise's icon tile, where it sits on screen: pass it to `grow(…)` so the next scene
 * opens out of it. `format` is the video's format.
 */
export function promiseListLeadIcon(props: PromiseListProps, format: keyof typeof FORMATS = 'landscape') {
  const { width, height } = FORMATS[format]
  const shape = shapeOf(width, height)
  const { icon, radius } = sizes(shape)
  return { x: shape === 'wide' ? 240 : padFor(shape), y: top(shape, width, height, props.items), width: icon, height: icon, radius }
}

/** The closing claims, building one under another. */
export function PromiseList({ items }: PromiseListProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { shape, wide, width, height, pad } = useShape()
  const size = sizes(shape)
  const side = wide ? 240 : pad
  return (
    <AbsoluteFill style={{ paddingTop: top(shape, width, height, items), paddingLeft: side, paddingRight: side, gap: size.gap }}>
      {items.map((item, index) => {
        const at = FIRST_AT + index * EVERY
        const shown = progress(frame, at, 36)
        const lead = index === 0
        const Icon = item.icon
        return (
          <div
            key={item.text}
            style={{
              display: 'flex', alignItems: wide ? 'center' : 'flex-start', gap: wide ? 32 : 24, opacity: shown,
              transform: `translateX(${(1 - shown) * -30}px)`, filter: `blur(${(1 - shown) * 6}px)`
            }}
          >
            <Sfx cue={index % 2 ? 'tickAlt' : 'tick'} at={at} volume={0.25} />
            <div style={{ flexShrink: 0, width: size.icon, height: size.icon, borderRadius: size.radius, background: lead ? colors.accent : colors.accentSoft, display: 'grid', placeItems: 'center' }}>
              <Icon size={size.icon * 0.45} color={lead ? '#fff' : colors.accent} strokeWidth={1.8} />
            </div>
            <div style={{
              maxWidth: width - 2 * side - size.icon - (wide ? 32 : 24), fontSize: lead ? size.lead : size.rest, lineHeight: 1.12,
              paddingTop: wide ? 0 : (size.icon - (lead ? size.lead : size.rest) * 1.12) / 2,
              fontWeight: 600, letterSpacing: '-0.035em', color: lead ? colors.text : colors.toned
            }}
            >
              {item.text}
            </div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
