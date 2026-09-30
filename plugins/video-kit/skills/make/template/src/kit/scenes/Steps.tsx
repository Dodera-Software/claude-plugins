import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { Eyebrow } from '../components/Eyebrow'
import { RevealWords } from '../components/RevealWords'
import { useShape } from '../layout'
import { inkOn, useLook } from '../look'
import { progress, readingFrames } from '../motion'

export interface StepsProps {
  eyebrow?: string
  title?: string
  /** Three to five steps in order, each a short name and an optional line. */
  steps: { title: string, text?: string }[]
}

const FIRST_AT = 34
const EVERY = 36

export function stepsFrames(props: StepsProps): number {
  const last = props.steps[props.steps.length - 1]
  return FIRST_AT + (props.steps.length - 1) * EVERY + readingFrames([last.title, last.text].filter(Boolean).join(' ')) + 60
}

/** How it works, step by step: a line draws through numbered stops, left to right or top down. */
export function Steps({ eyebrow, title, steps }: StepsProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, round } = useLook()
  const { wide, width, height, pad } = useShape()
  const side = wide ? 160 : pad
  const dot = wide ? 64 : 56
  const line = progress(frame, FIRST_AT, (steps.length - 1) * EVERY + 20, t => t)
  const across = width - 2 * side
  const each = across / steps.length
  return (
    <AbsoluteFill style={{ padding: `${Math.round(height * 0.1)}px ${side}px`, justifyContent: 'center' }}>
      {eyebrow && <Eyebrow text={eyebrow} />}
      {title && (
        <div style={{ fontSize: Math.round((wide ? 72 : 60) * type.scale), lineHeight: 1.08, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.text, marginBottom: wide ? 90 : 60 }}>
          <RevealWords text={title} start={6} />
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: wide ? 'row' : 'column', gap: wide ? 0 : 40 }}>
        <div style={{
          position: 'absolute', background: colors.accent, opacity: 0.35,
          ...(wide
            ? { left: dot / 2, top: dot / 2 - 2, height: 4, width: (across - each) * line }
            : { left: dot / 2 - 2, top: dot / 2, width: 4, height: `calc(${line * 100}% - ${dot}px)` })
        }}
        />
        {steps.map((step, index) => {
          const at = FIRST_AT + index * EVERY
          const shown = progress(frame, at, 30)
          return (
            <div key={step.title} style={{ position: 'relative', display: 'flex', flexDirection: wide ? 'column' : 'row', gap: wide ? 28 : 28, width: wide ? each : undefined, paddingRight: wide ? 32 : 0, opacity: shown, transform: `translateY(${(1 - shown) * 20}px)` }}>
              <div style={{
                flexShrink: 0, width: dot, height: dot, borderRadius: Math.min(dot / 2, 16 * round * 2), background: colors.accent,
                color: inkOn(colors.accent), display: 'grid', placeItems: 'center', fontFamily: type.labelFont, fontSize: dot * 0.42, fontWeight: 700
              }}
              >
                {index + 1}
              </div>
              <div>
                <div style={{ fontSize: wide ? 44 : 42, lineHeight: 1.15, fontWeight: Math.max(600, type.weight), letterSpacing: type.tracking, color: colors.text }}>{step.title}</div>
                {step.text && <div style={{ marginTop: 10, fontSize: 30, lineHeight: 1.35, color: colors.muted }}>{step.text}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
