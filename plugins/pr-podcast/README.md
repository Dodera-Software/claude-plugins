# pr-podcast

Turns a pull request, today's commits, a release or a date range into a 3–5 minute audio episode
with two hosts: what changed, why, and what's risky. Reviewers listen before opening the diff,
teams play it at standup, users hear what's new in a release, and anyone back from time off
catches up on what concerns them. Free: the voices run on your computer.

**Listen:**
[a pull request briefing](https://github.com/Dodera-Software/claude-plugins/releases/download/pr-podcast-v1.0.0/pr-podcast-briefing.mp3)
(video-kit 0.9.0, lively, 3½ min) ·
[the same, as a sports commentary](https://github.com/Dodera-Software/claude-plugins/releases/download/pr-podcast-v1.0.0/pr-podcast-sports-commentary.mp3)
(1¾ min) ·
[a release episode](https://github.com/Dodera-Software/claude-plugins/releases/download/pr-podcast-v1.0.0/pr-podcast-release.mp3)
(what's new in video-kit 0.8.0, for its users, 2½ min)

## What you can ask for

```
/pr-podcast:make                  asks what to cover, who it's for, how long, which tone
/pr-podcast:make 412              pull request 412
/pr-podcast:make since monday     everything merged since Monday
/pr-podcast:standup               what landed since the last standup, no questions
/pr-podcast:release               what's new in a release, for the people who use it
/pr-podcast:release v2.4.0        that version (or "unreleased" for what's coming)
/pr-podcast:catchup               back from time off: your pull requests, changes around your
                                  code, what's waiting on you
```

**Any style, in a few words**, after any of them: `/pr-podcast:make 412 like a sports commentary`,
`/pr-podcast:standup as a news bulletin`, `/pr-podcast:release like a movie trailer`,
`/pr-podcast:catchup gentle, I just got back`, "short and serious", "for my non-technical boss".
Whatever the style, what's said stays true to the changes, and every risk is still said plainly.

Claude reads the changes (the diff, the commits, the pull request's description, review threads
and linked issues), writes a two-host script, and records it. The hosts are lively by default:
enthusiastic, a few laughs, and what each change means in the real world; or "straight", just
the facts. You get `podcasts/<date>-<what>.mp3` in the project and show notes beside it: chapters
with timestamps, the files and lines each part refers to, and the risks as a checklist. The
`podcasts/` folder is kept out of git (locally, in `.git/info/exclude`), so episodes never land in
a commit.

## Install

In Claude Code:

```
/plugin install pr-podcast --marketplace Dodera-Software/claude-plugins
```

Confirm adding the marketplace, then choose **Install for you** to have it in every project, in the
terminal, VS Code and the desktop app. On Claude Code older than v2.1.275, run
`/plugin marketplace add Dodera-Software/claude-plugins` first, then `/plugin install pr-podcast@dodera`.

**Stay up to date:** turn on automatic updates once: type `/plugin`, open **Marketplaces**, choose
**dodera**, then **Enable auto-update**. Without it, the plugin mentions a newer version when you
use it, and you update from `/plugin` → Installed → pr-podcast → Update now. What's new in each
version: [releases](https://github.com/Dodera-Software/claude-plugins/releases).

**Where it works:** Claude Code (the terminal, the IDE extensions and the desktop app's Code tab),
on macOS, Windows and Linux, because recording runs on your computer. In the claude.ai chat, the
mobile app and Cowork it can write the script but not record it.

**You'll need** git, and [Node.js](https://nodejs.org) 20 or newer (the LTS version). No Python,
ffmpeg or Docker. The [GitHub CLI](https://cli.github.com) (`gh`, signed in) is optional: it adds
the pull request's description, reviews and discussion, releases, and what's waiting on you. On
GitLab, Bitbucket or without `gh`, episodes come from git alone.

**Your first episode takes a minute longer.** The first time on a computer, Claude installs the
voice engine and downloads the voices (about 150 MB, into `~/.cache/pr-podcast`), in the
background while it reads the changes. After that it records offline: a 4-minute episode in about
a minute and a half.

## If something goes wrong

Claude explains problems in plain words as they happen. The common ones:

| What you see | What to do |
| --- | --- |
| "Node.js 20 or newer is needed" | Install the LTS version from [nodejs.org](https://nodejs.org), then ask Claude to try again. |
| "Loading the voices failed" | The first episode needs an internet connection to download the voices. Connect and try again. |
| It can't find the pull request, or has no description or reviews | Sign in to GitHub once in a terminal with `gh auth login`, or give Claude the PR's link. |
| A word or name sounds wrong | Tell Claude which one; it spells it the way it sounds and records again. |
| Too long, too fast, too silly | Say so ("make it 2 minutes", "slower", "straight, no jokes"); Claude rewrites and records again. |
| No update shows up in `/plugin` | Type `/plugin marketplace update dodera`, then update pr-podcast from `/plugin` → Installed. |

Something else? [Open an issue](https://github.com/Dodera-Software/claude-plugins/issues) with what
you asked for and what Claude said.

## What leaves your computer

Nothing new. Claude reads the changes the way it reads any code in your session. The recording
happens locally; the audio and script aren't uploaded anywhere. The first run downloads the engine
from npm and the voices from Hugging Face. Posting the show notes on a pull request, or attaching
an episode to a GitHub release, happens only if you say yes when asked.

## Removing it

Type `/plugin uninstall pr-podcast@dodera`, then delete the `~/.cache/pr-podcast` folder (the voice
engine, about 150 MB). Your episodes stay in each project's `podcasts/` folder until you delete it.

## For developers

- **Voices:** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), 82 million parameters, through
  [kokoro-js](https://www.npmjs.com/package/kokoro-js) on the CPU (onnxruntime), English only, 24
  kHz. MP3 at 64 kbps mono via [lamejs](https://www.npmjs.com/package/@breezystack/lamejs).
- **The script** is JSON (`skills/make/engine/example.json`): hosts with voices, chapters, lines,
  and optional per-line `speed` and `pause` beats. Record one by hand with
  `node skills/make/engine/record.mjs episode.json out.mp3` (`--first 4` for a quick sample).
- **The engine** installs itself into `~/.cache/pr-podcast` (`PR_PODCAST_HOME` to move it), keyed by
  its `package.json`, so an update reinstalls it and older copies are removed.
- **Try it without installing:** clone `Dodera-Software/claude-plugins` and start Claude Code in your
  project with `claude --plugin-dir /path/to/claude-plugins/plugins/pr-podcast`.

## Licences

- This plugin: MIT.
- Kokoro's model and voices: Apache 2.0. kokoro-js and onnxruntime: Apache 2.0 / MIT. lamejs:
  LGPL-3.0. All installed from npm and Hugging Face on first use, not bundled.
