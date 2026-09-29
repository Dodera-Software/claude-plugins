# Scenes that show the product

The strongest scenes show the product working, rebuilt in React from its real screens and tokens.
They are specific to one product, so they live in the video's folder (`scenes/`, `components/`).
These patterns are proven; adapt them.

## The whole app, full frame

Rebuild the app shell (sidebar, header, main sheet) at a real viewport, 1440×810, and scale it to
fill the frame, so every size matches the product's CSS 1:1:

```tsx
<div style={{ width: 1440, height: 810, transform: `scale(${1920 / 1440})`, transformOrigin: '0 0' }}>
  <Sidebar active="Chat" /> <main>…</main>
</div>
```

Copy labels, icons (the same icon set the product uses, e.g. `lucide-react`) and spacing from the
page components. Show a realistic state from the demo data, never lorem ipsum.

## Doing something in it

- **Typing:** slice the text by frame, 1.6 frames per character, with a blinking caret; a `key` cue
  every 7 frames.
- **Sending:** the button presses (scale 0.88 for 8 frames), the empty state lifts away, the
  composer moves to its resting place, the user's message appears.
- **An answer or result streaming in:** `StreamText`, 1.4–1.8 frames per word; citations or badges
  pop in as they're reached.
- **A click:** `Cursor` glides to the target (`moveStart`, `moveDuration`) and presses at `clickAt`;
  the target shows its hover state just before; a `click` cue.
- **One camera move:** wrap the frame in a div and scale toward the point that matters, eased, once
  per scene: `transform: scale(mix(1, 1.4, push))` with `transformOrigin` at that point. The next
  scene can `grow` out of the element the camera ended on (take its box from a still).

## Something filling up live

Sources or inputs on one side, a panel on the other, filling row by row as items arrive: each new
row lands on top and pushes the others down (`top = sum of later rows' progress × row height`),
flashes a tint that fades, and gets a `tick`. A status pill says what's happening ("Reading 5 new
items…") and settles into a result ("Added 2 decisions and a to-do"). Dots travelling along curves
from the sources show where it comes from; keep them small and few.

## A page with a claim beside it

`ChapterTitle` on the left (about 640 px wide), the product's card on the right floating on the
canvas (`shadow.floating`, radius 24–28), its rows arriving in a stagger, one small interaction near
the end (a checkbox ticked, a counter counting up).

## A document with the key line

A card with the document's lines (a transcript, a spec, a ticket), the rest dimming while one
line is highlighted with `Marker`, a `Citation` or badge appearing at its end.

## Side by side

Two or three windows or columns playing the same moment differently: before and after, three
people's views, the product in two places it works (a Slack thread with `SlackThread`, an
assistant with a connector). Stagger their starts so the eye can follow one at a time, and give
each at least its own reading time.
