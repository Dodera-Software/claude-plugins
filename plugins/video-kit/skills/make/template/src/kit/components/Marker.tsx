import type { ReactNode } from 'react'
import { useBrand } from '../brand'

/** A highlighter stroke drawn left to right as `amount` goes from 0 to 1. */
export function Marker({ amount, children, tint }: { amount: number, children: ReactNode, tint?: string }) {
  const { colors } = useBrand()
  const fill = tint ?? colors.highlight
  return (
    <span style={{
      backgroundImage: `linear-gradient(${fill}, ${fill})`, backgroundRepeat: 'no-repeat',
      backgroundSize: `${amount * 100}% 100%`, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
      borderRadius: 4, padding: '1px 2px'
    }}
    >
      {children}
    </span>
  )
}
