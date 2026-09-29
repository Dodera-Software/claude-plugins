import type { LucideIcon } from 'lucide-react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
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

/** The closing claims, building one under another. */
export function PromiseList({ items }: PromiseListProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 240px', gap: 34 }}>
      {items.map((item, index) => {
        const at = FIRST_AT + index * EVERY
        const shown = progress(frame, at, 36)
        const lead = index === 0
        const Icon = item.icon
        return (
          <div
            key={item.text}
            style={{
              display: 'flex', alignItems: 'center', gap: 32, opacity: shown,
              transform: `translateX(${(1 - shown) * -30}px)`, filter: `blur(${(1 - shown) * 6}px)`
            }}
          >
            <Sfx cue={index % 2 ? 'tickAlt' : 'tick'} at={at} volume={0.25} />
            <div style={{ width: 84, height: 84, borderRadius: 22, background: lead ? colors.accent : colors.accentSoft, display: 'grid', placeItems: 'center' }}>
              <Icon size={38} color={lead ? '#fff' : colors.accent} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: lead ? 68 : 56, fontWeight: 600, letterSpacing: '-0.035em', color: lead ? colors.text : colors.toned }}>{item.text}</div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
