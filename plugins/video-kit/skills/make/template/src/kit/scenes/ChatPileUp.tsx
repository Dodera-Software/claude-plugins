import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { useBrand } from '../brand'
import { fitText, useShape } from '../layout'
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
  const { shape, wide, width, pad } = useShape()
  const { punchAt } = timing(props)
  const recede = progress(frame, punchAt - 6, 40)
  const tall = shape === 'tall'
  const text = wide ? 32 : tall ? 34 : 28
  const lastText = wide ? 40 : tall ? 42 : 34
  const avatar = wide ? 56 : 48
  const longest = props.punchline.reduce((a, b) => (b.length > a.length ? b : a), '')
  const punch = wide ? 104 : fitText(longest, width - 2 * pad, tall ? 128 : 96)

  return (
    <AbsoluteFill style={{
      flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', justifyContent: 'center',
      padding: wide ? '0 150px' : `0 ${pad}px`, gap: wide ? 0 : tall ? 80 : 44
    }}
    >
      <div style={{
        width: wide ? 860 : '100%', display: 'flex', flexDirection: 'column', gap: wide ? 18 : 14,
        opacity: mix(1, 0.35, recede), transform: `scale(${mix(1, 0.96, recede)})`, transformOrigin: wide ? '0 50%' : '0 0'
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
                display: 'flex', alignItems: 'flex-start', gap: wide ? 18 : 14, opacity: Math.min(1, pop * 1.6),
                transform: `translateY(${(1 - pop) * 30}px) scale(${mix(0.92, 1, pop)})`, transformOrigin: '0 50%'
              }}
            >
              <PersonAvatar person={message.person} size={avatar} />
              <div style={{ minWidth: 0, padding: wide ? '14px 24px 16px' : '12px 20px 14px', borderRadius: '6px 24px 24px 24px', background: colors.sheet, boxShadow: shadow.card, border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: wide ? 17 : 16, fontWeight: 600, color: colors.toned, marginBottom: 4 }}>{message.person.name}</div>
                <div style={{ fontSize: last ? lastText : text, lineHeight: 1.25, fontWeight: last ? 600 : 400, letterSpacing: '-0.015em', color: colors.text }}>{message.text}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ flex: wide ? 1 : undefined, paddingLeft: wide ? 90 : 0, fontSize: punch, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1, color: colors.text }}>
        {props.punchline.map((line, index) => (
          <div key={line}><RevealWords text={line} start={punchAt + index * 8} /></div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
