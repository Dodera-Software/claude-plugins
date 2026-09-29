import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide, type SlideDirection } from '@remotion/transitions/slide'
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

/** TransitionSeries takes any presentation; each keeps its own props type up to here. */
function transition<P extends Record<string, unknown>>(presentation: TransitionPresentation<P>, frames: number): SceneTransition {
  return { presentation: presentation as unknown as SceneTransition['presentation'], frames }
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
export function push(direction: SlideDirection = 'from-right', frames = 30): SceneTransition {
  return transition(slide({ direction }), frames)
}

/** The fallback. Use it only when nothing on screen can become the next scene. */
export function crossfade(frames = 20): SceneTransition {
  return transition(fade(), frames)
}
