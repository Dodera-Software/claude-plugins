import type { ReactNode } from 'react'
import { AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { Caption } from '../components/Caption'
import { MotionBlur } from '../components/MotionBlur'
import { useShape, type Shape } from '../layout'
import { useLook } from '../look'
import { readingFrames } from '../motion'
import { cameraAt, type ViewKey, type Vec3 } from '../three/camera'
import { focalLength, Place, Space } from '../three/Space'

export interface FlythroughStop {
  /** A screenshot under public/, at the scene's `viewport` proportions. */
  image?: string
  /**
   * Or any element drawn at `viewport` size: the product's rebuilt UI. Its `useCurrentFrame()`
   * counts from the moment the camera sets off toward it (the first one's from the scene's start),
   * so what it animates has landed by the time the camera settles.
   */
  visual?: ReactNode
  /** What this moment says, a short line. */
  caption: string
  detail?: string
  accent?: string[]
  /**
   * Frames the visual needs, counted from when the camera sets off toward it: a recording's
   * `recordingFrames(length)`, so it plays out before the camera moves on.
   */
  hold?: number
}

export interface FlythroughProps {
  /** Two to five places the camera visits, in order. */
  stops: FlythroughStop[]
  /** Size of each screen (default 1440×900). */
  viewport?: { width: number, height: number }
}

const OPENING = 100
const TRAVEL = 96
const SETTLE = 12
const LEAVE = 24

/** When the camera arrives at each stop, and when that stop's caption comes and goes. */
function schedule({ stops }: FlythroughProps) {
  let at = OPENING
  return stops.map((stop, index) => {
    const depart = index === 0 ? 0 : at - TRAVEL
    const arrive = at
    const caption = arrive - SETTLE
    const hold = Math.max(readingFrames(`${stop.caption} ${stop.detail ?? ''}`) + 20, (stop.hold ?? 0) - (caption - depart) - LEAVE)
    const leave = caption + hold + LEAVE
    at = leave + TRAVEL
    return { depart, arrive, caption, leave }
  })
}

/**
 * When the camera settles at each stop and when it leaves, in the scene's frames: to start a
 * voiceover line as a stop comes into view (`voice: [{ line, at: stops[0].arrive - 20 }, …]`).
 */
export function flythroughStops(props: FlythroughProps): { arrive: number, leave: number }[] {
  return schedule(props).map(({ arrive, leave }) => ({ arrive, leave }))
}

export function flythroughFrames(props: FlythroughProps): number {
  return schedule(props).at(-1)!.leave + 20
}

/** How much of the frame's width a screen fills when the camera is at it, and how far up it sits. */
const FILL: Record<Shape, { width: number, lift: number }> = {
  wide: { width: 0.56, lift: 0.1 },
  square: { width: 0.78, lift: 0.16 },
  tall: { width: 0.9, lift: -0.05 }
}

/**
 * One continuous shot: the product's screens hang in space, receding into the distance, and the
 * camera flies from one to the next, settling in front of each while its line appears below, like
 * a film's subtitles. Opens wide on all of them, so the viewer sees the journey before it starts.
 * The film form's core scene (style.md); no cuts, no title cards.
 */
export function Flythrough(props: FlythroughProps) {
  const { stops, viewport = { width: 1440, height: 900 } } = props
  const frame = useCurrentFrame()
  const { colors, shadow } = useBrand()
  const { round } = useLook()
  const { shape, width, height } = useShape()
  const times = schedule(props)
  const { width: W, height: H } = viewport
  const fill = FILL[shape]
  const focal = focalLength(height)
  const distance = (W * focal) / (fill.width * width)
  const gap = W * 1.5
  const spread = shape === 'wide' ? W * 0.62 : W * 0.5

  const places = stops.map((_, index) => {
    const side = index % 2 === 0 ? -1 : 1
    const turn = -side * 14
    const at: Vec3 = [side * spread, ((index % 3) - 1) * H * 0.06, -index * gap]
    const normal: Vec3 = [Math.sin((turn * Math.PI) / 180), 0, Math.cos((turn * Math.PI) / 180)]
    // The camera looks below the screen's centre, so the screen sits above the caption.
    const drop = fill.lift * height * (distance / focal)
    const target: Vec3 = [at[0], at[1] - drop, at[2]]
    const position: Vec3 = [target[0] + normal[0] * distance, target[1], target[2] + normal[2] * distance]
    return { at, turn, rest: { position, target } }
  })

  const middle = -((stops.length - 1) * gap) / 2
  const keys: ViewKey[] = [
    // Opens on the whole way ahead, the nearest screens large enough to read as screens.
    { at: 0, position: [0, H * 0.12, places[0].rest.position[2] + distance * 0.5], target: [0, H * 0.05, middle], fov: 35 },
    ...places.flatMap(({ rest }, index) => [
      { at: times[index].arrive, ...rest, fov: 35 },
      { at: times[index].leave, ...rest, fov: 35 }
    ])
  ]
  const camera = cameraAt(frame, keys)
  const travelling = times.some(({ depart, arrive }, index) => index > 0 && frame > depart + 15 && frame < arrive - 15)
  const radius = 18 * round

  return (
    <AbsoluteFill>
      {/* Blurred only while the camera travels between stops, fastest in the middle of a move. */}
      <MotionBlur active={travelling}>
        <Space camera={camera} fog={[distance * 1.6, distance * 1.6 + gap * 3.5]} depthOfField={0.5}>
          {stops.map((stop, index) => (
            <Place key={index} at={places[index].at} turn={places[index].turn} width={W} height={H}>
              <div style={{ width: W, height: H, borderRadius: radius, overflow: 'hidden', background: colors.sheet, boxShadow: shadow.floating }}>
                {stop.image && <Img src={staticFile(stop.image)} style={{ width: W, height: H, objectFit: 'cover', display: 'block' }} />}
                {stop.visual && <Freeze frame={Math.max(0, frame - times[index].depart)}>{stop.visual}</Freeze>}
              </div>
            </Place>
          ))}
        </Space>
      </MotionBlur>
      {/* The canvas rises behind the captions, so they read over whatever passes below. */}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${colors.canvas} 6%, transparent 27%)` }} />
      {stops.map((stop, index) => (
        <Caption key={index} text={stop.caption} detail={stop.detail} accent={stop.accent} start={times[index].caption} end={index === stops.length - 1 ? undefined : times[index].leave} />
      ))}
    </AbsoluteFill>
  )
}
