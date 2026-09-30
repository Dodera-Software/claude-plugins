import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

/**
 * The product's own font from its own files (copied from its repo into public/fonts/), for brands
 * whose font isn't on Google Fonts: returns the `fontFamily` for the Brand. Load only the weights
 * the video uses.
 *
 *   fontFamily: brandFont('Söhne', [{ src: 'fonts/soehne-400.woff2', weight: '400' }, …])
 */
export function brandFont(family: string, files: { src: string, weight?: string, style?: string }[]): string {
  // Only in the browser that draws the video: `npm run timeline` reads the same code in Node.
  if (typeof document !== 'undefined') {
    for (const file of files) {
      loadFont({ family, url: staticFile(file.src), weight: file.weight ?? '400', style: file.style ?? 'normal' })
    }
  }
  return `"${family}", Inter, sans-serif`
}
