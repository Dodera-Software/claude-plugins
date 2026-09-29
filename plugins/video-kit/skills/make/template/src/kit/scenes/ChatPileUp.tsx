import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { PersonAvatar } from '../components/PersonAvatar'
import { RevealWords } from '../components/RevealWords'
import { mix, progress, readingFrames } from '../motion'
import type { Person } from '../types'

export interface ChatPileUpProps {
  /** A few relatable messages; the last one is the joke and lands a beat later, bigger. */
  messages: { person: Person, text: string }[]
  /** The line that answers the pile-up, one or two short lines. */
  punchline: string[]
}

const FIRST_AT = 8
const EVERY = 22
const PUNCHLINE_PAUSE = 14

function timing(props: ChatPileUpProps) {
  const lastAt = FIRST_AT + (props.messages.length - 1) * EVERY + PUNCHLINE_PAUSE
  return { lastAt, punchAt: lastAt + 40 }
}

export function chatPileUpFrames(props: ChatPileUpProps): number {
  return timing(props).punchAt + readingFrames(props.punchline.join(' ')) + 20
}

/** The hook: a team chat piling up with the problem, then a big line that names it. */
export function ChatPileUp(props: ChatPileUpProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { colors, shadow } = useBrand()
  const { punchAt } = timing(props)
  const recede = progress(frame, punchAt - 6, 40)

  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 150px' }}>
      <div style={{
        width: 860, display: 'flex', flexDirection: 'column', gap: 18,
        opacity: mix(1, 0.35, recede), transform: `scale(${mix(1, 0.96, recede)})`, transformOrigin: '0 50%'
      }}
      >
        {props.messages.map((message, index) => {
          const last = index === props.messages.length - 1
          const at = FIRST_AT + index * EVERY + (last ? PUNCHLINE_PAUSE : 0)
          const pop = spring({ frame: frame - at, fps, config: last ? { damping: 11, stiffness: 180 } : { damping: 20, stiffness: 170 } })
          return (
            <div
              key={message.text}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 18, opacity: Math.min(1, pop * 1.6),
                transform: `translateY(${(1 - pop) * 30}px) scale(${mix(0.92, 1, pop)})`, transformOrigin: '0 50%'
              }}
            >
              <Sfx cue={last ? 'punch' : index % 2 ? 'popAlt' : 'pop'} at={at} volume={last ? 0.4 : 0.3} />
              <PersonAvatar person={message.person} size={56} />
              <div style={{ padding: '14px 24px 16px', borderRadius: '6px 24px 24px 24px', background: colors.sheet, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: colors.toned, marginBottom: 4 }}>{message.person.name}</div>
                <div style={{ fontSize: last ? 40 : 32, fontWeight: last ? 600 : 400, letterSpacing: '-0.015em', color: colors.text }}>{message.text}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ flex: 1, paddingLeft: 90, fontSize: 104, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1, color: colors.text }}>
        {props.punchline.map((line, index) => (
          <div key={line}><RevealWords text={line} start={punchAt + index * 8} /></div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
