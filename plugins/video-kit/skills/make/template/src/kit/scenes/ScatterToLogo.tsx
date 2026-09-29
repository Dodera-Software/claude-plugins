import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
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

const CENTER: [number, number] = [960, 540]
/** [x, y, scale] around the edges, clear of the line in the middle. */
const PLACES: [number, number, number][] = [
  [470, 210, 1], [1470, 190, 0.94], [250, 560, 0.96], [1680, 560, 1.02], [540, 890, 0.95], [1420, 900, 1]
]
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
  const { convergeAt, taglineAt } = timing(props)
  const converge = progress(frame, convergeAt, 90, easeInOut)
  const lineOut = progress(frame, convergeAt - 24, 30)
  const logo = spring({ frame: frame - (convergeAt + 64), fps, config: { damping: 18, stiffness: 120 } })
  const slide = progress(frame, convergeAt + 110, 50, easeInOut)

  return (
    <AbsoluteFill>
      <Sfx cue="whoosh" at={convergeAt + 10} volume={0.3} />
      <Sfx cue="chime" at={convergeAt + 64} volume={0.4} />
      {props.snippets.slice(0, PLACES.length).map((snippet, index) => {
        const [x, y, scale] = PLACES[index]
        const enter = progress(frame, 8 + index * 12, 50)
        const drift = Math.sin((frame + index * 40) / 70) * 6
        const px = mix(mix(x + (x - CENTER[0]) * 0.25, x, enter), CENTER[0], converge)
        const py = mix(y + drift, CENTER[1], converge)
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

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: 1 - lineOut }}>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.035em', textAlign: 'center', lineHeight: 1.1, color: colors.text }}>
          <RevealWords text={props.line} start={LINE_AT} stagger={6} />
          <br />
          <RevealWords text={props.aside} start={ASIDE_AT} stagger={5} style={{ color: colors.muted, fontSize: 52, letterSpacing: '-0.025em' }} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
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
        <div style={{ position: 'absolute', top: 700, fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', color: colors.muted }}>
          <RevealWords text={props.tagline} start={taglineAt} stagger={4} accent={props.taglineAccent} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
