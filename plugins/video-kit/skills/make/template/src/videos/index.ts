import type { VideoDefinition } from '../kit'
import { acmeTeaser } from './acme-teaser'

/** Every video in this studio. Add a new one here and it shows up in Studio and render.sh. */
export const VIDEOS: VideoDefinition[] = [acmeTeaser]
