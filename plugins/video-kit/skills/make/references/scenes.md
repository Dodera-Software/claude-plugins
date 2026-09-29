# Scenes and components

Everything below is exported from `src/kit` (`import { … } from '../../kit'`).

## Kit scenes

Each takes props and has a matching `…Frames(props)` that computes its length from its words.
Every one lays itself out for the frame: side by side in a wide video, stacked with type sized to
fit in a square or tall one.

```tsx
const hook: ChatPileUpProps = { messages, punchline: ['Sound', 'familiar?'] }
scenes: [{ component: () => <ChatPileUp {...hook} />, frames: chatPileUpFrames(hook) }]
```

Every video starts with `Cover` automatically (`defineVideo({ cover: { title } })`): logo, name and a
title line, fully visible at frame 0 because apps use the first frame as the video's preview. It
holds ¾ s, then the first scene enters (by default a flood from the centre). `npm run timeline`
lists it as `cover`.

| Scene | Use it for | Props |
| --- | --- | --- |
| `ChatPileUp` | The hook: a team chat piling up with the problem, then a big line naming it | `messages: { person, text }[]` (4–5, last one is the joke), `punchline: string[]` |
| `ScatterToLogo` | Scattered knowledge folding into the logo, name and tagline | `snippets: Snippet[]` (≤ 6), `line`, `aside`, `tagline`, `taglineAccent?` |
| `TitleCard` | A chapter on its own, or the opening of a feature teaser | `eyebrow`, `title`, `aside?`, `sub?`, `accent?` |
| `PromiseList` | Closing claims building one under another | `items: { icon: LucideIcon, text }[]` (3–5, first is the headline). `promiseListLeadIcon(props, format)` gives the headline icon's box, for `grow` into the next scene |
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
| `CapturedScreen` | Real screenshots (`render.sh capture`) in a browser window: `shots` that switch at frames, `camera` keyframes (zoom toward a point, one move at a time, view kept inside the screenshot), a `cursor` that clicks; see capture.md |
| `BrowserFrame` | A quiet browser window (dots and address) around anything |
| `ToolIcon` | Google Meet, Slack, GitHub, Jira, file, Claude |
| `Sfx` | A sound cue at a frame (see audio.md) |

Videos: `defineVideo({ id, brand, format, cover: { title }, sound, scenes })`, where `format` is
`'landscape'` (16:9, the default), `'square'` or `'portrait'` (9:16, tall);
`inLanguages(wordsByLanguage, words => defineVideo(…))` for one video per language (`<Id>-<lang>`),
`inFormats(formats, format => defineVideo(…))` for one per shape (`<Id>-<format>`); nest them for
every shape in every language (`<Id>-square-es`).

Layout: `useShape()` gives `{ shape: 'wide' | 'square' | 'tall', wide, width, height, pad }` for
your own scenes; `fitText(text, width, max)` is the largest size at which a line fits.

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

## Square and tall

Kit scenes adapt on their own. Your own scenes must too: read `useShape()` and stack what sits side
by side in a wide frame (title above the product instead of beside it, one window instead of two),
keep the side margin `pad`, size headlines with `fitText` or smaller fixed sizes (about 72 px square,
84 px tall), and look at a still of every shape before rendering.
