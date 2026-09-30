# Voiceover

A narrator reading a line per scene, recorded on the person's computer with Kokoro, open voices
(Apache 2.0, fine for commercial videos). No account, no key, nothing sent anywhere: the engine
installs once (about a minute) and downloads the voices once (about 90 MB, shared with
pr-podcast when it's installed). It runs with Node, not in the video app, so it works the same on
Mac, Windows and Linux.

**English only.** The voices are American and British English. For a video in another language,
say so plainly and offer: English narration over the translated captions, no voice, or the person
recording the lines themselves (`render.sh clip` takes any audio or video file they give; build
the timing from its length the same way).

## Writing the narration

The voice adds to the words on screen; it doesn't read them out. Captions stay (most social
video plays muted), and the narrator says the thing around them: the problem, the feeling, the
turn.

- One line per scene, one or two short sentences, written to be said: contractions, plain words,
  no lists, no brackets. About 2.5 words a second: a 6-second scene takes 12–15 words.
- The first line lands in the first 3 seconds and names the problem or the promise. The last line
  says the product's name and what to do ("Try it at steelit dot net").
- Numbers, names and addresses as they're said: "twenty-four seven", "steelit dot net". A word the
  voice would say wrong gets a `say` with its spelling as heard ("steel it" for steelit); `text`
  stays as it's written, for the captions and the brief.
- Match the look: calm and warm for editorial, brisk for bold, dry and precise for technical,
  bright for playful. `speed` 0.95 for calm, 1.05–1.1 for energetic; never beyond 0.9–1.15 for a
  whole video.
- Everything it says must be true of the product, like everything on screen.

Show the lines in the storyboard, one under each scene, so the person reads them before anything
is recorded.

## Choosing the voice

| Voice | Sounds |
| --- | --- |
| `af_heart` | warm, clear, American (the safe default) |
| `af_bella`, `af_nicole` | brighter; softer and closer |
| `am_michael` | calm, friendly, American |
| `am_fenrir`, `am_puck` | deeper; lively |
| `bf_emma`, `bm_george` | British, poised; British, measured |

Let the person hear before choosing: `./render.sh voice-sample "<the first line>" af_heart
am_michael bf_emma` writes one file per voice to `out/voice-samples/`. Open them for the person
(`./render.sh show out/voice-samples/af_heart.wav` opens each) and ask which one, with a
recommendation for the look. One voice per video.

## Recording

`src/videos/<slug>/voice.json`:

```json
{
  "voice": "af_heart",
  "speed": 1,
  "lines": [
    { "id": "hook", "text": "Your team asks the same questions every week." },
    { "id": "close", "text": "Try steelit today.", "say": "Try steel it today." }
  ]
}
```

`./render.sh voice <slug>` records every line into `public/voice/<slug>/` and writes
`public/voice/<slug>/voice.json`: each line's file and exact length. A few seconds a line on a
laptop. Change a line: edit it and record again; every length updates.

## Putting it in the video

```tsx
import voiceover from '../../../public/voice/launch/voice.json'

defineVideo({
  …,
  voiceover,
  scenes: [
    { component: Hook, frames: hookFrames(words.hook), voice: 'hook' },
    { component: Close, frames: endCardFrames(words.end), voice: { line: 'close', at: 40 } }
  ]
})
```

A scene with `voice` plays its line once it has arrived (after its entrance), or `at` frames in,
and lasts at least until the line is said plus a breath: the voice sets the pace, and scenes grow
to fit it. Put `at` where the line should land with the picture (the logo arriving, a number
counting up). The voice is the only sound: no effects, no music.

Check it by ear, not only by stills: render the video and listen for a line cut off by a
transition, two lines too close, or a line that says something before the picture shows it.
