# video

This product's videos, made with [video-kit](https://github.com/Dodera-Software/claude-plugins/tree/main/plugins/video-kit):
React components rendered frame by frame with Remotion. Ask Claude Code for a new one with
`/video-kit:make`, or edit these by hand.

```bash
npm install
./render.sh                          # list the videos
./render.sh <VideoId>                # → out/<video>-4k.mp4, -1080p.mp4, -poster.png, plus a glitch scan
./render.sh <VideoId> still 120 900  # single frames, to check a layout
./render.sh sheet reference.mp4      # contact sheets of a video you want to learn from
npm run timeline                     # where each scene starts
npm run studio                       # live preview with a timeline
```

Rendering runs in Docker (no browser on your machine); the script starts Docker if needed and
stops it afterwards.

- `src/kit/`: shared motion, components, scenes, transitions and sounds. Update it by copying a
  newer `template/src/kit` from the plugin.
- `src/brands/<x>/`: this product's tokens, font and logo.
- `src/videos/<x>/`: one video each: `BRIEF.md` (what it claims and where that comes from),
  `content.ts` (every word), `index.tsx` (scenes in order).

Remotion is free for individuals and companies of up to three people; larger companies need a
Remotion company licence to render.
