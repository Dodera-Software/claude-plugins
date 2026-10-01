// Renders videos inside Docker, so no browser is installed on the computer. The same on macOS,
// Linux and Windows (Claude Code runs it through Git Bash there). Starts Docker Desktop if it isn't
// running and leaves it running: people use it for other things, and quitting it is theirs to do.
// Every container it starts is removed when its work is done. render.sh calls this.
//
//   ./render.sh                          list the videos
//   ./render.sh AcmeTeaser-en            → out/acme-teaser-en-4k.mp4, -1080p.mp4, -poster.png, -thumbnail.jpg
//   ./render.sh AcmeTeaser-en quick      → only the 1080p one (a draft to watch: about 4× faster)
//   ./render.sh AcmeTeaser-en 4k         → only the 4K one
//                                        While it renders, out/progress.txt holds one line: how far
//                                        along the whole video is, and about how long is left.
//   ./render.sh AcmeTeaser-en still 120 900  single frames, to check a layout
//   ./render.sh sheet ~/Downloads/reference.mp4  2 frames a second on contact sheets, to study a video
//   ./render.sh setup                    get the render image ready (the first time: about 3 GB, 5–10 minutes)
//   ./render.sh clean                    remove render images other than this one (also done after every new build)
//   ./render.sh capture <folder>         screenshots and recordings of the running app from
//                                        src/videos/<folder>/capture.json (login details as VIDEO_* variables)
//   ./render.sh clip <file> <name>       a screen recording someone made → public/recordings/<name>.mp4
//   ./render.sh site <url> <folder> [/page …]  colours, fonts, logo, wording and screenshots of a
//                                        public website → public/site/<folder>/
//   ./render.sh show <file>              open a finished video and show it in its folder
//   ./render.sh voice <folder>           record src/videos/<folder>/voice.json → public/voice/<folder>/
//   ./render.sh voice-sample "<line>" af_heart am_michael …  the line in each voice → out/voice-samples/
//   ./render.sh room [VideoId]           the edit room: the videos live in the browser, to change and
//                                        export (on the computer with Node, only on 127.0.0.1)
//                                        (voices run on the computer with Node, no Docker)
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAC = process.platform === 'darwin'
const WINDOWS = process.platform === 'win32'
const MAC_APP = '/Applications/Docker.app/Contents/MacOS/Docker'
const WINDOWS_APP = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe')

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** Runs a command where the person can see it; stops everything on failure. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    finish(result.status ?? 1)
  }
  return result
}

/** Runs a command quietly: true when it succeeded within `timeout` ms. */
function quietly(command, args, timeout = 30000) {
  return spawnSync(command, args, { stdio: 'ignore', timeout }).status === 0
}

function output(command, args, timeout = 30000) {
  return spawnSync(command, args, { encoding: 'utf8', timeout }).stdout ?? ''
}

/**
 * A path given in Git Bash on Windows (/c/Users/…) as Windows understands it (C:/Users/…). render.sh
 * turns Git Bash's own path rewriting off, so web paths like /pricing reach the scripts intact.
 */
function hostPath(path) {
  const drive = WINDOWS && /^\/([a-z])\//i.exec(path)
  return resolve(drive ? `${drive[1]}:/${path.slice(3)}` : path)
}

// Docker Desktop: starting it, noticing it hangs, and stopping it again.

// A half-started engine makes `docker ps` hang instead of fail, so every check gets 5 seconds.
function dockerAnswers() {
  return quietly('docker', ['ps'], 5000)
}

function dockerReady(seconds) {
  for (let i = 0; i < seconds; i++) {
    if (dockerAnswers()) {
      return true
    }
    sleep(1000)
  }
  return false
}

function desktopRunning() {
  if (MAC) {
    return quietly('pgrep', ['-f', MAC_APP])
  }
  if (WINDOWS) {
    return output('tasklist', ['/FI', 'IMAGENAME eq Docker Desktop.exe']).includes('Docker Desktop.exe')
  }
  return false
}

// Docker Desktop sometimes hangs while starting, or ignores a start while it is still quitting.
// Let any shutdown finish, then start it.
function launchDocker() {
  for (let i = 0; i < 30 && desktopRunning(); i++) {
    sleep(1000)
  }
  if (MAC) {
    if (desktopRunning()) {
      quietly('pkill', ['-f', MAC_APP])
      sleep(3000)
    }
    quietly('open', ['-a', 'Docker'])
  } else if (WINDOWS) {
    if (desktopRunning()) {
      quietly('taskkill', ['/F', '/IM', 'Docker Desktop.exe'])
      sleep(3000)
    }
    spawn(WINDOWS_APP, [], { detached: true, stdio: 'ignore' }).unref()
  }
}

// Only for a Docker Desktop stuck while starting: quit it (it sometimes ignores "quit"; give it 20
// seconds, then stop it) so it can be started again.
function quitStuckDocker() {
  if (MAC) {
    quietly('osascript', ['-e', 'quit app "Docker"'])
  } else if (WINDOWS) {
    quietly('taskkill', ['/IM', 'Docker Desktop.exe'])
  }
  for (let i = 0; i < 20 && desktopRunning(); i++) {
    sleep(1000)
  }
  sleep(5000)
  if (MAC) {
    // Whatever ignored "quit": the app, its backend and build processes, and the agent helper it
    // leaves behind on every start.
    quietly('pkill', ['-f', '/Applications/Docker.app/Contents/MacOS/'])
    quietly('pkill', ['-f', 'Docker.app/Contents/Resources/cli-plugins/docker-agent serve api'])
  } else if (WINDOWS) {
    quietly('taskkill', ['/F', '/IM', 'Docker Desktop.exe'])
    quietly('taskkill', ['/F', '/IM', 'com.docker.backend.exe'])
  }
}

function finish(code = 0) {
  process.exit(code)
}

function startDocker() {
  if (dockerAnswers()) {
    return
  }
  if (!MAC && !WINDOWS) {
    console.error('Docker is not running. Start it (for example `sudo systemctl start docker`, or open Docker Desktop) and try again.')
    process.exit(1)
  }
  if (!existsSync(MAC ? '/Applications/Docker.app' : WINDOWS_APP)) {
    console.error('Docker Desktop is not installed: https://www.docker.com/products/docker-desktop/')
    process.exit(1)
  }
  console.log('Starting Docker Desktop...')
  launchDocker()
  if (!dockerReady(120)) {
    console.log('Docker is stuck starting; restarting it once...')
    quitStuckDocker()
    launchDocker()
    if (!dockerReady(150)) {
      console.error('Docker did not start')
      finish(1)
    }
  }
}

// The render image.

// Named after what goes into it, so projects on the same kit share one image. The lockfile is left
// out on purpose: `npm install` rewrites it without changing anything the image needs. Line endings
// are evened out, so a Windows checkout names the same image.
function imageName() {
  const hash = createHash('sha1')
  for (const file of ['package.json', 'Dockerfile', 'fonts.conf']) {
    hash.update(readFileSync(join(HERE, file), 'utf8').replace(/\r\n/g, '\n'))
  }
  return `video-kit:${hash.digest('hex').slice(0, 12)}`
}

// Every render image except this project's current one, the layers rebuilds leave untagged and the
// build cache: each is 2-3 GB, and a new kit version makes a new one.
function removeOldImages(image) {
  const old = output('docker', ['images', '--format', '{{.Repository}}:{{.Tag}}'])
    .split('\n').filter(name => name.startsWith('video-kit:') && name !== image)
  if (old.length) {
    quietly('docker', ['rmi', ...old], 120000)
  }
  quietly('docker', ['image', 'prune', '-f'], 120000)
  quietly('docker', ['builder', 'prune', '-f'], 120000)
  return old
}

function ensureImage(image) {
  if (!quietly('docker', ['image', 'inspect', image])) {
    console.log('Setting up the video app: a one-time download of about 3 GB, usually 5–10 minutes...')
    run('docker', ['build', '-t', image, '.'], { cwd: HERE })
    removeOldImages(image)
  }
  // A build interrupted by Docker stopping can leave empty files in the image; rebuild it clean.
  const size = Number(output('docker', ['run', '--rm', '--entrypoint', 'sh', image, '-c', 'wc -c < package.json'], 60000).trim())
  if (!(size >= 10)) {
    run('docker', ['build', '--no-cache', '-t', image, '.'], { cwd: HERE })
  }
}

/** Runs a command in the render image with the project mounted; `entrypoint` replaces `npx remotion`. */
function inImage(image, args, options = {}) {
  run('docker', dockerArgs(image, args, options))
}

function dockerArgs(image, args, { entrypoint, publicMode = 'ro', extraMount } = {}) {
  // Only VIDEO_* variables reach the container (login details for capture); nothing else leaks in.
  const env = Object.keys(process.env).filter(name => /^VIDEO_[A-Za-z0-9_]*$/.test(name)).flatMap(name => ['-e', name])
  const mount = (from, to, mode) => ['-v', `${join(HERE, from)}:${to}${mode ? `:${mode}` : ''}`]
  return [
    'run', '--rm',
    ...(entrypoint ? ['--entrypoint', entrypoint] : []),
    ...(extraMount ? ['-v', extraMount] : []),
    ...env,
    '--add-host=host.docker.internal:host-gateway',
    ...mount('src', '/video/src', 'ro'),
    ...mount('public', '/video/public', publicMode),
    ...mount('remotion.config.ts', '/video/remotion.config.ts', 'ro'),
    ...mount('tsconfig.json', '/video/tsconfig.json', 'ro'),
    ...mount('scripts', '/video/scripts', 'ro'),
    ...mount('out', '/video/out'),
    image, ...args
  ]
}

/**
 * How far the whole render is, across its passes, in out/progress.txt: one line in plain words
 * ("42% · about 6 min left · the 4K version"), which Claude reads to tell the person how it's
 * going. Each pass is a share of the whole (`from` to `to`); the time left comes from the pace so far.
 */
const progress = {
  started: Date.now(),
  write(fraction, what) {
    const done = Math.min(1, Math.max(0, fraction))
    const elapsed = (Date.now() - this.started) / 1000
    const left = done > 0.02 ? (elapsed / done) * (1 - done) : null
    const time = done >= 1 ? '' : left === null ? 'working out the time left' : left < 60 ? 'under a minute left' : `about ${Math.round(left / 60)} min left`
    try {
      writeFileSync(join(HERE, 'out', 'progress.txt'), `${[`${Math.floor(done * 100)}%`, time, what].filter(Boolean).join(' · ')}\n`)
    } catch {}
  }
}

/**
 * A full render pass, reporting its frames into the progress between `from` and `to`. Many 3D
 * frames at 4K can run the browser out of memory with a tab per core; the pass is then tried once
 * more with two tabs, slower but within memory.
 */
async function renderPass(image, args, { from, to, what }) {
  const attempt = extra => new Promise(done => {
    const child = spawn('docker', dockerArgs(image, [...args, ...extra]), { stdio: ['ignore', 'pipe', 'pipe'] })
    let last = 0
    const read = chunk => {
      const text = chunk.toString()
      process.stdout.write(text)
      const matches = [...text.matchAll(/Rendered (\d+)\/(\d+)/g)]
      const match = matches.at(-1)
      if (match && Date.now() - last > 1000) {
        last = Date.now()
        progress.write(from + (to - from) * (Number(match[1]) / Number(match[2])), what)
      }
    }
    child.stdout.on('data', read)
    child.stderr.on('data', read)
    child.on('close', code => done(code))
  })
  progress.write(from, what)
  if (await attempt(process.env.VIDEO_CONCURRENCY ? [`--concurrency=${process.env.VIDEO_CONCURRENCY}`] : []) === 0) {
    return
  }
  console.log('The render ran out of room; trying again more slowly, two frames at a time...')
  progress.write(from, `${what}, again more slowly`)
  if (await attempt(['--concurrency=2']) !== 0) {
    progress.write(from, 'stopped: the render failed')
    console.error('The render failed (see above).')
    process.exit(1)
  }
}

// On Linux the container writes as root; hand what it made back to whoever runs this, or they
// couldn't delete it (Docker Desktop on a Mac or Windows already does this).
function handBack(image, ...paths) {
  if (process.platform === 'linux' && process.getuid) {
    inImage(image, ['-R', `${process.getuid()}:${process.getgid()}`, ...paths], { entrypoint: 'chown', publicMode: 'rw' })
  }
}

// The commands.

const [command, ...rest] = process.argv.slice(2)

if (!command) {
  run('node', ['scripts/timeline.mjs', '--ids'], { cwd: HERE })
  process.exit(0)
}

if (command === 'show') {
  const file = hostPath(rest[0] ?? '')
  if (!existsSync(file)) {
    console.error(`No such file: ${file}`)
    process.exit(1)
  }
  if (MAC) {
    quietly('open', [file])
    quietly('open', ['-R', file])
  } else if (WINDOWS) {
    spawn('cmd', ['/c', 'start', '""', `"${file}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref()
    spawn('explorer', [`/select,${file}`], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [file], { detached: true, stdio: 'ignore' }).unref()
  }
  process.exit(0)
}

if (command === 'room') {
  const result = spawnSync(process.execPath, [join(HERE, 'scripts', 'room.mjs'), ...rest], { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

if (command === 'voice' || command === 'voice-sample') {
  const args = command === 'voice' ? rest : ['--sample', ...rest]
  const result = spawnSync(process.execPath, [join(HERE, 'scripts', 'voice.mjs'), ...args], { stdio: 'inherit' })
  process.exit(result.status ?? 1)
}

const slug = command.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
startDocker()
const image = imageName()

if (command === 'clean') {
  const old = removeOldImages(image)
  console.log(`Removed: ${old.join(' ') || 'nothing'}`)
  finish()
}

ensureImage(image)
if (command === 'setup') {
  console.log('The video app is ready.')
  finish()
}
mkdirSync(join(HERE, 'out'), { recursive: true })

if (command === 'sheet') {
  const reference = hostPath(rest[0] ?? '')
  if (!existsSync(reference)) {
    console.error(`Give the video to study: ./render.sh sheet <file> (${reference} doesn't exist)`)
    finish(1)
  }
  const name = basename(reference, extname(reference))
  inImage(image, ['-v', 'error', '-y', '-i', `/reference/${basename(reference)}`, '-vf', 'fps=2,scale=480:-2,tile=5x4', `out/${name}-sheet-%02d.png`],
    { entrypoint: 'ffmpeg', extraMount: `${dirname(reference)}:/reference:ro` })
  handBack(image, 'out')
  console.log(`Contact sheets: out/${name}-sheet-*.png (20 frames each, 0.5 s apart)`)
  finish()
}

if (command === 'clip') {
  const [from, name] = rest
  const source = hostPath(from ?? '')
  if (!existsSync(source) || !name) {
    console.error('Give the recording and a name: ./render.sh clip <file> <name>')
    finish(1)
  }
  mkdirSync(join(HERE, 'public', 'recordings'), { recursive: true })
  console.log(`Preparing ${basename(source)}...`)
  inImage(image, ['scripts/clip.mjs', `/clip/${basename(source)}`, `public/recordings/${name}.mp4`],
    { entrypoint: 'node', publicMode: 'rw', extraMount: `${dirname(source)}:/clip:ro` })
  handBack(image, `public/recordings/${name}.mp4`)
  finish()
}

if (command === 'capture') {
  const folder = rest[0]
  if (!folder || !existsSync(join(HERE, 'src', 'videos', folder, 'capture.json'))) {
    console.error(`No src/videos/${folder ?? '<folder>'}/capture.json`)
    finish(1)
  }
  console.log('Capturing from the running app (it must be up, with its database and demo data)...')
  // An app on this computer that listens only on ::1 gets a way in from Docker for the capture.
  const plan = JSON.parse(readFileSync(join(HERE, 'src', 'videos', folder, 'capture.json'), 'utf8'))
  const base = new URL(plan.baseUrl)
  const ports = ['localhost', '127.0.0.1'].includes(base.hostname)
    ? [Number(base.port || (base.protocol === 'https:' ? 443 : 80)), ...(plan.forward ?? [])]
    : []
  const bridge = ports.length ? spawn(process.execPath, [join(HERE, 'scripts', 'bridge.mjs'), ...ports.map(String)], { stdio: 'inherit' }) : null
  if (bridge) {
    // A failed capture ends this script with process.exit, which would leave the bridge running.
    process.on('exit', () => bridge.kill())
    sleep(1500)
  }
  inImage(image, ['scripts/capture.mjs', `src/videos/${folder}/capture.json`, `public/captures/${folder}`], { entrypoint: 'node', publicMode: 'rw' })
  bridge?.kill()
  handBack(image, `public/captures/${folder}`)
  console.log(`Done: public/captures/${folder}/`)
  finish()
}

if (command === 'site') {
  const [url, folder, ...pages] = rest
  if (!url || !folder) {
    console.error('Give the website address and a folder name: ./render.sh site https://example.com launch')
    finish(1)
  }
  console.log(`Reading ${url} (colours, fonts, logo, wording, screenshots)...`)
  inImage(image, ['scripts/site.mjs', url, `public/site/${folder}`, ...pages], { entrypoint: 'node', publicMode: 'rw' })
  handBack(image, `public/site/${folder}`)
  console.log(`Done: public/site/${folder}/`)
  finish()
}

if (rest[0] !== 'still') {
  progress.write(0, 'getting ready: preparing the video')
}
inImage(image, ['bundle', 'src/index.ts', '--out-dir=out/bundle'])

if (rest[0] === 'still') {
  for (const frame of rest.slice(1)) {
    inImage(image, ['still', 'out/bundle', command, `out/${slug}-frame-${frame}.png`, `--frame=${frame}`, '--log=error'])
  }
  handBack(image, 'out')
  rmSync(join(HERE, 'out', 'bundle'), { recursive: true, force: true })
  finish()
}

// The same frames drawn at twice the pixel density: a 3840×2160 master for YouTube and big
// screens, and 1080p for social posts, where platforms re-encode anyway. `quick` makes only the
// 1080p one: a draft to watch and give notes on, in about a quarter of the time.
// `4k` makes only the 4K one (with its poster), for when that's the only file wanted.
const quick = rest[0] === 'quick'
const only4k = rest[0] === '4k'
rmSync(join(HERE, 'out', `${slug}-4k.mp4`), { force: true })
if (only4k) {
  rmSync(join(HERE, 'out', `${slug}-1080p.mp4`), { force: true })
}
if (!quick) {
  // 4K draws four times the pixels: about four fifths of the time goes there.
  await renderPass(image, ['render', 'out/bundle', command, `out/${slug}-4k.mp4`, '--scale=2'], { from: 0, to: only4k ? 0.97 : 0.78, what: 'the 4K version' })
}
if (!only4k) {
  await renderPass(image, ['render', 'out/bundle', command, `out/${slug}-1080p.mp4`], { from: quick ? 0 : 0.78, to: 0.97, what: 'the 1080p version' })
}
progress.write(0.98, 'the poster and the final checks')
inImage(image, ['still', 'out/bundle', command, `out/${slug}-poster.png`, '--frame=0', ...(quick ? [] : ['--scale=2'])])
inImage(image, ['scripts/finish.mjs', slug], { entrypoint: 'node' })
handBack(image, 'out')
rmSync(join(HERE, 'out', 'bundle'), { recursive: true, force: true })
progress.write(1, 'done')
console.log(`Done: ${[!quick && `out/${slug}-4k.mp4`, !only4k && `out/${slug}-1080p.mp4`, `out/${slug}-poster.png`, `out/${slug}-thumbnail.jpg`].filter(Boolean).join(', ')}`)
finish()
