/** Tools the kit has icons for (components/ToolIcon.tsx). */
export type ToolKind = 'meeting' | 'slack' | 'github' | 'jira' | 'file' | 'claude'

export interface Person {
  initials: string
  name: string
  /** Avatar fill and letters. */
  tint: string
  ink: string
}

/** A piece of knowledge as it lives in its own tool: a Slack message, a ticket, a PR. */
export interface Snippet {
  kind: ToolKind
  where: string
  title: string
  body: string
  meta: string
}
