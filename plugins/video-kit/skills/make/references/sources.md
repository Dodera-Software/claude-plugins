# What the video is about: where the product is

Never decide this by looking at the folder. People keep videos in a folder of their own (one per
company or project, nicely organised) and the product's code lives elsewhere, or there's no code
at all. So the first step always asks, in the chat or in the browser, and the answer is kept.

## The five answers

| Answer | What you read | Notes |
| --- | --- | --- |
| **This project** | The code in the current folder | Offer it only when the folder has code (a `package.json`, `src/`, a git history…). The usual investigation (SKILL.md step 3). |
| **Code in another folder** | That folder, by its full path | Claude Code asks them once to allow reading outside the current folder: tell them in one line to click Allow. Only read there: never write, install or commit in it. For real screenshots, run the app from there (capture.md). |
| **A GitHub project** | A temporary copy | `git clone --depth 50 <link> "<temp>/video-kit-sources/<owner>-<repo>"` (`<temp>` from `node -p "require('os').tmpdir()"`); for a private one, `gh repo clone <owner>/<repo> <dir> -- --depth 50`. If neither works (no access), say so plainly and ask for a folder on this computer or the website instead. Delete the copy when the video is handed over. |
| **A website** | The public site | Website mode (website.md). |
| **Just an idea** | Their words | No product to read: an event invite, a pitch, an announcement, a concept. Ask what's missing in one round (what it is, for whom, the date or the call to action, a logo or colours if they have them, or a saved brand). Nothing on screen goes beyond what they told you. |

With code and a website both, use the code, and say in the storyboard that the website could be the
source instead. They can point to more than one place ("the app in ~/Work/app and the site
acme.com"): read each for what it's best at.

## Remember it: video/products.json

Once you know the product, write or update `video/products.json` in the studio:

```json
[{ "name": "Acme", "source": { "kind": "folder", "value": "/Users/sam/Work/acme-app" }, "website": "acme.com", "brand": "acme", "videos": ["launch-film"] }]
```

Next time in the same folder, the products listed there come first in the question ("Acme, like
last time"), so a company folder with many videos never asks twice. Also write the source into the
video's BRIEF.md (`Source:` line), so changes to that video later read the same place.

## Where the studio goes

Always in the folder Claude is open in (`video/`), whatever the source: that's where they chose to
keep their videos. In "This project" that's the product's own repo, as before; otherwise the code
folder is never touched.
