---
name: release
description: Make a 3–5 minute two-voice audio episode about a release (what's new, what it's good for, what to know before upgrading) from a tag, a GitHub release or the changes not yet released, recorded offline for free. Use when someone asks for a release podcast, a what's-new episode, release notes as audio, or an episode for a version.
argument-hint: "[optional: a tag or version, \"unreleased\", who it's for; and how it should be, e.g. \"like a movie trailer\"]"
---

# A release episode

The request: $ARGUMENTS

This is the `make` workflow (`${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md`): read that file and follow
it (the version check, starting the voices, recording, handing over), with this brief and these
sources instead. The episode is about what the release means for the people who use it, not a
review of its code: the release structure in `references/episode.md`.

## The brief

Fetch the tags first (`git fetch --tags --quiet`, silently skipped offline), then look:

```bash
git tag --sort=-creatordate | head -10
gh release list --limit 5 2>/dev/null
```

Ask only what `$ARGUMENTS` leaves open, in one round with the question tool:

| Header | Question | Options |
| --- | --- | --- |
| Release | Which release? | The latest: "v2.4.0, 3 days ago, 18 pull requests" · The one before it, same form · Not released yet: "the 11 changes since v2.4.0" |
| For | Who's listening? | The people who use it (Recommended): what they can do now, in plain words · The team: what shipped and how, a little more technical |
| Length | How long? | Fit it to the release (Recommended): 2 minutes for a small one, up to 5 for a big one · About 3 minutes · About 5 minutes |

The tone is lively and practical unless they ask for straight or describe a style of their own
("like a movie trailer": "Their own style" in `references/episode.md`); the voices Maya and Leo.

**Tags with a prefix** (a monorepo: `video-kit-v0.9.0`, `api/v1.2.0`): a release's previous version
is the previous tag with the same prefix, and only the changes under that part of the project
count (`git log <prev>..<tag> -- <its folder>`). If the prefix doesn't point at a folder, ask
which part of the project it is.

## Sources

Between the previous tag and this one (or the latest tag and the default branch, for "not
released yet"):

```bash
gh release view <tag> --json name,tagName,body,publishedAt,url,assets 2>/dev/null   # its notes
git log <prev>..<tag> --no-merges --format='%h|%an|%s%n%b'
git log <prev>..<tag> --merges --format='%h %s'
git diff <prev>..<tag> --stat
gh pr list --state merged --search "merged:<prev date>..<tag date>" --limit 100 --json number,title,author,body,labels 2>/dev/null
```

Plus the project's CHANGELOG entry for the version if there is one, and the README and docs the
release changed. Read the diffs of the changes that matter to users (new features, changed
behaviour, anything under "breaking"), enough to say exactly what they do; skim the rest.

What it's for: sort the changes into what's new (features someone would notice), smaller
improvements and fixes, and what to know before upgrading (breaking changes, removed or renamed
options, migrations, new requirements, deprecations). Everything true to the code and the notes,
as always: a feature is described as it works, not as the release notes hoped.

## Files and hand-over

`podcasts/<date>-release-<version>.json`, `.mp3` and `.md` (the show notes: the release link, the
chapters with times, the pull requests behind each feature, and the upgrade notes as a list).

When handing over, besides the usual offers: if the release is on GitHub, offer to attach the
episode to it (`gh release upload <tag> podcasts/<name>.mp3`) so everyone finds it with the
release. Only if they say yes: it's visible to everyone who can see the release. If video-kit is
installed, mention in one line that `/video-kit:changelog` makes a video from the same release.
