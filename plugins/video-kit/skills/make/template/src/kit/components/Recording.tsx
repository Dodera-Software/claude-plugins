import type { CSSProperties } from 'react'
import { Freeze, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { FPS } from '../motion'

export interface RecordingProps {
  /** An .mp4 under public/: `render.sh capture` films (public/captures/…) or `render.sh clip` (public/recordings/…). */
  src: string
  /** Where in the recording to start, in seconds (skip a slow load). */
  from?: number
  /** Playback speed: 1.5 plays it half again as fast. Keep typing and clicks at 1–1.5 so they read. */
  rate?: number
  /**
   * The recording's length in seconds (`duration` in its .json from capture, or what `clip`
   * printed). With it, the last frame holds once the recording ends instead of going blank.
   */
  length?: number
  /** How it fills its box: `cover` (default) crops to fill, `contain` shows all of it. */
  fit?: 'cover' | 'contain'
  style?: CSSProperties
}

/** How many frames of the video a recording plays for, from `from` to its end at `rate`. */
export function recordingFrames(length: number, from = 0, rate = 1): number {
  return Math.ceil(((length - from) * FPS) / rate)
}

/**
 * A screen recording, filling its box, playing from the scene's frame 0 (put it in a `Sequence` to
 * start it later). Works anywhere an image does: in `CapturedScreen` (as a shot), on a phone's
 * screen, in a `Flythrough` stop's `visual`, in a `Place`.
 */
export function Recording({ src, from = 0, rate = 1, length, fit = 'cover', style }: RecordingProps) {
  const frame = useCurrentFrame()
  const end = length === undefined ? Infinity : recordingFrames(length, from, rate)
  return (
    <Freeze frame={Math.max(0, end - 1)} active={frame >= end - 1}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        trimBefore={Math.round(from * FPS) || undefined}
        playbackRate={rate}
        style={{ width: '100%', height: '100%', objectFit: fit, display: 'block', ...style }}
      />
    </Freeze>
  )
}
