---
name: changelog
description: Make a short "what's new" video from the product's recent changes (commits, merged pull requests, changelog), for a release, a sprint or a monthly update. Use when someone asks for a changelog video, release video, update video or "what's new" clip.
argument-hint: "[optional: since when, e.g. v1.4.0, 2 weeks, last release] [--ci]"
---

# Make a "what's new" video

The request: $ARGUMENTS

A 15–30 second video of what changed in the product that its users will notice. Follow the `make`
skill for everything not said here: `${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md` (who you're
working with, getting ready, building, checking, handing over) and its references. Same kit, same
`video/` folder, same rules: plain words with the person, and nothing on screen that the code
doesn't show.

## 0. Newer version? (a few seconds, then move on; skip it with --ci)

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

## 1. Since when

If the request doesn't say, ask in one round (AskUserQuestion), together with the make skill's
Format and Sound questions (four questions at most per round); Look and Language come in a second
round with the changes to pick, as in the make skill:

| Header | Question | Options |
| --- | --- | --- |
| Since | Which changes? | Since the last release (name it and its date: `git describe --tags --abbrev=0`) · The last 2 weeks · The last month |

## 2. Find what changed, from the user's side

- **Sources:** `git log` for the range (subjects and bodies), merged pull requests
  (`gh pr list --state merged --search "merged:>=<date>"` when `gh` works, with their descriptions),
  `CHANGELOG.md` or release notes, migrations and new pages or routes.
- **Keep what a user would notice:** a new feature, a new screen or option, something clearly faster
  or simpler, an integration. Drop refactors, dependencies, tests, CI, internal fixes, anything
  behind a feature flag that's off.
- **Check each one in the code:** that it's merged, reachable in the product, and does what the
  commit says. Note its file, like any claim in the brief.
- **Rank** by how much users will care; 2–3 headliners, up to 4 smaller "also new" items.

Then ask (AskUserQuestion, multiple choice allowed) "Which changes should the video show?", with
the candidates in plain words (label: what it lets the user do; description: where they'll find
it). Recommend the headliners. Ask the make skill's Look and Language questions in the same round.

## 3. The shape

| Scene | What |
| --- | --- |
| Cover | "What's new in <Product>" with the version or month as `cover.title` |
| One per headliner, 5–8 s | The change shown the way it's best shown, a different way for each: the words beside the screen (`SplitScreen`), the old way against the new (`BeforeAfter`), a command (`Terminal`), a rebuilt flow; label NEW, the benefit as the title |
| Also new, if any | `PromiseList`, `WordSwap` or `Marquee` with the small items |
| End | `EndCard` with the product's site |

Headliners grow out of each other (`grow` from the element that changed, or the look's own transitions).
Video id `WhatsNew-<version or yyyy-mm-dd, dots as hyphens>`, e.g. `WhatsNew-v1-4-0`, so files are
named `whats-new-v1-4-0-…`. Storyboard, stills for approval, the offer of the editor before making
it, the full video and the hand-over follow the make skill.

## Unattended (`--ci`, or no one to ask)

When the arguments include `--ci` (the GitHub Action does), no one is there to answer:

- Don't ask anything, and don't offer the editor: make the video straight away. Range from the arguments: "up to <tag>" is from the release tag before it to
  that tag; "since <tag or time>" is from there to HEAD; otherwise from the latest release tag to
  HEAD. Wide format, silent, English, screens recreated from the code, and the look that fits the
  product (the same one as the last what's-new video, if there is one, so the series feels
  consistent).
- Pick the headliners and "also new" items yourself by the rules above; skip the stills approval.
- Set up `video/` if needed, build, check your own stills as usual, and make the video.
- Finish by writing `video/out/whats-new-<version>.md` (the same name the video files start with,
  e.g. `whats-new-v1-4-0.md`): the changes shown, one line each, with the
  file behind each claim, so a person can review it next to the video.
- Don't commit or push anything.

## The GitHub Action

`${CLAUDE_PLUGIN_ROOT}/skills/changelog/release-video.yml` makes this video on every published
release and attaches it to the release. To set it up for someone: copy it to
`.github/workflows/release-video.yml` in their project, and tell them in plain words that the
project needs an `ANTHROPIC_API_KEY` secret (GitHub → the project → Settings → Secrets and variables
→ Actions), which a developer or admin can add. Each run uses that key's credits. Until the secret
exists it skips quietly.
