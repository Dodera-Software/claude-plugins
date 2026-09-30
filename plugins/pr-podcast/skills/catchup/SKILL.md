---
name: catchup
description: Make a personal 3–5 minute two-voice audio episode of everything that concerns you since you were last active (your pull requests' reviews and merges, changes around the code you work on, what's waiting on you), recorded offline for free. Use when someone is back from time off, switching back to a project, or asks "what did I miss", "catch me up" or for a catch-up episode.
argument-hint: "[optional: since when, e.g. \"two weeks\"; and how it should be, e.g. \"gentle, I just got back\"]"
---

# A catch-up episode

The request: $ARGUMENTS

This is the `make` workflow (`${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md`): read that file and follow
it (the version check, starting the voices, recording, handing over), with this brief and these
sources instead. The episode talks to one person, by first name, about what matters to them: the
catch-up structure in `references/episode.md`.

## Who, and since when

**Who**: `git config user.name` and `user.email`, and with `gh`, `gh api user --jq .login`. Their
commits may use more than one email: take the addresses from their recent commits
(`git log --author="<name>" --format='%ae' | sort -u`).

**Since when**: `$ARGUMENTS` if it says ("since the 12th", "two weeks"). Otherwise, since they were
last active: their latest commit on any branch (`git log --all --author=<them> -1 --format=%ad`)
or, with `gh`, their latest pull request, review or comment, whichever is later. If that's today
or yesterday, they probably weren't away: ask with the question tool (Since when? · The last 3
days · The last week (Recommended) · The last 2 weeks · The last month). Say the range in the
first line of the episode.

`git fetch --quiet --prune` first (skipped silently offline), so the episode sees their team's work.

## Sources

**Their own pull requests** (with `gh`). Every search is limited to this project with `--repo`
(`gh repo view --json nameWithOwner --jq .nameWithOwner`); without it, `gh search` covers all of
GitHub and would bring in their other projects:

```bash
gh search prs --repo <owner/repo> --author=@me --updated=">=<from>" --json number,title,state,url,repository --limit 30
gh pr view <n> --json title,state,mergedAt,reviewDecision,reviews,comments,statusCheckRollup
```

For each: merged, approved, changes requested, new comments since they were away (and whether
they need a reply), CI failing.

**Waiting on them**:

```bash
gh search prs --repo <owner/repo> --review-requested=@me --state=open --json number,title,author,url,updatedAt
gh search issues --repo <owner/repo> --assignee=@me --state=open --updated=">=<from>" --json number,title,url
gh search issues --repo <owner/repo> --mentions=@me --include-prs --updated=">=<from>" --json number,title,url
```

**Around their code**: the files and folders they worked on most in the few months before
(`git log --author=<them> --since=<three months before from> --until=<from> --name-only --format=`),
and
CODEOWNERS entries naming them. Then what others changed there in the range
(`git log origin/<default> --since=<from> --no-merges -- <those paths>`); read those diffs: a changed
function they wrote, a renamed option they use, a new pattern replacing theirs.

**Everything else**: the range's merged work on the default branch, by theme, only the headlines.

Without `gh`, only the git parts; say once, plainly, that `gh auth login` adds their pull requests
and what's waiting on them.

## Brief and files

Don't ask anything else: tone lively and practical (or the style `$ARGUMENTS` describes, "Their own
style" in `references/episode.md`), voices Maya and Leo, length by how much
happened (2 minutes for a quiet few days, up to 5 for a month). `podcasts/<date>-catchup.json`,
`.mp3` and `.md` (the show notes: each item with its link, and "waiting on you" as a checklist, the
most urgent first).
