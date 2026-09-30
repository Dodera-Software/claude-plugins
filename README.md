# Dodera Software's Claude Code plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/install). Add it once and
every plugin here shows up in `/plugin` → Discover.

```
/plugin marketplace add Dodera-Software/claude-plugins
```

## Plugins

<a href="plugins/video-kit"><img src="media/video-kit/dodera-from-its-website.gif" width="560" alt="A video made by video-kit from doderasoft.com alone"></a>

| Plugin | What it does | Install |
| --- | --- | --- |
| [video-kit](plugins/video-kit) | Makes launch videos, feature teasers, social clips and what's-new videos for your product from its code or website, for anyone, no video skills needed: `/video-kit:make`, `/video-kit:website`, `/video-kit:changelog` (Mac, Windows, or Linux with Docker) | `/plugin install video-kit@dodera` |

Or add the marketplace and install in one step (Claude Code v2.1.275+):

```
/plugin install video-kit --marketplace Dodera-Software/claude-plugins
```

Choose **Install for you** to have a plugin in every project on your computer, in the terminal,
VS Code and the desktop app.

To get new versions automatically, turn on auto-update once: `/plugin` → **Marketplaces** →
**dodera** → **Enable auto-update**. What changed in each version:
[releases](https://github.com/Dodera-Software/claude-plugins/releases).

## Layout

```
.claude-plugin/marketplace.json   the catalog: name "dodera", one entry per plugin
plugins/<name>/                   each plugin: .claude-plugin/plugin.json, README.md, LICENSE, skills/
```

MIT licensed. Each plugin's README lists anything with its own licence terms.
