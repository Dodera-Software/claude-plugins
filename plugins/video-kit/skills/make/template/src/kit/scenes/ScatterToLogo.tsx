import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { fitText, lockupSizes, useShape, type Shape } from '../layout'
import { RevealWords } from '../components/RevealWords'
import { SnippetCard } from '../components/SnippetCard'
import { easeInOut, mix, progress, readingFrames } from '../motion'
import type { Snippet } from '../types'

export interface ScatterToLogoProps {
  /** Up to six pieces of scattered knowledge floating around the line. */
  snippets: Snippet[]
  line: string
  /** The muted second line, usually the joke. */
  aside: string
  /** Shown under the logo and name once everything has folded in. */
  tagline: string
  taglineAccent?: string[]
}

/**
 * Where the cards float, as [x, y, scale] with x and y as fractions of the frame: around the edges,
 * clear of the line in the middle. A square frame has room for four, a tall one for six.
 */
const PLACES: Record<Shape, [number, number, number][]> = {
  wide: [[0.245, 0.194, 1], [0.766, 0.176, 0.94], [0.13, 0.519, 0.96], [0.875, 0.519, 1.02], [0.281, 0.824, 0.95], [0.74, 0.833, 1]],
  square: [[0.27, 0.16, 0.76], [0.73, 0.13, 0.72], [0.28, 0.86, 0.74], [0.72, 0.84, 0.76]],
  tall: [[0.32, 0.09, 0.86], [0.68, 0.2, 0.84], [0.31, 0.31, 0.85], [0.69, 0.69, 0.86], [0.32, 0.8, 0.84], [0.68, 0.91, 0.86]]
}
const LINE_AT = 40
const ASIDE_AT = 85

function timing(props: ScatterToLogoProps) {
  const convergeAt = Math.max(250, LINE_AT + readingFrames(`${props.line} ${props.aside}`))
  return { convergeAt, taglineAt: convergeAt + 150 }
}

export function scatterToLogoFrames(props: ScatterToLogoProps): number {
  return timing(props).taglineAt + readingFrames(props.tagline) + 140
}

/** Scattered knowledge folds into the logo: the problem turns into the product. */
export function ScatterToLogo(props: ScatterToLogoProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, Logo, name } = useBrand()
  const { shape, wide, width, height, pad } = useShape()
  const places = PLACES[shape]
  const center: [number, number] = [width / 2, height / 2]
  const lockup = lockupSizes(shape, width, name)
  const { convergeAt, taglineAt } = timing(props)
  const converge = progress(frame, convergeAt, 90, easeInOut)
  const lineOut = progress(frame, convergeAt - 24, 30)
  const logo = spring({ frame: frame - (convergeAt + 64), fps, config: { damping: 18, stiffness: 120 } })
  const slide = progress(frame, convergeAt + 110, 50, easeInOut)
  const room = width - 2 * pad
  const lineSize = wide ? 72 : fitText(props.line, room, shape === 'tall' ? 80 : 68)
  const asideSize = wide ? 52 : fitText(props.aside, room, shape === 'tall' ? 56 : 48)

  return (
    <AbsoluteFill>
      <Sfx cue="whoosh" at={convergeAt + 10} volume={0.3} />
      <Sfx cue="chime" at={convergeAt + 64} volume={0.4} />
      {props.snippets.slice(0, places.length).map((snippet, index) => {
        const [fx, fy, scale] = places[index]
        const x = fx * width
        const y = fy * height
        const enter = progress(frame, 8 + index * 12, 50)
        const drift = Math.sin((frame + index * 40) / 70) * 6
        const px = mix(mix(x + (x - center[0]) * 0.25, x, enter), center[0], converge)
        const py = mix(y + drift, center[1], converge)
        return (
          <div
            key={index}
            style={{
              position: 'absolute', left: px, top: py,
              transform: `translate(-50%, -50%) scale(${mix(scale, 0.1, converge)})`,
              opacity: enter * (1 - progress(frame, convergeAt + 50, 40)),
              filter: `blur(${(1 - enter) * 10}px)`
            }}
          >
            <Sfx cue="drop" at={8 + index * 12} volume={0.12} />
            <SnippetCard snippet={snippet} />
          </div>
        )
      })}

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${pad}px`, opacity: 1 - lineOut }}>
        <div style={{ fontSize: lineSize, fontWeight: 600, letterSpacing: '-0.035em', textAlign: 'center', lineHeight: 1.1, color: colors.text }}>
          <RevealWords text={props.line} start={LINE_AT} stagger={6} />
          <br />
          <RevealWords text={props.aside} start={ASIDE_AT} stagger={5} style={{ color: colors.muted, fontSize: asideSize, letterSpacing: '-0.025em' }} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: `0 ${pad}px` }}>
        {wide
          ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: mix(0, 40, slide) }}>
                <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo * 2) }}>
                  <Logo size={148} />
                </div>
                <div style={{ maxWidth: mix(0, 1200, slide), overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {frame >= convergeAt + 110 && (
                    <div style={{ fontSize: 120, fontWeight: 600, letterSpacing: '-0.045em', color: colors.text }}>
                      <RevealWords text={name} start={convergeAt + 120} />
                    </div>
                  )}
                </div>
              </div>
            )
          : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
                <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo * 2) }}>
                  <Logo size={lockup.logo + 20} />
                </div>
                <div style={{ height: lockup.name * 1.2, fontSize: lockup.name, fontWeight: 600, letterSpacing: '-0.045em', color: colors.text, whiteSpace: 'nowrap' }}>
                  {frame >= convergeAt + 110 && <RevealWords text={name} start={convergeAt + 120} />}
                </div>
              </div>
            )}
        <div style={{
          position: wide ? 'absolute' : 'static', top: 700, marginTop: wide ? 0 : 32, maxWidth: wide ? undefined : room,
          textAlign: 'center', lineHeight: 1.25, fontSize: lockup.tagline - (wide ? 8 : 0), fontWeight: 500, letterSpacing: '-0.02em', color: colors.muted
        }}
        >
          <RevealWords text={props.tagline} start={taglineAt} stagger={4} accent={props.taglineAccent} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
