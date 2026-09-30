import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress } from '../motion'
import { RevealWords } from './RevealWords'

export interface CaptionProps {
  text: string
  /** A quieter second line. */
  detail?: string
  accent?: string[]
  /** When its first word arrives. */
  start: number
  /** When it has gone again (it fades out over the 16 frames before). Leave out to keep it. */
  end?: number
}

/**
 * A line of a film: words over the picture, low in the frame, arriving the look's way and leaving
 * before the camera moves on, like subtitles set by a title designer. For the film form, where
 * words ride on a continuous shot instead of getting a scene of their own (style.md).
 */
export function Caption({ text, detail, accent, start, end }: CaptionProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, align } = useLook()
  const { wide, shape, width, height, pad } = useShape()
  const gone = end === undefined ? 0 : progress(frame, end - 16, 16)
  if (frame < start || gone >= 1) {
    return null
  }
  const size = Math.round((wide ? 58 : shape === 'tall' ? 60 : 52) * type.scale)
  return (
    <div style={{
      position: 'absolute', left: pad, right: pad, bottom: Math.round(height * (shape === 'tall' ? 0.1 : 0.08)),
      textAlign: align, opacity: 1 - gone, transform: `translateY(${gone * -12}px)`
    }}
    >
      <div style={{ fontSize: size, lineHeight: 1.1, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.text, maxWidth: wide ? width * 0.62 : undefined, marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }}>
        <RevealWords text={text} start={start} accent={accent} />
      </div>
      {detail && (
        <div style={{ marginTop: 14, fontSize: Math.round(size * 0.5), lineHeight: 1.3, color: colors.muted, maxWidth: wide ? width * 0.5 : undefined, marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }}>
          <RevealWords text={detail} start={start + 14} />
        </div>
      )}
    </div>
  )
}
