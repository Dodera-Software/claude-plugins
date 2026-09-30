import { AbsoluteFill } from 'remotion'
import { ChapterTitle } from '../components/ChapterTitle'
import { useShape } from '../layout'
import { useLook } from '../look'
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

/** A chapter on its own: label, claim, joke or detail. Big, nothing else; aligned as the look says. */
export function TitleCard(props: TitleCardProps) {
  const { shape, width, pad } = useShape()
  const { type, align } = useLook()
  const size = Math.round((shape === 'wide' ? 96 : shape === 'tall' ? 84 : 72) * type.scale)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'stretch', padding: shape === 'wide' ? '0 180px' : `0 ${pad}px` }}>
      <ChapterTitle {...props} start={6} size={size} style={{ maxWidth: shape === 'wide' ? 1500 : width - 2 * pad }} />
    </AbsoluteFill>
  )
}
