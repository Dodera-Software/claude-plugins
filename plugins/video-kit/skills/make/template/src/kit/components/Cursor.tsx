import { useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { easeInOut, mix, progress } from '../motion'

interface Props {
  from: [number, number]
  to: [number, number]
  moveStart: number
  moveDuration: number
  clickAt: number
  /** Times the system arrow's size: 1.5 by default, so it stays easy to follow in a scaled-down frame. */
  size?: number
}

/** The macOS arrow, gliding to a target and pressing it. */
export function Cursor({ from, to, moveStart, moveDuration, clickAt, size = 1.5 }: Props) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const move = progress(frame, moveStart, moveDuration, easeInOut)
  const appear = progress(frame, moveStart - 12, 12)
  const press = frame >= clickAt && frame < clickAt + 10 ? 0.86 : 1
  const ring = progress(frame, clickAt, 24)
  const x = mix(from[0], to[0], move)
  const y = mix(from[1], to[1], move)
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: appear, pointerEvents: 'none' }}>
      {frame >= clickAt && (
        <div style={{
          position: 'absolute', left: -22 * size / 1.5, top: -22 * size / 1.5, width: 44 * size / 1.5, height: 44 * size / 1.5, borderRadius: '50%',
          border: `3px solid ${colors.accent}99`, transform: `scale(${0.4 + ring})`, opacity: 1 - ring
        }}
        />
      )}
      <svg width={24 * size} height={32 * size} viewBox="0 0 24 32" style={{ position: 'relative', transform: `scale(${press})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>
        <path d="M1 1v25l6.5-6.2 4.2 9.8 4-1.7-4.1-9.6H21z" fill="#1F1F1F" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
