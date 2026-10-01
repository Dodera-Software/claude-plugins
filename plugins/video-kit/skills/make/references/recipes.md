# Recipes

## A reference

A link or a file they like: watch it with `node scripts/reference.mjs <link or file>`
(direction.md, "Watching a reference"). Note its world, beats, how each scene becomes the next,
camera moves, colours and type. Borrow style and rhythm, never another company's brand or content.

Starting structures for the usual requests: the beats a video of that kind needs, and the time
each gets. The "ways to fill it" are examples of kit scenes for a plain product video; a video with
its own world fills every beat from that world (direction.md). Each says what to find out, what each beat is for and
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

## Film (30–60 s, landscape; square or tall work too)

**Find out:** the 3–5 places in the product a user passes through on their way to the result, in
order (the inbox, the task, the reminder, the report); the one line each deserves; the logo as an
SVG.

**Direction:** one journey, told by the camera, not by headings (style.md, "Two forms"). The
viewer travels through the product the way a user's work does; words stay few and low on the
picture.

| Time | Beat | Ways to fill it |
| --- | --- | --- |
| 0–4 s | The world | the cover, then the camera opening wide on everything ahead (`Flythrough` does this on its own) |
| 4–40 s | The journey | `Flythrough` through the product's screens, rebuilt or captured, one line per stop; or your own `Space` or `Stage3D` scene built from the product's shapes |
| 40–48 s | The object | `LogoReveal`, the camera landing on the logo |
| 48–55 s | Close | `EndCard` |

**Gotchas:** a line per stop, not a paragraph, or the camera waits too long; cut or grow between
shots, never slide; check the stops in every shape, since the camera frames each screen for it.

## Feature demo (10–25 s, landscape or square)

The short "here's how it works" clip teams post for every feature: one real flow in the real app,
edited like a pro screen recording.

**Find out:** the feature, the two or three steps that show it (type this, click that, see the
result), the one sentence of what it's for, a demo account with data that makes the result look
good.

**Direction:** no tour, no intro. A line of what it does, the flow itself, the result held.

| Time | Beat | Ways to fill it |
| --- | --- | --- |
| 0–2 s | What it does | the cover's title, or a `Caption` over the first frame of the recording |
| 2–18 s | The flow | one recording (capture.md) in a browser window or laptop, `camera={autoZoom(film, { at })}`: in on the typing, out for the result; a `Caption` per step if it helps |
| 18–25 s | The result, then where | hold on the result; `EndCard` or the product's name and address |

**Gotchas:** film the moment only (3–10 s) and trim slow loads with `from` and `rate`; the demo
data must make the result impressive (a filter that finds four rows, not zero); two zoom moves
are plenty.

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
the frame.

**Gotchas:** text that swaps inside a morphing container needs its own timing or it overlaps;
match the cursor's position and speed at the last and first frame or the loop stutters.
