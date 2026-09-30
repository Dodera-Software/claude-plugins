// Prepares a screen recording someone made themselves (QuickTime, the Windows Snipping Tool, an
// iPhone or Android screen recording) for a video: H.264 at its own frame rate up to 60, no sound,
// at most 2880 px on its long side, starting on a keyframe so any moment can be shown. Prints its
// length and size, which the scene needs. Runs inside the render image (render.sh clip <file> <name>).
//
// Usage: node scripts/clip.mjs <input> <output.mp4>
import { spawnSync } from 'node:child_process'

const [input, output] = process.argv.slice(2)

function probe(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(`Can't read ${file} as a video: ${result.stderr}`)
    process.exit(1)
  }
  const info = JSON.parse(result.stdout)
  const [num, den] = String(info.streams[0].avg_frame_rate).split('/').map(Number)
  return { width: info.streams[0].width, height: info.streams[0].height, duration: Number(info.format.duration), fps: den ? num / den : 0 }
}

// Phone and screen recordings often change frame rate as they go; the video needs a steady one.
const source = probe(input)
const fps = Math.min(60, Math.round(source.fps) || 30)

const result = spawnSync('ffmpeg', [
  '-hide_banner', '-nostdin', '-v', 'error', '-y', '-i', input,
  '-an',
  '-vf', `fps=${fps},scale='if(gte(iw,ih),min(2880,iw),-2)':'if(gte(iw,ih),-2,min(2880,ih))':flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-g', '30', '-movflags', '+faststart',
  output
], { stdio: 'inherit' })
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
const { width, height, duration } = probe(output)
console.log(`${output}: ${duration.toFixed(2)} s, ${width}×${height}`)
