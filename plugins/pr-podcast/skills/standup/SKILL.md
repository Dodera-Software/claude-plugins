---
name: standup
description: Make a 2–3 minute two-voice audio episode of what the team shipped since the last standup (merged work, who did it, what's in progress, heads-ups), recorded offline for free. Use when someone asks for a standup episode, a daily or weekly audio recap of the team's commits, or "what happened yesterday" as audio.
argument-hint: "[optional: since when, e.g. \"since friday\"; and how it should be, e.g. \"as a news bulletin\"]"
---

# A standup episode

The request: $ARGUMENTS

This is the `make` workflow (`${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md`) with the brief already
answered. Read that file and follow it, with these choices instead of asking:

- **Changes**: the default branch since the last standup: since yesterday morning (9:00 local), or
  since Friday morning on a Monday. Plus open PRs updated in that time, for "in progress". If
  `$ARGUMENTS` names a range ("since Friday", "this week", "the last sprint"), use that.
- **For**: the team at standup (the standup structure in `references/episode.md`).
- **Length**: about 3 minutes; 2 when there's little to say. Never pad a quiet day: "a quiet one:
  two fixes and a dependency bump" is a fine, short episode.
- **Tone**: lively and practical (`references/episode.md`), unless `$ARGUMENTS` asks for straight
  or describes a style of its own ("as a news bulletin", "short and calm": "Their own style" there).
- **Voices**: Maya and Leo, speed 1.05, unless `$ARGUMENTS` says otherwise.
- **File**: `podcasts/<date>-standup.json` and `.mp3`.

Ask nothing unless the range finds no changes at all; then say so and offer a longer range
(the last week) with the question tool.

To run this every morning on its own, they can use `/schedule` in Claude Code; the episode is
still made on their computer when the session runs.
