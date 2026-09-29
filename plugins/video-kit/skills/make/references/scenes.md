# Scenes and components

Everything below is exported from `src/kit` (`import { … } from '../../kit'`).

## Kit scenes

Each takes props and has a matching `…Frames(props)` that computes its length from its words.

```tsx
const hook: ChatPileUpProps = { messages, punchline: ['Sound', 'familiar?'] }
scenes: [{ component: () => <ChatPileUp {...hook} />, frames: chatPileUpFrames(hook) }]
```

| Scene | Use it for | Props |
| --- | --- | --- |
| `ChatPileUp` | The hook: a team chat piling up with the problem, then a big line naming it | `messages: { person, text }[]` (4–5, last one is the joke), `punchline: string[]` |
| `ScatterToLogo` | Scattered knowledge folding into the logo, name and tagline | `snippets: Snippet[]` (≤ 6), `line`, `aside`, `tagline`, `taglineAccent?` |
| `TitleCard` | A chapter on its own, or the opening of a feature teaser | `eyebrow`, `title`, `aside?`, `sub?`, `accent?` |
| `PromiseList` | Closing claims building one under another | `items: { icon: LucideIcon, text }[]` (3–5, first is the headline) |
| `EndCard` | Logo, name, tagline, "Works with" icons, the address | `tagline`, `taglineAccent?`, `worksWith?: ToolKind[]`, `cta?` |

## Kit components

| Component | What it does |
| --- | --- |
| `ChapterTitle` | Accent label + claim + muted aside + sub line, revealed in sequence |
| `RevealWords` / `revealEnd()` | Words rising into focus; `accent` words in the brand colour |
| `StreamText` / `streamEnd()` | An answer arriving word by word |
| `Cursor` | The macOS pointer gliding to a target and clicking |
| `Marker` | A highlighter stroke drawn under text |
| `Citation` | A numbered source marker inside a sentence |
| `PersonAvatar` | Initials in a tinted circle (`Person`: initials, name, tint, ink) |
| `SnippetCard` | A message, ticket or PR as it looks in its own tool |
| `SlackThread` | A Slack thread where someone @mentions the product and it answers in place |
| `ToolIcon` | Google Meet, Slack, GitHub, Jira, file, Claude |
| `Sfx` | A sound cue at a frame (see audio.md) |

Helpers: `progress(frame, start, duration, easing?)`, `mix(a, b, t)`, `seconds(n)`,
`readingFrames(text)`, `easeOut`, `easeInOut`, `useBrand()`.

## Scenes that show the product

Built per product, in the video's own folder: see product-scenes.md. When a pattern turns out
useful for a second video, move it into `src/kit` with props instead of copying it.

## Transitions

Set on the incoming scene: `{ component, frames, enter: grow({ … }) }`.

| Transition | Use it when | Arguments |
| --- | --- | --- |
| `grow` | something in the outgoing scene becomes the next page: a logo tile, a card, a clicked chip, a window | the element's box on screen `{ x, y, width, height, radius }` and its fill `color` |
| `flood` | a punchline or a highlight bursts into the next chapter | the point it bursts from `{ x, y }`, `color` (default accent) |
| `push` | two scenes of the same kind follow each other | `'from-right'`, `'from-bottom'`, … |
| `crossfade` | nothing on screen can become the next scene | frames |

Take the box from a rendered still of the outgoing scene's last frames (after any camera move),
then check the middle of the transition as a still. The growing shape keeps the element's colour
and the next scene appears inside it only as it opens, so the handoff reads as one object.

## Portrait and square

Kit scenes are laid out for 1920×1080. For `portrait` (1080×1920), stack instead of placing side by
side: title on top, one card or window below at full width, type about 15% smaller. For `square`,
drop side-by-side layouts to one column. Read `useVideoConfig()` for the frame size in new scenes.
