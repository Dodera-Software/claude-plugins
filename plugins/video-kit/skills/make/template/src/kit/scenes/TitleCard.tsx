import { AbsoluteFill } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { ChapterTitle } from '../components/ChapterTitle'
import { readingFrames } from '../motion'

export interface TitleCardProps {
  eyebrow: string
  title: string
  aside?: string
  sub?: string
  accent?: string[]
}

export function titleCardFrames(props: TitleCardProps): number {
  return 20 + readingFrames([props.title, props.aside, props.sub].filter(Boolean).join(' ')) + 30
}

/** A chapter on its own: label, claim, joke or detail. Left-aligned, big, nothing else. */
export function TitleCard(props: TitleCardProps) {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 180px' }}>
      <Sfx cue="pop" at={6} volume={0.25} />
      <ChapterTitle {...props} start={6} size={96} style={{ maxWidth: 1500 }} />
    </AbsoluteFill>
  )
}
