# Captured screens

The alternative to rebuilding the product's screens in React: screenshots of the real app, running
on this machine, animated in the video with a browser frame, camera moves and a cursor. Choose it
only when the person picks "Real screenshots of the running app".

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

- `baseUrl`: the app's address with the host replaced by `host.docker.internal` (the capture runs
  in Docker; this reaches the Mac's localhost, including servers bound to 127.0.0.1). Keep the port,
  protocol and path prefix you found: `https://localhost:3300` becomes
  `https://host.docker.internal:3300`.
- `viewport`: 1440×900 unless the product is best seen wider or narrower; shots are taken at 2×.
- `login`: the steps to sign in, reading `$VIDEO_LOGIN_EMAIL` and `$VIDEO_LOGIN_PASSWORD`.
- `steps`: go to each screen, wait for real content (`waitFor` a selector or `::-p-text(…)`), and
  take a `shot` of each state the video needs: before and after each action it shows.

Run it: `VIDEO_LOGIN_EMAIL=… VIDEO_LOGIN_PASSWORD=… ./render.sh capture <slug>`. Screenshots land in
`public/captures/<slug>/`. If a step fails, `_failed.png` there shows the page at that moment. Look
at every screenshot: no real data, no error toasts, no half-loaded states, no cookie banners.

## Use them

`CapturedScreen` (references/scenes.md) shows the shots in a browser frame: `shots` switch at
their frames, `camera` keyframes zoom toward what matters (one move at a time, and the view stays
inside the screenshot), `cursor` glides to a point and clicks. Positions are fractions of the
screenshot; take a click's target from the screenshot the click happens in, before the screen
changes. Pair it with `ChapterTitle` for the words, as in any product scene.

The captures can be committed with the video's source, so it re-renders without the app running;
leave them out if they show anything that shouldn't be in the repo.
