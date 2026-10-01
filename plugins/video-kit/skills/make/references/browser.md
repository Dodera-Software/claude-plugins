# The guided flow in the browser

For people who'd rather click than type (a salesperson, a founder): the whole video is made from a
page in their browser. You still do all the work, in Claude Code, exactly as in SKILL.md; the page
is where they answer, review and edit. Nothing about the video changes, only where the
conversation happens.

The page and you talk through `video/session.json`, with `scripts/session.mjs` on your side.
**Everything you'd ask in the chat, ask in the page instead** (`ask`); in the chat itself, keep to
one line now and then ("Working on the storyboard; it'll appear in your browser").

## Start it

1. Get ready as SKILL.md step 2 says (Node, the studio copied into `video/`, `npm install`; Docker
   only matters later). Tell them in one line: "Setting up your video studio, about a minute."
2. Start the session with what you know, and the brands saved on this computer:
   `node scripts/session.mjs start '{"product": "<name>", "brands": <output of brands.mjs list, as [{slug, name, domain}]>}'`
3. Open the page: `./render.sh room` in the background (Bash, `run_in_background`). It opens their
   browser on the brief. Tell them: "Your video studio is open in the browser. Answer a few
   questions there and I'll take it from there."
4. Listen: `node scripts/session.mjs watch` with the Monitor tool, for the whole session (it ends
   after 30 minutes: start it again). Each line is something they did, as JSON with a `kind`. It
   also brings the editor's notes (`kind: "note"`), so it's the only watcher you need.
5. While they answer, take the quick look at the product (SKILL.md step 1) and send ideas the page
   shows as one-click suggestions: `node scripts/session.mjs suggest '{"audiences": […], "messages": [three
   candidates, in the product's own words], "mustShow": [features worth showing], "actions": [its call to action]}'`.

## What they send, and what you do

| `kind` | It means | Do |
| --- | --- | --- |
| `brief` | The brief, every answer they gave (`brief.kind`, `audience`, `message`, `action`, `references`, `feel`, `look`, `form`, `sound`, `voice`, `formats`, `length`, `languages`, `mustShow`, `avoid`, `brand`, `inspireMe`). "auto" or empty means "you decide". | Treat it as SKILL.md step 1's answers and the interview's (references/interview.md). Ask follow-ups only where it matters, with `ask` (one at a time, with options), and push back on a vague message the way the interview does. `brand` set: `brands.mjs use <slug> video`. References, links or files in `public/session/references/`: watch each with `node scripts/reference.mjs <link or file>` and look at its frames (direction.md); a link that gives only a preview picture, `ask` for a screen recording or screenshots. Then the directions (below). Write BRIEF.md and VISION.md as usual. |
| `answer` | Their answer to one of your questions | Carry on with it. |
| `message` | Something they wrote to you | Reply with `say` (or act on it, then `say` what you did). |
| `ideas` | The directions they picked: `picked` (numbers from 0), `chosen` (their titles and links), `note`, or `more: true` for other ideas | Picked: write the direction into VISION.md, `node scripts/reference.mjs clean`, then the storyboard in it. More: find others, unlike the first ones, and send them again. |
| `storyboard` | `approved: true`, or their comments by scene number (from 0) and on the whole | Approved: build. Comments: change the storyboard and send it again (a new round). |
| `stills` | The same, for the stills | Approved: finish the video and hand over to the editor. Comments: fix and send new stills. |
| `note` | A note from the editor, once it's open | As in SKILL.md's edit room section: change it, then `notes.mjs done` or `ask`. |

## Show them where you are

- `node scripts/session.mjs steps '["Reading how <product> works", "Finding directions", "Writing the storyboard", "Building the scenes", "Pictures of key moments", "Handing it to the editor"]'`
  once the brief arrives, then `node scripts/session.mjs step <n> doing` as you start each (earlier steps tick
  themselves) and `step <n> done` at the end.
- `node scripts/session.mjs say "…"` for what's worth knowing, in the same plain words as always: what
  you found, what you decided for them and why, anything taking a while. Not every small step.
- `node scripts/session.mjs ask "…" '["Option A", "Option B"]'` for a decision that's theirs.

## The directions

After the brief and the investigation, always, before the storyboard: three directions that
differ at a glance (direction.md), each with two or three pictures. Pictures come from the
references they gave, the gallery videos you studied (`inspireMe` true, or no references: find
some, direction.md "Finding inspiration"), or a quick still of the direction itself. Write
`[{ "title": "<the world, in a few words>", "text": "<the story, the signature moment and the
ending, two sentences>", "pictures": ["<frame paths from reference.mjs>"], "link": "<where it
comes from, if anywhere>" }]` and run `node scripts/session.mjs ideas <file>`. The pictures are copied into the
page, so the temporary frames can go. The page shows them as cards to pick from.

## The storyboard and the stills

- The storyboard (SKILL.md step 4) as a file: `{ "title": "<the promise>", "scenes": [{ "title",
  "what" (what happens, one sentence, in pictures: what's on screen, not which kit scene), "words" (the words on screen), "narration" (the narrator's
  line, if any), "seconds" }] }`, then `node scripts/session.mjs storyboard <file>`. The page
  shows it scene by scene and they approve it or comment.
- The stills (SKILL.md step 6, after your own check against the quality bar): copy the 3–6 images
  you'd show into `public/session/stills/`, write `[{ "src": "session/stills/<file>.png",
  "caption": "<the moment, in a few words>" }]`, then `node scripts/session.mjs stills <file>`.
- Once the storyboard is approved, the reference files they dropped in aren't needed any more:
  delete `public/session/references/` and run `node scripts/reference.mjs clean`.

## The editor, and the end

When the stills are approved and the video is built: `node scripts/session.mjs editor <VideoId>`. The page
turns into the editor for that video (SKILL.md's edit room section). Don't render: they export
from the editor when they're happy (or ask you to). Keep listening: their notes now come as
`kind: "note"`. Before you finish, if the brand isn't saved, ask in the page with `ask` whether to
save it (SKILL.md step 7) and save it on yes.

## If they close things

- They close the page: everything is in `session.json`; `./render.sh room` brings them back to
  where they were.
- Claude Code closes: the page says Claude is away and keeps what they do; when you're back,
  `node scripts/session.mjs show` and `watch` pick it up.
- A session untouched for 30 days is cleared when the editor next opens, with the files dropped
  into it. `session.json` and `public/session/` are never committed.
