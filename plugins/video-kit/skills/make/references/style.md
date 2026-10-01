# Style

The reference is a careful motion designer who makes each film for this product alone: content
first, restraint, one idea at a time, and nothing that could be pasted into another company's video.

## Every video is its own

A video that looks like the last one we made is a failure, even if every frame is clean. The
whole method for inventing one (watching references, finding inspiration, pitching three
directions, building a world from scratch) is in direction.md; this section is the short version.

- **Your own idea first.** Before picking scenes, invent the video's concept: one creative
  through-line for this product that a motion designer would pitch. For example, a single card from
  the product travels through the whole film and becomes each scene; everything happens inside its
  terminal; the logo's shape keeps reappearing as the frame for each idea; the video is told as the
  product's own changelog, notification feed or search box; the numbers on its site build the
  layout. It comes from what you learned about the product, not from this list. Open the
  storyboard with it in one line. The scenes are written for it in the video's folder; the kit's
  ready-made scenes are fallbacks, one or two at most.
- **A signature moment.** Every video has one scene only this product could have, built from its
  own visual world: its CLI typing a real command (`Terminal`), its actual board with a card
  moving across it, its illustration style animated, its chart drawing its real shape, its logo's
  geometry turning into the layout. Find it while reading the product (code, site, screenshots) and
  name it in the storyboard.
- **The look fits the product** (below), chosen in the brief. Two videos for two products should
  differ at a glance: colour of the canvas, weight of the type, how things move.
- **Vary the structure.** No fixed opener or closer: not a chat piling up, not a title card, not a
  list of promises at the end by habit. Never the same kind of scene twice in a row.
- **Vary the handoffs.** Not every scene enters with the same transition. Each look has its own
  (below); inside that, plan each handoff in the storyboard from what's on screen.
- **Follow what they describe.** When the person describes a scene ("the logo builds itself from
  the grid", "show three customers' dashboards side by side"), make that scene as described.
  Their idea beats a recipe, and a reference they love beats the kit.
- **Recipes are starting points** (recipes.md). Change the order, swap scenes, cut beats; never
  reproduce one as is twice.

## Two forms

A video is told one of two ways. Choose the form with the idea, name it in the storyboard, and
offer the other as the alternative when it would suit the product too.

- **Chapters** (the default): scene after scene, each one idea with its own words and layout, joined
  by transitions. Clear and quick to follow: features, how it works, what's new, social clips.
- **Film**: one continuous shot through the product's world, like a film's opening sequence. The
  camera travels (through the product's screens with `Flythrough`, around its logo with
  `LogoReveal`, through your own 3D scene), and the words ride on the picture as `Caption`s instead
  of getting scenes of their own. No title cards, no eyebrows, no lists; few words, each line
  short. Between shots, `cut`, a `grow` from what the camera ended on, or a `dip` to the canvas;
  never a slide or a crossfade. Suits launch films, brand films, premium products, and anyone who
  asks for something cinematic, 3D, or "not like a presentation". 3d.md has the tools.

A film still opens on the cover, makes clear within 10 s what the product is, and ends on
`EndCard` (or `LogoReveal`, then `EndCard`).

## Looks

The looks are the kit's four finishes for product-style videos. A direction with its own world
(hand-drawn, pixel art, cut paper, a game) sets its own type, palette and motion in its scenes;
pick the look nearest to it for the kit's parts (transitions, the end) or skip them.

`defineVideo({ look })` sets the colours, type, motion and background of the whole video over the
brand. Kit scenes follow it; your own scenes read it with `useLook()` (product-scenes.md).

| Look | Feels | Pick it for | Transitions that suit | Scenes that shine |
| --- | --- | --- | --- | --- |
| `editorial` | calm, spacious, light type, words drift into focus | premium, B2B, finance, health, calm brands | `grow`, `zoom`, `dip` | `SplitScreen`, `BigQuote`, `ScreenMosaic`, `Steps`, `Flythrough` |
| `bold` | the brand colour fills the frame, heavy type, fast | launches, announcements, confident consumer brands | `wipe`, `pushCut`, `cut` | `WordSwap`, `BigNumber`, `TitleCard`, `BeforeAfter`, `LogoReveal` |
| `technical` | dark, faint grid, monospaced labels, text snaps in | developer tools, APIs, infrastructure, data | `zoom`, `push`, `cut` | `Terminal`, `Steps`, `Marquee`, `SplitScreen` |
| `playful` | tinted canvas, soft drifting shapes, bouncy, centred | consumer apps, education, community, fun brands | `grow`, `zoom`, `flood` | `WordSwap`, `ChatPileUp`, `BigNumber`, `Marquee` |

When they leave it to you, choose from the product itself: its site's feel, its audience, its own
design. Say which look and why in one line of the storyboard.

## Story

- Open on something specific to this product: a problem its users have lived, its signature
  moment, a striking number from its own site, or its promise in huge type. Not always the same
  opener.
- Make clear within 10 s what the product is: the name plus a one-line tagline that says what it
  does, not what it "empowers".
- Show, don't claim: a real flow, screen or command beats a bullet point. Claims go late, short.
- One idea per scene. The muted second line lands the joke or the detail.
- Humour is dry and specific, one per scene at most, and only when the look and the brief allow
  it (playful yes, editorial rarely).

## Type and layout

- The look sets weights, spacing and alignment. Headlines at most ~10 words and 2 lines; a third
  line means shorten the copy. Nothing under 15 px at 1080p.
- Frame 0 is the thumbnail: it's the cover (logo, name, promise), never an empty canvas.
- Vary the composition from scene to scene: text beside a visual, text over a wall of screens,
  a number alone, a full-frame window, a list, a centred quote.
- One camera move per scene, never in and out back to back. Let one thing move at a time.

## Restraint with effects

The polish tools make a video look expensive only when they're rare. Each one where it earns its
place, and some scenes simply calm:

- **Auto-zoom** (capture.md) on the moments a viewer must read or notice: typing, a small button.
  Two or three moves in a recording, none on a whole-page change.
- **Depth of field** where one thing is the subject and others pass by (the fly-through, a card in
  a crowd). Never on a flat scene full of text.
- **Motion blur** only on fast camera moves and fast objects: a whip between screens, a falling
  hammer. Never on a slow drift or on text.
- **Highlights** (capture.md) on the one thing each moment is about: the field filled, the button
  pressed. With auto-zoom on the same spot, one outline at a time, never on every click.
- **Transitions** ease in and out, and most are `grow`, `zoom` or `dip`; a hard `cut` only on a
  beat. A video that changes scenes smoothly feels edited; one that snaps feels generated.
- **Device frames:** one kind per video. A laptop for launch and brand films, the browser window
  for feature demos and tutorials (the address helps), a phone for mobile products.
- **3D moments:** one or two in a chapters video, the backbone of a film; never 3D for its own sake.

At most one "wow" per scene, and never two scenes in a row that shout.

## The quality bar: never AI slop

The first videos a company puts out decide whether people remember it as careful or as cheap AI
output. Before showing stills, go through this and fix what fails:

- **Specific:** every scene could only be this product: its real screens, names, numbers and
  words. A generic dashboard with generic charts is slop.
- **Human words:** say concrete things ("Log a week's hours in one sentence"), in the product's
  own voice. No "unlock", "supercharge", "seamless", "elevate", "empower", "revolutionize", "in
  today's fast-paced world", no three adjectives in a row, no questions nobody asks.
- **Believable data:** plausible names and numbers, no lorem ipsum, no row of zeros or empty
  states unless the point is the empty state.
- **Type:** the product's own font (brand.md); titles at least 48 px and details 24 px at 1080p;
  captions under about 45 characters a line; no word alone on a last line.
- **Motion with intent:** every move leads the eye to what matters next. If something moves only
  because it can, stop it.
- **Pace:** one idea per scene, every line held its reading time, room to breathe.
- **One voice:** one look, one device style, one narrator, one tone, start to finish.
- **The ending** says what to do next, held long enough to act on (at least 4 s).
- **The test:** would the product's own designer be proud to post this? If not, it isn't done.

## Never

Purple or blue gradients, glassmorphism, glows, sparkle or AI icons, emoji, lens flares, 3D that
spins or floats for its own sake (the camera moves, objects rest), stock photos, fake metrics,
"revolutionary", "supercharge", "unlock", "seamless".
