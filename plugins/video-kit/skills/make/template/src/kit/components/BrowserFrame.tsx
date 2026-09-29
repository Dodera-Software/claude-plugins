import type { ReactNode } from 'react'
import { useBrand } from '../brand'

/** A quiet browser window around a captured screen: three dots and the address. */
export function BrowserFrame({ url, width, children }: { url?: string, width: number, children: ReactNode }) {
  const { colors, shadow } = useBrand()
  return (
    <div style={{ width, borderRadius: 16, overflow: 'hidden', background: colors.sheet, boxShadow: shadow.floating, border: `1px solid ${colors.border}` }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: `1px solid ${colors.border}`, background: colors.canvas }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map(dot => <span key={dot} style={{ width: 12, height: 12, borderRadius: 6, background: dot }} />)}
        {url && (
          <div style={{ marginLeft: 16, flex: 1, maxWidth: 520, height: 26, borderRadius: 13, background: colors.sheet, border: `1px solid ${colors.border}`, fontSize: 14, color: colors.muted, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
            {url}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
