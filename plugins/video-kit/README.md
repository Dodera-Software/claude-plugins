# video-kit

A Claude Code plugin that makes launch videos, feature teasers and social clips for **your**
product, from your codebase. Describe the video you want; Claude studies the repo (what the product
does, its screens, colours, logo and demo data), proposes a storyboard, and renders a 4K video made
entirely of code: your real UI rebuilt in React, animated with [Remotion](https://www.remotion.dev).

```
/video-kit:make 20-second teaser for the new export feature, playful, for LinkedIn
```

Or run `/video-kit:make` on its own: it asks four quick multiple-choice questions (kind of video,
format, tone, sound), skims your product, and offers your real features to pick from.

## Install

In Claude Code:

```
/plugin install video-kit --marketplace Dodera-Software/claude-plugins
```

Confirm adding the marketplace, then pick a scope: **Install for you** to use it in every repo.

On Claude Code older than v2.1.275, add the marketplace first, then install:

```
/plugin marketplace add Dodera-Software/claude-plugins
/plugin install video-kit@dodera
```

It comes from [Dodera-Software/claude-plugins](https://github.com/Dodera-Software/claude-plugins),
Dodera's plugin catalog; adding it once also shows any future Dodera plugins in `/plugin` → Discover.
Choose **Install for you** to have it in every project, in the terminal, VS Code and the desktop app.

Then, in your product's repo, run `/video-kit:make` with what you want (or just ask Claude
for a launch video; the skill loads on its own).

**Update:** `/plugin` → Installed → video-kit → Update now.

**Try it without installing:** clone `Dodera-Software/claude-plugins` and start Claude Code in your
product's repo with `claude --plugin-dir /path/to/claude-plugins/plugins/video-kit`; the plugin is
loaded for that session only.

## What happens

1. **Setup:** the studio (this plugin's `skills/make/template/`) is copied into a `video/`
   folder in your repo and kept out of your own lint, build and Docker context.
2. **Investigation:** Claude reads your product until it can explain it: pages, features, copy,
   design tokens, logo, demo data. It writes a short brief where every claim points at a file.
3. **Storyboard:** scenes, words, seconds, transitions and sounds as a table, for your OK.
4. **Build:** reusable scenes from the kit plus your product's screens rebuilt in React. Scenes
   grow out of each other instead of fading, every line stays up long enough to read, and clicks,
   pops and whooshes land on the frame they belong to.
5. **Check and render:** Claude looks at stills of every scene and transition, renders 4K and
   1080p, and scans every frame for glitches before handing it over.

Give it notes like a director ("too fast here", "make the logo land harder") and it re-renders.

## Needs

- Node 20+ and Docker Desktop. Rendering runs in a container, so no browser is installed on your
  machine; the render script starts Docker when needed and stops it afterwards.

## Try the example

From a clone of `Dodera-Software/claude-plugins`:

```bash
cp -r plugins/video-kit/skills/make/template /tmp/video && cd /tmp/video && npm install
./render.sh AcmeTeaser          # a 16-second teaser for a made-up product → out/
npm run studio                  # or preview it live with a timeline
```

## Licences

- This plugin: MIT.
- Sound effects: CC0 (Kenney, "Interface Sounds"). No music is included.
- **Remotion** has its own licence: free for individuals and companies of up to three people;
  larger companies need a [Remotion company licence](https://www.remotion.pro/license) to render.
