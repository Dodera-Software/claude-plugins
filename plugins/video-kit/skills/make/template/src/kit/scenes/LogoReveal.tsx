import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion'
import { Sfx } from '../audio/Sfx'
import { useBrand } from '../brand'
import { RevealWords } from '../components/RevealWords'
import { fitText, useShape } from '../layout'
import { useLook } from '../look'
import { readingFrames } from '../motion'
import { cameraAt } from '../three/camera'
import { Logo3D } from '../three/Logo3D'
import { Stage3D } from '../three/Stage3D'

export interface LogoRevealProps {
  /** The line under the name. */
  tagline?: string
  taglineAccent?: string[]
}

const SETTLE = 110
// Moving from the first frame, landing long and soft.
const GLIDE = Easing.bezier(0.3, 0.1, 0.2, 1)

export function logoRevealFrames(props: LogoRevealProps): number {
  // The name and tagline are read from when the name appears, 30 frames before the camera settles.
  return SETTLE - 30 + readingFrames(`Name ${props.tagline ?? ''}`) + 60
}

/**
 * The logo as a solid object, lit, the camera gliding round from a low angle to face it as it
 * lands; then the name and a tagline beneath. A launch's big moment, or a film's last shot before
 * the end card. The only move is the camera's: the logo itself never spins.
 */
export function LogoReveal({ tagline, taglineAccent }: LogoRevealProps) {
  const frame = useCurrentFrame()
  const { colors, name } = useBrand()
  const { type, motion } = useLook()
  const { shape, width, height, pad } = useShape()
  const wide = shape === 'wide'
  const camera = cameraAt(frame, [
    { at: 0, position: [-4.8, -2.2, 3.4], target: [0, 0.9, 0], fov: 35 },
    { at: SETTLE, position: [0, 0.35, 7.4], target: [0, 0.35, 0], fov: 35 },
    // Then a drift too slow to notice as a move, so the last seconds aren't a still picture.
    { at: SETTLE + 600, position: [0.5, 0.45, 7.2], target: [0, 0.35, 0], fov: 35 }
  ], GLIDE)
  const nameSize = fitText(name, width - 2 * pad, Math.round((wide ? 104 : 96) * type.scale))
  const nameAt = SETTLE - 30
  return (
    <AbsoluteFill>
      <Sfx cue="whoosh" at={6} volume={0.25} />
      <Sfx cue="chime" at={SETTLE - 8} volume={0.35} />
      <Stage3D camera={camera}>
        <group position={[0, 1, 0]}>
          <Logo3D size={wide ? 1.7 : shape === 'tall' ? 1.25 : 1.45} />
        </group>
      </Stage3D>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', textAlign: 'center', padding: `0 ${pad}px ${Math.round(height * (wide ? 0.14 : 0.2))}px` }}>
        <div style={{ fontSize: nameSize, lineHeight: 1, fontWeight: Math.max(600, type.weight), letterSpacing: '-0.045em', color: colors.text, whiteSpace: 'nowrap' }}>
          <RevealWords text={name} start={nameAt} />
        </div>
        {tagline && (
          <div style={{ marginTop: 26, maxWidth: wide ? 1300 : width - 2 * pad, fontSize: Math.round((wide ? 46 : 42) * type.scale), lineHeight: 1.2, fontWeight: 500, letterSpacing: '-0.025em', color: colors.muted }}>
            <RevealWords text={tagline} start={nameAt + 12 + motion.stagger * 3} accent={taglineAccent} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
