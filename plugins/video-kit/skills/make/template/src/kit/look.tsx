import { loadFont } from '@remotion/google-fonts/JetBrainsMono'
import { converter, formatHex, interpolate, wcagContrast } from 'culori'
import { createContext, useContext, type ReactNode } from 'react'
import { Easing } from 'remotion'
import type { Brand } from './brand'

/**
 * The feel of a whole video, chosen per video, over the same brand:
 * - editorial: calm and spacious, light type, words drift into focus.
 * - bold: the brand colour fills the frame, heavy type, fast and punchy.
 * - technical: dark, a faint grid, monospaced labels, text that snaps in like a terminal.
 * - playful: a tinted canvas with drifting shapes, rounder, words that bounce in.
 */
export type LookName = 'editorial' | 'bold' | 'technical' | 'playful'

export interface Look {
  name: LookName
  type: {
    /** Headline weight and letter spacing. */
    weight: number
    tracking: string
    /** Multiplies the kit's base headline sizes. */
    scale: number
    /** Label (eyebrow) font; the monospace one in technical. */
    labelFont?: string
  }
  motion: {
    ease: (t: number) => number
    /** Frames between words. */
    stagger: number
    /** Frames each word takes to arrive. */
    duration: number
    /** How far a word rises as it arrives, in em. */
    rise: number
    blur: number
    /** How small a word starts, 0 = full size (bouncy looks start smaller and overshoot). */
    pop: number
  }
  /** Headlines left-aligned or centred. */
  align: 'left' | 'center'
  /** Multiplies corner radii. */
  round: number
  backdrop: 'none' | 'grid' | 'shapes'
  /** Monospace family for code and terminals, in every look. */
  mono: string
}

const { fontFamily: mono } = loadFont('normal', { weights: ['400', '500', '700'], subsets: ['latin', 'latin-ext'] })

const LOOKS: Record<LookName, Omit<Look, 'name' | 'mono'>> = {
  editorial: {
    type: { weight: 500, tracking: '-0.03em', scale: 1.04 },
    motion: { ease: Easing.bezier(0.16, 1, 0.3, 1), stagger: 5, duration: 48, rise: 0.3, blur: 8, pop: 0 },
    align: 'left',
    round: 1,
    backdrop: 'none'
  },
  bold: {
    type: { weight: 800, tracking: '-0.05em', scale: 1.22 },
    motion: { ease: Easing.bezier(0.2, 0.9, 0.1, 1), stagger: 2, duration: 20, rise: 0.6, blur: 0, pop: 0 },
    align: 'left',
    round: 0.6,
    backdrop: 'none'
  },
  technical: {
    type: { weight: 600, tracking: '-0.03em', scale: 0.94, labelFont: mono },
    motion: { ease: Easing.out(Easing.quad), stagger: 3, duration: 8, rise: 0, blur: 0, pop: 0 },
    align: 'left',
    round: 0.5,
    backdrop: 'grid'
  },
  playful: {
    type: { weight: 700, tracking: '-0.03em', scale: 1.08 },
    motion: { ease: Easing.bezier(0.34, 1.56, 0.64, 1), stagger: 4, duration: 30, rise: 0.4, blur: 0, pop: 0.35 },
    align: 'center',
    round: 1.5,
    backdrop: 'shapes'
  }
}

const toOklch = converter('oklch')

function mixed(from: string, to: string, amount: number): string {
  return formatHex(interpolate([from, to], 'oklab')(amount))
}

/** The colour lightened (or darkened) until it reads on `background` at `ratio`. */
function readable(color: string, background: string, ratio: number): string {
  const base = toOklch(color)
  if (!base) {
    return color
  }
  const lighter = (toOklch(background)?.l ?? 1) < 0.5
  let candidate = color
  for (let step = 0; step <= 20 && wcagContrast(candidate, background) < ratio; step++) {
    candidate = formatHex({ ...base, l: Math.min(1, Math.max(0, base.l + (lighter ? 1 : -1) * step * 0.03)) })
  }
  return candidate
}

/**
 * The brand's colours for a look. Editorial keeps them as they are; bold paints the canvas in the
 * brand colour; technical goes dark with the accent kept readable; playful tints the canvas.
 */
export function lookColors(brand: Brand, name: LookName): Brand {
  const c = brand.colors
  if (name === 'bold') {
    const ink = wcagContrast('#ffffff', c.accent) >= wcagContrast(c.text, c.accent) ? '#ffffff' : c.text
    const second = ink === '#ffffff' ? c.text : '#ffffff'
    return {
      ...brand,
      colors: {
        canvas: c.accent,
        // Cards a shade off the canvas, so the canvas's text colour reads on them too.
        sheet: mixed(c.accent, ink === '#ffffff' ? '#000000' : '#ffffff', 0.18),
        text: ink,
        toned: mixed(ink, c.accent, 0.12),
        muted: mixed(ink, c.accent, 0.3),
        border: mixed(c.accent, ink, 0.25),
        accent: wcagContrast(second, c.accent) >= 2.5 ? second : mixed(c.accent, '#000000', 0.6),
        accentSoft: mixed(c.accent, ink, 0.18),
        accentInk: c.accent,
        highlight: mixed(c.accent, ink, 0.3),
        subtle: mixed(c.accent, ink, 0.1)
      }
    }
  }
  if (name === 'technical') {
    const canvas = mixed('#0b0d10', c.accent, 0.04)
    const accent = readable(c.accent, canvas, 4.5)
    return {
      ...brand,
      colors: {
        canvas,
        sheet: mixed(canvas, '#ffffff', 0.05),
        text: '#eef0f3',
        toned: '#c4c9d1',
        muted: '#8a919c',
        border: mixed(canvas, '#ffffff', 0.12),
        accent,
        accentSoft: mixed(canvas, accent, 0.2),
        accentInk: mixed(accent, '#ffffff', 0.35),
        highlight: mixed(canvas, accent, 0.35),
        subtle: mixed(canvas, accent, 0.1)
      },
      shadow: { card: `0 0 0 1px ${mixed(canvas, '#ffffff', 0.12)}, 0 12px 32px rgba(0,0,0,0.45)`, floating: `0 0 0 1px ${mixed(canvas, '#ffffff', 0.14)}, 0 30px 80px rgba(0,0,0,0.6)` }
    }
  }
  if (name === 'playful') {
    return { ...brand, colors: { ...c, canvas: mixed(c.canvas, c.accent, 0.07) } }
  }
  return brand
}

export function lookFor(name: LookName): Look {
  return { name, mono, ...LOOKS[name] }
}

const LookContext = createContext<Look>(lookFor('editorial'))

export function LookProvider({ look, children }: { look: LookName, children: ReactNode }) {
  return <LookContext.Provider value={lookFor(look)}>{children}</LookContext.Provider>
}

/** The video's look: type, motion, alignment and roundness for kit and product scenes alike. */
export function useLook(): Look {
  return useContext(LookContext)
}

/** White or the darkest text colour, whichever reads better on `background`. */
export function inkOn(background: string, dark = '#111111'): string {
  return wcagContrast('#ffffff', background) >= wcagContrast(dark, background) ? '#ffffff' : dark
}
