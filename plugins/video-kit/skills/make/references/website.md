# From a website

For a product whose code isn't here: the person only has its public website, or prefers its look
and wording to what the code shows. The video's look, logo and facts come from the site.

## Read it

```bash
./render.sh site https://example.com <slug> /pricing /features
```

The address first, then the video's folder name, then up to four pages the video should show (the
home page is always read). Pick them from the site's own navigation: the pages about the feature or
story in the brief, rarely more than two. It writes to `public/site/<slug>/`:

- `brand.json`: the home page's design as it renders.
  - `siteName`.
  - `colors.semantic`: `primary`, `secondary`, `background`, `text`, `accent`. Also `colors.palette`
    by use and `colors.cssVariables`.
  - `typography.styles` and `typography.sources`: `googleFonts`, and the font files the site loads.
  - `borderRadius`, `shadows`, and `logo` (with `color`, the colour it's drawn in).
  - `voice.fragments`: the page's own words, by role (`hero-h1`, `hero-body`, `value-prop`, `claim`,
    `cta`, `social-proof`…).
- `pages.json`: the words of every extra page, by role.
- `home.txt`, `<page>.txt`: all the text each page shows, in reading order. The roles above are a
  best guess and can miss a headline that animates in; this is the complete wording, so read it.
- `logo.svg` (or `.png`): the logo from the page's header.
- `home.png`, `<page>.png`: clean screenshots at 1440×900, 2×, with cookie notices hidden.

Look at every screenshot and the logo before using them.

## The brand

Build `src/brands/<slug>/` from `brand.json` (references/brand.md), mapping:

- `canvas` / `sheet`: the page background and the colour of its cards.
- `text` / `muted`: the text colours.
- `accent`: the colour of the main button (`components.buttons`, or `colors.semantic.primary` when
  that is a real colour, not a grey).
- `shadow`: from `shadows`; the radii from `borderRadius` go into `tokens.ts` for mockups.
- **Font:** a Google font used by the site loads as is. For a self-hosted open font, load it from
  Google Fonts under the same name (Inter, Manrope, DM Sans…). For a paid font, pick the closest
  Google font and tell the person in one line which one stands in.
- **Logo:** from `logo.svg`. Replace `currentColor` with `logo.color`, and on a dark canvas keep
  the colour the site uses there. A PNG logo goes in `public/site/<slug>/` and shows through `<Img>`.
  With no logo, use the favicon (`brand.json` → `favicons`), or ask for the logo file in one plain
  sentence.

## The story

The video is about the company or product itself: what it is, what it does, for whom, and how,
from the site's own headline, services or features, and how-it-works sections. That is the default
story and the first option offered.

Case studies, client quotes and numbers from them are proof, not the story. Use them only when the
person picks that angle, and even then as one short beat, never as the opening.

## The facts

With no code to check, the site is the only source. Every claim in the video must be something the
site says, in the `.txt` files, `voice.fragments` or `pages.json`, and `BRIEF.md` names the page and role for each.
Keep the site's own product names and headline, trim for reading time, never add numbers, customers
or features it doesn't state. Testimonials and customer logos appear only as the site shows them.

## The screens

- **Public pages:** `CapturedScreen` with `home.png` and the other shots
  (`staticFile('site/<slug>/home.png')`). Camera moves toward the part the scene is about.
- **The product itself, behind a login:** the capture flow (references/capture.md) works against
  the live site too. Use its real address as `baseUrl`, with a demo account from the person. The
  same rules apply: demo data only, never a real account.
- **Rebuilt screens:** only when the screenshots show enough of the UI to rebuild it faithfully.
  Never invent screens the site doesn't show.

## Where the video lives

Where the person is working, like any other video: the `video/` folder in the current folder,
created if it isn't there, or next to the videos already in it.
