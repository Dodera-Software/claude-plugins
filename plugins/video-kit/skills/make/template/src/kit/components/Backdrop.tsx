import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { useLook } from '../look'
import { useShape } from '../layout'

/** Shapes drifting behind a playful video, mostly past the edges: [x, y, size] as fractions of the frame. */
const SHAPES: [number, number, number][] = [[-0.02, 0.08, 0.16], [1.01, 0.3, 0.12], [0.94, 1.02, 0.2]]

/**
 * What sits behind every scene in the look: a faint grid fading from the centre (technical),
 * soft round shapes drifting slowly (playful), or the plain canvas.
 */
export function Backdrop() {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { backdrop } = useLook()
  const { width, height } = useShape()
  if (backdrop === 'grid') {
    const line = colors.border
    return (
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: '72px 72px',
        backgroundPosition: `${width / 2}px ${height / 2}px`,
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 75%)'
      }}
      />
    )
  }
  if (backdrop === 'shapes') {
    const fills = [colors.accentSoft, colors.highlight, colors.accentSoft]
    return (
      <AbsoluteFill>
        {SHAPES.map(([x, y, size], index) => {
          const drift = frame / 90 + index * 1.7
          const diameter = size * width
          return (
            <div
              key={index}
              style={{
                position: 'absolute', width: diameter, height: diameter, borderRadius: '50%', background: fills[index], opacity: 0.55,
                left: x * width - diameter / 2 + Math.sin(drift) * 18, top: y * height - diameter / 2 + Math.cos(drift * 0.8) * 14
              }}
            />
          )
        })}
      </AbsoluteFill>
    )
  }
  return null
}
