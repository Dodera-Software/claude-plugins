---
name: make
description: Make a product video (launch film, feature teaser, social clip, changelog video) for the product in the current repo, rendered from code with Remotion. Use when someone asks for a launch video, promo, feature video, motion graphics, or a short clip about their product or a feature.
argument-hint: "[optional: what the video is for, length, format, tone]"
---

# Make a video

The request: $ARGUMENTS

The video is React components rendered frame by frame (Remotion), built from the kit in this skill's
template: `${CLAUDE_PLUGIN_ROOT}/skills/make/template` (when working inside the
claude-plugins repo itself, it's `plugins/video-kit/skills/make/template`). It should look like a careful motion designer made it for this product:
restrained, readable, specific, with one small joke per scene at most. Everything in it must be
true of the product as the code shows it today.

## 1. The brief

Settle what the video is before anything else. Ask with the multiple-choice question tool
(AskUserQuestion) so the person clicks instead of types; every question gets an "Other" for their
own answer. If that tool isn't available, ask the same questions in one short message.

**When the request describes the video** (`$ARGUMENTS` or the message says what it's for): use it,
and ask only what it leaves open, in a single round. Always ask about sound if it wasn't said.

**When it's just the command, with nothing else:** one round of four questions:

| Header | Question | Options (label: description) |
| --- | --- | --- |
| Video | What kind of video? | Launch film: 45–75 s, the whole product · Feature teaser: 15–30 s, one feature · Social clip: 10–20 s, one moment, loops |
| Format | Where will it play? | Landscape: 1920×1080, site and YouTube · Portrait: 1080×1920, Reels, Shorts, TikTok · Square: 1080×1080, LinkedIn and X |
| Tone | How should it feel? | Playful: a joke per scene · Confident and calm · Straight to the point |
| Sound | Sound effects or silent? | Sound effects: soft clicks, pops and whooshes on what happens · Silent: no audio (no music either way) |

Then a quick skim of the product (navigation, routes, landing copy, README, recent commits: minutes,
not the full investigation) and one follow-up question with real answers as options:

- **Feature teaser or social clip:** "Which feature?", offering 3–4 of the product's actual
  features, each with a one-line description of what it does, newest or most distinctive first.
- **Launch film:** "Which story?", offering 2–3 angles drawn from the product's own copy (the
  problem it removes, the moment it saves time, what makes it different), one line each.

Don't ask for the rest; decide it and show it in the storyboard, where it's easy to correct:

- **Who watches it:** customers, unless the request says investors or the team.
- **Call to action:** the product's domain.
- **Tone details:** confident and warm, never salesy, no hype words.
- **A reference**, if they mention one: once the studio is set up (step 2),
  `./render.sh sheet <file>` puts 2 frames a second of a video on contact sheets. Read them and note its beats, how each scene becomes the next, camera
  moves, colours and type. Borrow structure and rhythm, never another company's brand or content.
  references/recipes.md has structures for each kind of video.

## 2. Set up the studio in the product repo

Videos live with the product, in a `video/` folder at the repo root (use another name if `video/`
is taken). If it doesn't exist:

1. Copy the template (above) to `video/`, without `node_modules` and `out`:
   `rsync -a --exclude node_modules --exclude out "<template>/" video/`.
2. `cd video && npm install`.
3. Keep it out of the product's own tooling: add `video/node_modules` and `video/out` to
   `.gitignore`, and exclude `video/` from the product's linter, type checker, test runner and
   Docker build context if they would otherwise pick it up (check `eslint` config, root
   `tsconfig` includes, `.dockerignore`). Say in one line what you changed.

`video/src/videos/acme-teaser` and `video/src/brands/acme` are a made-up example: read them to see
how a video is put together, and delete them once the product's own video exists.

If `video/` exists already, reuse it: add the new video next to the others.

## 3. Investigate the product (the most important step)

A video is only as good as what you know about the product. Read the codebase until you could
explain it to a new hire, then write it down. For a large repo, send an Explore agent per area.

- **What it is and for whom:** README, docs, landing or marketing pages, i18n/copy files, app
  store or package descriptions, the first screen a new user sees.
- **What it does today:** routes and pages, navigation, API endpoints, background jobs,
  integrations, feature flags, changelog and recent commits. For a feature video, read that
  feature's code end to end: what the user does, what they see, its limits and edge cases.
- **How it looks:** design tokens (CSS variables, Tailwind config, theme files), fonts, radii,
  shadows, the logo and favicon SVGs, and the real screens (page components, screenshots,
  Storybook). The video rebuilds these screens, so note layouts and exact labels.
- **Its world:** demo or seed data, fixtures and test data give real-sounding names, projects and
  numbers. Prefer them to inventing.

Write `video/src/videos/<slug>/BRIEF.md`: the one-line promise, who it's for, the 3–5 things the
video will show with the file each claim comes from, the tokens, fonts and logo you'll use, the
demo names. If you can't point to code for a claim, it doesn't go in the video.

Then create the brand if it doesn't exist: references/brand.md.

## 4. Storyboard, then stop for approval

A table before any code: `# | scene (kit template or new) | words on screen | seconds | how it
becomes the next scene | sound`. Follow references/style.md and references/pacing.md. Show it with
the brief's key claims and wait for a yes or changes. A table is far cheaper to change than a render.

## 5. Build

- `video/src/videos/<slug>/`: `content.ts` holds every word; `index.tsx` calls
  `defineVideo({ id, brand, format, cover: { title }, scenes })`; the product's own scenes and UI mockups go in
  `scenes/` and `components/`. Register it in `video/src/videos/index.ts`.
- Kit scenes and components first (references/scenes.md). Scenes that show the product follow the
  patterns in references/product-scenes.md: its real screens rebuilt in React from the brand's
  tokens, never a screenshot, so they stay sharp at 4K and can move.
- The cover: every video opens on a composed frame (logo, name and `cover.title`, the video's
  promise in a few words), because Slack, LinkedIn, X, WhatsApp and Finder show a video's first
  frame as its preview; a blank first frame looks like a broken upload. The first scene bursts out
  of it. Turn it off only if the first scene is fully composed at its own frame 0.
- Transitions: every scene after the first says how it arrives (`enter: grow(…)`, `flood(…)`,
  `push(…)`), growing out of something visible in the previous scene. Crossfade only when nothing
  can.
- Sound: if they chose sound effects, quiet `<Sfx>` cues on things that happen (references/audio.md);
  if they chose silent, `defineVideo({ sound: false })` and skip the cues in new scenes. No music:
  if the person wants a track, they add one they have the rights to in their editor.
- Kit scenes compute their own length from their words; in your own scenes every line stays up for
  `readingFrames(text)` from its first word.
- `npx tsc --noEmit` must pass.

## 6. Check your own work

`npm run timeline` prints where each scene starts. `./render.sh <VideoId> still <frame> …` renders
single frames (in Docker; the script starts and stops it). Render each scene at its fullest moment
and the middle of every transition, and look at every image. Fix: text that overlaps or wraps with
one word alone, a heading over three lines, empty areas inside cards, anything cut at the frame
edge, anything off-brand, any claim not in the brief. Slow is fixable; "too fast to read" is the
complaint viewers actually make.

## 7. Render and hand over

`./render.sh <VideoId>` writes `out/<slug>-4k.mp4`, `out/<slug>-1080p.mp4`, a 4K poster and a
1280×720 `thumbnail.jpg` (both the cover), embeds the cover in the MP4s as cover art, then scans
every frame for single-frame pops. Look at every pop it lists (a `still` of that frame and its
neighbours) and fix the cause. Open the 4K file for the person, and tell them its length, where the
files are, and anything you assumed. For YouTube, the thumbnail file is the one to upload as the
custom thumbnail. If they render often, `./render.sh clean` removes old render images.

## Never

- Invent features, customers, numbers, quotes or testimonials, or show logos of companies the
  product doesn't integrate with.
- Impersonate another product's UI beyond a simplified, recognisable mockup of an integration the
  product really has.
- Add audio the kit doesn't ship without a licence that allows it in the repo.
- Leave Docker running: `render.sh` stops what it started; if you start it yourself, stop it.
