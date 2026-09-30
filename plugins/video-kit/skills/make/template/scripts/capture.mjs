// Captures real screens from the product running on this machine, for videos that show the actual
// app instead of a rebuilt one. Runs inside the render image (render.sh capture <video>), driving
// the Chrome Remotion already installed there; the app is reached at host.docker.internal.
//
// Usage: node scripts/capture.mjs <plan.json> <output dir>
//
// The plan (src/videos/<slug>/capture.json):
// {
//   "baseUrl": "http://localhost:3000",
//   "viewport": { "width": 1440, "height": 900 },
//   "login": [ { "goto": "/login" }, { "fill": "input[type=email]", "value": "$VIDEO_LOGIN_EMAIL" }, … ],
//   "steps": [ { "goto": "/board" }, { "waitFor": "::-p-text(To do)" }, { "shot": "board" },
//              { "click": "button.new-card" }, { "type": "textarea", "value": "Invoice export" },
//              { "wait": 400 }, { "shot": "board-new-card" } ]
// }
// Steps: goto, click, fill (replace a field's value), type (key by key), press (a key), hover,
// scroll (pixels down, or a selector to bring into view), wait (ms), waitFor (a selector;
// ::-p-text(…) matches visible text), storage ({ key: value } into the page's localStorage, then a
// reload: a language, a dismissed intro), shot (id), record (id) … stop: film the steps in between.
// A value starting with $ is read from the environment, so passwords never live in a file.
//
// The app runs on this computer, the browser in Docker. A localhost address works as is: its port
// (and any in "forward": [8000, …], for an API on another port) is passed through to the computer,
// so the app sees the address it expects (dev servers like Vite refuse other host names). Names
// only this computer knows (Herd, Valet, /etc/hosts), like an API at https://demo.growee.test, go in
// "local": ["growee.test", "*.growee.test"]: the browser sends them to the computer too.
//
// Recording: { "record": "add-card" } starts filming, { "stop": true } (or the end of the plan) ends
// it. In between, the steps play at a pace a viewer can follow: the mouse glides to what it clicks
// (so hover states show), typing goes key by key, and each step settles for half a second. A
// pointer is drawn into the page, so it is part of the recording and always in sync. Filmed frame
// by frame at 60 fps and 2× (see `filming` below); "filming": "live" on the plan or the record step
// films in real time instead. Writes
// <id>.mp4 and <id>.json: its length, size and when each step happened (t, in seconds), for placing
// camera moves on the moments that matter.
import { spawnSync } from 'node:child_process'
import { lookup } from 'node:dns/promises'
import { createServer, connect } from 'node:net'
import { mkdtempSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import puppeteer from 'puppeteer-core'
import { findChrome } from './chrome.mjs'

const [planPath, outDir] = process.argv.slice(2)
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const TIMEOUT = 20000

function value(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('$')) {
    return raw
  }
  const name = raw.slice(1)
  if (!process.env[name]) {
    throw new Error(`The plan reads $${name}, but it isn't set. Pass it to render.sh: ${name}=… ./render.sh capture …`)
  }
  return process.env[name]
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The pointer drawn into the page while filming: the macOS arrow, following the real mouse events,
// pressing on mousedown. It survives page loads through sessionStorage. A 1-pixel dot flickers
// invisibly in the corner, so the page repaints every frame and the film keeps running through
// moments where nothing moves.
const POINTER = `(() => {
  if (sessionStorage.getItem('video-kit-pointer') !== 'on') return
  const start = () => {
    const at = JSON.parse(sessionStorage.getItem('video-kit-pointer-at') || '[-40,-40]')
    const pointer = document.createElement('div')
    pointer.innerHTML = '<svg width="24" height="32" viewBox="0 0 24 32"><path d="M1 1v25l6.5-6.2 4.2 9.8 4-1.7-4.1-9.6H21z" fill="#1F1F1F" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    pointer.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))'
    // The press shrinks the arrow around its tip. Only the arrow: scaling the element that carries
    // the position would pull the pointer toward the corner of the screen.
    const arrow = pointer.firstChild
    arrow.style.cssText = 'display:block;transform-origin:1px 1px;transition:transform .08s'
    const place = (x, y) => { pointer.style.transform = 'translate(' + x + 'px,' + y + 'px)'; sessionStorage.setItem('video-kit-pointer-at', JSON.stringify([x, y])) }
    place(at[0], at[1])
    document.documentElement.appendChild(pointer)
    addEventListener('mousemove', event => place(event.clientX, event.clientY), true)
    addEventListener('mousedown', () => { arrow.style.transform = 'scale(0.86)' }, true)
    addEventListener('mouseup', () => { arrow.style.transform = 'none' }, true)
    const tick = document.createElement('div')
    tick.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:2147483646;pointer-events:none'
    document.documentElement.appendChild(tick)
    let odd = false
    const flicker = () => { odd = !odd; tick.style.background = odd ? 'rgba(0,0,0,0.004)' : 'rgba(0,0,0,0.005)'; requestAnimationFrame(flicker) }
    flicker()
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start)
  else start()
})()`

/**
 * The film being made, if any. Two ways to film, same steps, same pace:
 * - frames (the default): Chrome draws only when told (begin-frame control). Between frames the
 *   page's clock (virtual time) and the compositor's (the frame's time stamp) both move on exactly
 *   1/60 s, so scripts, CSS transitions and animations all run at their real speed; every frame is
 *   there and sharp (2×) however slow the computer: about 25 seconds per 10 seconds filmed. Page
 *   loads inside it are cut out (time runs freely while the page loads).
 * - live ("filming": "live"): Chrome's screencast in real time. Quick, but 1× (Chrome ignores the
 *   page's pixel density), 30 fps, and slower and uneven when the page is heavy for a computer
 *   drawing without a GPU. For apps that misbehave with their clock stopped.
 */
let filming = null

const FRAME = 1000 / 60

/** Chrome's frame clock: the monotonic clock in milliseconds (the same one on Linux, in the container). */
function monotonicMs() {
  return Number(process.hrtime.bigint() / 1000n) / 1000
}

/** Asks Chrome for a frame every 16 ms while running, so the page draws as it normally would. */
function pump(client) {
  let running = false
  let loop = Promise.resolve()
  return {
    client,
    start() {
      if (running) {
        return
      }
      running = true
      loop = (async () => {
        while (running) {
          await client.send('HeadlessExperimental.beginFrame', { interval: FRAME }).catch(() => {})
          await sleep(16)
        }
      })()
    },
    async stop() {
      running = false
      await loop
    }
  }
}

/** The tab being worked in, and its frame pump. */
let tab = null
let drawing = null
let browser = null

/**
 * A new tab whose frames are drawn on request (begin-frame control), with a pump that asks for one
 * every 16 ms while nothing is filmed, so pages load and render as usual; the old tab, if any,
 * closes. A filmed tab can't go back to real time (its clock only fast-forwards or pauses from
 * then on), so every recording ends in a fresh tab at the same address: same login, same storage.
 */
async function openTab(url) {
  const old = tab
  await drawing?.stop()
  const browserClient = await browser.target().createCDPSession()
  const { targetId } = await browserClient.send('Target.createTarget', {
    url: 'about:blank', enableBeginFrameControl: true, width: plan.viewport?.width ?? 1440, height: plan.viewport?.height ?? 900
  })
  await browserClient.detach().catch(() => {})
  const page = await (await browser.waitForTarget(target => target._targetId === targetId)).page()
  drawing = pump(await page.createCDPSession())
  drawing.start()
  await page.evaluateOnNewDocument(POINTER)
  tab = page
  if (url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT })
  }
  await old?.close().catch(() => {})
  return page
}

/** One frame of the film: real time passing (live), or the page's clock moved on and a shot (frames). */
async function frame(page) {
  if (filming.mode === 'live') {
    await sleep(FRAME)
    return
  }
  const done = new Promise(resolve => filming.client.once('Emulation.virtualTimeBudgetExpired', resolve))
  await filming.client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: FRAME })
  await done
  filming.ticks += FRAME
  const { screenshotData } = await drawing.client.send('HeadlessExperimental.beginFrame', {
    frameTimeTicks: filming.ticks, interval: FRAME, screenshot: { format: 'jpeg', quality: 92 }
  })
  // Nothing changed on screen: the frame is the previous one again.
  filming.last = screenshotData ? Buffer.from(screenshotData, 'base64') : filming.last
  const file = join(filming.dir, `${String(filming.frames.length).padStart(5, '0')}.jpg`)
  writeFileSync(file, filming.last)
  filming.frames.push(file)
}

/** Holds for `ms`, the film running. */
async function hold(page, ms) {
  if (filming.mode === 'live') {
    await sleep(ms)
    return
  }
  for (let i = 0; i < Math.round(ms / FRAME); i++) {
    await frame(page)
  }
}

/** Seconds into a frame-by-frame film. */
function filmTime() {
  return Number((filming.frames.length / 60).toFixed(2))
}

/**
 * Sends input to the page (a mouse move, a key). Filming frame by frame, Chrome handles input with
 * the next frame it draws, so the frame is drawn first and the input waited on after; this counts
 * as that frame.
 */
async function act(page, send) {
  if (filming?.mode !== 'frames') {
    await send()
    return
  }
  const sent = send()
  await frame(page)
  await sent
}

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

async function glide(page, selector) {
  const target = await page.locator(selector).setTimeout(TIMEOUT).waitHandle()
  // Bring it into view the way a person would: a smooth scroll, if it's off screen.
  const box0 = await target.boundingBox()
  const height = plan.viewport?.height ?? 900
  if (box0 && (box0.y < 60 || box0.y + box0.height > height - 60)) {
    await scrollBy(page, box0.y - height * 0.4)
  }
  const box = await target.boundingBox()
  const to = [box.x + box.width / 2, box.y + box.height / 2]
  const from = filming.mouse
  // Eased in and out over about half a second, a step per frame, like a hand on a trackpad.
  const steps = 28
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps)
    filming.mouse = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
    await act(page, () => page.mouse.move(...filming.mouse))
  }
  await hold(page, 120)
  return target
}

/** Scrolls by `pixels` (or to put an element 40% down the screen), eased over 0.9 s, a step per frame. */
async function scrollBy(page, pixels) {
  const from = await page.evaluate(() => window.scrollY)
  const steps = 54
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(y => window.scrollTo(0, y), from + pixels * ease(i / steps))
    await frame(page)
  }
}

async function press(page) {
  await act(page, () => page.mouse.down())
  await hold(page, 75)
  await act(page, () => page.mouse.up())
}

/** Draws the pointer into the page at the mouse's place. */
async function armPointer(page, at) {
  await page.evaluate(() => sessionStorage.setItem('video-kit-pointer', 'on'))
  await page.evaluate(POINTER)
  await page.mouse.move(at[0], at[1])
}

async function startFilm(page, id, mode) {
  const start = [plan.viewport?.width ?? 1440, (plan.viewport?.height ?? 900) * 0.72].map(v => Math.round(v * 0.5))
  await armPointer(page, start)
  const client = await page.createCDPSession()
  const dir = mkdtempSync(join(tmpdir(), 'film-'))
  filming = { id, mode, client, dir, frames: [], marks: [], mouse: start, began: Date.now() }
  if (mode === 'live') {
    // Chrome sends a frame each time the page repaints, with the moment it was drawn; they're kept
    // on disk and timed into a steady film when it stops.
    client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = join(dir, `${String(filming?.frames.length ?? 0).padStart(5, '0')}.jpg`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      filming?.frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 })
      client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 92 })
  } else {
    await drawing.stop()
    await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
    filming.ticks = monotonicMs()
    // The first frame is always drawn in full, so there's one to repeat.
    const { screenshotData } = await drawing.client.send('HeadlessExperimental.beginFrame', {
      frameTimeTicks: filming.ticks, interval: FRAME, screenshot: { format: 'jpeg', quality: 92 }
    })
    filming.last = screenshotData ? Buffer.from(screenshotData, 'base64') : await page.screenshot({ type: 'jpeg', quality: 92 })
  }
  await hold(page, 600)
}

async function stopFilm(page) {
  if (!filming) {
    return
  }
  await hold(page, 700)
  const { id, mode, client, dir, frames, marks, began } = filming
  filming = null
  const mp4 = join(outDir, `${id}.mp4`)
  let input
  if (mode === 'live') {
    await client.send('Page.stopScreencast').catch(() => {})
    const end = Date.now() / 1000
    if (!frames.length) {
      throw new Error(`The recording ${id} caught no frames`)
    }
    // Each frame lasts until the next one was drawn; the film starts on the first frame.
    const first = frames[0].t
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`)
    writeFileSync(join(dir, 'frames.txt'), `${list.join('\n')}\nfile '${frames.at(-1).file}'\n`)
    input = ['-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'), '-vf', 'fps=30,format=yuv420p']
    const shift = first - began / 1000
    for (const mark of marks) {
      mark.t = Number(Math.max(0, mark.t - shift).toFixed(2))
    }
  } else {
    input = ['-framerate', '60', '-i', join(dir, '%05d.jpg'), '-vf', 'format=yuv420p']
  }
  await client.detach().catch(() => {})
  if (mode === 'frames') {
    // The rest of the plan goes on in real time, in a fresh tab at the same address.
    await openTab(page.url())
  } else {
    await page.evaluate(() => sessionStorage.removeItem('video-kit-pointer')).catch(() => {})
  }
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-y', ...input, '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-g', '30', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
  rmSync(dir, { recursive: true, force: true })
  if (result.status !== 0) {
    throw new Error(`Couldn't make the recording ${mp4}`)
  }
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', mp4], { encoding: 'utf8' }).stdout)
  const info = { src: relative('public', mp4).split('\\').join('/'), filming: mode, duration: Number(Number(probe.format.duration).toFixed(2)), width: probe.streams[0].width, height: probe.streams[0].height, marks }
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(info, null, 2) + '\n')
  console.log(`  ${mp4} (${info.duration} s, ${mode})`)
}

async function run(page, step) {
  const url = step.goto && new URL(step.goto, plan.baseUrl).href
  if (filming && !step.record && !step.stop && !step.shot) {
    filming.marks.push({ t: filming.mode === 'live' ? Date.now() / 1000 - filming.began / 1000 : filmTime(), step: JSON.stringify(step) })
  }
  if (step.record) {
    await stopFilm(page)
    await startFilm(page, step.record, step.filming ?? plan.filming ?? 'frames')
  } else if (step.stop) {
    await stopFilm(page)
  } else if (filming && step.click) {
    await glide(page, step.click)
    await press(page)
    await hold(page, 500)
  } else if (filming && step.hover) {
    await glide(page, step.hover)
    await hold(page, 500)
  } else if (filming && step.type) {
    await glide(page, step.type)
    await press(page)
    await hold(page, 250)
    for (const character of value(step.value)) {
      await act(page, () => page.keyboard.type(character))
      await hold(page, 55)
    }
    await hold(page, 500)
  } else if (filming && step.press) {
    await act(page, () => page.keyboard.press(step.press))
    await hold(page, 400)
  } else if (filming && step.scroll) {
    if (typeof step.scroll === 'string') {
      const box = await (await page.locator(step.scroll).setTimeout(TIMEOUT).waitHandle()).boundingBox()
      await scrollBy(page, box.y - (plan.viewport?.height ?? 900) * 0.15)
    } else {
      await scrollBy(page, step.scroll)
    }
    await hold(page, 300)
  } else if (filming && step.wait) {
    await hold(page, step.wait)
  } else if (filming && step.waitFor) {
    // The film keeps running while the page gets there (an answer streaming in, a result
    // loading). Frame by frame, real seconds of waiting become a fraction of that on film.
    const until = Date.now() + (step.timeout ?? 90000)
    while (!(await page.$(step.waitFor))) {
      if (Date.now() > until) {
        throw new Error(`Waited ${(step.timeout ?? 90000) / 1000} s for ${step.waitFor}`)
      }
      await frame(page)
    }
    await hold(page, 300)
  } else if (filming && filming.mode === 'frames' && url) {
    // The load happens off camera, in a fresh tab; the film picks up once it's there.
    await filming.client.detach().catch(() => {})
    const next = await openTab(url)
    await armPointer(next, filming.mouse)
    await drawing.stop()
    filming.client = await next.createCDPSession()
    await filming.client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
    filming.ticks = Math.max(filming.ticks, monotonicMs())
    await hold(next, 500)
  } else if (url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT })
    if (filming) {
      await hold(page, 500)
    }
  } else if (step.storage) {
    await page.evaluate(items => Object.entries(items).forEach(([key, item]) => localStorage.setItem(key, String(item))), step.storage)
    await page.reload({ waitUntil: 'networkidle2', timeout: TIMEOUT })
  } else if (step.click) {
    await page.locator(step.click).setTimeout(TIMEOUT).click()
  } else if (step.fill) {
    await page.locator(step.fill).setTimeout(TIMEOUT).fill(value(step.value))
  } else if (step.type) {
    await page.locator(step.type).setTimeout(TIMEOUT).click()
    await page.keyboard.type(value(step.value), { delay: 30 })
  } else if (step.press) {
    await page.keyboard.press(step.press)
  } else if (step.hover) {
    await page.locator(step.hover).setTimeout(TIMEOUT).hover()
  } else if (step.scroll) {
    await page.evaluate(y => window.scrollBy(0, y), typeof step.scroll === 'number' ? step.scroll : 0)
  } else if (step.wait) {
    await new Promise(resolve => setTimeout(resolve, step.wait))
  } else if (step.waitFor) {
    await page.waitForSelector(step.waitFor, { timeout: TIMEOUT })
  } else if (step.shot) {
    // Let fonts, images and any settling animation finish before the shutter.
    await page.evaluate(() => document.fonts.ready)
    await new Promise(resolve => setTimeout(resolve, 300))
    const file = join(outDir, `${step.shot}.png`)
    await page.screenshot({ path: file })
    console.log(`  ${file}`)
  } else {
    throw new Error(`Unknown step: ${JSON.stringify(step)}`)
  }
}

/** Passes localhost:<port> inside the container through to the same port on the computer. */
function forward(port) {
  return new Promise((resolve, reject) => {
    const server = createServer(socket => {
      const upstream = connect(port, 'host.docker.internal')
      socket.pipe(upstream).pipe(socket)
      socket.on('error', () => upstream.destroy())
      upstream.on('error', () => socket.destroy())
    })
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

const base = new URL(plan.baseUrl)
const forwarded = []
if (['localhost', '127.0.0.1'].includes(base.hostname)) {
  const port = Number(base.port || (base.protocol === 'https:' ? 443 : 80))
  for (const each of new Set([port, ...(plan.forward ?? [])])) {
    forwarded.push(await forward(each))
  }
}

// Local names resolve to the computer, the way they do in its own browser.
const computer = plan.local?.length ? (await lookup('host.docker.internal')).address : null
const localNames = computer ? [`--host-resolver-rules=${plan.local.map(name => `MAP ${name} ${computer}`).join(', ')}`] : []

mkdirSync(outDir, { recursive: true })
browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'shell',
  acceptInsecureCerts: true,
  args: [
    '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    // Every layer drawn fresh before each shot, as Remotion renders: without these, a frame filmed
    // with the page's clock paused can show parts of the screen as they were moments earlier
    // (a sidebar still hovered), which blinks when the next keypress redraws them.
    '--run-all-compositor-stages-before-draw', '--disable-threaded-animation', '--disable-threaded-scrolling',
    '--disable-checker-imaging', '--disable-new-content-rendering-timeout', '--disable-image-animation-resync',
    // A real 2× screen rather than an emulated one: with emulation, Chrome's own hover checks (after
    // a screenshot, a key press, a layout change) look at half the mouse's position and light up
    // the wrong element for a frame.
    `--window-size=${plan.viewport?.width ?? 1440},${plan.viewport?.height ?? 900}`, '--force-device-scale-factor=2',
    // Frames drawn only when asked, at the time given: see `filming`.
    '--deterministic-mode', '--enable-begin-frame-control',
    ...localNames
  ],
  defaultViewport: null
})
try {
  await openTab()
  for (const step of [...(plan.login ?? []), ...plan.steps]) {
    try {
      await run(tab, step)
    } catch (error) {
      await tab.screenshot({ path: join(outDir, '_failed.png') }).catch(() => {})
      throw new Error(`Step ${JSON.stringify(step)} failed: ${error.message}. The page at that moment: ${join(outDir, '_failed.png')}`)
    }
  }
  await stopFilm(tab)
} finally {
  await drawing?.stop()
  await browser.close()
  for (const server of forwarded) {
    server.close()
  }
}
