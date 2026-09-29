import type { Brand } from '../../kit/brand'
import { Logo } from './Logo'
import { color, fontFamily, shadow } from './tokens'

export const acme: Brand = {
  name: 'Acme Tasks',
  domain: 'acme.example',
  fontFamily,
  colors: {
    canvas: color.canvas,
    sheet: color.sheet,
    text: color.text,
    toned: color.toned,
    muted: color.muted,
    border: color.border,
    accent: color.teal,
    accentSoft: color.tealSoft,
    accentInk: color.tealInk,
    highlight: color.marker,
    subtle: color.subtle
  },
  shadow,
  Logo
}
