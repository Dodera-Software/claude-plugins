import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { useBrand } from '../brand'
import { BrandMark } from '../components/BrandMark'
import { lockupSizes, useShape } from '../layout'
import { inkOn, useLook } from '../look'
import { RevealWords } from '../components/RevealWords'
import { ToolIcon } from '../components/ToolIcon'
import { progress, readingFrames } from '../motion'
import type { ToolKind } from '../types'

export interface EndCardProps {
  tagline: string
  taglineAccent?: string[]
  worksWith?: ToolKind[]
  /** The button under everything; defaults to the brand's domain. */
  cta?: string
}

export function endCardFrames(props: EndCardProps): number {
  return 50 + readingFrames(props.tagline) + 150
}

/** Logo, name, tagline, the tools it works with, and where to go. Holds long enough to act on. */
export function EndCard({ tagline, taglineAccent, worksWith, cta }: EndCardProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, name, domain } = useBrand()
  const { shape, width, pad } = useShape()
  const size = lockupSizes(shape, width, name)
  const { type } = useLook()
  const logo = spring({ frame, fps, config: { damping: 18, stiffness: 110 } })
  const works = progress(frame, 90, 30)
  const button = progress(frame, 130, 36)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${pad}px` }}>
      <div style={{ display: 'flex', flexDirection: size.stacked ? 'column' : 'row', alignItems: 'center', gap: size.stacked ? 28 : 36 }}>
        <div style={{ transform: `scale(${logo})` }}>
          <BrandMark size={size.logo} />
        </div>
        <div style={{ fontSize: size.name, fontWeight: Math.max(600, type.weight), letterSpacing: '-0.045em', color: colors.text, whiteSpace: 'nowrap' }}>
          <RevealWords text={name} start={14} />
        </div>
      </div>
      <div style={{ marginTop: 40, maxWidth: size.stacked ? width - 2 * pad : 1600, textAlign: 'center', lineHeight: 1.25, fontSize: size.tagline, fontWeight: 500, letterSpacing: '-0.025em', color: colors.muted }}>
        <RevealWords text={tagline} start={44} stagger={4} accent={taglineAccent} />
      </div>
      {worksWith && (
        <div style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 26, opacity: works, fontSize: 20, color: colors.muted }}>
          Works with
          {worksWith.map(kind => <ToolIcon key={kind} kind={kind} size={32} />)}
        </div>
      )}
      <div style={{
        marginTop: 48, padding: '16px 34px', borderRadius: 40, background: colors.accent, color: inkOn(colors.accent),
        fontSize: 30, fontWeight: 600, opacity: button, transform: `translateY(${(1 - button) * 16}px)`
      }}
      >
        {cta ?? domain}
      </div>
    </AbsoluteFill>
  )
}
