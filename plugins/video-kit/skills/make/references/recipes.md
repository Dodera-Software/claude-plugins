# Recipes

## A reference

If they mention a video they'd like theirs to feel like, ask them to put the file in the project
(or give its path). `./render.sh sheet <file>` puts 2 frames a second on contact sheets in `out/`.
Read them and note its beats, how each scene becomes the next, camera moves, colours and type.
Borrow structure and rhythm, never another company's brand or content.

Starting structures for the usual requests. Each says what to find out, what each beat is for and
a few ways to fill it, and what goes wrong. They are skeletons, not videos: your idea for the
product decides the scenes (style.md, "Every video is its own"), and no two videos should fill the
beats the same way.

## Launch film (45–75 s, landscape)

**Find out:** the product's one-line promise, the problem its users complain about in their own
words, 3–4 features that exist today, the demo data, where to send people.

**Direction:** a hook, then the product, then proof, then trust, carried by your idea.

| Time | Beat | Ways to fill it |
| --- | --- | --- |
| 0–5 s | Hook | the problem as a `ChatPileUp`; a striking number from its own source (`BigNumber`); the range it covers (`WordSwap`); its CLI running (`Terminal`); your signature moment |
| 5–12 s | What it is | pieces folding into the logo (`ScatterToLogo`); the promise beside the product (`SplitScreen`); the promise alone (`TitleCard`) |
| 12–40 s | 3–4 things it does, one per scene | real flows in the rebuilt UI or captured screens; `Steps` for a process; `ScreenMosaic` for breadth; your own scenes |
| 40–55 s | Why it's different | `BeforeAfter`; a real quote (`BigQuote`); what it works with (`Marquee`) |
| 55–70 s | Close | `PromiseList`, `WordSwap` or one last `BigNumber`, then `EndCard` |

**Gotchas:** product scenes need 5–9 s each or the text can't be read; the logo must land before
10 s or viewers don't know what they're watching; take `grow` boxes from stills taken after camera
moves.

## Feature teaser (15–30 s, landscape or portrait)

**Find out:** the feature, the question or task it answers, where it lives (in the app, in Slack,
in an assistant), 2–3 true claims about it, read from its code including its limits.

**Direction:** one feature, one flow, no tour. Open on the benefit, show it working once, close.

| Time | Beat | Ways to fill it |
| --- | --- | --- |
| 0–5 s | The benefit | `TitleCard` (NEW IN PRODUCT); `WordSwap` of what it handles; `BeforeAfter` of the old way |
| 5–15 s | It working, once | the rebuilt UI or captured screens beside the words (`SplitScreen`) or full frame; `Terminal` for a CLI |
| 15–21 s | What to know | `PromiseList` or `Steps`, 3 items; a `BigNumber` it really states |
| 21–26 s | `EndCard` | — |

**Gotchas:** claims come from the feature's code, limits included ("encrypted end to end" only
if the code does exactly that).

## UI motion loop (8–15 s, square, for social)

**Find out:** 6–10 states one of the product's elements goes through (button → loader → check →
toast, a card moving across a board, a filter narrowing a list).

**Direction:** one shape, never cut. The same element changes size, radius and colour; its content
swaps inside with its own short enter and exit. A cursor drives every change with real clicks.
There's nothing to read, so something happens every half second. The last frame equals the first,
so it loops.

**Build:** one new scene in the video's folder; `spring()` for every settle, and a value that
changes target several times is the sum of one spring per change so it stays a pure function of
the frame; a sound cue on each change.

**Gotchas:** text that swaps inside a morphing container needs its own timing or it overlaps;
match the cursor's position and speed at the last and first frame or the loop stutters.
