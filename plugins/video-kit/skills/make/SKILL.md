---
name: make
description: Make a product video (launch film, feature teaser, social clip) for the product in the current repo, or for any product from its public website, rendered with Remotion. Use when someone asks for a launch video, promo, feature video, motion graphics, or a short clip about their product or a feature.
argument-hint: "[optional: what the video is for, length, format, tone]"
---

# Make a video

The request: $ARGUMENTS

The video is React components rendered frame by frame (Remotion), built from the kit in this
skill's template: `${CLAUDE_PLUGIN_ROOT}/skills/make/template` (inside the claude-plugins repo
itself, `plugins/video-kit/skills/make/template`). It should look like a careful motion designer made
it for this product: restrained, readable, specific, with one small joke per scene at most.
Everything in it must be true of the product as the code shows it today, or, in website mode, as
its website says.

## Who you're working with

Assume the person is not technical: someone from sales, marketing or management who wants a video
for their product. So:

- **You do every technical step yourself.** Never ask them to run a command, open a terminal, edit a
  file or install a package through the command line. If something needs their action (installing
  an app, giving a demo login), ask for exactly that, in one plain sentence.
- **Plain words.** No jargon in anything you say to them: not "Docker", "render", "frames",
  "props", "repo" or "commit" unless they used it first. Say "the video app", "making the video",
  "a moment in the video", "the project".
- **Short progress notes** at each step ("Reading how the product works…", "Making the video,
  about 3 minutes…"), and nothing else in between.
- **Show, don't describe.** Before the full video, show still images of key moments to approve.
- **Errors in plain words**: what happened, what you're doing about it, and what (if anything)
  they need to do.
- A developer may use it too; if they talk technically, match them.

## 0. Newer version? (a few seconds, then move on)

Compare the installed version with the latest published one:

```bash
grep '"version"' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"
curl -fsS --max-time 5 https://raw.githubusercontent.com/Dodera-Software/claude-plugins/main/plugins/video-kit/.claude-plugin/plugin.json | grep '"version"'
```

If the published one is newer, tell the person in one plain sentence and carry on with what's
installed: "A newer version of video-kit is available (X.Y.Z; what's new:
https://github.com/Dodera-Software/claude-plugins/releases/tag/video-kit-vX.Y.Z). To get it:
type /plugin, open Installed, choose video-kit and Update now. I'll continue with this version."
Say nothing if it's up to date, and skip it silently if the check fails (offline). Never block on it.

## 1. The brief

Ask with the multiple-choice question tool (AskUserQuestion) so the person clicks instead of types;
every question gets an "Other" for their own answer. If that tool isn't available, ask the same
questions in one short message.

**When the request describes the video** (`$ARGUMENTS` or the message says what it's for): use it,
and ask only what it leaves open, in a single round. Ask about the look and sound if they weren't
said, and use any scenes or ideas it describes as the plan.

**When it's just the command:** one round of four questions (Format allows more than one answer):

| Header | Question | Options (label: description) |
| --- | --- | --- |
| Video | What kind of video? | Launch film: 45–75 s, the whole product · Feature teaser: 15–30 s, one feature · Social clip: 10–20 s, one moment, loops |
| Format | Where will it be shown? (pick all that apply) | Website or YouTube: wide (16:9) · Reels, Shorts or TikTok: tall (9:16) · LinkedIn or X: square |
| Sound | Sound effects or silent? | Silent (recommended): no sound at all · Sound effects: soft clicks and pops on what happens (never music) |
| Your ideas | Anything you'd like to see in it? | Surprise me (recommended): I'll come up with the idea · I'll describe it: the scenes or the idea in your own words (they write it in "Other" or in the chat) |

**No code here** (the folder isn't a software project, or the person says they only have the
website): this is website mode (references/website.md), the same as `/video-kit:website`. Ask for
the website address in the first round if it wasn't given, and read the site before the second
round, as the quick look below. With code and a website both, use the code, and say in the
storyboard that the website could be the source instead.

Then a quick look at the product (navigation, pages, landing copy, design, README, recent changes:
minutes, not the full investigation) and one more round, with real options:

| Header | Question | Options |
| --- | --- | --- |
| Feature / Story | Which feature? (teaser, clip) or Which story? (launch film) | 3–4 of the product's actual features with a one-line description each, newest or most distinctive first; or 2–3 story angles from the product's own copy |
| Look | How should it look? | The four looks, the one that fits this product first, marked "(Recommended)": Calm and elegant: lots of space, light type, gentle motion · Bold: your brand colour fills the screen, big type, fast · Technical: dark, a subtle grid, code-style labels · Playful: soft shapes, bouncy motion, a light joke |
| Language | In which language? (multiple choice allowed) | English (default) · the other languages the product itself ships in (from its translation files) |
| Screens | How should the product appear? | Recreated from the code (recommended): nothing needs to run · Real screenshots of the running app: I start the product on this computer with example data; needs a demo login |

In website mode, Screens offers: Screenshots of your website (recommended) · Real screenshots of the
product, behind its login: needs a demo account · Simple animated scenes, no screenshots.

If they pick real screenshots, give them the notice in references/capture.md before going on.

When they describe scenes or an idea, that is the plan: build what they described, filling in only
what they left open, and say where you had to adapt it (a claim the product can't back, a scene
too long to read).

Don't ask for the rest; decide it and show it in the storyboard, where it's easy to correct: who
watches it (customers unless said otherwise), the call to action (the product's website), tone
(from the look: a light joke only in playful; confident and warm otherwise, never salesy, no hype
words). If they mention a video they'd like to
look like, see "A reference" in references/recipes.md.

## 2. Get ready (quietly)

Check what's needed before doing any work, so nobody finds out after 20 minutes:

- **A Mac, or Linux with Docker already running.** Making the video relies on macOS tools to open
  and close Docker Desktop and show the result. On Windows, say plainly that video-kit works on a
  Mac (or Linux) for now, and stop there.
- **Node.js 20 or newer** (`node --version`) and **Docker Desktop** (`docker --version`, or
  `/Applications/Docker.app` on a Mac; it doesn't need to be running). If one is missing, stop
  and say so in plain words with the download link (nodejs.org, the LTS version;
  docker.com/products/docker-desktop), that installing may need an administrator, and that you'll
  carry on as soon as it's installed. Everything up to the storyboard can go ahead meanwhile.
- **The studio:** videos live with the product, in a `video/` folder at the project root (another
  name if that's taken), whatever the video is about. If it isn't there, copy the template to it without `node_modules` and
  `out` (`rsync -a --exclude node_modules --exclude out "<template>/" video/`), run `npm install`
  in it, and keep it out of the project's own tooling: add `video/node_modules` and `video/out` to
  `.gitignore`, and exclude `video/` from the linter, type checker, tests and Docker build context
  where they would pick it up. Tell the person in one line that you added a `video` folder to the
  project, which a developer may want to glance at. Don't commit or push unless they ask.
- `video/src/videos/acme-teaser` and `video/src/brands/acme` are a made-up example; delete them once
  the product's own video exists. If `video/` exists already, add the new video next to the others.
- **An older studio:** if `video/` came from an earlier version (it lacks files the template has,
  like `src/kit/layout.ts` or `scripts/site.mjs`), bring it up to date first: copy from the template
  `src/kit/`, `scripts/`, `render.sh`, `Dockerfile`, `fonts.conf`, `package.json`,
  `package-lock.json`, `README.md` and `public/audio/`, never `src/videos/`, `src/brands/` or the
  rest of `public/`. Then `npm install` and `npx tsc --noEmit`; if an existing video no longer
  compiles, fix it to the new kit API. Say in one line that you updated the video tools.

## 3. Understand the product (the most important step)

A video is only as good as what you know about the product. Read the code until you could explain
it to a new hire. For a large project, send an Explore agent per area.

- **What it is and for whom:** README, docs, landing or marketing pages, translation files, store
  descriptions, the first screen a new user sees.
- **What it does today:** pages, navigation, API endpoints, integrations, feature flags, changelog
  and recent commits. For a feature video, read that feature end to end: what the user does, what
  they see, its limits.
- **How it looks:** design tokens (CSS variables, Tailwind config, theme files), fonts, radii,
  shadows, the logo and favicon SVGs, the real screens (page components, screenshots, Storybook).
- **Its world:** demo or seed data and fixtures give real-sounding names, projects and numbers.
- **For real screenshots:** how the project runs (references/capture.md, "Learn how this project
  runs").
- **In website mode** the site replaces all of the above: `./render.sh site <address> <slug> …`
  reads its look, logo, wording and screenshots (references/website.md). Claims come only from the
  site's own words.

Write `video/src/videos/<slug>/BRIEF.md`: the one-line promise, who it's for, the 3–5 things the
video shows with the file each claim comes from, the tokens, fonts and logo, the demo names, and,
for captures, how the app runs. A claim you can't point to in the code doesn't go in the video.
Create the brand if it doesn't exist: references/brand.md.

## 4. Storyboard, then stop for approval

Make this video its own (references/style.md, "Every video is its own"): your concept for it, the
look, the signature moment, a varied structure. Then show the plan the way a person reads it:

- **The idea**, one line ("The whole film happens inside Acme's terminal: every feature is a
  command"), and one different idea as the alternative, one line.
- **The look**, one line on which and why.
- One line per scene, in their words ("Opens on a team chat where nobody knows who's doing the
  invoice export; then…"), with its length in seconds and what it shows. Mark the signature moment.
- The few decisions you made for them (audience, website, sound).
- "Anything you'd like to change or add? Describe any scene and I'll build it."

Follow references/pacing.md. Wait for a yes or changes.

## 5. Build

- `video/src/videos/<slug>/`: `content.ts` holds every word; `index.tsx` calls
  `defineVideo({ id, brand, format, look, cover: { title }, sound, scenes })`; the product's own
  scenes, including the original scene for your idea, go in `scenes/` and `components/`. Register
  it in `video/src/videos/index.ts`.
- **Several shapes:** `inFormats(['landscape', 'square'], format => defineVideo({ …, format }))`
  makes one video per shape (`<Id>-landscape`, `<Id>-square`) from the same storyboard. Kit scenes
  lay themselves out for each shape (stacked in square and tall frames); your own scenes must too
  (references/product-scenes.md). Check stills of every shape.
- **Several languages:** `content.ts` exports the words per language, and `index.tsx` wraps the
  definition in `inLanguages(words, words => defineVideo(…))`, which makes one video per language
  (`<Id>-en`, `<Id>-ro`). Both together: `inLanguages(words, w => inFormats(formats, f => …))`
  makes every shape in every language (`<Id>-square-ro`). Kit scenes time themselves from each
  language's text. Write each
  language as a native speaker would, not word for word; the font needs `latin-ext` for accented
  letters (references/brand.md). One language: plain `defineVideo`, no suffix.
- The whole kit (references/scenes.md), chosen for this story and look, plus your own scenes where
  the idea needs them. Scenes that show the product: rebuilt from the code
  (references/product-scenes.md) or real screenshots (`CapturedScreen`, references/capture.md), as
  they chose. Your own scenes read `useLook()` and `useShape()` so they fit the look and every shape.
- The cover: every video opens on a composed frame (logo, name and `cover.title`, the video's
  promise in a few words), because Slack, LinkedIn, X, WhatsApp and Finder show a video's first
  frame as its preview.
- Transitions: every scene after the first says how it arrives, in the look's own set
  (references/style.md, "Looks"): growing out of something visible in the previous scene where it
  can, varied from scene to scene. Crossfade only when nothing else fits.
- Sound: silent unless they chose sound effects; then `sound: true` and quiet `<Sfx>` cues on things
  that happen (references/audio.md). Never music.
- In your own scenes every line stays up for `readingFrames(text)` from its first word.
- `npx tsc --noEmit` must pass.

## 6. Check it, then show it

`npm run timeline` prints where each scene starts. `./render.sh <VideoId> still <frame> …` renders
single images (the script starts the video app and closes it after). Look at each scene at its
fullest moment and the middle of every transition. Fix text that overlaps or wraps with one word
alone, headings over three lines, empty areas, anything cut at the edge, anything off-brand, any
claim not in the brief. "Too fast to read" is what viewers complain about; slow is fixable.

Then show the person 3–4 of those images (open them, or point to them), one line each on the moment
they show, and ask "Shall I make the full video?" Their notes now cost seconds; after the full
video, minutes.

## 7. Make the video and hand it over

`./render.sh <VideoId>` (once per video id: each language and shape) makes the full-resolution and
1080p videos, a poster and a thumbnail in the video's own shape, and checks every frame for
glitches; fix any it reports. Then:

- Open the video for them (`open out/<slug>-4k.mp4`; `xdg-open` on Linux) and reveal the folder
  (`open -R …`).
- Tell them in plain words: how long it is, which file is for what (wide: "the 4K one for the
  website and YouTube, the 1080p one for LinkedIn, Slack and email; the thumbnail is the picture
  YouTube asks for"; square and tall: "the 1080p one is what you upload"), and anything you
  assumed.
- Invite notes like a director gives them: "this part is too fast", "make the ending punchier".

## Never

- Invent features, customers, numbers, quotes or testimonials, or show logos of companies the
  product doesn't integrate with.
- Impersonate another product's UI beyond a simplified, recognisable mockup of an integration the
  product really has.
- Put real customer data on screen. Demo data only.
- Add audio the kit doesn't ship without a licence that allows it in the repo.
- Leave anything running: `render.sh` closes the video app if it opened it; stop anything else you
  started (the product's dev server, its containers).
