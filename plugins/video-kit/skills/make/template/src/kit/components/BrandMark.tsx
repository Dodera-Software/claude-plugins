import { useBrand } from '../brand'
import { useLook } from '../look'

/**
 * The brand's logo at `size`. On the bold look's brand-coloured canvas, or the technical look's dark
 * one, a logo drawn for a light page can vanish, so it sits on a white tile there (the technical
 * look uses the brand's `LogoOnDark` instead when it has one).
 */
export function BrandMark({ size }: { size: number }) {
  const { Logo, LogoOnDark } = useBrand()
  const { name, round } = useLook()
  if (name === 'technical' && LogoOnDark) {
    return <LogoOnDark size={size} />
  }
  if (name !== 'bold' && name !== 'technical') {
    return <Logo size={size} />
  }
  const inset = Math.round(size * 0.16)
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.24 * round), background: '#ffffff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Logo size={size - 2 * inset} />
    </div>
  )
}
