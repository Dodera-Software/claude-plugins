# video-kit: a Claude Code plugin for product videos

Launch videos, feature teasers, social clips and "what's new" videos for **your** product, made
by Claude from your product's own code, or just its website. No video editor and no design skills
needed: answer a few questions, approve a plan, and get a finished 4K video.

<table>
  <tr>
    <td width="58%" valign="top">
      <a href="https://github.com/Dodera-Software/claude-plugins/releases/download/video-kit-v1.2.0/video-kit-launch-film-1080p.mp4"><img src="../../media/video-kit/video-kit-launch-film.gif" alt="video-kit's launch film: Video Kit's red tile in a hand-drawn studio, from a founder's request to opening night"></a>
      <br><sub><b>video-kit's own launch film</b>, made with video-kit in the guided browser flow, in a hand-drawn style picked from three directions (wide, 39 s). <a href="https://github.com/Dodera-Software/claude-plugins/releases/download/video-kit-v1.2.0/video-kit-launch-film-1080p.mp4">Watch the full video</a></sub>
    </td>
    <td width="42%" valign="top">
      <a href="https://github.com/Dodera-Software/claude-plugins/releases/download/video-kit-v0.8.1/dodera-from-its-website-1080p.mp4"><img src="../../media/video-kit/dodera-from-its-website.gif" alt="Dodera Software's film in the technical look: its way of working as a deploy command, what it builds, its team"></a>
      <br><sub><b>Dodera Software</b>, made by <code>/video-kit:website doderasoft.com</code> from its website alone, in the technical look (wide, 47 s). <a href="https://github.com/Dodera-Software/claude-plugins/releases/download/video-kit-v0.8.1/dodera-from-its-website-1080p.mp4">Watch the full video</a></sub>
    </td>
  </tr>
</table>

## What you can ask for

```
/video-kit:make
```

Claude asks what kind of video (launch film, feature teaser, social clip), where it will be shown,
whether it's narrated or silent (silent unless you ask), which feature or story, how it should look, which
languages, and whether to show the product recreated from its code, as the real app (screenshots and
short recordings) or through screen recordings you made. Then it
reads how your product works, comes up with an idea for this video, shows you the plan and a few
still images to approve, and makes the video.

**Every video is its own.** Four looks change the whole feel: calm and elegant, bold (your brand
colour fills the screen), technical (dark, for developer tools) and playful. Claude builds each
video around its own idea and one moment only your product could have, from a wide range of
scenes (numbers counting up, words swapping, a typing terminal, before and after, a wall of
screens, step-by-step, quotes, a flight through your screens, your logo in 3D…), so no two videos
look alike.

**Scene by scene, or like a film.** Most videos go scene by scene, each with its own point. Ask
for something cinematic (or let Claude choose it) and you get a film instead: one continuous camera
journey through your product's screens, words appearing over the picture like subtitles, and
your logo as a solid 3D object at the end.

**Directed or quick.** For anything public, choose "Directed": Claude interviews you for about ten
minutes about your audience, your one message, videos you'd like it to feel like (how they start,
how they end), the moments you want and what to avoid, then writes it down for you to confirm.
The video follows your vision, not a template. "Quick" is a few clicks, for internal or social
clips.

**Describe it yourself if you like:** "open on our logo drawing itself, then show the three
dashboards side by side" and it builds exactly that.

```
/video-kit:make 20-second teaser for the new export feature, playful, for LinkedIn
```

With a description, it only asks what's missing.

```
/video-kit:website acme.com
```

**No code? Just a website.** Give it a product's website (or run it without one and it asks). It
reads the colours, logo, fonts and wording from there, takes clean screenshots of the pages
(cookie notices hidden), and makes the video from what the site says. Works from any folder; the
video goes in a `video` folder there. Use it for your own website, or one whose owner has agreed:
the logo, wording and screenshots in the video belong to them.

```
/video-kit:voiceover
```

**A narrator's voice**, for a video you already made or a new one. Claude writes a line for each
scene, lets you hear a few voices and pick one, and the video is timed to the voice. The voices
are free and open and are recorded on your computer: no account, nothing uploaded. English only
(American and British voices).

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

While it renders, Claude tells you how far along it is and about how long is left. Want a draft
first? Ask for "just the quick one": 1080p only, in about a quarter of the time.

Give notes like a director ("this part is too fast", "make the ending punchier") and it redoes them.

**Every video is made for you, not from a template.** Claude watches the videos you say you like
(a link or a file), looks for inspiration when you have none, and before the storyboard shows you
three different directions, with pictures, to pick from: a hand-drawn story, a pixel-art game, a
cinematic 3D film, whatever suits your product. Then it draws that video from scratch, around your
brand.

**Make it in your browser, step by step.** When you start, Claude asks whether you'd like to work
in the chat or in your browser. In the browser, a guided page walks you through it: pick what
you're making, who it's for and the one thing they should remember (with suggestions from your
product), paste videos you like and say what you like about them (or ask for ideas), say how it should feel, hear the
narrator voices, pick one of three directions, then review the storyboard and the key moments before anything is made, and
finish in the editor. Claude does the work in the background and talks to you on the page.

**Watch and tweak it live.** Before making the video, Claude offers the editor: the video opens in
your browser, playing live. Jump between scenes or loop just one, change any word on screen, make a
scene longer or shorter (drag its end on the timeline), drag scenes into a new order, duplicate or
hide one, pick how a scene comes in, rewrite what the narrator says and hear it again, leave a note
for Claude on the exact moment ("the logo should land here"), and export when you're happy.
**Undo** any change, yours or Claude's, or go back to an earlier **version**. It runs only on your
computer and only while it's open; heavy 3D can stutter in the preview, never in the finished video.

**It remembers your brand.** After the first video, Claude offers to save the brand (colours, logo,
fonts, look and voice) on your computer, so the next video for the same company, in any project,
starts on-brand.

## Where to start

Open Claude Code in any folder and type `/video-kit:make`. The first thing it asks is what the
video is about:

- **This project:** you're in your product's code, and the video comes from it.
- **Code in another folder, or on GitHub:** keep your videos in a folder of their own (one per
  company or project, say `Videos/Acme`) and point Claude to the code. It only reads it.
- **A website:** any product, from its public site.
- **Just an idea:** an event, an announcement, a pitch: describe it, and the video says only what
  you told it.

Coming back to the same folder, it remembers what each product's videos come from, so the next
video starts straight away.

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

**Where it works:** Claude Code (the terminal, the IDE extensions and the desktop app's Code tab),
because making a video runs programs on your computer. In the claude.ai chat, the mobile app and
Cowork it can plan a video but not make it.

**You'll need** a Mac or a Windows PC (or Linux with Docker running), with
[Node.js](https://nodejs.org) (the LTS version) and
[Docker Desktop](https://www.docker.com/products/docker-desktop) installed. Claude
checks for both before starting and tells you if one is missing. After installing Docker Desktop,
open it once and accept its terms; from then on it doesn't need to be open: Claude opens it when
it makes a video and leaves it open. Keep about 5 GB of disk space free.

**Your first video takes 5–10 minutes longer.** The first time on a computer, Claude sets up the
video app (a one-time download of about 3 GB). It does this in the background while it reads your
product, and tells you when it starts. After that, a video starts straight away.

## The real app, and your own recordings (optional)

By default the product is recreated from its code, so nothing needs to run. If you choose the real
app instead:

- Claude starts your product on your computer the way developers run it (with its database and
  example data), takes screenshots, films short recordings of the moments where something moves
  (typing, a card moving, a list filling up), and closes it again. It reads your project to learn how.
- If pages need a login, you give it a **demo account**, never a real one.
- **Everything on screen ends up in the video**, so only example data should be visible.
- Recordings are edited like a screen-recording app would: the camera moves in on what's being
  typed or clicked, an outline in your brand colour marks it, the pointer is large enough to
  follow, and the screen can sit in a laptop. Each used sparingly, so it looks crafted.

You can also bring screen recordings you made yourself (on a Mac, Windows or your phone): put them
in the project or tell Claude where they are, and it builds the video around them.

## What leaves your computer

- **Your code and your videos stay on your computer.** The plugin sends nothing anywhere: no
  accounts, no analytics, no uploads. Claude reads your project the same way it does in any Claude
  Code session.
- **What it downloads:** the video app the first time (from npm and Docker Hub, and the browser it
  draws with), the fonts from Google Fonts while making the video, the voices the first time you
  choose a narrator (about 90 MB, from Hugging Face; shared with pr-podcast), and, once per video,
  the plugin's version number from GitHub to tell you about updates.
- **Videos you point it to** (a link to a video you like, a gallery it looks through for ideas)
  are downloaded only to take a few still pictures from them; the download is deleted straight
  away and the pictures within a day.
- **In website mode** it visits the pages it reads, like a browser would, and downloads a public
  list of cookie notices to hide them.
- **Saved brands and versions stay on your computer.** Brands you choose to save are kept in a
  `.video-kit` folder in your home folder until you ask Claude to forget them. Versions for Undo
  are kept inside the project's `video` folder for 7 days (the last 30 changes per video) and then
  deleted by themselves.
- **Real screenshots and recordings** run your product on your computer only. The demo login is
  passed while they are taken and never written to a file.

## If something goes wrong

Claude explains problems in plain words as they happen. The common ones:

| What you see | What to do |
| --- | --- |
| "Docker did not start" | Open Docker Desktop once yourself, accept its terms, wait until it says it's running, then ask Claude to try again. |
| It stops with "no space left" | Free up about 5 GB of disk space and ask Claude to try again. |
| A website "blocks" the screenshots | Some sites turn automated visitors away. Choose "Simple animated scenes" instead of screenshots, or give Claude screenshots you took yourself. |
| Text goes by too fast, or a scene is wrong | Say so like you would to a video editor ("scene 3 is too fast", "use our green, not the blue"); Claude redoes that part. |
| No update shows up in `/plugin` | Type `/plugin marketplace update dodera`, then update video-kit from `/plugin` → Installed. |

Something else? [Tell us what went wrong](https://github.com/Dodera-Software/claude-plugins/issues/new/choose)
with what you asked for and what Claude said. Questions and ideas go in
[Discussions](https://github.com/Dodera-Software/claude-plugins/discussions), and so does anything
you made with it: we'd love to see it.

## Removing it

Type `/plugin uninstall video-kit@dodera`. Then ask Claude "remove the video-kit
video app from Docker" to free its 3 GB (or delete the `video-kit` image in Docker Desktop →
Images). Your videos stay in each project's `video` folder until you delete it.

## For developers

- **Where things go:** a `video/` folder in your project (Remotion, its own `package.json`),
  kept out of your linter, build and Docker context. `video/out/` and `video/node_modules/` are
  git-ignored. See `video/README.md` for the commands.
- **Rendering** runs in Docker, so no browser is installed on your machine. The render image is
  about 2.7 GB, shared by every project on the same kit version; older versions are removed
  automatically when a new one is built.
- **Release videos on every release:** copy `skills/changelog/release-video.yml` to
  `.github/workflows/` and add an `ANTHROPIC_API_KEY` repository secret. Each run uses that key's
  credits.
- **Try it without installing:** clone `Dodera-Software/claude-plugins` and start Claude Code in your
  project with `claude --plugin-dir /path/to/claude-plugins/plugins/video-kit`.

### Try the example

From a clone of `Dodera-Software/claude-plugins`:

```bash
cp -r plugins/video-kit/skills/make/template /tmp/video && cd /tmp/video && npm install
./render.sh AcmeTeaser-en       # a 19-second teaser for a made-up product → out/ (also AcmeTeaser-es)
npm run studio                  # or preview it live with a timeline
```

## Licences

- This plugin: MIT.
- Voices: Kokoro (Apache 2.0), free for commercial videos.
- **Remotion** has its own licence: free for individuals and companies of up to three people;
  larger companies need a [Remotion company licence](https://www.remotion.pro/license) to render.
- **Docker Desktop** is free for personal use, education and companies with fewer than 250
  employees and under $10 million in yearly revenue; larger companies need a
  [paid Docker subscription](https://www.docker.com/pricing/).
