---
name: website
description: Make a product video from a product's public website alone (its colours, logo, fonts, wording and screenshots), from any folder, with no code needed. Use when someone wants a video for a product or company and gives, or only has, its website.
argument-hint: "[website address] [optional: what the video is for, length, format, tone]"
---

# A video from a website

The request: $ARGUMENTS

1. **The address.** Take the website address from the request. If there is none, ask for it in one
   plain sentence ("Which website is the video about? For example acme.com") and wait. Accept it
   without `https://` and add it yourself. Check it opens
   (`curl -sL -o /dev/null -w "%{http_code}" <address>`); if it doesn't, say so plainly and ask
   again.
2. **Then make the video** by following `${CLAUDE_PLUGIN_ROOT}/skills/make/SKILL.md` from step 0,
   in website mode (`${CLAUDE_PLUGIN_ROOT}/skills/make/references/website.md`), whatever is in the
   current folder:
   - Don't ask where the look and wording come from: it's the website.
   - Read the site (`render.sh site`) before the second round of questions, so the feature or story
     options come from what the site actually says.
   - The video lives where they are working: the `video/` folder in the current folder, as usual.
