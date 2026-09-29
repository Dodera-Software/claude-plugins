import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
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
  const { colors, Logo, name, domain } = useBrand()
  const logo = spring({ frame, fps, config: { damping: 18, stiffness: 110 } })
  const works = progress(frame, 90, 30)
  const button = progress(frame, 130, 36)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Sfx cue="chime" at={2} volume={0.4} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <div style={{ transform: `scale(${logo})` }}>
          <Logo size={128} />
        </div>
        <div style={{ fontSize: 112, fontWeight: 600, letterSpacing: '-0.045em', color: colors.text }}>
          <RevealWords text={name} start={14} />
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 48, fontWeight: 500, letterSpacing: '-0.025em', color: colors.muted }}>
        <RevealWords text={tagline} start={44} stagger={4} accent={taglineAccent} />
      </div>
      {worksWith && (
        <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 26, opacity: works, fontSize: 20, color: colors.muted }}>
          Works with
          {worksWith.map(kind => <ToolIcon key={kind} kind={kind} size={32} />)}
        </div>
      )}
      <div style={{
        marginTop: 48, padding: '16px 34px', borderRadius: 40, background: colors.accent, color: '#fff',
        fontSize: 30, fontWeight: 600, opacity: button, transform: `translateY(${(1 - button) * 16}px)`
      }}
      >
        {cta ?? domain}
      </div>
    </AbsoluteFill>
  )
}
