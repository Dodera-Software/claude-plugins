import { Hash } from 'lucide-react'
import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { progress } from '../motion'
import type { Person } from '../types'
import { PersonAvatar } from './PersonAvatar'
import { StreamText, streamEnd } from './StreamText'

const SLACK_AUBERGINE = '#4A154B'
const SLACK_LINK = '#1264A3'

export interface SlackThreadProps {
  channel: string
  asker: Person
  /** What follows the @mention. */
  question: string
  answer: string
  source?: string
  askAt: number
  answerAt: number
  width?: number
  height?: number
}

/** A Slack thread where someone @mentions the product's app and it answers in place. */
export function SlackThread({ channel, asker, question, answer, source, askAt, answerAt, width = 820, height = 470 }: SlackThreadProps) {
  const frame = useCurrentFrame()
  const { colors, shadow, name, Logo } = useBrand()
  const ask = progress(frame, askAt, 24)
  const typing = frame >= askAt + 30 && frame < answerAt
  const reply = progress(frame, answerAt - 4, 20)
  const sourceIn = progress(frame, streamEnd(answer, answerAt) + 6, 20)

  return (
    <div style={{ width, height, borderRadius: 24, background: colors.sheet, boxShadow: shadow.floating, border: `1px solid ${colors.border}`, overflow: 'hidden', color: colors.text }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 8, padding: '0 28px', borderBottom: `1px solid ${colors.border}`, fontSize: 21, fontWeight: 700 }}>
        <Hash size={20} strokeWidth={2.4} color={SLACK_AUBERGINE} />
        {channel}
        <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 400, color: colors.muted }}>Thread</span>
      </div>
      <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', gap: 16, opacity: ask, transform: `translateY(${(1 - ask) * 12}px)` }}>
          <PersonAvatar person={asker} size={44} />
          <div>
            <div style={{ fontSize: 18 }}><b>{asker.name}</b> <span style={{ color: colors.muted, fontSize: 15 }}>10:42</span></div>
            <div style={{ fontSize: 23, lineHeight: 1.45, marginTop: 2 }}>
              <span style={{ color: SLACK_LINK, background: '#E8F5FA', borderRadius: 4, padding: '0 3px' }}>@{name}</span> {question}
            </div>
          </div>
        </div>
        {typing && <div style={{ fontSize: 16, color: colors.muted, paddingLeft: 60 }}>{name} is looking…</div>}
        <div style={{ display: 'flex', gap: 16, opacity: reply }}>
          <Logo size={44} />
          <div>
            <div style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <b>{name}</b>
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.toned, background: '#EEEEEE', borderRadius: 4, padding: '1px 5px' }}>APP</span>
              <span style={{ color: colors.muted, fontSize: 15 }}>10:42</span>
            </div>
            <div style={{ fontSize: 23, lineHeight: 1.45, marginTop: 2 }}>
              <StreamText text={answer} start={answerAt} />
            </div>
            {source && (
              <div style={{ marginTop: 12, fontSize: 16, color: colors.muted, opacity: sourceIn, borderLeft: `3px solid ${colors.border}`, paddingLeft: 12 }}>
                Source: <span style={{ color: SLACK_LINK }}>{source}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
