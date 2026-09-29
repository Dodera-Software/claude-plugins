import { useBrand } from '../brand'
import type { Snippet } from '../types'
import { ToolIcon } from './ToolIcon'

/** One piece of knowledge as it lives in its own tool. */
export function SnippetCard({ snippet }: { snippet: Snippet }) {
  const { colors, shadow } = useBrand()
  return (
    <div style={{
      width: 420, padding: '20px 22px', borderRadius: 18, background: colors.sheet, boxShadow: shadow.card,
      border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 10
    }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, color: colors.muted }}>
        <ToolIcon kind={snippet.kind} size={20} />
        <span>{snippet.where}</span>
        <span style={{ color: colors.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet.title}</span>
      </div>
      <div style={{ fontSize: 21, lineHeight: 1.4, color: colors.text }}>{snippet.body}</div>
      <div style={{ fontSize: 15, color: colors.muted }}>{snippet.meta}</div>
    </div>
  )
}
