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
skills/make/references/*.md       details SKILL.md points to: scenes, product-scenes, style, pacing, audio, brand, recipes, capture, website
skills/make/template/             the studio copied into a product repo as video/
  src/kit/                        shared: motion helpers, brand context, components, scenes, transitions, sound cues, defineVideo
  src/brands/acme/                example brand (tokens, logo, Brand object)
  src/videos/acme-teaser/         example video built only from kit scenes
  render.sh                       every render goes through this (Docker)
  scripts/                        finish.mjs (previews, glitch scan), timeline.mjs, capture.mjs (real screenshots), sfx-peaks.py
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
- `references/scenes.md`, `product-scenes.md` and `audio.md` describe the kit's API. Change them in
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
- **Docker Desktop on macOS** can hang while starting, ignore "quit", and leave a half-built image
  with empty files if it's stopped mid-build. `render.sh` handles all three (timed `docker ps`
  checks via perl `alarm`, one restart, force-stop, and a rebuild when `package.json` in the image
  is empty). Keep those guards. Anything in the exit trap must not fail (`pkill … || true`): under
  `set -e` a `pkill` that finds nothing ends a successful render with exit code 1.
- **One render image per kit version.** Its tag hashes `package.json` and the `Dockerfile`, not the
  lockfile, which `npm install` rewrites (plus `fonts.conf`, which goes into it); `./render.sh clean`
  removes the rest.
- **Audio** must be redistributable (CC0) and listed in `public/audio/LICENSES.md`. No music: the
  skill asks "sound effects or silent?" and `defineVideo({ sound: false })` mutes every cue.
- **Remotion** needs a company licence for companies over three people; the READMEs say so.
