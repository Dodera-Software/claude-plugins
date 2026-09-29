# video-kit

Launch videos, feature teasers, social clips and "what's new" videos for **your** product, made
by Claude from your product's own code. No video editor and no design skills needed: answer a few
questions, approve a plan, and get a finished 4K video.

## What you can ask for

```
/video-kit:make
```

Claude asks what kind of video (launch film, feature teaser, social clip), where it will be shown,
the tone, sound effects or silent, which feature or story, which languages, and whether to show the
product recreated from its code or as real screenshots. Then it reads how your product works,
shows you the plan and a few still images to approve, and makes the video.

```
/video-kit:make 20-second teaser for the new export feature, playful, for LinkedIn
```

With a description, it only asks what's missing.

```
/video-kit:changelog
```

A 15–30 second "what's new" video from your recent changes: Claude finds what users will notice,
checks each change in the code, and lets you pick which ones to show.

You get:

- the video in 4K (website, YouTube) and 1080p (LinkedIn, Slack, email),
- a cover image and a YouTube thumbnail; every video opens on a cover, so Slack and LinkedIn show
  a proper preview,
- one video per language you asked for.

Give notes like a director ("this part is too fast", "make the ending punchier") and it redoes them.

## Install

In Claude Code:

```
/plugin install video-kit --marketplace Dodera-Software/claude-plugins
```

Confirm adding the marketplace, then choose **Install for you** to have it in every project, in the
terminal, VS Code and the desktop app. On Claude Code older than v2.1.275, run
`/plugin marketplace add Dodera-Software/claude-plugins` first, then `/plugin install video-kit@dodera`.

**Stay up to date:** turn on automatic updates once: type `/plugin`, open **Marketplaces**, choose
**dodera**, then **Enable auto-update**. New versions then install by themselves; Claude Code tells
you when one arrives. Without it, the plugin mentions a newer version when you use it, and you
update from `/plugin` → Installed → video-kit → Update now. What's new in each version:
[releases](https://github.com/Dodera-Software/claude-plugins/releases).

**You'll need** a Mac (or Linux with Docker running; Windows isn't supported yet), with
[Node.js](https://nodejs.org) (the LTS version) and
[Docker Desktop](https://www.docker.com/products/docker-desktop) installed. Claude
checks for both before starting and tells you if one is missing. Docker doesn't need to be open;
Claude opens it while making the video and closes it afterwards.

## Real screenshots (optional)

By default the product is recreated from its code, so nothing needs to run. If you choose real
screenshots instead:

- Claude starts your product on your computer the way developers run it (with its database and
  example data), takes the screenshots, and closes it again. It reads your project to learn how.
- If pages need a login, you give it a **demo account**, never a real one.
- **Everything on screen ends up in the video**, so only example data should be visible.

## For developers

- **Where things go:** a `video/` folder in your project (Remotion, its own `package.json`),
  kept out of your linter, build and Docker context. `video/out/` and `video/node_modules/` are
  git-ignored. See `video/README.md` for the commands.
- **Rendering** runs in Docker, so no browser is installed on your machine. The render image is
  about 1.9 GB, shared by every project on the same kit version; `./render.sh clean` removes old
  ones.
- **Release videos on every release:** copy `skills/changelog/release-video.yml` to
  `.github/workflows/` and add an `ANTHROPIC_API_KEY` repository secret. Each run uses that key's
  credits.
- **Try it without installing:** clone `Dodera-Software/claude-plugins` and start Claude Code in your
  project with `claude --plugin-dir /path/to/claude-plugins/plugins/video-kit`.

### Try the example

From a clone of `Dodera-Software/claude-plugins`:

```bash
cp -r plugins/video-kit/skills/make/template /tmp/video && cd /tmp/video && npm install
./render.sh AcmeTeaser-en       # a 17-second teaser for a made-up product → out/ (also AcmeTeaser-es)
npm run studio                  # or preview it live with a timeline
```

## Licences

- This plugin: MIT.
- Sound effects: CC0 (Kenney, "Interface Sounds"). No music is included.
- **Remotion** has its own licence: free for individuals and companies of up to three people;
  larger companies need a [Remotion company licence](https://www.remotion.pro/license) to render.
