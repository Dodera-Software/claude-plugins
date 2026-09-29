# Scenes and components

Everything below is exported from `src/kit` (`import { … } from '../../kit'`).

## Kit scenes

Each takes props and has a matching `…Frames(props)` that computes its length from its words.
Every one lays itself out for the frame (side by side in a wide video, stacked with type sized to
fit in a square or tall one) and follows the video's look (colours, type, motion). Use the whole
range: a video built from `TitleCard` and `PromiseList` alone is the generic video (style.md).

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
| `ScatterToLogo` | Scattered pieces (messages, tickets, docs) folding into the logo, name and tagline | `snippets: Snippet[]` (≤ 6), `line`, `aside`, `tagline`, `taglineAccent?` |
| `TitleCard` | A chapter on its own: label, claim, muted line | `eyebrow`, `title`, `aside?`, `sub?`, `accent?` |
| `WordSwap` | A fixed start and the word after it changing in place: a range in one breath ("We build / web apps. / websites. / AI agents.") | `lead`, `words: string[]` (2–5), `eyebrow?` |
| `BigNumber` | One number the product's own source states, counting up huge, and what it means | `value`, `prefix?`, `suffix?`, `decimals?`, `label`, `eyebrow?` |
| `SplitScreen` | Words on one side, the thing they're about on the other (stacked in square and tall) | `eyebrow`, `title`, `aside?`, `accent?`, and `image` (a screenshot, shown in a browser window; `viewport`, `url`) or `visual` (any element, like `<TerminalWindow>`), `side?` |
| `Steps` | How it works: a line drawing through 3–5 numbered stops | `eyebrow?`, `title?`, `steps: { title, text? }[]` |
| `ScreenMosaic` | Many screens on a tilted wall drifting slowly, a title over it: the breadth of a product | `shots: string[]` (3–6 screenshots under public/), `viewport?`, `eyebrow?`, `title?`, `accent?` |
| `Marquee` | Names streaming past in two rows: technologies, integrations, industries | `items: { name, icon? }[]` (6+; `icon` from simple-icons, `import { siReact } from 'simple-icons'`), `eyebrow?`, `title?` |
| `BeforeAfter` | The old way fading back, the new one landing beside it | `before` / `after`: `{ label, lines?: string[], image? }`, `eyebrow?` |
| `BigQuote` | One real quote, big, and who said it. Only quotes the product itself shows | `quote`, `name`, `role?`, `accent?` |
| `Terminal` | Commands typing themselves, output following: developer tools and CLIs | `lines: { command?, output?, tone?: 'ok' \| 'muted' \| 'error' \| 'accent' }[]`, `title?`, `caption?` |
| `PromiseList` | Claims building one under another | `items: { icon: LucideIcon, text }[]` (3–5, first is the headline). `promiseListLeadIcon(props, format, look)` gives the headline icon's box, for `grow` into the next scene |
| `EndCard` | Logo, name, tagline, "Works with" icons, the address | `tagline`, `taglineAccent?`, `worksWith?: ToolKind[]`, `cta?` |

## Kit components

| Component | What it does |
| --- | --- |
| `ChapterTitle` | Accent label + claim + muted aside + sub line, revealed in sequence |
| `Eyebrow` | The small accent label over a heading, in the look's label font |
| `RevealWords` / `revealEnd()` | Words arriving the look's way (drifting, snapping, typed, bouncing); `accent` words in the brand colour |
| `TerminalWindow` / `terminalSchedule()` | The typing terminal on its own, for `SplitScreen`'s `visual` or your own scenes |
| `BrandMark` | The logo as scenes should show it: on a white tile in the bold look, where the canvas is the brand colour |
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

Videos: `defineVideo({ id, brand, format, look, cover: { title }, sound, scenes })`, where `format` is
`'landscape'` (16:9, the default), `'square'` or `'portrait'` (9:16, tall); `look` is `'editorial'`
(default), `'bold'`, `'technical'` or `'playful'` (style.md); `sound` is off unless they chose sound
effects (`sound: true`);
`inLanguages(wordsByLanguage, words => defineVideo(…))` for one video per language (`<Id>-<lang>`),
`inFormats(formats, format => defineVideo(…))` for one per shape (`<Id>-<format>`); nest them for
every shape in every language (`<Id>-square-es`).

Layout: `useShape()` gives `{ shape: 'wide' | 'square' | 'tall', wide, width, height, pad }` for
your own scenes; `fitText(text, width, max)` is the largest size at which a line fits.
To stop a word ending up alone on the last line, join it to the one before with a non-breaking
space (`'18\u00A0months.'`); kit text breaks lines only at ordinary spaces. `accent` words match
with or without their punctuation.

Helpers: `progress(frame, start, duration, easing?)`, `mix(a, b, t)`, `seconds(n)`,
`readingFrames(text)`, `easeOut`, `easeInOut`, `useBrand()` (colours already adapted to the look),
`useLook()` (`type`, `motion`, `align`, `round`, `mono`), `inkOn(colour)` (white or dark text,
whichever reads on it).

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
| `wipe` | a hard edge sweeps the next scene in: graphic, bold and technical looks | `'from-left'`, `'from-top-right'`, … |
| `pushCut` | a punchy zoom cut with a brief flash: the next beat hits (bold, playful) | frames |
| `cut` | no transition, on the beat (technical, bold) | — |
| `crossfade` | nothing on screen can become the next scene | frames |

Take the box from a rendered still of the outgoing scene's last frames (after any camera move),
then check the middle of the transition as a still. The growing shape keeps the element's colour
and the next scene appears inside it only as it opens, so the handoff reads as one object.

## Square and tall

Kit scenes adapt on their own. Your own scenes must too: read `useShape()` and stack what sits side
by side in a wide frame (title above the product instead of beside it, one window instead of two),
keep the side margin `pad`, size headlines with `fitText` or smaller fixed sizes (about 72 px square,
84 px tall), and look at a still of every shape before rendering.
