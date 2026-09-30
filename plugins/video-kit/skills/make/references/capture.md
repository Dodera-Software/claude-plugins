# Captured screens

The alternative to rebuilding the product's screens in React: screenshots and short recordings of
the real app, running on this machine, animated in the video with a browser frame, camera moves and
a cursor. Choose it only when the person picks real screens of the running app, or brings
recordings of their own.

## Tell them what it needs, before anything else

In one short, plain message, and get a yes:

- "To take real screenshots I'll start the product on this computer, the way developers run it,
  with its database and example data. I'll close it again when I'm done."
- "If the pages need a login, I'll need a **demo account** (email and password). Please don't
  give me a real one: anything on screen ends up in the video."
- "Only example data will be visible; nothing about real customers."
- "It takes a bit longer than recreating the screens from the code."

If the product can't run here (it needs services or keys that aren't available), say so plainly
and continue with screens recreated from the code.

They give the demo login in the chat. Pass it to the capture as `VIDEO_LOGIN_EMAIL` and
`VIDEO_LOGIN_PASSWORD` on that one command only; never write it to a file, never repeat it back.

## Learn how this project runs (never guess)

Read, don't assume a port or a command:

- **Start command:** README "getting started" / "development", `Makefile` targets (`make up`,
  `make dev`), `package.json` scripts (`dev`, `start`), `composer.json`, `Procfile`,
  `docker-compose.yml`, `.env.example`, CLAUDE.md or AGENTS.md.
- **Address:** the dev server's host, port and protocol from that command and its config
  (`vite.config`, `nuxt.config`, framework defaults, `.env` like `PORT` or `APP_URL`). Note https with
  a local certificate (mkcert) and any path prefix.
- **Database and demo data:** migrations and seed commands (`db:migrate`, `seed`, `seed:demo`,
  `artisan db:seed`, fixtures), and whether a demo account exists in the seed. Prefer the project's
  own demo data over creating records by hand.
- **Login:** the sign-in page, its field selectors, what the page shows once signed in.

Write what you found in the video's `BRIEF.md` (command, address, seed, login page), so the next
capture doesn't start from zero.

## Start it

You start it, with the project's own command, in the background (they may be a developer who
already has it running: check first, and reuse it). If it needs a first-time setup (installing
dependencies, creating the database, loading demo data), do that too, following the project's own
instructions, and tell them in one line what you're doing. Check it answers before capturing:
`curl -sk -o /dev/null -w "%{http_code}" <address>` should give 200 or a redirect to the login page.

**Stop everything you started when the capture is done** (dev server, containers the start command
brought up), leaving anything that was already running alone.

## Write the plan and capture

`video/src/videos/<slug>/capture.json`, as documented at the top of `video/scripts/capture.mjs`:

- `baseUrl`: the app's address as you found it, `http://localhost:5173` or `https://localhost:3300`
  with its path prefix. The capture runs in Docker and passes localhost through to this computer,
  so dev servers that check the host name (Vite, Next, webpack) accept it. An API on another local
  port goes in `forward: [8000]`. A remote address (a staging server) works as is.
- `viewport`: 1440×900 unless the product is best seen wider or narrower; shots are taken at 2×.
- `login`: the steps to sign in, reading `$VIDEO_LOGIN_EMAIL` and `$VIDEO_LOGIN_PASSWORD`. Each
  capture is a fresh browser, so set what a new visitor would otherwise see with a `storage` step
  (it writes localStorage and reloads): the app's language, a dismissed cookie notice or intro. Read
  the app's code for the keys and values it expects (`"true"`, not `"1"`, for a stored boolean).
- `steps`: go to each screen, wait for real content (`waitFor` a selector or `::-p-text(…)`), and
  take a `shot` of each state the video needs: before and after each action it shows.
- `record` … `stop` around the steps to film instead (below).

Run it: `VIDEO_LOGIN_EMAIL=… VIDEO_LOGIN_PASSWORD=… ./render.sh capture <slug>`. Screenshots land in
`public/captures/<slug>/`. If a step fails, `_failed.png` there shows the page at that moment. Look
at every screenshot: no real data, no error toasts, no half-loaded states, no cookie banners.

## Screenshots or recordings: you decide

Recordings show what a still can't: something moving because someone did something. Use one for:

- typing that produces something (a search narrowing, a form filling, a command palette),
- a list, board or chart changing (a card dragged, rows arriving, a chart loading),
- a short flow of two or three clicks that reads as one gesture,
- whenever the person asks for a recording or "a real demo".

Use screenshots for everything else: a screen's state, a before and after. Mix them in one scene: a
screenshot to set the scene, the recording for the moment, a screenshot of the result to hold on.
Say in the storyboard which moments are recordings.

Film only the moment, 3–10 seconds. Wrap its steps in `{ "record": "<id>" }` … `{ "stop": true }`;
the steps between play at a pace a viewer can follow (the mouse glides, hover states show, typing
goes key by key, each step settles), and a pointer is drawn into the page. `scroll` takes pixels
or a selector to bring into view, scrolled smoothly. `waitFor` inside a recording keeps filming
until its selector appears: use it for an answer streaming in or a result loading (something that
appears only when it's done, like a copy button under the answer), then `wait` a moment to hold on
it. Frame by frame, a wait of real seconds becomes a fraction of that on film, so a slow answer
streams in briskly.

Recordings are filmed frame by frame: Chrome draws each frame when asked, with the page's clock
and its animations moved on exactly 1/60 s, so the film is 60 fps, as sharp as a screenshot (2×),
and plays at the app's real speed (hovers, transitions, drawers sliding in) however slow the
computer. It takes about 25 seconds per 10 seconds filmed. A page load inside a recording is cut
out. If an app misbehaves with its clock controlled (it hangs, or its content never arrives), film
that recording live instead with `"filming": "live"` on its `record` step: real time, but 1×,
30 fps and less even. Each recording writes
`<id>.mp4` and `<id>.json` (its `duration`, size, and `marks`: when each step happened, in seconds),
so camera moves can land on the moment that matters.

## Their own recordings

People can bring screen recordings they made (QuickTime or the Mac's Screenshot app, the Windows
Snipping Tool, an iPhone or Android screen recording): ask them to put the file in the project or
give its path. `./render.sh clip <file> <name>` prepares it as `public/recordings/<name>.mp4` and
prints its length and size. Those show the real pointer, and a phone's recording belongs on a
phone: a phone frame built in the video's folder, with `<Recording>` as its screen (in a `Place`
for 3D). Watch it first (`./render.sh sheet
<file>`): demo data only, no notifications or private tabs on screen.

## Use them

`CapturedScreen` (references/scenes.md) shows the shots in a browser frame: `shots` switch at
their frames, `camera` keyframes zoom toward what matters (one move at a time, and the view stays
inside the screenshot), `cursor` glides to a point and clicks. Positions are fractions of the
screenshot; take a click's target from the screenshot the click happens in, before the screen
changes. Pair it with `ChapterTitle` for the words, as in any product scene.

A recording is a shot too: `{ src: film.src, at, length: film.duration }` plays from its `at` and
holds its last frame (import its .json: `import film from
'../../../public/captures/<slug>/add-task.json'`). It brings its own pointer, so leave `cursor` out
while it plays. Time the scene from it: `recordingFrames(film.duration, from, rate)`, and a camera
key at `at + mark.t * 60` lands on a step. A live recording (1×) looks soft zoomed past 1.5×;
frame-by-frame ones zoom like screenshots. Anywhere else (a phone screen, a `Flythrough` stop's
`visual`, a `Place`), use `<Recording src length />`, which fills its box.

The captures can be committed with the video's source, so it re-renders without the app running;
leave them out if they show anything that shouldn't be in the repo.
