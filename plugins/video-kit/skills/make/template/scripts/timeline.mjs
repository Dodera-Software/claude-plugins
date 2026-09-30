// Prints each video's timeline (where each scene starts and how long its entrance overlaps the
// previous one), so frames can be checked by number: `npm run timeline`. With --ids, just the ids.
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Written inside node_modules so the bundle's own imports resolve from there.
const outfile = 'node_modules/.cache/video-kit-timeline.mjs'
// The registry may hold JSX (index.tsx) or not (index.ts).
const entry = ['src/videos/index.tsx', 'src/videos/index.ts'].find(file => existsSync(file))
await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  packages: 'external',
  logLevel: 'error'
})
// Loading the kit loads three.js through a CommonJS path that prints a deprecation notice; it
// means nothing here, so keep the timeline's output clean.
process.removeAllListeners('warning')
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
