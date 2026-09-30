import { Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { easeInOut, progress } from '../motion'
import { BrowserFrame } from './BrowserFrame'
import { Cursor } from './Cursor'
import { Recording } from './Recording'

export interface CameraKey {
  /** Frame (inside the scene) the camera arrives at this framing. */
  at: number
  /** 1 shows the whole screen; 2 fills the frame with a quarter of it. */
  zoom: number
  /** The point to centre, as fractions of the screenshot (0–1). */
  focus: [number, number]
}

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
  /** Where the camera looks, keyframe by keyframe; between keys it eases, one move at a time. */
  camera?: CameraKey[]
  /**
   * A pointer gliding to a point on the screenshot (fractions) and clicking. Take `to` from the
   * screenshot the click happens in (before the screen changes), where the target really is.
   */
  cursor?: { from: [number, number], to: [number, number], moveStart: number, moveDuration: number, clickAt: number }
}

const SWITCH = 8

function framing(camera: CameraKey[], frame: number): { zoom: number, focus: [number, number] } {
  if (!camera.length) {
    return { zoom: 1, focus: [0.5, 0.5] }
  }
  let from = camera[0]
  let to = camera[0]
  for (const key of camera) {
    if (key.at <= frame) {
      from = key
    }
  }
  to = camera.find(key => key.at > frame) ?? from
  // Each move starts right after the previous key and takes up to 40 frames to arrive.
  const start = Math.max(from.at, to.at - 40)
  const t = to === from ? 1 : progress(frame, start, to.at - start, easeInOut)
  // Zoom eases in log space, so going from 1× to 3× doesn't seem to speed up.
  const zoom = Math.exp(interpolate(t, [0, 1], [Math.log(from.zoom), Math.log(to.zoom)]))
  // Keep the view inside the screenshot: past its edge there's nothing to show.
  const half = 0.5 / zoom
  const keep = (value: number) => Math.min(1 - half, Math.max(half, value))
  return { zoom, focus: [keep(interpolate(t, [0, 1], [from.focus[0], to.focus[0]])), keep(interpolate(t, [0, 1], [from.focus[1], to.focus[1]]))] }
}

/**
 * The product's real screens, captured with `render.sh capture`, in a browser window: screenshots
 * swapping at their frames, one camera move at a time, and a cursor that zooms with the screen.
 */
export function CapturedScreen({ shots, viewport = { width: 1440, height: 900 }, width: ownWidth, url, camera = [], cursor }: CapturedScreenProps) {
  const frame = useCurrentFrame()
  const video = useVideoConfig()
  const width = ownWidth ?? Math.min(1560, video.width - 120)
  const height = (width * viewport.height) / viewport.width
  const { zoom, focus } = framing(camera, frame)
  const x = (0.5 - focus[0]) * width * zoom
  const y = (0.5 - focus[1]) * height * zoom
  const at = (point: [number, number]): [number, number] => [point[0] * width, point[1] * height]

  return (
    <BrowserFrame url={url} width={width}>
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
          {cursor && <Cursor from={at(cursor.from)} to={at(cursor.to)} moveStart={cursor.moveStart} moveDuration={cursor.moveDuration} clickAt={cursor.clickAt} />}
        </div>
      </div>
    </BrowserFrame>
  )
}
