# Direction: every video invented for this product

Every video is designed from scratch for this product and this brief, the way a studio pitches a
film. The kit is plumbing, not a menu: `defineVideo`, transitions, `readingFrames`, brand and look,
captures, the voice. Its ready-made scenes (`ChatPileUp`, `WordSwap`, `Steps`, `PromiseList`, …)
are fallbacks for a beat the direction's own world can't show better. They are never the video's
backbone.

Why this matters: when the storyboard is filled from the list of kit scenes, every video comes out
as the same sequence: a chat piling up, a word swapping, three steps, a list, an end card. Each
frame is clean and the result is forgettable, because none of it came from the product, the person
or anything they showed you.

## What the video is made from

1. **The brief:** what they said and chose, in their words (the questionnaire, the interview).
2. **The investigation:** the product's own world: its screens, words, data, illustrations,
   the problem its users complain about, the moment only it can show.
3. **References they gave:** watch them properly (below). What they like in them is the strongest
   signal you have.
4. **Inspiration you found:** when they gave none, or asked for ideas, look at videos made by
   others (below) and bring back styles that would suit this product.
5. **The brand:** colours, type, logo, tone. It tints whatever world you choose; it doesn't choose
   it.

## Watching a reference

A link is not a video you've watched. Reading a page's words tells you nothing about its style.

```bash
node scripts/reference.mjs <link or file> --frames 16     # in video/: frames → a temporary folder
```

It finds the video on a page (a gallery entry, a portfolio, a launch page) or takes the file,
pulls frames spread over it, deletes the download straight away, and prints the frames' paths.
Look at all of them (the Read tool shows images). Write down what you see in VISION.md: the
medium (hand-drawn on graph paper, pixel art, cut paper, bold type, the product's own UI, 3D
clay…), the palette, the type (handwriting, pixel font, heavy sans), the characters and their
props, the story device (a hero levelling up, a boss fight, a journey on a map), the camera, the
pace, how scenes hand over, and the ending. Then ask yourself what exactly the person liked, using
what they ticked and wrote.

- YouTube, Vimeo, X, TikTok, Instagram, LinkedIn don't give out their files: only the preview
  picture comes out. Ask for a short screen recording or two or three screenshots of the parts
  they like (in the browser: "drop them on the Videos you like step").
- Everything it makes is temporary: older than a day, it goes on the next run, and
  `node scripts/reference.mjs clean` empties it once the direction is chosen. Delete the files
  people dropped in (`public/session/references/`) once the storyboard is approved.

## Finding inspiration

When they have no reference, ask for ideas, or the brief is thin, go and look before you invent:

- **A gallery of videos made with Claude:** https://skillry.dev/ai-videos/opus-5-5 (categories:
  Explainers, Motion graphics, 3D scenes, Games). `node scripts/reference.mjs list <page>` lists
  its entries with their words; pick 4–6 whose style could suit this product and audience (not
  the most popular ones, the most fitting ones), and study each with `--frames 6`. Each entry also
  shows the prompt its maker used, which tells you what they asked for.
- **The web** (WebSearch): "<product category> explainer video", award-winning motion design for
  the field, the product's own competitors' launch films (their style, never their content).
- **The product itself:** its illustrations, its empty states, its mascot, its changelog's
  humour. A direction that grows out of these is the most its own.

Take a style, a device or a rhythm, never another video's content, characters or brand. Keep the
link of anything you drew on in VISION.md.

## Directions: three different films

Before the storyboard, invent three directions that differ at a glance, not three variations on
one. Each has:

- **A world:** the medium and what's in it ("a pixel-art developer on graph paper fights the bugs
  of shipping without a plan"; "the whole film is one receipt printing, each feature a line
  item"; "the product's dashboard seen as a city at night, each feature a lit window").
- **A story device:** what carries the viewer from start to end (a hero's level-up, a before and
  after, a countdown, a single object travelling through every scene).
- **The signature moment** only this product could have, and **the ending**.
- **Type, palette and motion,** in a line, with the brand in it.
- **Pictures:** frames from the references or gallery videos it draws on, so the person sees it,
  not reads it.

At least one of the three is bolder than you'd dare by default. In the browser, send them with
`session.mjs ideas` (browser.md); in the chat, describe them and ask which with the multiple-choice
tool, showing their pictures. The one they pick, mixed with anything they add, is the direction.
Write it into VISION.md.

## Building a world from scratch

Write the scenes in the video's folder (`scenes/`, `components/`), as React drawing the world:
SVG for anything drawn, CSS for type and layout, three.js (references/3d.md) for depth. Everything
is a function of the frame (`useCurrentFrame()`), lines last their `readingFrames()`, colours come
from the brand. Some techniques that come up often:

- **Hand-drawn:** SVG paths with a seeded wobble (`random(seed)` from remotion, never
  `Math.random`), drawn on with `strokeDasharray`/`strokeDashoffset`, two slightly offset strokes
  for a marker feel, hatching for fills; paper as an SVG pattern grid with an `feTurbulence` grain.
- **Pixel art:** a sprite as rows of characters mapped to a palette, drawn as `<rect>`s with
  `shapeRendering="crispEdges"`; a few frames per expression or pose, switched on the beat.
- **Handwriting and game type:** `@remotion/google-fonts` (Caveat, Kalam, Patrick Hand for hands;
  Press Start 2P, Silkscreen, VT323 for game UI), loaded in the video's folder.
- **Characters:** a small set of poses and expressions, a squash on landing, a blink now and then;
  props (a helmet, a shield, a laptop) that arrive with the story.
- **Game devices** when the story is a journey: health, levels, inventory slots filling, a boss
  bar emptying, "level up". Only when the brief's tone allows play.
- **Camera:** pan and zoom over one large drawing instead of cutting between slides, when the
  world is continuous.

The cover follows the world too: `defineVideo({ cover: false })` and make the first scene a
composed frame at frame 0 (the product's name, the promise and the world's main character or
object, all visible at once). Apps show frame 0 as the preview, so it can never start empty or
fading in.

## Before the storyboard goes out: is it its own?

- Read the scene list aloud. If it sounds like any other product's video with the words swapped,
  or like the kit's scene list, start again.
- Compare with the videos already in `video/src/videos/`: a new one doesn't reuse their world.
- Every scene traces back to the brief, the investigation, a reference or the direction they
  picked.
- Would someone describe it to a colleague after one watch ("the one with the little guy fighting
  the bug boss")? If there's nothing to describe, it isn't there yet.

The quality bar (style.md) still holds on top: specific, readable, true to the product.
