# Adding a brand

A brand is a folder `src/brands/<slug>/`, copied from the example `src/brands/acme/`:

- `tokens.ts`: the product's own design tokens, read from its CSS or theme (canvas, text greys,
  accent, borders, shadows), plus the font. Product mockups import these directly.
- `Logo.tsx`: the logo as an inline SVG component taking `size`. Take the paths from the product's
  favicon or logo SVG; never redraw a logo from memory.
- `index.ts`: the `Brand` object the kit reads through `useBrand()`: `name`, `domain`,
  `fontFamily`, `colors` (canvas, sheet, text, toned, muted, border, accent, accentSoft, accentInk,
  highlight, subtle), `shadow` (card, floating) and `Logo`; `LogoOnDark` too when the product has a
  version of its logo for dark backgrounds (the technical look uses it; without it the logo sits on
  a white tile there).

## Fonts: the product's own

The video speaks in the product's typeface, never a default: the same font in the rebuilt screens,
the captions and the titles makes it feel like theirs. Find it before anything else:

- Tailwind `fontFamily` (`tailwind.config.*`), CSS variables (`--font-sans`), `@font-face` rules,
  a Google Fonts `<link>` in `index.html`, `@fontsource/*` or `next/font` imports, font files in
  the repo (`public/fonts`, `assets/fonts`). In website mode, `brand.json` from `render.sh site`
  lists them.
- When the product has a display font for headings and a text font for the UI (Inter for
  headings, Open Sans for text), use the display font for `fontFamily`: the video's words are
  headings. The rebuilt screens use the UI font, as the product does.

Then load it:

- **On Google Fonts:** `@remotion/google-fonts/<Family>`
  (`loadFont('normal', { weights, subsets: ['latin', 'latin-ext'] })`); `latin-ext` carries the
  accented letters of Romanian, Polish, Czech, Turkish and others, and costs nothing when unused.
  Other scripts need their subset (`cyrillic`, `greek`, `vietnamese`).
- **Its own files** (a licensed or custom font in the repo): copy the weights the video uses into
  `public/fonts/` and use `brandFont('Family', [{ src: 'fonts/family-600.woff2', weight: '600' }])`
  as the Brand's `fontFamily`. It's their font, used for their video; don't copy it anywhere else.
- **A system stack** (`-apple-system, Segoe UI`): rendering runs in Linux, which doesn't have
  them; pick the closest Google font (SF Pro → Inter, Segoe → Open Sans, Helvetica → Inter or
  Arimo) and say so in a comment.

Only load the weights you use.
