# Dodera Software's Claude Code plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/install). Add it once and
every plugin here shows up in `/plugin` → Discover.

```
/plugin marketplace add Dodera-Software/claude-plugins
```

## Plugins

<a href="plugins/video-kit"><img src="media/video-kit/video-kit-launch-film.gif" width="640" alt="video-kit's own launch film, made with video-kit"></a>

| Plugin | What it does | Install |
| --- | --- | --- |
| [video-kit](plugins/video-kit) | Makes launch videos, feature teasers, social clips and what's-new videos for your product from its code or website, for anyone, no video skills needed: `/video-kit:make`, `/video-kit:website`, `/video-kit:changelog` (Mac, Windows, or Linux with Docker) | `/plugin install video-kit@dodera` |
| [pr-podcast](plugins/pr-podcast) | Turns a pull request, today's commits, a release or a date range into a 3–5 minute two-voice audio episode (what changed, why, what's risky) to hear before the diff, at standup or after time off, recorded free on your computer: `/pr-podcast:make`, `/pr-podcast:standup`, `/pr-podcast:release`, `/pr-podcast:catchup` | `/plugin install pr-podcast@dodera` |

Or add the marketplace and install in one step (Claude Code v2.1.275+):

```
/plugin install video-kit --marketplace Dodera-Software/claude-plugins
```

Choose **Install for you** to have a plugin in every project on your computer, in the terminal,
VS Code and the desktop app.

To get new versions automatically, turn on auto-update once: `/plugin` → **Marketplaces** →
**dodera** → **Enable auto-update**. What changed in each version:
[releases](https://github.com/Dodera-Software/claude-plugins/releases).

## Help and ideas

- **Questions, ideas, and things you made:** [Discussions](https://github.com/Dodera-Software/claude-plugins/discussions).
- **Something went wrong:** [report it](https://github.com/Dodera-Software/claude-plugins/issues/new/choose); no technical knowledge needed.
- **A security problem:** privately, as [SECURITY.md](SECURITY.md) says.

## Layout

```
.claude-plugin/marketplace.json   the catalog: name "dodera", one entry per plugin
plugins/<name>/                   each plugin: .claude-plugin/plugin.json, README.md, LICENSE, skills/
```

MIT licensed. Each plugin's README lists anything with its own licence terms.
