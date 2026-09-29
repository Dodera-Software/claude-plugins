import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { Eyebrow } from '../components/Eyebrow'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

/** One side: a label and either a few short lines or a screenshot under public/. */
export interface BeforeAfterSide {
  label: string
  lines?: string[]
  image?: string
}

export interface BeforeAfterProps {
  eyebrow?: string
  before: BeforeAfterSide
  after: BeforeAfterSide
}

const AFTER_AT = 90

function words(side: BeforeAfterSide): string {
  return [side.label, ...(side.lines ?? [])].join(' ')
}

export function beforeAfterFrames(props: BeforeAfterProps): number {
  return AFTER_AT + Math.max(60, readingFrames(words(props.after))) + 50
}

function Panel({ side, after, start }: { side: BeforeAfterSide, after: boolean, start: number }) {
  const frame = useCurrentFrame()
  const { colors, shadow } = useBrand()
  const { type, round } = useLook()
  const { wide } = useShape()
  const shown = progress(frame, start, 36)
  return (
    <div style={{
      flex: '1 1 0', minWidth: 0, padding: wide ? 56 : 44, borderRadius: 24 * round, background: after ? colors.sheet : colors.subtle,
      border: `${after ? 2 : 1}px solid ${after ? colors.accent : colors.border}`, boxShadow: after ? shadow.floating : undefined,
      opacity: shown, transform: `translateY(${(1 - shown) * 30}px) scale(${after ? 1 : 0.98})`
    }}
    >
      <div style={{ fontFamily: type.labelFont, fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', color: after ? colors.accent : colors.muted, marginBottom: 24 }}>{side.label.toUpperCase()}</div>
      {side.image && <Img src={staticFile(side.image)} style={{ width: '100%', borderRadius: 12 * round, display: 'block', filter: after ? undefined : 'grayscale(0.6)', opacity: after ? 1 : 0.8 }} />}
      {side.lines?.map((line, index) => {
        const lineShown = progress(frame, start + 12 + index * 12, 28)
        return (
          <div key={line} style={{ fontSize: wide ? 54 : 44, lineHeight: 1.25, fontWeight: after ? Math.max(600, type.weight) : 500, letterSpacing: type.tracking, color: after ? colors.text : colors.muted, marginTop: index ? 16 : 0, opacity: lineShown, textDecoration: after ? undefined : 'line-through', textDecorationColor: colors.border }}>
            {line}
          </div>
        )
      })}
    </div>
  )
}

/** How it was, then how it is: the old way fades back, the new one lands beside it. */
export function BeforeAfter({ eyebrow, before, after }: BeforeAfterProps) {
  const { wide, height, pad } = useShape()
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: wide ? '0 160px' : `${Math.round(height * 0.08)}px ${pad}px` }}>
      <Sfx cue="whoosh" at={AFTER_AT} volume={0.2} />
      {eyebrow && <Eyebrow text={eyebrow} />}
      <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: wide ? 48 : 32, alignItems: 'stretch' }}>
        <Panel side={before} after={false} start={10} />
        <Panel side={after} after start={AFTER_AT} />
      </div>
    </AbsoluteFill>
  )
}
