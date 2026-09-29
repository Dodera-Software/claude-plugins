// Prints each video's timeline (where each scene starts and how long its entrance overlaps the
// previous one), so frames can be checked by number: `npm run timeline`. With --ids, just the ids.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'

// Written inside node_modules so the bundle's own imports resolve from there.
const outfile = 'node_modules/.cache/video-kit-timeline.mjs'
await build({
  entryPoints: ['src/videos/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  packages: 'external',
  logLevel: 'error'
})
const { VIDEOS } = await import(pathToFileURL(outfile).href)
if (process.argv.includes('--ids')) {
  console.log(VIDEOS.map(video => video.id).join('\n'))
  process.exit(0)
}
for (const video of VIDEOS) {
  const { starts, frames, enters, cover } = video.timeline
  console.log(`${video.id}: ${video.durationInFrames} frames (${(video.durationInFrames / video.fps).toFixed(1)} s)`)
  starts.forEach((start, index) => console.log(`  ${cover && index === 0 ? 'cover  ' : `scene ${cover ? index - 1 : index}`}  start ${String(start).padStart(5)}  frames ${String(frames[index]).padStart(4)}  enters over ${enters[index]}`))
}
