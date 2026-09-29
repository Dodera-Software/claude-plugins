import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { Eyebrow } from '../components/Eyebrow'
import { RevealWords } from '../components/RevealWords'
import { fitText, useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

export interface WordSwapProps {
  /** The fixed start: "We build". */
  lead: string
  /** What swaps in after it, each one held long enough to read: "web apps", "websites", "AI agents". */
  words: string[]
  eyebrow?: string
}

const START = 24
const OUT = 14

function holds(props: WordSwapProps): number[] {
  return props.words.map(word => Math.max(54, readingFrames(word) + 10))
}

export function wordSwapFrames(props: WordSwapProps): number {
  return START + holds(props).reduce((sum, hold) => sum + hold, 0) + 30
}

/** A fixed line and the word after it changing in place: a range of things in one breath. */
export function WordSwap(props: WordSwapProps) {
  const { lead, words, eyebrow } = props
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, align, motion } = useLook()
  const { shape, width, pad } = useShape()
  const side = shape === 'wide' ? 180 : pad
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '')
  const size = fitText(longest, width - 2 * side, Math.round((shape === 'wide' ? 150 : 110) * type.scale), 0.58)
  const hold = holds(props)
  const starts = hold.map((_, index) => START + hold.slice(0, index).reduce((sum, h) => sum + h, 0))
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align, padding: `0 ${side}px` }}>
      {eyebrow && <Eyebrow text={eyebrow} />}
      <div style={{ fontSize: Math.round(size * 0.62), lineHeight: 1.1, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.muted }}>
        <RevealWords text={lead} start={4} />
      </div>
      <div style={{ position: 'relative', height: size * 1.2, width: '100%', overflow: 'hidden' }}>
        {words.map((word, index) => {
          const at = starts[index]
          const last = index === words.length - 1
          const inAmount = motion.ease(progress(frame, at, Math.max(18, motion.duration), t => t))
          const outAmount = last ? 0 : progress(frame, at + hold[index] - OUT, OUT)
          return (
            <div
              key={word}
              style={{
                position: 'absolute', left: 0, right: 0, top: 0, fontSize: size, lineHeight: 1.1, fontWeight: Math.max(600, type.weight),
                letterSpacing: type.tracking, color: colors.accent, whiteSpace: 'nowrap',
                opacity: Math.min(1, inAmount * 2) * (1 - outAmount),
                transform: `translateY(${(1 - inAmount) * 60 - outAmount * 60}%)`
              }}
            >
              <Sfx cue={index % 2 ? 'popAlt' : 'pop'} at={at} volume={0.2} />
              {word}
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
