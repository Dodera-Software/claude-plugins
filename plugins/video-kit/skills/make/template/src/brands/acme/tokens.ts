import { loadFont } from '@remotion/google-fonts/Inter'

/** A made-up product for the example video. A real brand's tokens come from its own CSS or theme. */
export const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })

export const color = {
  canvas: '#F7F7F5',
  sheet: '#FFFFFF',
  text: '#18181B',
  toned: '#3F3F46',
  muted: '#71717A',
  border: '#E4E4E7',
  teal: '#0F766E',
  tealSoft: '#CCFBF1',
  tealInk: '#134E4A',
  marker: '#FEF08A',
  subtle: '#F0FDFA'
}

export const shadow = {
  card: '0 1px 2px rgba(24,24,27,0.06), 0 8px 24px rgba(24,24,27,0.08)',
  floating: '0 2px 6px rgba(24,24,27,0.08), 0 24px 64px rgba(24,24,27,0.14)'
}
