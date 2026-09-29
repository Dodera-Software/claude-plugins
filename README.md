# Dodera Software's Claude Code plugins

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/install). Add it once and
every plugin here shows up in `/plugin` → Discover.

```
/plugin marketplace add Dodera-Software/claude-plugins
```

## Plugins

| Plugin | What it does | Install |
| --- | --- | --- |
| [video-kit](https://github.com/Dodera-Software/video-kit) | Makes launch videos, feature teasers and social clips for your product from your codebase: `/video-kit:make` | `/plugin install video-kit@dodera` |

Or add the marketplace and install in one step (Claude Code v2.1.275+):

```
/plugin install video-kit --marketplace Dodera-Software/claude-plugins
```

## Adding a plugin

Each plugin lives in its own repository. Add an entry to `.claude-plugin/marketplace.json` with a
`url` source set to the repository's HTTPS clone URL (a `github` source may clone over SSH, which
fails for anyone without a GitHub SSH key), and the display fields (`description`, `author`, `homepage`,
`license`), which users see before they install. Then run `claude plugin validate .` and push.
