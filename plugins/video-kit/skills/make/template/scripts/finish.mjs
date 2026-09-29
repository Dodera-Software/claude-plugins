// Runs inside the render image after a render (render.sh calls it):
//   1. previews: a JPEG thumbnail from the poster, in the video's own shape (1280×720 for wide, which
//      is what YouTube asks for; 1280×1280 square; 720×1280 tall), embedded in both MP4s as cover
//      art for players and file browsers that show it. Never stretched to a shape it isn't;
//   2. glitch scan: compares every frame with the one before it and flags a frame that jumps away
//      and comes straight back (two sharp changes in a row, 3× the frames around them, with calm on
//      either side), which reads as a flash or a pop. A cut changes once and stays; smooth fast
//      motion rises and falls over several frames: neither is flagged.
// Usage: node scripts/finish.mjs <slug>   (reads out/<slug>-4k.mp4, -1080p.mp4 and -poster.png)
import { spawnSync } from 'node:child_process'
import { readFileSync, renameSync, rmSync } from 'node:fs'

const FPS = 60

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.status !== 0) {
    throw new Error(result.stderr.slice(-2000))
  }
  return result.stderr
}

function scan(file) {
  const log = '/tmp/frame-differences.txt'
  ffmpeg(['-i', file, '-vf', `scale=480:-2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${log}`, '-f', 'null', '-'])
  const values = readFileSync(log, 'utf8').split('\n')
    .filter(line => line.startsWith('lavfi.signalstats.YAVG='))
    .map(line => Number(line.split('=')[1]))
  rmSync(log)
  // values[i] is how much frame i+1 differs from frame i. A frame that pops shows as two changes
  // in a row (into it, then back out of it), with quiet frames before and after.
  const pops = []
  values.forEach((into, i) => {
    const back = values[i + 1] ?? 0
    const around = [...values.slice(Math.max(0, i - 6), Math.max(0, i - 1)), ...values.slice(i + 3, i + 8)]
    if (!around.length) {
      return
    }
    const typical = around.sort((a, b) => a - b)[Math.floor(around.length / 2)]
    const spike = Math.min(into, back)
    const calmBefore = (values[i - 1] ?? 0) < 0.4 * spike
    const calmAfter = (values[i + 2] ?? 0) < 0.4 * spike
    if (spike > 2 && spike > 3 * Math.max(typical, 0.3) && calmBefore && calmAfter) {
      pops.push(`frame ${i + 1} (${((i + 1) / FPS).toFixed(2)} s): ${spike.toFixed(1)} vs ${typical.toFixed(1)} around it`)
    }
  })
  console.log(pops.length
    ? `${file}: ${pops.length} possible single-frame pops, check these:\n  ${pops.join('\n  ')}`
    : `${file}: no single-frame pops`)
}

function previews(slug) {
  const thumbnail = `out/${slug}-thumbnail.jpg`
  // The long side becomes 1280, the other follows: wide 1280×720, square 1280×1280, tall 720×1280.
  ffmpeg(['-y', '-i', `out/${slug}-poster.png`, '-vf', "scale='if(gte(iw,ih),1280,-2)':'if(gte(iw,ih),-2,1280)'", '-q:v', '3', thumbnail])
  for (const video of [`out/${slug}-4k.mp4`, `out/${slug}-1080p.mp4`]) {
    const temp = video.replace(/\.mp4$/, '.cover.mp4')
    ffmpeg(['-y', '-i', video, '-i', thumbnail, '-map', '0', '-map', '1', '-c', 'copy', '-disposition:v:1', 'attached_pic', '-movflags', '+faststart', temp])
    renameSync(temp, video)
  }
  console.log(`${thumbnail}: preview written and embedded in both videos`)
}

const slug = process.argv[2]
previews(slug)
scan(`out/${slug}-1080p.mp4`)
