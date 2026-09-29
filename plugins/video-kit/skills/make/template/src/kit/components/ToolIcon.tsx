import { FileText, Hash } from 'lucide-react'
import { siClaude, siGithub, siGooglemeet, siJira } from 'simple-icons'
import type { ToolKind } from '../types'

const BRANDS = { meeting: siGooglemeet, github: siGithub, jira: siJira, claude: siClaude }
/** simple-icons dropped Slack's mark at Slack's request; a # in Slack's aubergine stands in. */
const SLACK_AUBERGINE = '#4A154B'

export function ToolIcon({ kind, size }: { kind: ToolKind, size: number }) {
  if (kind === 'slack') {
    return <Hash size={size} color={SLACK_AUBERGINE} strokeWidth={2.4} />
  }
  if (kind === 'file') {
    return <FileText size={size} color="#444746" strokeWidth={1.8} />
  }
  const brand = BRANDS[kind]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <path d={brand.path} fill={`#${brand.hex}`} />
    </svg>
  )
}
