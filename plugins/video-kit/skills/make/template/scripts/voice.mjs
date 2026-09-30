// Records voiceovers on the computer (not in Docker): installs the voice engine once into a cache
// outside the project (~/.cache/video-kit, keyed by voice/package.json so an update reinstalls it),
// keeps the voices there too (or uses pr-podcast's, when it already downloaded them), and runs
// voice/speak.mjs from that folder. render.sh calls this.
//
//   node scripts/voice.mjs --setup                             install, download the voices, "ready"
//   node scripts/voice.mjs <folder>                            src/videos/<folder>/voice.json
//                                                              → public/voice/<folder>/*.wav + voice.json
//   node scripts/voice.mjs --sample "<text>" <voice> [voice …] → out/voice-samples/<voice>.wav
//
// Only Node is needed. Same on macOS, Windows and Linux.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 20 || (major === 20 && minor < 11)) {
  fail(`Node.js 20 or newer is needed (this is ${process.versions.node}).`)
}

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const engine = path.join(studio, 'voice')
const home = process.env.VIDEO_KIT_HOME || path.join(os.homedir(), '.cache', 'video-kit')
const manifest = fs.readFileSync(path.join(engine, 'package.json'), 'utf8').replace(/\r\n/g, '\n')
const dir = path.join(home, `voice-${createHash('sha256').update(manifest).digest('hex').slice(0, 10)}`)
const ready = path.join(dir, '.ready')

if (!fs.existsSync(ready)) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  for (const file of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(engine, file), path.join(dir, file))
  }
  console.error('Installing the voice engine (only the first time, about a minute)…')
  const npm = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: dir,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32'
  })
  if (npm.status !== 0) {
    fail('Installing the voice engine failed (see above). Is there an internet connection?')
  }
  fs.writeFileSync(ready, new Date().toISOString())
  // Older engines are ours and unused now; nothing on the way out may fail.
  for (const old of fs.readdirSync(home)) {
    if (old.startsWith('voice-') && path.join(home, old) !== dir) {
      try {
        fs.rmSync(path.join(home, old), { recursive: true, force: true })
      } catch {}
    }
  }
}

// The same voices pr-podcast uses: when it has downloaded them already, don't download them twice.
const shared = path.join(os.homedir(), '.cache', 'pr-podcast', 'models')
const models = fs.existsSync(path.join(shared, 'onnx-community')) ? shared : path.join(home, 'models')

const [first, ...rest] = process.argv.slice(2)
let args
if (first === '--setup') {
  args = ['--setup']
} else if (first === '--sample') {
  args = ['--sample', rest[0] ?? '', path.join(studio, 'out', 'voice-samples'), ...rest.slice(1)]
} else if (first) {
  const script = path.join(studio, 'src', 'videos', first, 'voice.json')
  if (!fs.existsSync(script)) {
    fail(`No src/videos/${first}/voice.json`)
  }
  args = [script, path.join(studio, 'public', 'voice', first), `voice/${first}`]
} else {
  fail('Usage: node scripts/voice.mjs <folder> | --sample "<text>" <voice> … | --setup')
}

fs.copyFileSync(path.join(engine, 'speak.mjs'), path.join(dir, 'speak.mjs'))
const run = spawnSync(process.execPath, [path.join(dir, 'speak.mjs'), ...args], {
  stdio: 'inherit',
  env: { ...process.env, VIDEO_KIT_MODELS: models }
})
process.exit(run.status ?? 1)
