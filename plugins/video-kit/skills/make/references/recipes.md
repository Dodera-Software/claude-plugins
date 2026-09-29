# Recipes

## A reference

If they mention a video they'd like theirs to feel like, ask them to put the file in the project
(or give its path). `./render.sh sheet <file>` puts 2 frames a second on contact sheets in `out/`.
Read them and note its beats, how each scene becomes the next, camera moves, colours and type.
Borrow structure and rhythm, never another company's brand or content.

Starting structures for the usual requests. Each says what to find out, how it should look, what
happens when, and what goes wrong. Adapt one in the storyboard; don't follow it blindly.

## Launch film (45–75 s, landscape)

**Find out:** the product's one-line promise, the problem its users complain about in their own
words, 3–4 features that exist today, the demo data, where to send people.

**Direction:** the problem, then the product, then proof, then trust. Restraint, the brand's
canvas, one accent. Every scene grows out of the previous one.

| Time | Scene | Becomes the next by |
| --- | --- | --- |
| 0–4 s | `ChatPileUp`: the problem as a team chat, a punchline | flood from the punchline |
| 4–12 s | `ScatterToLogo`: the answer is scattered across tools; it folds into the logo and tagline | the logo tile grows into the page |
| 12–40 s | 3–4 product scenes, one idea each: `ChapterTitle` plus a real flow in the rebuilt UI | a card, a clicked element or a highlight grows or floods into the next |
| 40–60 s | what makes it different, shown side by side | push |
| 60–70 s | `PromiseList`, then `EndCard` | the first promise's icon grows into the end card |

**Gotchas:** product scenes need 5–9 s each or the text can't be read; the logo must land before
10 s or viewers don't know what they're watching; take `grow` boxes from stills taken after camera
moves.

## Feature teaser (15–30 s, landscape or portrait)

**Find out:** the feature, the question or task it answers, where it lives (in the app, in Slack,
in an assistant), 2–3 true claims about it, read from its code including its limits.

**Direction:** one feature, one flow, no tour. Open on the benefit, show it working once, close.

| Time | Scene | Becomes the next by |
| --- | --- | --- |
| 0–5 s | `TitleCard`: NEW IN PRODUCT, the benefit, a muted joke | push |
| 5–15 s | the feature working: `ChapterTitle` left, the UI right | the window grows into the list |
| 15–21 s | `PromiseList`, 3 items | the first icon grows into the end card |
| 21–26 s | `EndCard` | — |

**Gotchas:** claims come from the feature's code, limits included ("never says more than the
channel may see" only if the code enforces exactly that).

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
