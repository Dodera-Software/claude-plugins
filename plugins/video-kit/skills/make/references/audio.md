# Audio

The kit ships sound effects only, all CC0 (public domain): Kenney's "Interface Sounds". No music,
so there's nothing to license. If someone wants a music bed, they add a track they have the rights
to in their editor after the render.

Ask whether they want sound effects at all. `defineVideo({ sound: false })` renders a silent video:
every `<Sfx>` in it, including the kit scenes' own, stays quiet, so switching back is one word.

## Sound effects

`<Sfx cue="pop" at={frame} volume={0.3} />` inside a scene; `at` is the frame the sound should
peak on (each cue is shifted by its measured peak, so it hits exactly). Cues are named by what
happens on screen:

| Cue | When |
| --- | --- |
| `pop`, `popAlt` | a message, card or window appears (alternate them in a series) |
| `punch` | the joke lands |
| `whoosh` | things fly together |
| `chime` | the logo arrives |
| `success` | a task completes, a checkbox ticks |
| `tick`, `tickAlt` | a row lands in a list |
| `click` | a cursor click |
| `key` | a key press (every ~7 frames while typing, very quiet) |
| `send` | a message is sent |
| `sparkle` | a highlight draws |
| `toggle`, `drop` | switches; cards drifting in (very quiet) |

Levels: 0.12 for background and repeated cues, up to 0.4 for a single important moment. Effects
season the video; if everything makes a sound, nothing does. Kit scenes already place their own.

## Adding a sound

Only CC0 or similar (redistribution allowed): Kenney's other packs (kenney.nl) are CC0. Put the
file in `public/audio/sfx/`, list it in `public/audio/LICENSES.md`, decode it to WAV in the render
image (`ffmpeg -i x.ogg -ac 1 -ar 22050 x.wav`), run `python3 scripts/sfx-peaks.py x.wav` and add
it to `CUES` in `src/kit/audio/cues.ts` with that peak. Mixkit, Pixabay and similar are free to use
in a video but forbid redistributing the files, so they can't live in the repo.
