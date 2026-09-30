import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { useBrand } from '../brand'
import { Eyebrow } from '../components/Eyebrow'
import { RevealWords } from '../components/RevealWords'
import { fitText, useShape } from '../layout'
import { useLook } from '../look'
import { easeOut, progress, readingFrames } from '../motion'

export interface BigNumberProps {
  /** The number it counts up to, as the source states it. */
  value: number
  prefix?: string
  suffix?: string
  /** Digits after the decimal point. */
  decimals?: number
  /** What the number means, one short line. */
  label: string
  eyebrow?: string
}

const COUNT = 70

export function bigNumberFrames(props: BigNumberProps): number {
  return 16 + COUNT + readingFrames(`${props.value} ${props.label}`) + 30
}

/** One number that matters, counting up huge, and a line on what it means. */
export function BigNumber({ value, prefix = '', suffix = '', decimals = 0, label, eyebrow }: BigNumberProps) {
  const frame = useCurrentFrame()
  const { colors } = useBrand()
  const { type, align } = useLook()
  const { shape, width, pad } = useShape()
  const shown = value * progress(frame, 16, COUNT, easeOut)
  const text = `${prefix}${shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  const final = `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  const room = width - 2 * (shape === 'wide' ? 180 : pad)
  const size = fitText(final, room, Math.round((shape === 'wide' ? 300 : 240) * type.scale), 0.6)
  const labelSize = Math.round((shape === 'wide' ? 56 : 46) * type.scale)
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align, padding: `0 ${shape === 'wide' ? 180 : pad}px` }}>
      {eyebrow && <Eyebrow text={eyebrow} />}
      <div style={{ fontSize: size, lineHeight: 1, fontWeight: Math.max(700, type.weight), letterSpacing: '-0.05em', color: colors.accent, fontVariantNumeric: 'tabular-nums', opacity: progress(frame, 8, 16) }}>
        {text}
      </div>
      <div style={{ marginTop: 28, maxWidth: room, fontSize: labelSize, lineHeight: 1.15, fontWeight: type.weight, letterSpacing: type.tracking, color: colors.text }}>
        <RevealWords text={label} start={30} />
      </div>
    </AbsoluteFill>
  )
}
