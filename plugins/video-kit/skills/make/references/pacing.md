# Pacing

Everything runs at 60 fps. `seconds(2)` is 120 frames.

## The reading rule

A line stays on screen for at least `readingFrames(text)`, counted from its first word appearing:
3.5 words a second plus 0.8 s to notice it arrived. Kit scenes apply this themselves; in your own
scenes, compute a scene's `frames` from its words, don't guess.

The most common note on a first cut is "too fast", always where a headline or tagline left
before it could be read. Viewers forgive slow, never unreadable.

## Lengths

| Piece | Typical |
| --- | --- |
| Hook | within the first 3 s something relatable is on screen |
| A scene | 4–9 s; a product demo scene up to 12 s |
| Transition between scenes | 30–36 frames for flood, grow and push; 40 for a dip; 20 for a crossfade |
| End card | at least 5 s, so someone can read the address |
| Social clip | 10–20 s, 3–4 scenes |
| Feature teaser | 15–30 s, 4–6 scenes |
| Launch film | 45–75 s, 8–10 scenes |
| Film form | 30–60 s, 2–4 shots; the camera travels about 1.6 s between stops and rests while each line is read |

## Rhythm

- Stagger reveals: words 4–6 frames apart, list rows 30+ frames apart, cards 10–14 apart.
- Let one thing move at a time. When the camera pushes in, nothing else animates.
- Put the joke a moment later than feels natural (the chat pile-up waits 14 extra frames before
  its last message).
- Typing: 1.6 frames per character. Streaming answers: 1.4–1.8 frames per word.
- After the last word of a scene appears, hold at least 1 s before the transition starts.
