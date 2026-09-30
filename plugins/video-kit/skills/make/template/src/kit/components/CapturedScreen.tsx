import { Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { progress } from '../motion'
import { BrowserFrame } from './BrowserFrame'
import { Cursor } from './Cursor'
import { Laptop } from './DeviceFrame'
import { Recording } from './Recording'
import { Highlights } from './Highlight'
import { framing, type CameraKey, type HighlightKey } from './screenCamera'

export type { CameraKey, HighlightKey }

export interface CapturedScreenProps {
  /**
   * Screenshots and recordings under public/, in order; each shows from its `at` frame on (the
   * first from 0). A recording (.mp4) starts playing at its `at`; `from`, `rate` and `length` are
   * as in `Recording` (give `length` so its last frame holds). Recordings bring their own pointer.
   */
  shots: { src: string, at?: number, from?: number, rate?: number, length?: number }[]
  /** The captured viewport, in CSS pixels (the plan's viewport). */
  viewport?: { width: number, height: number }
  /** Width of the window on screen, in video pixels. Defaults to the frame's width less a margin. */
  width?: number
  url?: string
  /**
   * Where the camera looks, keyframe by keyframe; between keys it eases, one move at a time.
   * `autoZoom(film, { at })` follows what happens in a recording.
   */
  camera?: CameraKey[]
  /**
   * Parts of the screen outlined for a while (fractions of the screenshot, frames of the scene):
   * the field being filled, the button about to be pressed. `autoHighlights(film, { at })` picks
   * them from a recording. One at a time, and not on every step.
   */
  highlights?: HighlightKey[]
  /** Around the screen: a browser window (default), a laptop, or nothing. */
  frame?: 'browser' | 'laptop' | 'none'
  /**
   * A pointer gliding to a point on the screenshot (fractions) and clicking. Take `to` from the
   * screenshot the click happens in (before the screen changes), where the target really is.
   */
  cursor?: { from: [number, number], to: [number, number], moveStart: number, moveDuration: number, clickAt: number }
}

const SWITCH = 8

/**
 * The product's real screens, captured with `render.sh capture`, in a browser window: screenshots
 * swapping at their frames, one camera move at a time, and a cursor that zooms with the screen.
 */
export function CapturedScreen({ shots, viewport = { width: 1440, height: 900 }, width: ownWidth, url, camera = [], highlights, cursor, frame: around = 'browser' }: CapturedScreenProps) {
  const frame = useCurrentFrame()
  const video = useVideoConfig()
  // A laptop is wider than its screen (the base overhangs): its screen gets a little less.
  const width = ownWidth ?? Math.min(around === 'laptop' ? 1300 : 1560, video.width - (around === 'laptop' ? 320 : 120))
  const height = (width * viewport.height) / viewport.width
  const { zoom, focus } = framing(camera, frame)
  const x = (0.5 - focus[0]) * width * zoom
  const y = (0.5 - focus[1]) * height * zoom
  const at = (point: [number, number]): [number, number] => [point[0] * width, point[1] * height]

  const screen = (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '50% 50%' }}>
          {shots.map((shot, index) => {
            const next = shots[index + 1]
            const shown = index === 0 ? 1 : progress(frame, shot.at ?? 0, SWITCH)
            const hidden = next ? progress(frame, (next.at ?? 0) + SWITCH, 1) : 0
            const style = { position: 'absolute', inset: 0, width, height, opacity: shown * (1 - hidden) } as const
            return /\.(mp4|webm|mov)$/i.test(shot.src)
              ? (
                  <Sequence key={`${shot.src}-${index}`} from={shot.at ?? 0} layout="none">
                    <div style={style}><Recording src={shot.src} from={shot.from} rate={shot.rate} length={shot.length} /></div>
                  </Sequence>
                )
              : <Img key={`${shot.src}-${index}`} src={staticFile(shot.src)} style={style} />
          })}
          {highlights && <Highlights keys={highlights} zoom={zoom} />}
          {cursor && <Cursor from={at(cursor.from)} to={at(cursor.to)} moveStart={cursor.moveStart} moveDuration={cursor.moveDuration} clickAt={cursor.clickAt} />}
        </div>
    </div>
  )
  if (around === 'laptop') {
    return <Laptop width={width + 2 * Math.round(width * 0.0185)} screen={viewport}>{screen}</Laptop>
  }
  return around === 'none' ? screen : <BrowserFrame url={url} width={width}>{screen}</BrowserFrame>
}
