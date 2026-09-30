import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { inkOn, useLook } from '../look'

/** A command typed at the prompt, or output printed under it. */
export interface TerminalLine {
  command?: string
  output?: string
  tone?: 'ok' | 'muted' | 'error' | 'accent'
}

const PER_CHAR = 2
const AFTER_COMMAND = 14
const PER_OUTPUT = 10

/** When each line starts and when the last one has finished, from `start`. */
export function terminalSchedule(lines: TerminalLine[], start = 0) {
  const at: number[] = []
  let time = start
  for (const line of lines) {
    at.push(time)
    time += line.command ? line.command.length * PER_CHAR + AFTER_COMMAND : PER_OUTPUT
  }
  return { at, end: time }
}

/** A terminal window where commands type themselves and their output follows, line by line. */
export function TerminalWindow({ lines, title, width, start = 0 }: { lines: TerminalLine[], title?: string, width: number, start?: number }) {
  const frame = useCurrentFrame()
  const { colors, shadow } = useBrand()
  const { mono, round } = useLook()
  const dark = inkOn(colors.sheet) === '#ffffff'
  const tones = {
    ok: dark ? '#4ade80' : '#15803d',
    error: dark ? '#f87171' : '#b91c1c',
    muted: colors.muted,
    accent: colors.accent
  }
  const { at, end } = terminalSchedule(lines, start)
  const size = Math.round(width / (width < 1100 ? 34 : 46))
  return (
    <div style={{ width, borderRadius: 16 * round, overflow: 'hidden', background: colors.sheet, border: `1px solid ${colors.border}`, boxShadow: shadow.floating }}>
      <div style={{ height: 46, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', borderBottom: `1px solid ${colors.border}` }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map(dot => <span key={dot} style={{ width: 12, height: 12, borderRadius: 6, background: dot }} />)}
        {title && <span style={{ marginLeft: 14, fontFamily: mono, fontSize: 16, color: colors.muted }}>{title}</span>}
      </div>
      <div style={{ padding: '26px 30px 34px', fontFamily: mono, fontSize: size, lineHeight: 1.6, color: colors.text, minHeight: size * 1.6 * (lines.length + 1) }}>
        {lines.map((line, index) => {
          if (frame < at[index]) {
            return null
          }
          if (line.command) {
            const typed = Math.min(line.command.length, Math.floor((frame - at[index]) / PER_CHAR))
            return (
              <div key={index} style={{ whiteSpace: 'pre-wrap' }}>
                <span style={{ color: colors.accent }}>$ </span>
                {line.command.slice(0, typed)}
              </div>
            )
          }
          return <div key={index} style={{ whiteSpace: 'pre-wrap', color: tones[line.tone ?? 'muted'] }}>{line.output}</div>
        })}
        {frame >= end && (
          <div>
            <span style={{ color: colors.accent }}>$ </span>
            <span style={{ display: 'inline-block', width: size * 0.6, height: size * 1.1, verticalAlign: 'text-bottom', background: colors.text, opacity: Math.floor(frame / 30) % 2 ? 0 : 1 }} />
          </div>
        )}
      </div>
    </div>
  )
}
