import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { useBrand } from '../brand'
import { BrandMark } from '../components/BrandMark'
import { lockupSizes, useShape } from '../layout'
import { inkOn, useLook } from '../look'
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
  const { colors, name } = useBrand()
  const { shape, width, pad } = useShape()
  const size = lockupSizes(shape, width, name)
  const { type } = useLook()
  const push = mix(1, 1.03, Math.min(1, frame / Math.max(1, durationInFrames)))
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${pad}px`, transform: `scale(${push})` }}>
      <div style={{ display: 'flex', flexDirection: size.stacked ? 'column' : 'row', alignItems: 'center', gap: size.stacked ? 28 : 36 }}>
        <BrandMark size={size.logo} />
        <div style={{ fontSize: size.name, fontWeight: Math.max(600, type.weight), letterSpacing: '-0.045em', color: colors.text, whiteSpace: 'nowrap' }}>{name}</div>
      </div>
      {title && (
        <div style={{ marginTop: 40, maxWidth: size.stacked ? width - 2 * pad : 1400, textAlign: 'center', fontSize: size.tagline, lineHeight: 1.25, fontWeight: 500, letterSpacing: '-0.025em', color: colors.muted }}>
          {title}
        </div>
      )}
    </AbsoluteFill>
  )
}
