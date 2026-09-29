import type { ReactNode } from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { BrowserFrame } from '../components/BrowserFrame'
import { ChapterTitle } from '../components/ChapterTitle'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

export interface SplitScreenProps {
  eyebrow: string
  title: string
  aside?: string
  accent?: string[]
  /** A screenshot under public/ shown in a browser window, or any visual of your own. */
  image?: string
  /** The image's own size in CSS pixels, for its proportions (default 1440×900). */
  viewport?: { width: number, height: number }
  url?: string
  visual?: ReactNode
  /** Which side the visual is on in a wide frame. */
  side?: 'left' | 'right'
}

export function splitScreenFrames(props: SplitScreenProps): number {
  return 30 + readingFrames([props.title, props.aside].filter(Boolean).join(' ')) + 50
}

/** Words on one side, the thing they're about on the other; stacked in square and tall frames. */
export function SplitScreen({ eyebrow, title, aside, accent, image, viewport = { width: 1440, height: 900 }, url, visual, side = 'right' }: SplitScreenProps) {
  const frame = useCurrentFrame()
  const { shadow } = useBrand()
  const { type, round } = useLook()
  const { wide, width, height, pad } = useShape()
  const enter = progress(frame, 10, 46)
  const visualWidth = wide ? Math.round(width * 0.5) : width - 2 * pad
  const content = visual ?? (image && (
    <BrowserFrame url={url} width={visualWidth}>
      <Img src={staticFile(image)} style={{ width: visualWidth, height: (visualWidth * viewport.height) / viewport.width, display: 'block' }} />
    </BrowserFrame>
  ))
  const words = (
    <ChapterTitle
      eyebrow={eyebrow}
      title={title}
      aside={aside}
      accent={accent}
      start={4}
      size={Math.round((wide ? 76 : 64) * type.scale)}
      style={{ flex: wide ? '1 1 0' : undefined, textAlign: 'left' }}
    />
  )
  const picture = (
    <div style={{
      flexShrink: 0, borderRadius: 16 * round, boxShadow: visual ? shadow.floating : undefined, opacity: enter,
      transform: wide ? `translateX(${(1 - enter) * (side === 'right' ? 80 : -80)}px)` : `translateY(${(1 - enter) * 60}px)`
    }}
    >
      {content}
    </div>
  )
  return (
    <AbsoluteFill style={{
      flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', justifyContent: 'center',
      gap: wide ? 90 : 56, padding: wide ? `0 ${pad}px` : `${Math.round(height * 0.1)}px ${pad}px`
    }}
    >
      {wide && side === 'left' ? <>{picture}{words}</> : <>{words}{picture}</>}
    </AbsoluteFill>
  )
}
