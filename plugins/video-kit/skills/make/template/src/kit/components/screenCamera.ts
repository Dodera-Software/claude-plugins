import { interpolate } from 'remotion'
import { easeInOut, FPS, progress } from '../motion'

/** Where the camera looks on a screen at a frame: zoom, and the point centred. */
export interface CameraKey {
  /** Frame (inside the scene) the camera arrives at this framing. */
  at: number
  /** 1 shows the whole screen; 2 fills the frame with a quarter of it. */
  zoom: number
  /** The point to centre, as fractions of the screenshot (0–1). */
  focus: [number, number]
  /** Frames the move into this key takes (default 40). */
  move?: number
}

/** The camera between its keys: each move eases in over up to 40 frames, one move at a time. */
export function framing(camera: CameraKey[], frame: number): { zoom: number, focus: [number, number] } {
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
  // Each move starts right after the previous key and takes up to its `move` frames to arrive.
  const start = Math.max(from.at, to.at - (to.move ?? 40))
  const t = to === from ? 1 : progress(frame, start, to.at - start, easeInOut)
  // Zoom eases in log space, so going from 1× to 3× doesn't seem to speed up.
  const zoom = Math.exp(interpolate(t, [0, 1], [Math.log(from.zoom), Math.log(to.zoom)]))
  // Keep the view inside the screenshot: past its edge there's nothing to show.
  const half = 0.5 / zoom
  const keep = (value: number) => Math.min(1 - half, Math.max(half, value))
  return { zoom, focus: [keep(interpolate(t, [0, 1], [from.focus[0], to.focus[0]])), keep(interpolate(t, [0, 1], [from.focus[1], to.focus[1]]))] }
}


/** A step a recording noted (its .json `marks`): when, what, and where on the screen. */
export interface FilmMark {
  t: number
  end?: number
  kind?: string
  box?: { x: number, y: number, width: number, height: number }
}

export interface AutoZoomOptions {
  /** The frame the recording starts playing at in the scene (its shot's `at`). */
  at?: number
  /** As the recording's `from` and `rate`. */
  from?: number
  rate?: number
  /** 0.5 for gentler zooms, 1 as designed, up to 1.3 for bolder ones. */
  strength?: number
}

const WIDE: [number, number] = [0.5, 0.5]

type Box = NonNullable<FilmMark['box']>

/**
 * The moments in a recording worth pointing at: typing always, a click only on a small target
 * (a big one is already seen). Steps under a second apart and close on screen are one moment,
 * their boxes joined.
 */
function moments(film: { marks: FilmMark[] }): { start: number, end: number, box: Box, typing: boolean }[] {
  const picked = film.marks.filter(mark => mark.box && (mark.kind === 'type' || (mark.kind === 'click' && mark.box.width * mark.box.height < 0.06)))
  const groups: { start: number, end: number, box: Box, typing: boolean }[] = []
  for (const mark of picked) {
    const box = mark.box!
    const end = mark.end ?? mark.t + 0.6
    const last = groups.at(-1)
    const x = Math.min(last?.box.x ?? box.x, box.x)
    const y = Math.min(last?.box.y ?? box.y, box.y)
    const joined = last && { x, y, width: Math.max(last.box.x + last.box.width, box.x + box.width) - x, height: Math.max(last.box.y + last.box.height, box.y + box.height) - y }
    // One moment only when it's also one place: two fields side by side, not a field and the menu.
    if (last && joined && mark.t - last.end < 1 && joined.width <= 0.45 && joined.height <= 0.25) {
      last.box = joined
      last.end = Math.max(last.end, end)
      last.typing ||= mark.kind === 'type'
    } else {
      groups.push({ start: mark.t, end, box: { ...box }, typing: mark.kind === 'type' })
    }
  }
  return groups
}

/**
 * Camera keys that follow what happens in a recording the way an editor would: toward typing (so
 * it can be read) and toward clicks on small targets, holding while it happens, then back out. It
 * picks its moments: steps close together make one move, a big target needs no zoom, and after
 * zooming out it rests at least 2.5 s before zooming in again, so the film breathes between
 * moments instead of bobbing at every click. Pass it as `camera` to `CapturedScreen` or `Recording`.
 */
export function autoZoom(film: { marks: FilmMark[] }, { at = 0, from = 0, rate = 1, strength = 1 }: AutoZoomOptions = {}): CameraKey[] {
  const frameOf = (seconds: number) => at + Math.round(((seconds - from) * FPS) / rate)
  const groups = moments(film)
  const keys: CameraKey[] = [{ at: 0, zoom: 1, focus: WIDE }]
  let restUntil = -Infinity
  groups.forEach((group, index) => {
    const start = frameOf(group.start)
    const end = frameOf(group.end)
    if (start - 50 < restUntil) {
      return
    }
    // Close enough that the moment fills the frame, but never so close that its edges leave it.
    const room = 0.8 / Math.max(group.box.width * 1.1, group.box.height * 1.8, 0.2)
    const wanted = group.typing ? 1.65 : 1.35
    const zoom = 1 + (Math.min(wanted, room, 2) - 1) * strength
    if (zoom < 1.12) {
      return
    }
    const focus: [number, number] = [group.box.x + group.box.width / 2, group.box.y + group.box.height / 2]
    const previous = keys.at(-1)!
    // Arrive a moment before it happens; the move itself takes 50 frames.
    keys.push({ at: Math.max(previous.at + 1, start - 50), zoom: previous.zoom, focus: previous.focus, move: 1 })
    keys.push({ at: Math.max(previous.at + 2, start + 4), zoom, focus, move: 50 })
    const hold = end + 36
    keys.push({ at: hold, zoom, focus, move: 1 })
    const next = groups[index + 1]
    // The next moment is near: glide straight there, without going wide in between.
    if (next && frameOf(next.start) - hold < 90) {
      return
    }
    keys.push({ at: hold + 55, zoom: 1, focus: WIDE, move: 55 })
    restUntil = hold + 55 + 150
  })
  return keys.sort((a, b) => a.at - b.at)
}

/** A part of the screen outlined for a while: a field being filled, the button about to be pressed. */
export interface HighlightKey {
  /** Frames (inside the scene) it appears and leaves. */
  at: number
  until: number
  /** Where, as fractions of the screen (0–1), like a mark's `box`. */
  box: Box
  /** Darken the rest of the screen a little, so only this part stands out. */
  dim?: boolean
}

export interface AutoHighlightOptions extends Omit<AutoZoomOptions, 'strength'> {
  /** At least this many frames between two highlights (default 240, 4 s): one moment at a time. */
  gap?: number
  dim?: boolean
}

/**
 * Highlights that follow what happens in a recording: an outline around the field being typed in
 * or the small target clicked, from just before until a moment after. Rationed like `autoZoom`
 * (the same moments, at most one every 4 s), and both together read as one gesture: the camera
 * moves in and the outline settles on the same spot. Pass it as `highlights` to `CapturedScreen`
 * or `Recording`.
 */
export function autoHighlights(film: { marks: FilmMark[] }, { at = 0, from = 0, rate = 1, gap = 240, dim = false }: AutoHighlightOptions = {}): HighlightKey[] {
  const frameOf = (seconds: number) => at + Math.round(((seconds - from) * FPS) / rate)
  const keys: HighlightKey[] = []
  for (const moment of moments(film)) {
    const start = frameOf(moment.start) - 12
    if (keys.length && start - keys.at(-1)!.until < gap) {
      continue
    }
    // A little room around the element, as a designer would draw it.
    const padX = 0.008
    const padY = 0.012
    const box = { x: moment.box.x - padX, y: moment.box.y - padY, width: moment.box.width + 2 * padX, height: moment.box.height + 2 * padY }
    keys.push({ at: Math.max(0, start), until: frameOf(moment.end) + 40, box, dim })
  }
  return keys
}
