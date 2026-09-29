import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { useBrand } from '../brand'
import { mix } from '../motion'

export interface CoverProps {
  /** One line under the name: the video's promise. Leave it out for just the logo and name. */
  title?: string
}

/**
 * The first frame of every video, fully composed from frame 0. Slack, LinkedIn, X, WhatsApp and
 * Finder use a video's first frame as its preview, so it must never be a blank canvas. It holds
 * for a moment with a slow push, then the first scene grows out of it.
 */
export function Cover({ title }: CoverProps) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const { colors, Logo, name } = useBrand()
  const push = mix(1, 1.03, Math.min(1, frame / Math.max(1, durationInFrames)))
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${push})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Logo size={128} />
        <div style={{ fontSize: 112, fontWeight: 600, letterSpacing: '-0.045em', color: colors.text }}>{name}</div>
      </div>
      {title && (
        <div style={{ marginTop: 40, maxWidth: 1400, textAlign: 'center', fontSize: 48, fontWeight: 500, letterSpacing: '-0.025em', color: colors.muted }}>
          {title}
        </div>
      )}
    </AbsoluteFill>
  )
}
