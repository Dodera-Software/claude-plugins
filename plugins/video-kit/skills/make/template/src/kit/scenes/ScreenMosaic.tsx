import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { useBrand } from '../brand'
import { ChapterTitle } from '../components/ChapterTitle'
import { useShape } from '../layout'
import { useLook } from '../look'
import { mix, progress, readingFrames } from '../motion'

export interface ScreenMosaicProps {
  /** Three to six screenshots under public/, all the same proportions. */
  shots: string[]
  /** Their proportions (default 1440×900). */
  viewport?: { width: number, height: number }
  eyebrow?: string
  title?: string
  accent?: string[]
}

export function screenMosaicFrames(props: ScreenMosaicProps): number {
  return Math.max(200, 40 + (props.title ? readingFrames(props.title) : 0) + 80)
}

/** Many screens at once on a tilted wall that slowly drifts: the breadth of a product in one shot. */
export function ScreenMosaic({ shots, viewport = { width: 1440, height: 900 }, eyebrow, title, accent }: ScreenMosaicProps) {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const { colors, shadow } = useBrand()
  const { type, round } = useLook()
  const { wide, width, height, pad } = useShape()
  const columns = wide ? 3 : 2
  const card = Math.round((wide ? width * 0.36 : width * 0.62))
  const cardHeight = (card * viewport.height) / viewport.width
  const drift = mix(0, -cardHeight * 0.5, progress(frame, 0, durationInFrames, t => t))
  const tiles = Array.from({ length: columns * 3 }, (_, index) => shots[index % shots.length])
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ perspective: 2400, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${columns}, ${card}px)`, gap: 36,
          transform: `rotateX(22deg) rotateZ(-10deg) translateY(${drift}px)`, transformOrigin: 'center'
        }}
        >
          {tiles.map((shot, index) => {
            const shown = progress(frame, 4 + (index % (columns * 2)) * 5, 34)
            return (
              <Img
                key={index}
                src={staticFile(shot)}
                style={{ width: card, height: cardHeight, objectFit: 'cover', borderRadius: 14 * round, boxShadow: shadow.floating, opacity: shown, transform: `translateY(${(1 - shown) * 40}px)` }}
              />
            )
          })}
        </div>
      </AbsoluteFill>
      {title && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', padding: `0 ${pad}px ${Math.round(height * 0.1)}px`, background: `linear-gradient(to top, ${colors.canvas} 18%, transparent 55%)` }}>
          <ChapterTitle eyebrow={eyebrow} title={title} accent={accent} start={24} size={Math.round((wide ? 76 : 60) * type.scale)} style={{ maxWidth: width - 2 * pad, textAlign: 'left' }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
