// Runs inside the render image after a render (render.sh calls it): compares every frame with the
// one before it and flags single-frame spikes (3× their neighbours), which read as a flash or a pop.
// Usage: node scripts/finish.mjs video.mp4
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'

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
  const pops = []
  values.forEach((value, frame) => {
    const around = [...values.slice(Math.max(0, frame - 6), frame - 1), ...values.slice(frame + 2, frame + 7)]
    if (!around.length) {
      return
    }
    const typical = around.sort((a, b) => a - b)[Math.floor(around.length / 2)]
    if (value > 2 && value > 3 * Math.max(typical, 0.3)) {
      pops.push(`frame ${frame + 1} (${((frame + 1) / FPS).toFixed(2)} s): ${value.toFixed(1)} vs ${typical.toFixed(1)} around it`)
    }
  })
  console.log(pops.length
    ? `${file}: ${pops.length} possible single-frame pops, check these:\n  ${pops.join('\n  ')}`
    : `${file}: no single-frame pops`)
}

scan(process.argv[2])
