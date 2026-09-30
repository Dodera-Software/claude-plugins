# Dodera Software's Claude Code plugins

This repo is a Claude Code plugin marketplace laid out like Anthropic's own
(`anthropics/claude-plugins-official`): the catalog in `.claude-plugin/marketplace.json`, named
`dodera`, and each plugin in `plugins/<name>/`, listed with `"source": "./plugins/<name>"`.

## The marketplace

- Every plugin entry has `name`, `description`, `author`, `source`, `category` and `homepage` (the
  plugin's folder on GitHub). Users see the entry before installing.
- Adding a plugin: create `plugins/<name>/` with `.claude-plugin/plugin.json` (`name`, `version`,
  `description`, `author`, `license`), `README.md`, `LICENSE` and its `skills/`; add its entry;
  list it in the root README.
- `claude plugin validate .` (catalog) and `claude plugin validate plugins/<name>` (each plugin)
  must pass before pushing.
- Commits carry no Claude co-author line.

## video-kit

Makes product videos from a product's own codebase. Users run `/video-kit:make` (or
`/video-kit:changelog` for a what's-new video) in their repo; the skill asks what the video is,
copies a Remotion studio into `video/` there, studies the product, storyboards, shows stills,
builds and renders.

**Its users are often not technical** (sales, marketing). The skills do every technical step
themselves, speak in plain words, check Node and Docker up front, and show stills before the full
video. Keep that true in every change: nothing a user has to type into a terminal, no jargon in
what Claude says to them. Nothing in it is about any one product: the example brand and
video (`acme`) are made up, and real products' videos live in their own repos.

### Layout (inside `plugins/video-kit/`)

```
.claude-plugin/plugin.json        the plugin: name video-kit, version (bump it, see Releasing)
skills/make/SKILL.md              the workflow Claude follows: brief (questionnaire), readiness and setup, investigation, storyboard, build, stills, render
skills/website/SKILL.md           /video-kit:website: asks for the address, then the make workflow in website mode
skills/changelog/                 /video-kit:changelog (what's-new videos from recent changes) and release-video.yml, a GitHub Action template
skills/make/references/*.md       details SKILL.md points to: scenes, product-scenes, 3d, style, pacing, audio, brand, recipes, capture, website
skills/make/template/             the studio copied into a product repo as video/
  src/kit/                        shared: motion helpers, brand context, components, scenes, transitions, sound cues, defineVideo
  src/kit/three/                  depth: cameraAt, Space/Place (DOM in 3D), Stage3D/Logo3D (three.js)
  src/brands/acme/                example brand (tokens, logo, Brand object)
  src/videos/acme-teaser/         example video built only from kit scenes
  render.sh                       every render goes through this: hands the command to scripts/render.mjs
  scripts/                        render.mjs (Docker, on macOS, Windows and Linux), finish.mjs (previews, glitch scan),
                                  timeline.mjs, capture.mjs (screenshots and recordings), clip.mjs (people's own
                                  recordings), site.mjs, sfx-peaks.py
  fonts.conf                      makes Inter answer for system fonts in captures
  public/audio/sfx/               CC0 sounds (Kenney) + LICENSES.md
```

### Working on the kit

```bash
cd plugins/video-kit/skills/make/template && npm install
npx tsc --noEmit                         # must pass
npm run timeline                         # scene start frames
./render.sh AcmeTeaser-en still 170 380  # single frames, Docker
./render.sh AcmeTeaser-en                # full render + glitch scan
npm run studio                           # live preview
```

- `src/kit` changes through props, never one video's content. A pattern a second video needs moves
  into the kit with props; product-specific scenes stay in the product's repo.
- Every kit scene exports `<scene>Frames(props)`, which computes its length from its words with
  `readingFrames()`. Never hard-code a length that holds text.
- Kit code reads colours through `useBrand()`, never hex values (except third-party marks in
  `ToolIcon`).
- `references/scenes.md`, `product-scenes.md`, `3d.md` and `audio.md` describe the kit's API. Change them in
  the same commit as the code, or Claude will use the kit wrong in users' repos.
- Kit scenes follow the look (`useLook()`, `useBrand()` colours adapted by `lookColors`). After a
  kit change, look at stills of the changed scenes in all four looks and in wide, square and tall
  frames (a scratch video listing the scenes with `inFormats` per look is the quickest way), then
  render the example end to end.

### Testing the plugin as a user would

In any other repo, load this working copy for one session, without installing it:

```bash
claude --plugin-dir /path/to/claude-plugins/plugins/video-kit
```

Then `/video-kit:make …`. Check that the questions come first, that setup copies the template,
that the storyboard comes before any code, and that the render finishes.
`claude plugin validate plugins/video-kit` must pass.

### CI

`.github/workflows/video-kit.yml` runs on every push touching the plugin: both validators, the
kit's type check and a full render of the example (timing the first-time image build). It calls
no model, so it costs nothing. There are no `claude plugin eval` suites on purpose: each run spends
API credits.

### README media

`media/video-kit/` (outside the plugin, so installs don't download it) holds the README's GIF
previews; the full MP4s are assets on a GitHub release. GIFs from the 1080p render with Remotion's
bundled ffmpeg (it has no `fps` filter; use `-r`):
`npx remotion ffmpeg -i in.mp4 -r 15 -filter_complex "scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" out.gif`.

### Releasing

1. Bump `version` in `plugins/video-kit/.claude-plugin/plugin.json`. Installed copies are pinned to the version they
   got; without a bump, nobody receives the change.
2. `claude plugin validate .` and `claude plugin validate plugins/video-kit`. If the description
   changed, update the plugin's entry in `.claude-plugin/marketplace.json` too: users see that
   entry in `/plugin` before they install.
3. Commit and push to `main`.
4. Publish a GitHub release tagged `video-kit-v<version>`, with notes in plain words for
   non-technical users (what they can now do, what got better; no internals):
   `gh release create video-kit-v<version> --title "video-kit <version>" --notes-file …`.
   The skills' update notice links to it, and people watching the repo get it by email.
5. Users with auto-update on get it by themselves; everyone else sees the skills' "newer version"
   notice and updates with `/plugin` → Installed → Update now, or
   `claude plugin update video-kit@dodera`. Kit changes don't reach `video/` folders already copied
   into products; they re-copy `template/src/kit` to upgrade.

### Hard-won rules

- **Captures reach the host at `host.docker.internal`** (with `--add-host … host-gateway` for Linux);
  that reaches servers bound to 127.0.0.1 too. Only `VIDEO_*` environment variables pass into the
  container, for demo logins. The render image carries Inter as the answer for system fonts
  (`fonts.conf`), or apps using the system stack would capture in a fallback font. Keep camera views
  inside the screenshot; past its edge there's nothing to show.
- **Frame 0 is the preview.** Slack, LinkedIn, X, WhatsApp and Finder show a video's first frame;
  a video that fades in from an empty canvas looks like a blank upload. `defineVideo` prepends the
  `Cover` scene (logo, name, title), and the poster and thumbnail are taken from frame 0.
- **Readability beats pace.** The complaint on every early cut was "too fast to read". A line stays
  up `readingFrames(text)` from its first word (3.5 words/s + 0.8 s).
- **Scenes are transparent.** The canvas colour sits under the whole video. Anything that layers a
  scene over a colour (transitions) must give the scene layer `colors.canvas`, or the colour shows
  through for the rest of the scene.
- **Ease areas, not radii.** A circle's coverage grows with r², so an eased radius changes half the
  screen in two frames and reads as a flash (the glitch scan catches it). `flood` eases the area.
- **`grow` keeps the source element's colour** and shows the next scene only as it opens; otherwise
  it covers the element instantly and looks like a blank frame.
- **Take transition geometry from stills** of the outgoing scene's last frames, after any camera move.
- **Docker Desktop** can hang while starting, ignore "quit", and leave a half-built image with
  empty files if it's stopped mid-build. `scripts/render.mjs` handles all three (every `docker ps`
  check times out after 5 s, one restart, force-stop, and a rebuild when `package.json` in the image
  is empty). Keep those guards.
- **Never close Docker Desktop.** The script starts it when it isn't running and leaves it open;
  people use it for other things. Its own containers run with `--rm`, so nothing of the video's is
  left behind. The only quit is the restart of a Docker stuck while starting. The same when testing
  by hand: stop what you started (dev servers, containers), never Docker Desktop.
- **One script for every system.** `render.sh` only sets `MSYS_NO_PATHCONV` (Git Bash on Windows
  would otherwise rewrite arguments like `/pricing` into Windows paths) and runs
  `scripts/render.mjs`; everything else is Node, so it behaves the same on macOS, Windows and Linux.
  `.gitattributes` keeps LF endings, since a carriage return breaks `render.sh` in Git Bash, and the
  image name hashes files with line endings evened out.
- **Recordings are filmed frame by frame, and exactly.** `capture.mjs` opens the tab with
  begin-frame control (`--enable-begin-frame-control`, `Target.createTarget({ enableBeginFrameControl })`):
  Chrome draws only when asked. A pump asks every 16 ms while nothing is filmed; while filming, each
  frame moves the page's clock (`Emulation.setVirtualTimePolicy`) and the compositor's (the
  `frameTimeTicks` of `HeadlessExperimental.beginFrame`) on exactly 1/60 s, and the frame's
  screenshot comes back with it. Both clocks are needed: with only the page's, CSS transitions and
  animations run on real time and play several times too fast. Input (mouse, keys) is handled with
  the next frame, so it's sent, the frame drawn, then awaited (`act`); awaiting first deadlocks.
  The pump must be stopped before the browser closes, or the capture never exits.
- **3D at 4K is memory-hungry.** Every WebGL frame at `--scale=2` is 3840×2160 drawn in software,
  once per tab; a tab per core ran an 8 GB Docker out of memory ("Target closed") in a 3D-heavy
  scene. `render.mjs` retries a failed render pass once with `--concurrency=2`, and
  `VIDEO_CONCURRENCY` sets it from the start.
- **2× is a real 2× screen**, `--force-device-scale-factor=2` with `--window-size`, never puppeteer's
  emulated `deviceScaleFactor`: with emulation, Chrome's own hover checks (after a screenshot, a key
  press, a layout change) look at half the mouse's position, and hover styles blink on whatever is
  there (a sidebar item). Live filming (`"filming": "live"`, the screencast) stays as a fallback: 1×,
  30 fps, uneven.
- **The recorded pointer is drawn into the page**, so it's always in sync with hover states. Its
  press shrinks only the arrow, around its tip: scaling the element that carries its position pulls
  it toward the screen's corner for the length of the press.
- **Apps on localhost are reached as localhost.** `capture.mjs` passes localhost ports inside the
  container through to the computer (dev servers like Vite refuse the host name
  `host.docker.internal`), and `scripts/bridge.mjs`, started by `render.mjs` for the capture,
  passes 127.0.0.1 through to `::1` for servers that listen only on IPv6 (Vite on recent Node),
  which Docker can't reach.
- **One render image per kit version.** Its name hashes `package.json` and the `Dockerfile`, not the
  lockfile, which `npm install` rewrites (plus `fonts.conf`, which goes into it); `./render.sh clean`
  removes the rest.
- **3D is a function of the frame.** Camera, positions and rotations come from `useCurrentFrame()`
  (`cameraAt`); never R3F's `useFrame`, a clock or unseeded randomness, since frames render
  separately and out of order. `Stage3D` renders brand colours untoned (`flat`) with a low
  environment light: brighter reflections wash a dark brand colour out to pastel. WebGL runs in
  software in the render container with Remotion's default flags; nothing to configure.
- **Audio** must be redistributable (CC0) and listed in `public/audio/LICENSES.md`. No music: the
  skill asks "sound effects or silent?" and `defineVideo({ sound: false })` mutes every cue.
- **Remotion** needs a company licence for companies over three people; the READMEs say so.

## pr-podcast

Turns a pull request, commits, a release or a date range into a 3–5 minute two-host audio episode
(what changed, why, what's risky) with show notes. Its users are developers and their teams, so
it can talk code, but the same care applies: Claude does every step, one round of clickable
questions at most, progress in short notes. Everything is free: the voices run locally.

### Layout (inside `plugins/pr-podcast/`)

```
.claude-plugin/plugin.json, icon.svg   the plugin (bump version, see Releasing) and its directory icon
skills/make/SKILL.md                  the workflow: version check, voices in the background, quick look,
                                      brief, gather, understand, script, record, show notes
skills/standup|release|catchup/       the make workflow with the brief answered, and their own sources
skills/make/references/episode.md     script format, length budget, hosts, tones, a style in their words,
                                      structures per audience, writing for the ear
skills/make/references/risk.md        the risk checklist
skills/make/engine/                   record.mjs (installs the engine into ~/.cache/pr-podcast, keyed by
                                      package.json, then runs studio.mjs), studio.mjs (Kokoro voices →
                                      one MP3 + chapter times as JSON), example.json, package-lock.json
```

### Working on it

```bash
cd plugins/pr-podcast/skills/make/engine
node record.mjs --setup                          # install + voices, prints "ready"
node record.mjs example.json /tmp/ex.mp3         # the example episode, ~2 min
node record.mjs example.json /tmp/ex.mp3 --first 3
```

Test it as a user would with `claude --plugin-dir /path/to/claude-plugins/plugins/pr-podcast` in
another repo; a non-interactive run (`claude -p … "/pr-podcast:make <sha> as a news bulletin"`)
covers everything but the questions. CI (`.github/workflows/pr-podcast.yml`) validates and records
the example on macOS, Windows and Linux, calling no model. Releasing is as for video-kit, with the
tag `pr-podcast-v<version>`; the README's sample episodes are assets on the first release.

### Hard-won rules

- **Never `process.exit()` after the voices load.** onnxruntime aborts the process ("mutex lock
  failed"), turning a success into a crash. studio.mjs checks everything (voices, hosts, text)
  before loading the model and then runs to its end.
- **Node 20.11 or newer**: kokoro-js reads `import.meta.dirname`.
- **Kokoro is English only** (American and British voices; `af_heart`, `am_michael`, `bf_emma`,
  `bm_george`, `af_bella`, `am_fenrir` are the good ones). No free, light model does Romanian or
  other languages well enough; VoxCPM2 does, but it's a 5 GB download. Don't add languages at that
  cost without asking.
- **~160 words a minute** including pauses: the length budget in episode.md depends on it.
- **The voices follow punctuation**, not instructions: energy comes from the writing, per-line
  `speed` and `pause` beats. No laughter in scripts; it sounds wrong synthesised. No chimes or
  music: the owner removed them.
- **`gh search` covers all of GitHub**: every search in the skills carries `--repo`.
- **Line numbers in show notes come from the file** (`git show <sha>:<path> | grep -n`), never from
  counting a diff hunk.
- **Episodes stay out of git** through `.git/info/exclude`, never the project's `.gitignore`.
- **Style never bends the truth**: any format ("sports commentary") still says each risk plainly.
