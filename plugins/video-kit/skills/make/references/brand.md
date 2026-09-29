# Adding a brand

A brand is a folder `src/brands/<slug>/`, copied from the example `src/brands/acme/`:

- `tokens.ts`: the product's own design tokens, read from its CSS or theme (canvas, text greys,
  accent, borders, shadows), plus the font. Product mockups import these directly.
- `Logo.tsx`: the logo as an inline SVG component taking `size`. Take the paths from the product's
  favicon or logo SVG; never redraw a logo from memory.
- `index.ts`: the `Brand` object the kit reads through `useBrand()`: `name`, `domain`,
  `fontFamily`, `colors` (canvas, sheet, text, toned, muted, border, accent, accentSoft, accentInk,
  highlight, subtle), `shadow` (card, floating) and `Logo`.

## Fonts

Load with `@remotion/google-fonts/<Family>` (`loadFont('normal', { weights, subsets: ['latin', 'latin-ext'] })`);
`latin-ext` carries the accented letters of Romanian, Polish, Czech, Turkish and others, and costs
nothing when unused. Other scripts need their subset (`cyrillic`, `greek`, `vietnamese`).
Rendering runs in a Linux container, so system fonts (SF Pro, Segoe) aren't there: pick the
closest Google font (SF Pro → Inter, Segoe → Open Sans, Helvetica → Inter or Arimo) and say so in a
comment. Only load the weights you use.
