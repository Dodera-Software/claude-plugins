import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { RevealWords } from '../components/RevealWords'
import { TerminalWindow, terminalSchedule, type TerminalLine } from '../components/TerminalWindow'
import { useShape } from '../layout'
import { useLook } from '../look'
import { progress, readingFrames } from '../motion'

export interface TerminalProps {
  lines: TerminalLine[]
  /** The window's title, like the project's folder: "~/acme". */
  title?: string
  /** One line under the window once it has run. */
  caption?: string
  accent?: string[]
}

const START = 16

export function terminalFrames(props: TerminalProps): number {
  return terminalSchedule(props.lines, START).end + (props.caption ? readingFrames(props.caption) : 0) + 70
}

/**
 * The product at work from the command line: commands type themselves, output follows. For
 * developer tools and anything with a CLI; pair the window with words through SplitScreen's
 * `visual` (<TerminalWindow />) when it needs explaining.
 */
export function Terminal({ lines, title, caption, accent }: TerminalProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type } = useLook()
  const { wide, width, pad } = useShape()
  const windowWidth = wide ? Math.min(1400, width - 2 * 200) : width - 2 * pad
  const enter = progress(frame, 0, 30)
  const { end } = terminalSchedule(lines, START)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 56, padding: `0 ${pad}px` }}>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
        <TerminalWindow lines={lines} title={title} width={windowWidth} start={START} />
      </div>
      {caption && (
        <div style={{ maxWidth: windowWidth, textAlign: 'center', fontSize: Math.round((wide ? 56 : 48) * type.scale), lineHeight: 1.15, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.text }}>
          <RevealWords text={caption} start={end + 10} accent={accent} />
        </div>
      )}
    </AbsoluteFill>
  )
}
