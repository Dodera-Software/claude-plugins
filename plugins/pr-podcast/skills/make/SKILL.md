---
name: make
description: Turn a pull request, today's commits, a date range or a branch into a 3–5 minute two-voice audio briefing (what changed, why, and what's risky), recorded offline for free. Use when someone asks for a PR podcast, an audio briefing or summary of a PR or of recent commits, something to listen to before reviewing, or an episode for standup.
argument-hint: "[optional: a PR number or link, \"today\", \"since monday\", a branch; and how it should be, e.g. \"like a sports commentary\"]"
---

# Make an episode

The request: $ARGUMENTS

An episode is two hosts talking through a set of changes for 3–5 minutes: what changed, why, and
what's risky, so a reviewer knows where to look before opening the diff, or a team hears what
landed at standup. You read the changes and write the script; the engine in
`${CLAUDE_PLUGIN_ROOT}/skills/make/engine` records it on this computer with open voices (Kokoro,
Apache 2.0) into an MP3. Nothing is paid for and nothing leaves the computer except what you
already read through git and `gh`.

**Everything said must be true of the changes.** Every claim comes from the diff, the commit
messages, the PR and its discussion, or the code around it. When the why isn't written anywhere,
the hosts say so ("the PR doesn't say why") instead of guessing. A risk names the exact place and
the exact way it goes wrong, or it isn't in the episode.

## Who you're working with

Mostly developers and their teams; sometimes a product manager or lead who wants the gist. So:

- **You do every step yourself**: fetching, reading, writing, recording. Never ask them to run a
  command. If something needs them (signing in to GitHub, a PR number you can't find), ask for
  exactly that in one sentence.
- **Short progress notes** at each step ("Reading pull request 412, 38 files…", "Recording, about
  a minute…"), and nothing else in between.
- Match how they talk. With a product manager, no jargon.

## 0. Newer version? (a few seconds, then move on)

```bash
grep '"version"' "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"
curl -fsS --max-time 5 https://raw.githubusercontent.com/Dodera-Software/claude-plugins/main/plugins/pr-podcast/.claude-plugin/plugin.json | grep '"version"'
```

If the published one is newer, say so in one sentence and carry on: "A newer version of pr-podcast
is available (X.Y.Z; what's new:
https://github.com/Dodera-Software/claude-plugins/releases/tag/pr-podcast-vX.Y.Z). To get it: type
/plugin, open Installed, choose pr-podcast and Update now. I'll continue with this version." Say
nothing if it's up to date, and skip it silently if the check fails. Never block on it.

## 1. Start the voices, then a quick look

**First**, start installing the voice engine in the background (`run_in_background`), so it's
ready by the time the script is. The first time it downloads about 150 MB (the engine and the
voices, into `~/.cache/pr-podcast`); after that it takes seconds and works offline:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/make/engine/record.mjs" --setup
```

If you can't run commands here (the claude.ai chat, the mobile app, Cowork), say so in one
sentence: recording needs Claude Code on their computer (the terminal, an IDE, or the desktop
app's Code tab). You can still write the script and show notes from what you can read; don't
pretend to record.

It needs Node.js 20 or newer. If `node --version` fails or is older, tell them in one sentence
that the recording needs Node.js (https://nodejs.org, the LTS button) and that you'll write the
script meanwhile; carry on, and record once it's there.

**Then a quick look** (seconds, not the investigation), so the questions offer real choices:

```bash
git rev-parse --show-toplevel && git remote -v | head -2
git fetch --quiet --prune 2>/dev/null   # teammates' work; skip silently offline
git branch --show-current
git log --since=midnight --no-merges --format='%h %an %s' --all | head -30
gh pr view --json number,title,author,additions,deletions,changedFiles 2>/dev/null   # this branch's PR
gh pr list --limit 5 --json number,title,author,additions,deletions 2>/dev/null
```

Not a git project: say so and stop. No `gh` or not signed in: fine; a PR can still come from git
alone (step 3). Mention once, plainly, that `gh auth login` would add the PR's description and
discussion.

## 2. The brief

Ask with the multiple-choice question tool (AskUserQuestion); each question gets an "Other" for
their own answer. If the tool isn't there, ask the same in one short message.

**When `$ARGUMENTS` already says what to cover** (a PR number or link, "today", "since Monday", a
branch name), don't ask about the scope; ask only what's left open, in one round, or nothing at all
if the request says enough (then state the defaults you used in one line). The defaults: about 3
minutes (the 430–500 word budget), the lively tone, the reviewers audience for a PR and the standup
one for a date range, Maya and Leo.

**A style in their words** ("412, like a sports commentary", "today's commits, short and
serious"): that's the tone; don't ask about it, and follow "Their own style" in
`references/episode.md`. It can also settle the length, audience and voices.

**Otherwise, one round of four questions**, with options from the quick look:

| Header | Question | Options (label: description) |
| --- | --- | --- |
| Changes | What should the episode cover? | This branch's PR, if it has one: "#412 Retry card payments (+640 −120, 38 files)" · Other open PRs from the list, up to two, same form · Today's commits: "14 commits by 4 people, since midnight" · A date range: they write it in "Other" ("since Monday", "Sep 1 to Sep 15") |
| For | Who's listening? | Reviewers before they open the diff: where to start, what's risky, what to check · The team at standup: what landed, who did it, heads-ups · Someone outside the code: a lead or product manager, more why, less code |
| Length | How long? | About 3 minutes (Recommended) · About 5 minutes: more detail on each risk · Fit it to the changes: 2 minutes for a small PR, 5 for a big one |
| Tone | How should it feel? | Lively and practical (Recommended): two enthusiastic hosts, a few laughs, what each change means in the real world · Straight: calm and brisk, just the facts · Your own style: a few words in "Other", like "a sports commentary" or "short and serious" |

Voices aren't asked: Maya and Leo (American) unless they say otherwise. After the episode,
offer the other pairs (Emma and George, British; Bella and Ray, American, warmer).

Put the most likely scope first: the branch's own PR if there is one, today's commits otherwise.
If the branch has unpushed or unmerged work and no PR, offer "This branch against main" too.
For a release or a personal catch-up, `/pr-podcast:release` and `/pr-podcast:catchup` do it
better; if that's what they're after, follow those skills instead.
Picking Changes → a date range with nothing in "Other": ask for the dates in one sentence.

## 3. Gather the changes

Pick the source by scope. Read the whole diff, not only the file list; skip lockfiles, generated
code, snapshots, vendored folders and minified files (say in the notes that you skipped them).

**A pull request** (with `gh`):

```bash
gh pr view <n> --json number,title,url,author,body,baseRefName,headRefName,additions,deletions,changedFiles,labels,commits,files,reviews,comments,closingIssuesReferences
gh pr diff <n>
gh api repos/{owner}/{repo}/pulls/<n>/comments --paginate --jq '.[] | {path, line, user: .user.login, body}'   # review comments on lines
gh pr checks <n> 2>/dev/null   # is CI green?
```

Also read the linked issues (`gh issue view <n>`) for the why. Without `gh`, on GitHub:
`git fetch origin pull/<n>/head:pr-podcast/<n>` and diff it against the base
(`git diff origin/main...pr-podcast/<n>`); tell them the description and discussion are missing.
Delete that local branch at the end.

**Today's commits / a date range**: the default branch, plus anything merged into it:

```bash
git log origin/<default> --since='<from>' --until='<to>' --no-merges --format='%h|%an|%ad|%s%n%b' --date=short
git log origin/<default> --since='<from>' --until='<to>' --merges --format='%h %s'   # merged PRs
git diff <oldest>^..<newest> --stat && git diff <oldest>^..<newest>
gh pr list --state merged --search "merged:>=<from>" --json number,title,author,body,mergedAt 2>/dev/null
```

The default branch: `git symbolic-ref --short refs/remotes/origin/HEAD` (or `gh repo view --json
defaultBranchRef`). "Today" is since local midnight; for standup on a Monday, since Friday morning
(say so). For standup, also list open PRs updated in the range, for "in progress".

**A branch**: `git log <default>..<branch>` and `git diff <default>...<branch>`, plus uncommitted
work if it's the current branch and they asked for "what I'm working on".

**Big changes** (over ~3,000 changed lines or ~60 files): group the files by area first (folders,
features), read each area's diff, and use subagents (Explore) for areas you can't hold at once,
asking each for what changed, why, and anything risky, with file and line. Never summarise from
file names alone.

## 4. Understand it

Before writing a word of script, write yourself a working brief (not shown unless asked):

- **The one-sentence version**: what's different for the product or the codebase after this.
- **Why**: the problem, in the author's words where they gave them (PR body, issue, commits).
- **What changed**, by area, in reading order: where a reviewer should start and why.
- **What's risky**, ranked: read `references/risk.md` and go through its checklist against the
  diff. Each risk: file and line, what goes wrong, when, how sure you are (it will break / worth
  a look). Open the surrounding code when the diff alone can't tell you. Two or three real risks
  beat eight vague ones; "nothing stands out" is a fine finding, said plainly.
- **Tests**: what's covered, and the case that matters that isn't.
- **What's already been said**: review comments and open threads, so the hosts don't raise as new
  what's already being discussed (they can say "Sam already asked about this in the review").
- For standup and catch-up: who did what (first names from the commits), what's still open.

## 5. Write the script

Read `references/episode.md` for the structure per audience, the tone, the length budget and how
to write for the ear, and follow it. In the lively tone the listener should enjoy it and learn from
it: every change gets its real-world "so what", and the humour comes from the material. It is
still true to the diff, word for word. The script is `podcasts/<date>-<scope>.json` in the project (e.g.
`podcasts/2026-09-30-pr-412.json`, `podcasts/2026-09-30-today.json`). Before writing there, add
`podcasts/` to `.git/info/exclude` (not `.gitignore`: it's local and changes nothing in the
project) unless it's already ignored, so episodes never end up in a commit.

Then check it against the working brief: every claim true, every risk from the brief in it (or
dropped for a reason), the word count inside the budget. Fix, then record; don't show the script
first unless they asked to see it, since changing and re-recording afterwards is cheap.

## 6. Record

When the background setup has printed `ready` (if it failed, show its message in plain words; the
usual cause is no internet on the first run):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/make/engine/record.mjs" podcasts/<name>.json podcasts/<name>.mp3
```

It takes roughly a third of the episode's length (a 4-minute episode, about 80 seconds) and prints
one line of JSON at the end: the file, the duration and each chapter's start. If it says the script
needs fixing, fix those lines and run it again. If the duration is off the budget by more than 20%,
shorten or lengthen the script and record again.

Then write the show notes, `podcasts/<name>.md`: the title, the scope (PR link, or the date range
and commit count), the chapters with their timestamps from the JSON, and under each chapter what
it covered with the files and lines it refers to, as links when the project is on GitHub
(`https://github.com/<owner>/<repo>/blob/<sha>/<path>#L<line>`). Take line numbers from the file
at that commit (`git show <sha>:<path> | grep -n …`), never by counting from a diff hunk. The
risks go in as a checklist.

## 7. Hand it over

In a few lines: where the episode is (`podcasts/<name>.mp3`, clickable), how long it is, the
chapters with times, and the risks it calls out in one line each. Then offer, in one line, what
fits: play it now (`open` on macOS, `start ""` on Windows, `xdg-open` on Linux); post the show notes as a
comment on the PR (only if they say yes: it's visible to everyone on the PR); make a shorter or
longer cut; different voices. For changes, edit the script and record again.

The MP3 can't be attached to a PR from here (GitHub only takes uploads through its website); they
can drag it into the PR comment box, a Slack thread or a standup call.

## Details

- **Voices**: Kokoro's American (`af_*`, `am_*`) and British (`bf_*`, `bm_*`) voices, English only.
  The pairs offered: `af_heart` + `am_michael`, `bf_emma` + `bm_george`, `af_bella` +
  `am_fenrir`. Other voices are lower quality; use them only when asked. The host names follow the
  voice (Maya/Leo, Emma/George, Bella/Ray) unless they choose names.
- **Speed**: `"speed"` in the script, 0.8 to 1.3; 1 is right for most. For standup, 1.05 is fine.
- **A quick sample**: `--first 4` records only the first four lines (a few seconds), handy to
  let someone hear the voices before a long episode.
- The engine lives in `~/.cache/pr-podcast` (`PR_PODCAST_HOME` to move it); deleting that folder is
  safe, it reinstalls next time.
