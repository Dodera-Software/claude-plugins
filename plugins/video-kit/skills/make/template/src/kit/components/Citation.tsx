import { useBrand } from '../brand'

/** A numbered source marker inside a sentence. */
export function Citation({ n, size = 11 }: { n: number, size?: number }) {
  const { colors } = useBrand()
  return (
    <span style={{
      display: 'inline-grid', placeItems: 'center', minWidth: size * 1.6, height: size * 1.6, padding: '0 4px',
      margin: '0 2px', borderRadius: 5, background: colors.subtle, color: colors.accent, fontSize: size,
      fontWeight: 600, verticalAlign: size * 0.55, lineHeight: 1
    }}
    >
      {n}
    </span>
  )
}
