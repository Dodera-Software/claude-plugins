import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { pushCut as remotionPushCut } from '@remotion/transitions/push-cut'
import { slide, type SlideDirection } from '@remotion/transitions/slide'
import { wipe as remotionWipe, type WipeDirection } from '@remotion/transitions/wipe'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { useBrand } from './brand'
import { easeInOut, mix } from './motion'

/**
 * How one scene becomes the next. Prefer a change of shape (flood, grow) over a fade: an object in
 * the outgoing scene turns into the incoming one, which is what makes a film feel designed.
 */
export interface SceneTransition {
  presentation: TransitionPresentation<Record<string, unknown>>
  frames: number
  /**
   * Remotion's own presentations (slide, wipe, fade) move at an even speed; these are given an
   * ease in and out, so they start and land softly. The kit's own ease inside themselves.
   */
  eased?: boolean
}

type Point = { x: number, y: number }
type Rect = Point & { width: number, height: number, radius: number }
type GrowProps = Rect & { color?: string }

function farthestCorner({ x, y }: Point, width: number, height: number): number {
  return Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y))
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

type FloodProps = Point & { color?: string }

function Flood({ children, presentationDirection, presentationProgress, passedProps }: TransitionPresentationComponentProps<FloodProps>) {
  const { width, height } = useVideoConfig()
  const { colors } = useBrand()
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill>{children}</AbsoluteFill>
  }
  // Ease the area, not the radius: coverage grows with r², so an eased radius changes half the
  // screen in a couple of frames mid-way, which reads as a flash.
  const reach = farthestCorner(passedProps, width, height) * 1.04
  const lead = Math.sqrt(easeInOut(clamp01(presentationProgress / 0.7))) * reach
  const scene = Math.sqrt(easeInOut(clamp01((presentationProgress - 0.3) / 0.7))) * reach
  const at = `${passedProps.x}px ${passedProps.y}px`
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: passedProps.color ?? colors.accent, clipPath: `circle(${lead}px at ${at})` }} />
      <AbsoluteFill style={{ background: colors.canvas, clipPath: `circle(${scene}px at ${at})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  )
}

function Grow({ children, presentationDirection, presentationProgress, passedProps }: TransitionPresentationComponentProps<GrowProps>) {
  const { width, height } = useVideoConfig()
  const { colors } = useBrand()
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill>{children}</AbsoluteFill>
  }
  const t = easeInOut(presentationProgress)
  const top = mix(passedProps.y, 0, t)
  const left = mix(passedProps.x, 0, t)
  const right = mix(width - passedProps.x - passedProps.width, 0, t)
  const bottom = mix(height - passedProps.y - passedProps.height, 0, t)
  const radius = mix(passedProps.radius, 0, t)
  // The shape keeps the colour of the element it grew from, and the next scene shows through it
  // only as it finishes opening, so the move reads as one object becoming the page.
  const tint = 1 - clamp01(presentationProgress / 0.75)
  const scene = easeInOut(clamp01((presentationProgress - 0.4) / 0.6))
  return (
    <AbsoluteFill style={{ background: colors.canvas, clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)` }}>
      <AbsoluteFill style={{ opacity: scene, transform: `scale(${mix(0.96, 1, t)})`, transformOrigin: `${passedProps.x + passedProps.width / 2}px ${passedProps.y + passedProps.height / 2}px` }}>
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: passedProps.color ?? colors.sheet, opacity: tint }} />
    </AbsoluteFill>
  )
}

/**
 * The outgoing scene fades away to the canvas, then the incoming one fades up from it: the two are
 * never on screen together. Scenes are transparent, so the canvas is what shows in between.
 */
function Dip({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<Record<string, never>>) {
  const opacity = presentationDirection === 'exiting'
    ? 1 - easeInOut(clamp01(presentationProgress / 0.5))
    : easeInOut(clamp01((presentationProgress - 0.5) / 0.5))
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

/** TransitionSeries takes any presentation; each keeps its own props type up to here. */
function transition<P extends Record<string, unknown>>(presentation: TransitionPresentation<P>, frames: number, eased = false): SceneTransition {
  return { presentation: presentation as unknown as SceneTransition['presentation'], frames, eased }
}

type ZoomProps = { direction: 'in' | 'out' }

/**
 * Through the picture: the outgoing scene grows toward the viewer and fades while the next one
 * settles in from a little smaller ('in'), or the reverse ('out'). Both move on one eased curve, so
 * the change reads as a single camera move, not two scenes swapping.
 */
function Zoom({ children, presentationDirection, presentationProgress, passedProps }: TransitionPresentationComponentProps<ZoomProps>) {
  const t = easeInOut(presentationProgress)
  const sign = passedProps.direction === 'in' ? 1 : -1
  const exiting = presentationDirection === 'exiting'
  const scale = exiting ? 1 + sign * 0.14 * t : 1 - sign * 0.08 * (1 - t)
  const opacity = exiting ? 1 - easeInOut(clamp01(presentationProgress / 0.7)) : easeInOut(clamp01((presentationProgress - 0.2) / 0.8))
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>{children}</AbsoluteFill>
}

/** A colour bursts out of a point, clears the farthest corner, and the next scene follows it out. */
export function flood(origin: FloodProps, frames = 36): SceneTransition {
  return transition({ component: Flood, props: origin }, frames)
}

/**
 * The next scene opens out of an element on screen: a button, a card, a logo becomes the page.
 * Pass the element's box and its fill colour (defaults to the brand's sheet white).
 */
export function grow(from: GrowProps, frames = 36): SceneTransition {
  return transition({ component: Grow, props: from }, frames)
}

/** Pages push: for two scenes of the same kind, side by side in the story. */
export function push(direction: SlideDirection = 'from-right', frames = 40): SceneTransition {
  return transition(slide({ direction }), frames, true)
}

/**
 * The camera moves through: `'in'` goes deeper (the next scene is a closer look: a feature after
 * the overview, a detail after the screen), `'out'` steps back (the big picture after a detail).
 * Smooth in every look; the calm way between two full pictures that belong together.
 */
export function zoom(direction: 'in' | 'out' = 'in', frames = 40): SceneTransition {
  return transition({ component: Zoom, props: { direction } }, frames)
}

/** A hard edge sweeps across and leaves the next scene behind it: bold, graphic. */
export function wipe(direction: WipeDirection = 'from-left', frames = 32): SceneTransition {
  return transition(remotionWipe({ direction }), frames, true)
}

/** A punchy zoom cut: the next beat hits. For bold and playful looks. No flash: a one-frame strobe reads as a glitch. */
export function pushCut(frames = 18): SceneTransition {
  return transition(remotionPushCut({ flashOpacity: 0 }), frames)
}

/**
 * A transition needs at least one frame in which both scenes are mounted. A cut puts the incoming
 * scene on the canvas colour, so in that frame it covers the outgoing one instead of showing both.
 * The outgoing scene is left as it is: TransitionSeries wraps it in this component for its whole
 * length, not just the transition, so hiding it here would hide the entire scene.
 */
function Cut({ children, presentationDirection }: TransitionPresentationComponentProps<Record<string, never>>) {
  const { colors } = useBrand()
  return <AbsoluteFill style={presentationDirection === 'entering' ? { background: colors.canvas } : undefined}>{children}</AbsoluteFill>
}

/** No transition at all, on the beat. Technical and bold looks cut; calm ones rarely do. */
export function cut(): SceneTransition {
  return transition({ component: Cut, props: {} }, 1)
}

/**
 * Out to the canvas, then in: the calm way between two full pictures (a film's last shot and the
 * end card), where a crossfade would show both at once.
 */
export function dip(frames = 40): SceneTransition {
  return transition({ component: Dip, props: {} }, frames)
}

/** The fallback. Use it only when nothing on screen can become the next scene, and both are sparse; between two busy pictures, `dip`. */
export function crossfade(frames = 30): SceneTransition {
  return transition(fade(), frames, true)
}
