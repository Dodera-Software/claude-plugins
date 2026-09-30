import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { easeOut, progress } from '../motion'
import type { HighlightKey } from './screenCamera'

/**
 * Outlines on a screen: each settles onto its part of the page (from a little larger, fading in),
 * holds, and fades out. Drawn inside the screen's camera, so it moves and zooms with the page;
 * `zoom` keeps the line the same thickness however close the camera is.
 */
export function Highlights({ keys, zoom = 1 }: { keys: HighlightKey[], zoom?: number }) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {keys.map(({ at, until, box, dim }) => {
        if (frame < at || frame > until + 14) {
          return null
        }
        const settle = progress(frame, at, 16, easeOut)
        const shown = settle * (1 - progress(frame, until, 14))
        const grow = 1 + 0.06 * (1 - settle)
        const line = 3 / zoom
        return (
          <div
            key={`${at}-${box.x}`}
            style={{
              position: 'absolute',
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
              transform: `scale(${grow})`,
              opacity: shown,
              borderRadius: 10 / zoom,
              border: `${line}px solid ${colors.accent}`,
              // A soft halo of the same colour, and the rest of the screen dimmed when asked.
              boxShadow: `0 0 0 ${6 / zoom}px ${colors.accent}33${dim ? ', 0 0 0 9999px rgba(0,0,0,0.28)' : ''}`
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}
